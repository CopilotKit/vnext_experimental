/**
 * Middleware support for CopilotKit Runtime.
 *
 * A middleware hook can be provided as either:
 *   1. A **callback function** executed in-process.
 *   2. A **webhook URL** (http/https).  The runtime will `POST` a JSON payload
 *      to the URL and, for *before* hooks, accept an optional modified
 *      `Request` object in the response body.
 *
 * Two lifecycle hooks are available:
 *   • `BEFORE_REQUEST` – runs *before* the request handler.
 *   • `AFTER_REQUEST`  – runs *after* the handler returns a `Response`.
 */

import type { CopilotRuntime } from "./runtime";
import type { MaybePromise } from "@copilotkitnext/shared";
import { logger } from "@copilotkitnext/shared";

/* ------------------------------------------------------------------------------------------------
 * Public types
 * --------------------------------------------------------------------------------------------- */

/** A string beginning with http:// or https:// that points to a webhook endpoint. */
export type MiddlewareURL = `${"http" | "https"}://${string}`;

export interface BeforeRequestMiddlewareParameters {
  runtime: CopilotRuntime;
  request: Request;
  path: string;
}
export interface AfterRequestMiddlewareParameters {
  runtime: CopilotRuntime;
  response: Response;
  path: string;
}

export type BeforeRequestMiddlewareFn = (
  params: BeforeRequestMiddlewareParameters
) => MaybePromise<Request | void>;
export type AfterRequestMiddlewareFn = (
  params: AfterRequestMiddlewareParameters
) => MaybePromise<void>;

/**
 * A middleware value can be either a callback function or a webhook URL.
 */
export type BeforeRequestMiddleware = BeforeRequestMiddlewareFn | MiddlewareURL;
export type AfterRequestMiddleware = AfterRequestMiddlewareFn | MiddlewareURL;

/** Lifecycle events emitted to webhook middleware. */
export enum CopilotKitMiddlewareEvent {
  BeforeRequest = "BEFORE_REQUEST",
  AfterRequest = "AFTER_REQUEST",
}

/** Stages used by the Middleware Webhook Protocol */
/** Stages used by the CopilotKit webhook protocol */
export enum WebhookStage {
  BeforeRequest = "before_request",
  AfterRequest = "after_request",
}

/* ------------------------------------------------------------------------------------------------
 * Internal helpers – (de)serialisation
 * --------------------------------------------------------------------------------------------- */

function isMiddlewareURL(value: unknown): value is MiddlewareURL {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

export async function callBeforeRequestMiddleware({
  runtime,
  request,
  path,
}: BeforeRequestMiddlewareParameters): Promise<Request | void> {
  const mw = runtime.beforeRequestMiddleware;
  if (!mw) return;

  // Function-based middleware (in-process)
  if (typeof mw === "function") {
    return (mw as BeforeRequestMiddlewareFn)({ runtime, request, path });
  }

  // Webhook middleware
  if (isMiddlewareURL(mw)) {
    const clone = request.clone();
    const url = new URL(request.url);
    const headersObj: Record<string, string> = {};
    clone.headers.forEach((v, k) => {
      headersObj[k] = v;
    });
    let bodyJson: unknown = undefined;
    try {
      bodyJson = await clone.json();
    } catch {
      /* ignore */
    }

    const payload = {
      method: request.method,
      path: url.pathname,
      query: url.search.startsWith("?") ? url.search.slice(1) : url.search,
      headers: headersObj,
      body: bodyJson,
    };

    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 2000);
    let res: Response;
    try {
      res = await fetch(mw, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-CopilotKit-Webhook-Stage": WebhookStage.BeforeRequest,
        },
        body: JSON.stringify(payload),
        signal: ac.signal,
      });
    } catch {
      clearTimeout(to);
      throw new Response(undefined, { status: 502 });
    }
    clearTimeout(to);

    if (res.status >= 500) {
      throw new Response(undefined, { status: 502 });
    }
    if (res.status >= 400) {
      const errBody = await res.text();
      throw new Response(errBody || null, {
        status: res.status,
        headers: {
          "content-type": res.headers.get("content-type") || "application/json",
        },
      });
    }
    if (res.status === 204) return;

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return;
    }

    if (json && typeof json === "object") {
      const { headers, body } = json as {
        headers?: Record<string, string>;
        body?: unknown;
      };
      const init: RequestInit = {
        method: request.method,
      };
      if (headers) {
        init.headers = headers;
      }
      // Only add body for non-GET/HEAD requests
      if (
        body !== undefined &&
        request.method !== "GET" &&
        request.method !== "HEAD"
      ) {
        init.body = JSON.stringify(body);
      }
      return new Request(request.url, init);
    }
    return;
  }

  logger.warn({ mw }, "Unsupported beforeRequestMiddleware value – skipped");
  return;
}

export async function callAfterRequestMiddleware({
  runtime,
  response,
  path,
}: AfterRequestMiddlewareParameters): Promise<void> {
  const mw = runtime.afterRequestMiddleware;
  if (!mw) return;

  if (typeof mw === "function") {
    return (mw as AfterRequestMiddlewareFn)({ runtime, response, path });
  }

  if (isMiddlewareURL(mw)) {
    const clone = response.clone();
    const headersObj: Record<string, string> = {};
    clone.headers.forEach((v, k) => {
      headersObj[k] = v;
    });
    let body = "";
    try {
      body = await clone.text();
    } catch {
      /* ignore */
    }

    const payload = {
      status: clone.status,
      headers: headersObj,
      body,
    };

    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 2000);
    let res: Response;
    try {
      res = await fetch(mw, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-CopilotKit-Webhook-Stage": WebhookStage.AfterRequest,
        },
        body: JSON.stringify(payload),
        signal: ac.signal,
      });
    } finally {
      clearTimeout(to);
    }

    if (!res.ok) {
      throw new Error(
        `after_request webhook ${mw} responded with ${res.status}`
      );
    }
    return;
  }

  logger.warn({ mw }, "Unsupported afterRequestMiddleware value – skipped");
}

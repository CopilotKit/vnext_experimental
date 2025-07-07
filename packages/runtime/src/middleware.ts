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

import type { CopilotKitRuntime } from "./runtime";
import { VERSION } from "./runtime";
import type { CopilotKitRequestType } from "./handler";
import type { MaybePromise } from "@copilotkit/shared";
import { logger } from "./logger";

/* ------------------------------------------------------------------------------------------------
 * Public types
 * --------------------------------------------------------------------------------------------- */

/** A string beginning with http:// or https:// that points to a webhook endpoint. */
export type MiddlewareURL = `${"http" | "https"}://${string}`;

export interface BeforeRequestMiddlewareParameters {
  runtime: CopilotKitRuntime;
  request: Request;
  requestType: CopilotKitRequestType;
}
export interface AfterRequestMiddlewareParameters {
  runtime: CopilotKitRuntime;
  response: Response;
  requestType: CopilotKitRequestType;
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

/* ------------------------------------------------------------------------------------------------
 * Internal helpers – (de)serialisation
 * --------------------------------------------------------------------------------------------- */

interface SerializedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}
interface SerializedResponse {
  status: number;
  headers: Record<string, string>;
  body?: string;
}

function isMiddlewareURL(value: unknown): value is MiddlewareURL {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

async function serializeRequest(request: Request): Promise<SerializedRequest> {
  const clone = request.clone();
  const headers: Record<string, string> = {};
  clone.headers.forEach((v, k) => {
    headers[k] = v;
  });
  let body: string | undefined;
  try {
    body = await clone.text();
    if (!body) body = undefined;
  } catch {
    /* ignore */
  }

  return { url: clone.url, method: clone.method, headers, body };
}

async function serializeResponse(res: Response): Promise<SerializedResponse> {
  const clone = res.clone();
  const headers: Record<string, string> = {};
  clone.headers.forEach((v, k) => {
    headers[k] = v;
  });
  let body: string | undefined;
  try {
    body = await clone.text();
    if (!body) body = undefined;
  } catch {
    /* ignore */
  }

  return { status: clone.status, headers, body };
}

function deserializeRequest(sr: SerializedRequest): Request {
  return new Request(sr.url, {
    method: sr.method,
    headers: sr.headers,
    body: sr.body,
  });
}

export async function callBeforeRequestMiddleware({
  runtime,
  request,
  requestType,
}: BeforeRequestMiddlewareParameters): Promise<Request | void> {
  const mw = runtime.beforeRequestMiddleware;
  if (!mw) return;

  // Function-based middleware (in-process)
  if (typeof mw === "function") {
    return (mw as BeforeRequestMiddlewareFn)({ runtime, request, requestType });
  }

  // Webhook middleware
  if (isMiddlewareURL(mw)) {
    const payload = {
      event: CopilotKitMiddlewareEvent.BeforeRequest,
      requestType,
      runtimeVersion: VERSION,
      request: await serializeRequest(request),
    };

    const res = await fetch(mw, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        `before_request webhook ${mw} responded with ${res.status}`
      );
    }
    if (res.status === 204) return; // no modifications

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return;
    }

    if (json && typeof json === "object" && "request" in json) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return deserializeRequest((json as any).request as SerializedRequest);
    }
    return;
  }

  logger.warn({ mw }, "Unsupported beforeRequestMiddleware value – skipped");
  return;
}

export async function callAfterRequestMiddleware({
  runtime,
  response,
  requestType,
}: AfterRequestMiddlewareParameters): Promise<void> {
  const mw = runtime.afterRequestMiddleware;
  if (!mw) return;

  if (typeof mw === "function") {
    return (mw as AfterRequestMiddlewareFn)({ runtime, response, requestType });
  }

  if (isMiddlewareURL(mw)) {
    const payload = {
      event: CopilotKitMiddlewareEvent.AfterRequest,
      requestType,
      runtimeVersion: VERSION,
      response: await serializeResponse(response),
    };

    const res = await fetch(mw, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        `after_request webhook ${mw} responded with ${res.status}`
      );
    }
    return;
  }

  logger.warn({ mw }, "Unsupported afterRequestMiddleware value – skipped");
}

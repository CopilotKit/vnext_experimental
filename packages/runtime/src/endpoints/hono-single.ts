import { Hono } from "hono";
import { cors } from "hono/cors";

import { CopilotRuntime } from "../runtime";
import { handleRunAgent } from "../handlers/handle-run";
import { handleConnectAgent } from "../handlers/handle-connect";
import { handleStopAgent } from "../handlers/handle-stop";
import { handleGetRuntimeInfo } from "../handlers/get-runtime-info";
import { handleTranscribe } from "../handlers/handle-transcribe";
import { logger } from "@copilotkitnext/shared";
import { callBeforeRequestMiddleware, callAfterRequestMiddleware } from "../middleware";

interface CopilotSingleEndpointParams {
  runtime: CopilotRuntime;
  /**
   * Absolute path at which to mount the single-route endpoint (e.g. "/api/copilotkit").
   */
  basePath: string;
}

type CopilotEndpointContext = {
  Variables: {
    modifiedRequest?: Request;
  };
};

const METHOD_NAMES = ["agent/run", "agent/connect", "agent/stop", "info", "transcribe"] as const;

type EndpointMethod = (typeof METHOD_NAMES)[number];

interface JsonEnvelope {
  method?: string;
  params?: Record<string, unknown>;
  body?: unknown;
}

interface MethodCall {
  method: EndpointMethod;
  params?: Record<string, unknown>;
  body?: unknown;
}

export function createCopilotEndpointSingleRoute({ runtime, basePath }: CopilotSingleEndpointParams) {
  const app = new Hono<CopilotEndpointContext>();
  const routePath = normalizePath(basePath);

  return app
    .basePath(routePath)
    .use(
      "*",
      cors({
        origin: "*",
        allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
        allowHeaders: ["*"],
      }),
    )
    .use("*", async (c, next) => {
      const request = c.req.raw;
      const path = c.req.path;

      try {
        const maybeModifiedRequest = await callBeforeRequestMiddleware({
          runtime,
          request,
          path,
        });
        if (maybeModifiedRequest) {
          c.set("modifiedRequest", maybeModifiedRequest);
        }
      } catch (error) {
        logger.error({ err: error, url: request.url, path }, "Error running before request middleware");
        if (error instanceof Response) {
          return error;
        }
        throw error;
      }

      await next();
    })
    .use("*", async (c, next) => {
      await next();

      const response = c.res;
      const path = c.req.path;

      callAfterRequestMiddleware({
        runtime,
        response,
        path,
      }).catch((error) => {
        logger.error({ err: error, url: c.req.url, path }, "Error running after request middleware");
      });
    })
    .post("/", async (c) => {
      const request = c.get("modifiedRequest") || c.req.raw;

      let methodCall: MethodCall;
      try {
        methodCall = await parseMethodCall(request);
      } catch (error) {
        if (error instanceof Response) {
          logger.warn({ url: request.url }, "Invalid single-route payload");
          return error;
        }
        logger.warn({ err: error, url: request.url }, "Invalid single-route payload");
        return c.json(
          {
            error: "invalid_request",
            message: error instanceof Error ? error.message : "Invalid request payload",
          },
          400,
        );
      }

      try {
        switch (methodCall.method) {
          case "agent/run": {
            const agentId = expectString(methodCall.params, "agentId");
            const handlerRequest = createJsonRequest(request, methodCall.body);
            return await handleRunAgent({ runtime, request: handlerRequest, agentId });
          }
          case "agent/connect": {
            const agentId = expectString(methodCall.params, "agentId");
            const handlerRequest = createJsonRequest(request, methodCall.body);
            return await handleConnectAgent({ runtime, request: handlerRequest, agentId });
          }
          case "agent/stop": {
            const agentId = expectString(methodCall.params, "agentId");
            const threadId = expectString(methodCall.params, "threadId");
            return await handleStopAgent({ runtime, request, agentId, threadId });
          }
          case "info": {
            return await handleGetRuntimeInfo({ runtime, request });
          }
          case "transcribe": {
            return await handleTranscribe({ runtime, request });
          }
          default: {
            const exhaustiveCheck: never = methodCall.method;
            return exhaustiveCheck;
          }
        }
      } catch (error) {
        if (error instanceof Response) {
          return error;
        }
        logger.error({ err: error, url: request.url, method: methodCall.method }, "Error running single-route handler");
        throw error;
      }
    })
    .notFound((c) => {
      return c.json({ error: "Not found" }, 404);
    });
}

async function parseMethodCall(request: Request): Promise<MethodCall> {
  const contentType = request.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw createResponseError("Single-route endpoint expects JSON payloads", 415);
  }

  let jsonEnvelope: JsonEnvelope;
  try {
    jsonEnvelope = (await request.clone().json()) as JsonEnvelope;
  } catch (error) {
    throw createResponseError("Invalid JSON payload", 400);
  }

  const method = validateMethod(jsonEnvelope.method);

  return {
    method,
    params: jsonEnvelope.params,
    body: jsonEnvelope.body,
  };
}

function validateMethod(method: string | undefined): EndpointMethod {
  if (!method) {
    throw createResponseError("Missing method field", 400);
  }

  if ((METHOD_NAMES as readonly string[]).includes(method)) {
    return method as EndpointMethod;
  }

  throw createResponseError(`Unsupported method '${method}'`, 400);
}

function expectString(params: Record<string, unknown> | undefined, key: string): string {
  const value = params?.[key];
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  throw createResponseError(`Missing or invalid parameter '${key}'`, 400);
}

function createJsonRequest(base: Request, body: unknown): Request {
  if (body === undefined || body === null) {
    throw createResponseError("Missing request body for JSON handler", 400);
  }

  const headers = new Headers(base.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");

  const serializedBody = serializeJsonBody(body);

  return new Request(base.url, {
    method: "POST",
    headers,
    body: serializedBody,
    // Preserve the abort signal so downstream handlers can react to client disconnects.
    signal: base.signal,
  });
}

function serializeJsonBody(body: unknown): BodyInit {
  if (typeof body === "string") {
    return body;
  }

  if (body instanceof Blob || body instanceof ArrayBuffer || body instanceof Uint8Array) {
    return body;
  }

  if (body instanceof FormData || body instanceof URLSearchParams) {
    return body;
  }

  return JSON.stringify(body);
}

function normalizePath(path: string): string {
  if (!path) {
    throw new Error("basePath must be provided for single-route endpoint");
  }

  if (!path.startsWith("/")) {
    return `/${path}`;
  }

  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }

  return path;
}

function createResponseError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({
      error: "invalid_request",
      message,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

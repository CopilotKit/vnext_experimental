import { createServerAdapter } from "@whatwg-node/server";
import { handleRunAgent } from "./handlers/handle-run";
import { handleGetRuntimeInfo } from "./handlers/get-runtime-info";
import { CopilotKitRuntime } from "./runtime";
import { CopilotKitRequestHandler, CopilotKitRequestType } from "./handler";
import { logger } from "@copilotkit/shared";
import {
  callBeforeRequestMiddleware,
  callAfterRequestMiddleware,
} from "./middleware";

export default (runtime: CopilotKitRuntime) =>
  createServerAdapter(async (request: Request) => {
    const { requestType, info } = routeRequest(request);

    if (!requestType) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    switch (requestType) {
      case CopilotKitRequestType.RunAgent:
        return runHandlerWithMiddlewareAndLogging({
          runtime,
          request,
          requestType,
          handler: async ({ request }) =>
            await handleRunAgent({
              runtime,
              request,
              agentName: info!.agentName as string,
            }),
        });
      case CopilotKitRequestType.GetRuntimeInfo:
        return runHandlerWithMiddlewareAndLogging({
          runtime,
          request,
          requestType,
          handler: async ({ request }) =>
            handleGetRuntimeInfo({ runtime, request }),
        });
      default:
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
    }
  });

export function routeRequest(request: Request): {
  requestType: CopilotKitRequestType | null;
  info?: Record<string, unknown>;
} {
  const url = new URL(request.url);
  const path = url.pathname;

  // Check if path ends with agent/<agentName>/run
  const runMatch = path.match(/\/agent\/([^/]+)\/run$/);
  if (runMatch && runMatch[1]) {
    const agentName = runMatch[1];
    return {
      requestType: CopilotKitRequestType.RunAgent,
      info: { agentName },
    };
  }

  // Check if path ends with /info
  if (path.endsWith("/info")) {
    return {
      requestType: CopilotKitRequestType.GetRuntimeInfo,
    };
  }

  // Return null for unmatched paths (will result in 404)
  return {
    requestType: null,
  };
}

export async function runHandlerWithMiddlewareAndLogging({
  request,
  requestType,
  runtime,
  handler,
}: {
  request: Request;
  requestType: CopilotKitRequestType;
  runtime: CopilotKitRuntime;
  handler: CopilotKitRequestHandler;
}) {
  try {
    const maybeModifiedRequest = await callBeforeRequestMiddleware({
      runtime,
      request,
      requestType,
    });
    if (maybeModifiedRequest) {
      request = maybeModifiedRequest;
    }
  } catch (error) {
    logger.error(
      { err: error, url: request.url, requestType },
      "Error running before request middleware"
    );
    if (error instanceof Response) {
      return error;
    }
    throw error;
  }

  let response: Response;
  try {
    response = await handler({ request });
  } catch (error) {
    logger.error(
      { err: error, url: request.url, requestType },
      "Error running request handler"
    );
    throw error;
  }

  callAfterRequestMiddleware({ runtime, response, requestType }).catch(
    (error) => {
      logger.error(
        { err: error, url: request.url, requestType },
        "Error running after request middleware"
      );
    }
  );

  return response;
}

import { createServerAdapter } from "@whatwg-node/server";
import { handleRunAgent } from "./handlers/handle-run";
import { handleGetAgents } from "./handlers/get-agents";
import { CopilotKitRuntime } from "./runtime";
import { handleGetInfo } from "./handlers/get-info";
import { CopilotKitRequestHandler, CopilotKitRequestType } from "./handler";
import { logger } from "./logger";
import {
  callBeforeRequestMiddleware,
  callAfterRequestMiddleware,
} from "./middleware";

export default (runtime: CopilotKitRuntime) =>
  createServerAdapter(async (request: Request) => {
    const { requestType, info } = routeRequest(request);
    switch (requestType) {
      case CopilotKitRequestType.RunAgent:
        return runHandlerWithMiddlewareAndLogging({
          runtime,
          request,
          requestType,
          handler: async ({ request }) =>
            handleRunAgent({
              runtime,
              request,
              agentName: info!.agentName as string,
            }),
        });
      case CopilotKitRequestType.GetAgents:
        return runHandlerWithMiddlewareAndLogging({
          runtime,
          request,
          requestType,
          handler: async ({ request }) => handleGetAgents({ runtime, request }),
        });
      case CopilotKitRequestType.GetInfo:
        return runHandlerWithMiddlewareAndLogging({
          runtime,
          request,
          requestType,
          handler: async ({ request }) => handleGetInfo({ runtime, request }),
        });
      default:
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
        });
    }
  });

export function routeRequest(request: Request): {
  requestType: CopilotKitRequestType;
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

  if (path.endsWith("/agents")) {
    return {
      requestType: CopilotKitRequestType.GetAgents,
    };
  }

  return {
    requestType: CopilotKitRequestType.GetInfo,
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
      "Error running before request middleware",
    );
    throw error;
  }

  let response: Response;
  try {
    response = await handler({ request });
  } catch (error) {
    logger.error(
      { err: error, url: request.url, requestType },
      "Error running request handler",
    );
    throw error;
  }

  try {
    await callAfterRequestMiddleware({
      runtime,
      response,
      requestType,
    });
  } catch (error) {
    logger.error(
      { err: error, url: request.url, requestType },
      "Error running after request middleware",
    );
    // After-request middleware errors are logged but do not fail the request
  }

  return response;
}

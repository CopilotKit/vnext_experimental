import { createServerAdapter } from "@whatwg-node/server";
import { handleRunAgent } from "./handlers/handle-run";
import { handleGetAgents } from "./handlers/get-agents";
import { CopilotKitRuntime } from "./runtime";
import { handleGetInfo } from "./handlers/get-info";
import { CopilotKitRequestHandler, CopilotKitRequestType } from "./handler";
import { logger } from "./logger";

export default (runtime: CopilotKitRuntime) =>
  createServerAdapter(async (request: Request) => {
    const { handlerType, info } = routeRequest(request);
    switch (handlerType) {
      case CopilotKitRequestType.RunAgent:
        return runHandlerWithMiddlewareAndLogging({
          runtime,
          request,
          handlerType,
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
          handlerType,
          handler: async ({ request }) => handleGetAgents({ runtime, request }),
        });
      case CopilotKitRequestType.GetInfo:
        return runHandlerWithMiddlewareAndLogging({
          runtime,
          request,
          handlerType,
          handler: async ({ request }) => handleGetInfo({ runtime, request }),
        });
      default:
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
        });
    }
  });

function routeRequest(request: Request): {
  handlerType: CopilotKitRequestType;
  info?: Record<string, unknown>;
} {
  const url = new URL(request.url);
  const path = url.pathname;

  // Check if path ends with agent/<agentName>/run
  const runMatch = path.match(/\/agent\/([^\/]+)\/run$/);
  if (runMatch && runMatch[1]) {
    const agentName = runMatch[1];
    return {
      handlerType: CopilotKitRequestType.RunAgent,
      info: { agentName },
    };
  }

  if (path.endsWith("/agents")) {
    return {
      handlerType: CopilotKitRequestType.GetAgents,
    };
  }

  return {
    handlerType: CopilotKitRequestType.GetInfo,
  };
}

async function runHandlerWithMiddlewareAndLogging({
  request,
  handlerType,
  runtime,
  handler,
}: {
  request: Request;
  handlerType: CopilotKitRequestType;
  runtime: CopilotKitRuntime;
  handler: CopilotKitRequestHandler;
}) {
  if (runtime.beforeRequestMiddleware) {
    try {
      const maybeModifiedRequest = await runtime.beforeRequestMiddleware({
        runtime,
        request,
        handlerType,
      });
      if (maybeModifiedRequest) {
        request = maybeModifiedRequest;
      }
    } catch (error) {
      logger.error(
        { err: error, url: request.url, handlerType },
        "Error running before request middleware"
      );
      throw error;
    }
  }

  let response: Response;
  try {
    response = await handler({ request });
  } catch (error) {
    logger.error(
      { err: error, url: request.url, handlerType },
      "Error running request handler"
    );
    throw error;
  }

  if (runtime.afterRequestMiddleware) {
    try {
      await runtime.afterRequestMiddleware({
        runtime,
        response,
        handlerType,
      });
    } catch (error) {
      logger.error(
        { err: error, url: request.url, handlerType },
        "Error running after request middleware"
      );
      throw error;
    }
  }

  return response;
}

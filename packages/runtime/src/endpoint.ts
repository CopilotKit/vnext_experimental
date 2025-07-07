import { createServerAdapter } from "@whatwg-node/server";
import { handleRunAgent } from "./lib/handlers/handle-run";
import { handleGetAgents } from "./handlers/get-agents";
import { CopilotKitRuntime } from "./runtime";
import { handleGetInfo } from "./handlers/get-info";
import { CopilotKitRequestHandlerType } from "./handler";

export default (runtime: CopilotKitRuntime) =>
  createServerAdapter(async (request: Request) => {
    const { handlerType, info } = routeRequest(request);
    switch (handlerType) {
      case CopilotKitRequestHandlerType.RunAgent:
        return runtime.runHandlerWithMiddleware({
          request,
          handlerType,
          handler: async ({ runtime, request }) =>
            handleRunAgent({
              runtime,
              request,
              agentName: info!.agentName as string,
            }),
        });
      case CopilotKitRequestHandlerType.GetAgents:
        return runtime.runHandlerWithMiddleware({
          request,
          handlerType,
          handler: async ({ runtime, request }) =>
            handleGetAgents({ runtime, request }),
        });
      case CopilotKitRequestHandlerType.GetInfo:
        return runtime.runHandlerWithMiddleware({
          request,
          handlerType,
          handler: async ({ runtime, request }) =>
            handleGetInfo({ runtime, request }),
        });
      default:
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
        });
    }
  });

function routeRequest(request: Request): {
  handlerType: CopilotKitRequestHandlerType;
  info?: Record<string, unknown>;
} {
  const url = new URL(request.url);
  const path = url.pathname;

  // Check if path ends with agent/<agentName>/run
  const runMatch = path.match(/\/agent\/([^\/]+)\/run$/);
  if (runMatch && runMatch[1]) {
    const agentName = runMatch[1];
    return {
      handlerType: CopilotKitRequestHandlerType.RunAgent,
      info: { agentName },
    };
  }

  if (path.endsWith("/agents")) {
    return {
      handlerType: CopilotKitRequestHandlerType.GetAgents,
    };
  }

  return {
    handlerType: CopilotKitRequestHandlerType.GetInfo,
  };
}

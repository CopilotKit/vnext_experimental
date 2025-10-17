import { CopilotRuntime } from "../runtime";
import { EventType } from "@ag-ui/client";

interface StopAgentParameters {
  request: Request;
  runtime: CopilotRuntime;
  agentId: string;
  threadId: string;
}

export async function handleStopAgent({
  runtime,
  request,
  agentId,
  threadId,
}: StopAgentParameters) {
  try {
    const agents = await runtime.agents;

    if (!agents[agentId]) {
      return new Response(
        JSON.stringify({
          error: "Agent not found",
          message: `Agent '${agentId}' does not exist`,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse client-declared resourceId from header
    const clientDeclared = CopilotRuntime["parseClientDeclaredResourceId"](request);

    // Resolve resource scope
    const scope = await runtime.resolveThreadsScope({ request, clientDeclared });

    // Guard against undefined scope (auth failure or missing return)
    if (scope === undefined) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized",
          message: "No resource scope provided",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Verify the thread belongs to this scope before stopping
    const runner = await runtime.runner;
    const metadata = await runner.getThreadMetadata(threadId, scope);

    if (!metadata) {
      // Return 404 (not 403) to prevent resource enumeration
      return new Response(
        JSON.stringify({
          error: "Thread not found",
          message: `Thread '${threadId}' does not exist or you don't have access`,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const stopped = await runner.stop({ threadId });

    if (!stopped) {
      return new Response(
        JSON.stringify({
          stopped: false,
          message: `No active run for thread '${threadId}'.`,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        stopped: true,
        interrupt: {
          type: EventType.RUN_ERROR,
          message: "Run stopped by user",
          code: "STOPPED",
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error stopping agent run:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to stop agent",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

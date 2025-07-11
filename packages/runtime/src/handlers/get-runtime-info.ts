import { CopilotKitRuntime } from "../runtime";
import { AgentDescription, RuntimeInfo } from "@copilotkit/shared";
import { VERSION } from "../runtime";

interface HandleGetRuntimeInfoParameters {
  runtime: CopilotKitRuntime;
  request: Request;
}

export async function handleGetRuntimeInfo({
  runtime,
}: HandleGetRuntimeInfoParameters) {
  try {
    const agents = await runtime.agents;

    const agentsDict = Object.entries(agents).reduce(
      (acc, [name, agent]) => {
        acc[name] = {
          name,
          description: agent.description,
          className: agent.constructor.name,
        };
        return acc;
      },
      {} as Record<string, AgentDescription>
    );

    const runtimeInfo: RuntimeInfo = {
      version: VERSION,
      agents: agentsDict,
      audioFileTranscriptionEnabled: !!runtime.transcriptionService,
    };

    return new Response(JSON.stringify(runtimeInfo), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to retrieve runtime information",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

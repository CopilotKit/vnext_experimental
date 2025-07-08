import { CopilotKitRuntime } from "../runtime";
import { AgentDescription } from "@copilotkit/shared";

interface HandleGetAgentsParameters {
  runtime: CopilotKitRuntime;
  request: Request;
}

export async function handleGetAgents({ runtime }: HandleGetAgentsParameters) {
  try {
    const agents = await runtime.agents;

    const agentsDict = Object.entries(agents).reduce(
      (acc, [name, agent]) => {
        acc[name] = {
          name,
          description: agent.description,
        };
        return acc;
      },
      {} as Record<string, AgentDescription>,
    );

    return new Response(
      JSON.stringify({
        agents: agentsDict,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to retrieve agents",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

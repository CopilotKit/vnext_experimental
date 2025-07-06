import CopilotKitRuntime from "./runtime";

interface AgentsParameters {
  runtime: CopilotKitRuntime;
  request: Request;
}

export async function handleGetAgents({ runtime, request }: AgentsParameters) {
  try {
    // Get agents from runtime (handle both sync and async cases)
    const agents = await runtime.getAgents();

    // Extract agent names and descriptions
    const agentList = Object.entries(agents).map(([name, agent]) => ({
      name,
      description: agent.description,
    }));

    return new Response(
      JSON.stringify({
        agents: agentList,
        count: agentList.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
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
      }
    );
  }
}

import {
  AbstractAgent,
  RunAgentInput,
  RunAgentInputSchema,
} from "@ag-ui/client";
import { EventEncoder } from "@ag-ui/encoder";
import { CopilotKitRuntime } from "../runtime";

interface RunAgentParameters {
  request: Request;
  runtime: CopilotKitRuntime;
  agentId: string;
}

export async function handleRunAgent({
  runtime,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request,
  agentId,
}: RunAgentParameters) {
  try {
    const agents = await runtime.agents;

    // Check if the requested agent exists
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

    const agent = agents[agentId].clone() as AbstractAgent;

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new EventEncoder();

    // Process the request in the background
    (async () => {
      let input: RunAgentInput;
      try {
        input = RunAgentInputSchema.parse(await request.json());
      } catch (error) {
        return new Response(
          JSON.stringify({
            error: "Invalid request body",
          }),
          { status: 400 }
        );
      }
      agent.setMessages(input.messages);
      agent.setState(input.state);
      agent.threadId = input.threadId;

      await agent.runAgent(
        {
          runId: input.runId,
          tools: input.tools,
          context: input.context,
          forwardedProps: input.forwardedProps,
        },
        {
          onEvent({ event }) {
            writer.write(encoder.encode(event));
          },
        }
      );
    })();

    // Return the SSE response
    return new Response(stream.readable, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to run agent",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

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
  console.log(`[handleRunAgent] Starting agent run for agentId: ${agentId}`);
  
  try {
    console.log('[handleRunAgent] Fetching agents from runtime');
    const agents = await runtime.agents;
    console.log(`[handleRunAgent] Available agents: ${Object.keys(agents).join(', ')}`);

    // Check if the requested agent exists
    if (!agents[agentId]) {
      console.log(`[handleRunAgent] Agent '${agentId}' not found in available agents`);
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

    console.log(`[handleRunAgent] Found agent '${agentId}', attempting to clone`);
    const agent = agents[agentId].clone() as AbstractAgent;
    console.log(`[handleRunAgent] Successfully cloned agent '${agentId}'`);

    console.log('[handleRunAgent] Setting up stream and encoder');
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new EventEncoder();

    // Process the request in the background
    (async () => {
      let input: RunAgentInput;
      try {
        console.log('[handleRunAgent] Parsing request body');
        const requestBody = await request.json();
        console.log('[handleRunAgent] Request body:', JSON.stringify(requestBody, null, 2));
        input = RunAgentInputSchema.parse(requestBody);
        console.log(`[handleRunAgent] Successfully parsed input for runId: ${input.runId}`);
      } catch (error) {
        console.error('[handleRunAgent] Failed to parse request body:', error);
        return new Response(
          JSON.stringify({
            error: "Invalid request body",
          }),
          { status: 400 }
        );
      }
      console.log('[handleRunAgent] Setting agent messages, state, and threadId');
      console.log(`[handleRunAgent] Messages count: ${input.messages.length}`);
      console.log(`[handleRunAgent] Tools count: ${input.tools.length}`);
      
      agent.setMessages(input.messages);
      agent.setState(input.state);
      agent.threadId = input.threadId;

      console.log('[handleRunAgent] Starting agent execution');
      await agent.runAgent(
        {
          runId: input.runId,
          tools: input.tools,
          context: input.context,
          forwardedProps: input.forwardedProps,
        },
        {
          onEvent({ event }) {
            console.log(`[handleRunAgent] Received event: ${event.type}`);
            writer.write(encoder.encode(event));
          },
        }
      );
      
      console.log('[handleRunAgent] Agent execution completed, closing writer');
      await writer.close();
    })().catch((error) => {
      console.error('[handleRunAgent] Error in background process:', error);
      console.error('[handleRunAgent] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      writer.close();
    });

    // Return the SSE response
    console.log('[handleRunAgent] Returning SSE response stream');
    return new Response(stream.readable, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error('[handleRunAgent] Caught error in main try block:', error);
    console.error('[handleRunAgent] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[handleRunAgent] Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      cause: error instanceof Error ? error.cause : undefined,
    });
    
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

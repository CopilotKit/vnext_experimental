// integrations/openai/src/index.ts
import {
  AbstractAgent,
  RunAgentInput,
  EventType,
  BaseEvent,
} from "@ag-ui/client";
import { Observable } from "rxjs";

import { OpenAI } from "openai";

export class OpenAIAgent extends AbstractAgent {
  private openai: OpenAI;

  constructor(openai?: OpenAI) {
    super();
    // Initialize OpenAI client - uses OPENAI_API_KEY from environment if not provided
    this.openai = openai ?? new OpenAI();
  }

  protected run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((observer) => {
      // Same as before - emit RUN_STARTED to begin
      observer.next({
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      } as any);

      // NEW: Instead of hardcoded response, call OpenAI's API
      this.openai.chat.completions
        .create({
          model: "gpt-4o",
          stream: true, // Enable streaming for real-time responses
          // Convert AG-UI tools format to OpenAI's expected format
          tools: input.tools.map((tool) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            },
          })),
          // Transform AG-UI messages to OpenAI's message format
          messages: input.messages.map((message) => ({
            role: message.role as any,
            content: message.content ?? "",
            // Include tool calls if this is an assistant message with tools
            ...(message.role === "assistant" && message.toolCalls
              ? {
                  tool_calls: message.toolCalls,
                }
              : {}),
            // Include tool call ID if this is a tool result message
            ...(message.role === "tool"
              ? { tool_call_id: message.toolCallId }
              : {}),
          })),
        })
        .then(async (response) => {
          const messageId = Date.now().toString();

          // NEW: Stream each chunk from OpenAI's response
          for await (const chunk of response) {
            // Handle text content chunks
            if (chunk.choices[0].delta.content) {
              observer.next({
                type: EventType.TEXT_MESSAGE_CHUNK, // Chunk events open and close messages automatically
                messageId,
                delta: chunk.choices[0].delta.content,
              } as any);
            }
            // Handle tool call chunks (when the model wants to use a function)
            else if (chunk.choices[0].delta.tool_calls) {
              let toolCall = chunk.choices[0].delta.tool_calls[0];

              observer.next({
                type: EventType.TOOL_CALL_CHUNK,
                toolCallId: toolCall.id,
                toolCallName: toolCall.function?.name,
                parentMessageId: messageId,
                delta: toolCall.function?.arguments,
              } as any);
            }
          }

          // Same as before - emit RUN_FINISHED when complete
          observer.next({
            type: EventType.RUN_FINISHED,
            threadId: input.threadId,
            runId: input.runId,
          } as any);

          observer.complete();
        })
        // NEW: Handle errors from the API
        .catch((error) => {
          observer.next({
            type: EventType.RUN_ERROR,
            message: error.message,
          } as any);

          observer.error(error);
        });
    });
  }
}

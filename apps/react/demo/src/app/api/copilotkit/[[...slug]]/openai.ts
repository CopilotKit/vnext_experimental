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

  clone(): OpenAIAgent {
    const cloned = Object.create(Object.getPrototypeOf(this));

    // Clone all properties except the ones that should be shared
    for (const key of Object.getOwnPropertyNames(this)) {
      const value = (this as Record<string, unknown>)[key];
      if (typeof value !== "function") {
        if (key === "openai") {
          // Share the same OpenAI instance instead of cloning
          cloned[key] = value;
        } else {
          // Use structuredClone for other properties
          cloned[key] = structuredClone(value);
        }
      }
    }

    return cloned;
  }

  protected run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((observer) => {
      // Same as before - emit RUN_STARTED to begin
      observer.next({
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      } as BaseEvent);

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
          messages: input.messages.map((message) => {
            if (message.role === "tool") {
              return {
                role: "tool" as const,
                content: message.content ?? "",
                tool_call_id: message.toolCallId ?? "",
              };
            } else if (message.role === "assistant" && message.toolCalls) {
              return {
                role: "assistant" as const,
                content: message.content ?? "",
                tool_calls: message.toolCalls,
              };
            } else {
              return {
                role: message.role as "system" | "user" | "assistant",
                content: message.content ?? "",
              };
            }
          }),
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
              } as BaseEvent);
            }
            // Handle tool call chunks (when the model wants to use a function)
            else if (chunk.choices[0].delta.tool_calls) {
              const toolCall = chunk.choices[0].delta.tool_calls[0];

              observer.next({
                type: EventType.TOOL_CALL_CHUNK,
                toolCallId: toolCall.id,
                toolCallName: toolCall.function?.name,
                parentMessageId: messageId,
                delta: toolCall.function?.arguments,
              } as BaseEvent);
            }
          }

          // Same as before - emit RUN_FINISHED when complete
          observer.next({
            type: EventType.RUN_FINISHED,
            threadId: input.threadId,
            runId: input.runId,
          } as BaseEvent);

          observer.complete();
        })
        // NEW: Handle errors from the API
        .catch((error) => {
          observer.next({
            type: EventType.RUN_ERROR,
            message: error.message,
          } as BaseEvent);

          observer.error(error);
        });
    });
  }
}

import {
  AbstractAgent,
  RunAgentInput,
  EventType,
  BaseEvent,
} from "@ag-ui/client";
import { Observable } from "rxjs";
import { OpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class OpenAIAgent extends AbstractAgent {
  private openai: OpenAI;

  constructor(openai?: OpenAI) {
    super();
    this.openai = openai ?? new OpenAI();
  }

  clone(): OpenAIAgent {
    return new OpenAIAgent(this.openai);
  }

  public run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((observer) => {
      observer.next({
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      } as BaseEvent);

      this.openai.chat.completions
        .create({
          model: "gpt-4o",
          stream: true,
          tools: input.tools.map((tool) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: tool.parameters,
            },
          })),
          messages: this.toChatCompletionMessages(input.messages),
        })
        .then(async (response) => {
          const messageId = Date.now().toString();
          for await (const chunk of response) {
            if (chunk.choices[0]?.delta?.content) {
              observer.next({
                type: EventType.TEXT_MESSAGE_CHUNK,
                messageId,
                delta: chunk.choices[0].delta.content,
              } as BaseEvent);
            } else if (chunk.choices[0]?.delta?.tool_calls?.[0]) {
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
          observer.next({
            type: EventType.RUN_FINISHED,
            threadId: input.threadId,
            runId: input.runId,
          } as BaseEvent);
          observer.complete();
        })
        .catch((error) => {
          observer.next({
            type: EventType.RUN_ERROR,
            message: error.message,
          } as BaseEvent);
          observer.error(error);
        });
    });
  }

  private toChatCompletionMessages(
    messages: RunAgentInput["messages"],
  ): ChatCompletionMessageParam[] {
    const normalizedMessages: ChatCompletionMessageParam[] = [];

    for (const message of messages) {
      const content = this.normalizeContent(
        "content" in message ? message.content : undefined,
      );

      switch (message.role) {
        case "tool":
          normalizedMessages.push({
            role: "tool",
            content,
            tool_call_id: message.toolCallId,
          });
          break;
        case "assistant":
          normalizedMessages.push({
            role: "assistant",
            content,
            name: message.name,
            tool_calls: message.toolCalls?.map((toolCall) => ({
              id: toolCall.id,
              type: toolCall.type,
              function: {
                name: toolCall.function.name,
                arguments: toolCall.function.arguments,
              },
            })),
          });
          break;
        case "system":
          normalizedMessages.push({
            role: "system",
            name: message.name,
            content,
          });
          break;
        case "user":
          normalizedMessages.push({
            role: "user",
            name: message.name,
            content,
          });
          break;
        case "developer":
          normalizedMessages.push({
            role: "developer",
            name: message.name,
            content,
          });
          break;
        default:
          break;
      }
    }

    return normalizedMessages;
  }

  private normalizeContent(content: unknown): string {
    if (typeof content === "string") {
      return content;
    }

    if (content === null || content === undefined) {
      return "";
    }

    if (Array.isArray(content)) {
      return JSON.stringify(content);
    }

    if (typeof content === "object") {
      return JSON.stringify(content);
    }

    return String(content);
  }
}

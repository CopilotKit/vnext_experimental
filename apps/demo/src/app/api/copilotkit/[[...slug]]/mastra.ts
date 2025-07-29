import type {
  AgentConfig,
  BaseEvent,
  RunAgentInput,
  RunFinishedEvent,
  RunStartedEvent,
  TextMessageChunkEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallResultEvent,
  ToolCallStartEvent,
  Message,
} from "@ag-ui/client";
import { AbstractAgent, EventType } from "@ag-ui/client";
import { processDataStream } from "@ai-sdk/ui-utils";
import { Agent } from "@mastra/core/agent";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { randomUUID } from "crypto";
import { Observable } from "rxjs";
import type { CoreMessage } from "@mastra/core";

export interface MastraAgentConfig extends AgentConfig {
  agent: Agent;
  resourceId?: string;
  runtimeContext?: RuntimeContext;
}

interface MastraAgentStreamOptions {
  onTextPart?: (text: string) => void;
  onFinishMessagePart?: () => void;
  onToolCallPart?: (streamPart: {
    toolCallId: string;
    toolName: string;
    args: unknown;
  }) => void;
  onToolResultPart?: (streamPart: { toolCallId: string; result: unknown }) => void;
  onError?: (error: Error) => void;
  onRunFinished?: () => Promise<void>;
}

export class MastraAgent extends AbstractAgent {
  agent: Agent;
  resourceId?: string;
  runtimeContext?: RuntimeContext;

  constructor({
    agent,
    resourceId,
    runtimeContext,
    ...rest
  }: MastraAgentConfig) {
    super(rest);
    this.agent = agent;
    this.resourceId = resourceId;
    this.runtimeContext = runtimeContext;
  }

  protected run(input: RunAgentInput): Observable<BaseEvent> {
    let messageId = randomUUID();

    return new Observable<BaseEvent>((subscriber) => {
      const run = async () => {
        const runStartedEvent: RunStartedEvent = {
          type: EventType.RUN_STARTED,
          threadId: input.threadId,
          runId: input.runId,
        };

        subscriber.next(runStartedEvent);

        try {
          await this.streamMastraAgent(input, {
            onTextPart: (text) => {
              const event: TextMessageChunkEvent = {
                type: EventType.TEXT_MESSAGE_CHUNK,
                role: "assistant",
                messageId,
                delta: text,
              };
              subscriber.next(event);
            },
            onToolCallPart: (streamPart) => {
              const startEvent: ToolCallStartEvent = {
                type: EventType.TOOL_CALL_START,
                parentMessageId: messageId,
                toolCallId: streamPart.toolCallId,
                toolCallName: streamPart.toolName,
              };
              subscriber.next(startEvent);

              const argsEvent: ToolCallArgsEvent = {
                type: EventType.TOOL_CALL_ARGS,
                toolCallId: streamPart.toolCallId,
                delta: JSON.stringify(streamPart.args),
              };
              subscriber.next(argsEvent);

              const endEvent: ToolCallEndEvent = {
                type: EventType.TOOL_CALL_END,
                toolCallId: streamPart.toolCallId,
              };
              subscriber.next(endEvent);
            },
            onToolResultPart(streamPart) {
              const toolCallResultEvent: ToolCallResultEvent = {
                type: EventType.TOOL_CALL_RESULT,
                toolCallId: streamPart.toolCallId,
                content: JSON.stringify(streamPart.result),
                messageId: randomUUID(),
                role: "tool",
              };

              subscriber.next(toolCallResultEvent);
            },
            onFinishMessagePart: async () => {
              messageId = randomUUID();
            },
            onError: (error) => {
              console.error("error", error);
              // Handle error
              subscriber.error(error);
            },
            onRunFinished: async () => {
              // Emit run finished event
              subscriber.next({
                type: EventType.RUN_FINISHED,
                threadId: input.threadId,
                runId: input.runId,
              } as RunFinishedEvent);

              // Complete the observable
              subscriber.complete();
            },
          });
        } catch (error) {
          console.error("Stream error:", error);
          subscriber.error(error);
        }
      };

      run();

      return () => {};
    });
  }

  /**
   * Streams in process or remote mastra agent.
   * @param input - The input for the mastra agent.
   * @param options - The options for the mastra agent.
   * @returns The stream of the mastra agent.
   */
  private async streamMastraAgent(
    { threadId, runId, messages, tools }: RunAgentInput,
    {
      onTextPart,
      onFinishMessagePart,
      onToolCallPart,
      onToolResultPart,
      onError,
      onRunFinished,
    }: MastraAgentStreamOptions
  ): Promise<void> {
    const clientTools = tools.reduce(
      (acc, tool) => {
        acc[tool.name as string] = {
          id: tool.name,
          description: tool.description,
          inputSchema: tool.parameters,
        };
        return acc;
      },
      {} as Record<string, { id: string; description: string; inputSchema: unknown }>
    );
    const resourceId = this.resourceId ?? threadId;
    const convertedMessages = convertAGUIMessagesToMastra(messages);
    const runtimeContext = this.runtimeContext;

    try {
      const response = await this.agent.stream(convertedMessages, {
        threadId,
        resourceId,
        runId,
        clientTools,
        runtimeContext,
      });

      // For local agents, the response should already be a stream
      // Process it using the agent's built-in streaming mechanism
      if (response && typeof response === "object") {
        // If the response has a toDataStreamResponse method, use it
        if (
          "toDataStreamResponse" in response &&
          typeof response.toDataStreamResponse === "function"
        ) {
          const dataStreamResponse = response.toDataStreamResponse();
          if (dataStreamResponse && dataStreamResponse.body) {
            await processDataStream({
              stream: dataStreamResponse.body,
              onTextPart,
              onToolCallPart,
              onToolResultPart,
              onFinishMessagePart,
            });
            await onRunFinished?.();
          } else {
            throw new Error("Invalid data stream response from local agent");
          }
        } else {
          // If it's already a readable stream, process it directly
          await processDataStream({
            stream: response as unknown as ReadableStream<Uint8Array>,
            onTextPart,
            onToolCallPart,
            onToolResultPart,
            onFinishMessagePart,
          });
          await onRunFinished?.();
        }
      } else {
        throw new Error("Invalid response from local agent");
      }
    } catch (error) {
      onError?.(error as Error);
    }
  }
}

export function convertAGUIMessagesToMastra(
  messages: Message[]
): CoreMessage[] {
  const result: CoreMessage[] = [];

  for (const message of messages) {
    if (message.role === "assistant") {
      const parts: Array<{ type: string; text?: string; toolCallId?: string; toolName?: string; args?: unknown }> = message.content
        ? [{ type: "text", text: message.content }]
        : [];
      for (const toolCall of message.toolCalls ?? []) {
        parts.push({
          type: "tool-call",
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          args: JSON.parse(toolCall.function.arguments),
        });
      }
      result.push({
        role: "assistant",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: parts as any,
      });
    } else if (message.role === "user") {
      result.push({
        role: "user",
        content: message.content || "",
      });
    } else if (message.role === "tool") {
      let toolName = "unknown";
      for (const msg of messages) {
        if (msg.role === "assistant") {
          for (const toolCall of msg.toolCalls ?? []) {
            if (toolCall.id === message.toolCallId) {
              toolName = toolCall.function.name;
              break;
            }
          }
        }
      }
      result.push({
        role: "tool",
        content: [
          {
            type: "tool-result",
            toolCallId: message.toolCallId,
            toolName: toolName,
            result: message.content,
          },
        ],
      });
    }
  }

  return result;
}

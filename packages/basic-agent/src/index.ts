import {
  AbstractAgent,
  BaseEvent,
  RunAgentInput,
  EventType,
  Message,
  RunFinishedEvent,
  RunStartedEvent,
  TextMessageChunkEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallStartEvent,
  ToolCallResultEvent,
  RunErrorEvent,
  StateSnapshotEvent,
  StateDeltaEvent,
} from "@ag-ui/client";
import {
  streamText,
  LanguageModel,
  ModelMessage,
  AssistantModelMessage,
  UserModelMessage,
  ToolModelMessage,
  ToolCallPart,
  ToolResultPart,
  TextPart,
  tool as createVercelAISDKTool,
  ToolChoice,
  ToolSet,
  experimental_createMCPClient as createMCPClient,
} from "ai";
import { Observable } from "rxjs";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { randomUUID } from "crypto";
import { z } from "zod";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPClientTransportOptions,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { u } from "vitest/dist/chunks/reporters.d.BFLkQcL6.js";

/**
 * Properties that can be overridden by forwardedProps
 * These match the exact parameter names in streamText
 */
export type OverridableProperty =
  | "model"
  | "toolChoice"
  | "maxOutputTokens"
  | "temperature"
  | "topP"
  | "topK"
  | "presencePenalty"
  | "frequencyPenalty"
  | "stopSequences"
  | "seed"
  | "maxRetries"
  | "prompt";

/**
 * Supported model identifiers for BasicAgent
 */
export type BasicAgentModel =
  // OpenAI models
  | "openai/gpt-5"
  | "openai/gpt-5-mini"
  | "openai/gpt-4.1"
  | "openai/gpt-4.1-mini"
  | "openai/gpt-4.1-nano"
  | "openai/gpt-4o"
  | "openai/gpt-4o-mini"
  // OpenAI reasoning series
  | "openai/o3"
  | "openai/o3-mini"
  | "openai/o4-mini"
  // Anthropic (Claude) models
  | "anthropic/claude-sonnet-4.5"
  | "anthropic/claude-sonnet-4"
  | "anthropic/claude-3.7-sonnet"
  | "anthropic/claude-opus-4.1"
  | "anthropic/claude-opus-4"
  | "anthropic/claude-3.5-haiku"
  // Google (Gemini) models
  | "google/gemini-2.5-pro"
  | "google/gemini-2.5-flash"
  | "google/gemini-2.5-flash-lite"
  // Allow any LanguageModel instance
  | (string & {});

/**
 * Model specifier - can be a string like "openai/gpt-4o" or a LanguageModel instance
 */
export type ModelSpecifier = string | LanguageModel;

/**
 * MCP Client configuration for HTTP transport
 */
export interface MCPClientConfigHTTP {
  /**
   * Type of MCP client
   */
  type: "http";
  /**
   * URL of the MCP server
   */
  url: string;
  /**
   * Optional transport options for HTTP client
   */
  options?: StreamableHTTPClientTransportOptions;
}

/**
 * MCP Client configuration for SSE transport
 */
export interface MCPClientConfigSSE {
  /**
   * Type of MCP client
   */
  type: "sse";
  /**
   * URL of the MCP server
   */
  url: string;
  /**
   * Optional HTTP headers (e.g., for authentication)
   */
  headers?: Record<string, string>;
}

/**
 * MCP Client configuration
 */
export type MCPClientConfig = MCPClientConfigHTTP | MCPClientConfigSSE;

/**
 * Resolves a model specifier to a LanguageModel instance
 * @param spec - Model string (e.g., "openai/gpt-4o") or LanguageModel instance
 * @returns LanguageModel instance
 */
export function resolveModel(spec: ModelSpecifier): LanguageModel {
  // If already a LanguageModel instance, pass through
  if (typeof spec !== "string") {
    return spec;
  }

  // Normalize "provider/model" or "provider:model" format
  const normalized = spec.replace("/", ":").trim();
  const parts = normalized.split(":");
  const rawProvider = parts[0];
  const rest = parts.slice(1);

  if (!rawProvider) {
    throw new Error(
      `Invalid model string "${spec}". Use "openai/gpt-5", "anthropic/claude-sonnet-4.5", or "google/gemini-2.5-pro".`,
    );
  }

  const provider = rawProvider.toLowerCase();
  const model = rest.join(":").trim();

  if (!model) {
    throw new Error(
      `Invalid model string "${spec}". Use "openai/gpt-5", "anthropic/claude-sonnet-4.5", or "google/gemini-2.5-pro".`,
    );
  }

  switch (provider) {
    case "openai": {
      // Lazily create OpenAI provider
      const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });
      // Accepts any OpenAI model id, e.g. "gpt-4o", "gpt-4.1-mini", "o3-mini"
      return openai(model);
    }

    case "anthropic": {
      // Lazily create Anthropic provider
      const anthropic = createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY!,
      });
      // Accepts any Claude id, e.g. "claude-3.7-sonnet", "claude-3.5-haiku"
      return anthropic(model);
    }

    case "google":
    case "gemini":
    case "google-gemini": {
      // Lazily create Google provider
      const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_API_KEY!,
      });
      // Accepts any Gemini id, e.g. "gemini-2.5-pro", "gemini-2.5-flash"
      return google(model);
    }

    default:
      throw new Error(`Unknown provider "${provider}" in "${spec}". Supported: openai, anthropic, google (gemini).`);
  }
}

/**
 * Tool definition for BasicAgent
 */
export interface ToolDefinition<TParameters extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  parameters: TParameters;
}

/**
 * Define a tool for use with BasicAgent
 * @param name - The name of the tool
 * @param description - Description of what the tool does
 * @param parameters - Zod schema for the tool's input parameters
 * @returns Tool definition
 */
export function defineTool<TParameters extends z.ZodTypeAny>(config: {
  name: string;
  description: string;
  parameters: TParameters;
}): ToolDefinition<TParameters> {
  return {
    name: config.name,
    description: config.description,
    parameters: config.parameters,
  };
}

/**
 * Converts AG-UI messages to Vercel AI SDK ModelMessage format
 */
export function convertMessagesToVercelAISDKMessages(messages: Message[]): ModelMessage[] {
  const result: ModelMessage[] = [];

  for (const message of messages) {
    if (message.role === "assistant") {
      const parts: Array<TextPart | ToolCallPart> = message.content ? [{ type: "text", text: message.content }] : [];

      for (const toolCall of message.toolCalls ?? []) {
        const toolCallPart: ToolCallPart = {
          type: "tool-call",
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments),
        };
        parts.push(toolCallPart);
      }

      const assistantMsg: AssistantModelMessage = {
        role: "assistant",
        content: parts,
      };
      result.push(assistantMsg);
    } else if (message.role === "user") {
      const userMsg: UserModelMessage = {
        role: "user",
        content: message.content || "",
      };
      result.push(userMsg);
    } else if (message.role === "tool") {
      let toolName = "unknown";
      // Find the tool name from the corresponding tool call
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

      const toolResultPart: ToolResultPart = {
        type: "tool-result",
        toolCallId: message.toolCallId,
        toolName: toolName,
        output: {
          type: "text",
          value: message.content,
        },
      };

      const toolMsg: ToolModelMessage = {
        role: "tool",
        content: [toolResultPart],
      };
      result.push(toolMsg);
    }
  }

  return result;
}

/**
 * JSON Schema type definition
 */
interface JsonSchema {
  type: "object" | "string" | "number" | "boolean" | "array";
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
}

/**
 * Converts JSON Schema to Zod schema
 */
export function convertJsonSchemaToZodSchema(jsonSchema: JsonSchema, required: boolean): z.ZodSchema {
  if (jsonSchema.type === "object") {
    const spec: { [key: string]: z.ZodSchema } = {};

    if (!jsonSchema.properties || !Object.keys(jsonSchema.properties).length) {
      return !required ? z.object(spec).optional() : z.object(spec);
    }

    for (const [key, value] of Object.entries(jsonSchema.properties)) {
      spec[key] = convertJsonSchemaToZodSchema(value, jsonSchema.required ? jsonSchema.required.includes(key) : false);
    }
    let schema = z.object(spec).describe(jsonSchema.description ?? "");
    return required ? schema : schema.optional();
  } else if (jsonSchema.type === "string") {
    let schema = z.string().describe(jsonSchema.description ?? "");
    return required ? schema : schema.optional();
  } else if (jsonSchema.type === "number") {
    let schema = z.number().describe(jsonSchema.description ?? "");
    return required ? schema : schema.optional();
  } else if (jsonSchema.type === "boolean") {
    let schema = z.boolean().describe(jsonSchema.description ?? "");
    return required ? schema : schema.optional();
  } else if (jsonSchema.type === "array") {
    if (!jsonSchema.items) {
      throw new Error("Array type must have items property");
    }
    let itemSchema = convertJsonSchemaToZodSchema(jsonSchema.items, true);
    let schema = z.array(itemSchema).describe(jsonSchema.description ?? "");
    return required ? schema : schema.optional();
  }
  throw new Error("Invalid JSON schema");
}

/**
 * Converts AG-UI tools to Vercel AI SDK ToolSet
 */
function isJsonSchema(obj: unknown): obj is JsonSchema {
  if (typeof obj !== "object" || obj === null) return false;
  const schema = obj as Record<string, unknown>;
  return typeof schema.type === "string" && ["object", "string", "number", "boolean", "array"].includes(schema.type);
}

export function convertToolsToVercelAITools(tools: RunAgentInput["tools"]): ToolSet {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};

  for (const tool of tools) {
    if (!isJsonSchema(tool.parameters)) {
      throw new Error(`Invalid JSON schema for tool ${tool.name}`);
    }
    const zodSchema = convertJsonSchemaToZodSchema(tool.parameters, true);
    result[tool.name] = createVercelAISDKTool({
      description: tool.description,
      inputSchema: zodSchema,
    });
  }

  return result;
}

/**
 * Converts ToolDefinition array to Vercel AI SDK ToolSet
 */
export function convertToolDefinitionsToVercelAITools(tools: ToolDefinition[]): ToolSet {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};

  for (const tool of tools) {
    result[tool.name] = createVercelAISDKTool({
      description: tool.description,
      inputSchema: tool.parameters,
    });
  }

  return result;
}

/**
 * Configuration for BasicAgent
 */
export interface BasicAgentConfiguration {
  /**
   * The model to use
   */
  model: BasicAgentModel | LanguageModel;
  /**
   * Maximum number of steps/iterations for tool calling (default: 1)
   */
  maxSteps?: number;
  /**
   * Tool choice setting - how tools are selected for execution (default: "auto")
   */
  toolChoice?: ToolChoice<Record<string, unknown>>;
  /**
   * Maximum number of tokens to generate
   */
  maxOutputTokens?: number;
  /**
   * Temperature setting (range depends on provider)
   */
  temperature?: number;
  /**
   * Nucleus sampling (topP)
   */
  topP?: number;
  /**
   * Top K sampling
   */
  topK?: number;
  /**
   * Presence penalty
   */
  presencePenalty?: number;
  /**
   * Frequency penalty
   */
  frequencyPenalty?: number;
  /**
   * Sequences that will stop the generation
   */
  stopSequences?: string[];
  /**
   * Seed for deterministic results
   */
  seed?: number;
  /**
   * Maximum number of retries
   */
  maxRetries?: number;
  /**
   * Prompt for the agent
   */
  prompt?: string;
  /**
   * List of properties that can be overridden by forwardedProps.
   */
  overridableProperties?: OverridableProperty[];
  /**
   * Optional list of MCP server configurations
   */
  mcpServers?: MCPClientConfig[];
  /**
   * Optional tools available to the agent
   */
  tools?: ToolDefinition[];
}

export class BasicAgent extends AbstractAgent {
  constructor(private config: BasicAgentConfiguration) {
    super();
  }

  /**
   * Check if a property can be overridden by forwardedProps
   */
  canOverride(property: OverridableProperty): boolean {
    return this.config?.overridableProperties?.includes(property) ?? false;
  }

  protected run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((subscriber) => {
      // Emit RUN_STARTED event
      const startEvent: RunStartedEvent = {
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      };
      subscriber.next(startEvent);

      // Resolve the model
      const model = resolveModel(this.config.model);

      // Build prompt based on conditions
      let systemPrompt: string | undefined = undefined;

      // Check if we should build a prompt:
      // - config.prompt is set, OR
      // - input.context is non-empty, OR
      // - input.state is non-empty and not an empty object
      const hasPrompt = !!this.config.prompt;
      const hasContext = input.context && input.context.length > 0;
      const hasState =
        input.state !== undefined &&
        input.state !== null &&
        !(typeof input.state === "object" && Object.keys(input.state).length === 0);

      if (hasPrompt || hasContext || hasState) {
        const parts: string[] = [];

        // First: the prompt if any
        if (hasPrompt) {
          parts.push(this.config.prompt!);
        }

        // Second: context from the application
        if (hasContext) {
          parts.push("\n## Context from the application\n");
          for (const ctx of input.context) {
            parts.push(`${ctx.description}:\n${ctx.value}\n`);
          }
        }

        // Third: state from the application that can be edited
        if (hasState) {
          parts.push(
            "\n## Application State\n" +
              "This is state from the application that you can edit by calling AGUISendStateSnapshot or AGUISendStateDelta.\n" +
              `\`\`\`json\n${JSON.stringify(input.state, null, 2)}\n\`\`\`\n`,
          );
        }

        systemPrompt = parts.join("");
      }

      // Convert messages and prepend system message if we have a prompt
      const messages = convertMessagesToVercelAISDKMessages(input.messages);
      if (systemPrompt) {
        messages.unshift({
          role: "system",
          content: systemPrompt,
        });
      }

      // Merge tools from input and config
      let allTools: ToolSet = convertToolsToVercelAITools(input.tools);
      if (this.config.tools && this.config.tools.length > 0) {
        const configTools = convertToolDefinitionsToVercelAITools(this.config.tools);
        allTools = { ...allTools, ...configTools };
      }

      const streamTextParams: Parameters<typeof streamText>[0] = {
        model,
        messages,
        tools: allTools,
        toolChoice: this.config.toolChoice,
        maxOutputTokens: this.config.maxOutputTokens,
        temperature: this.config.temperature,
        topP: this.config.topP,
        topK: this.config.topK,
        presencePenalty: this.config.presencePenalty,
        frequencyPenalty: this.config.frequencyPenalty,
        stopSequences: this.config.stopSequences,
        seed: this.config.seed,
        maxRetries: this.config.maxRetries,
      };

      // Apply forwardedProps overrides (if allowed)
      if (input.forwardedProps && typeof input.forwardedProps === "object") {
        const props = input.forwardedProps as Record<string, unknown>;

        // Check and apply each overridable property
        if (props.model !== undefined && this.canOverride("model")) {
          if (typeof props.model === "string" || typeof props.model === "object") {
            // Accept any string or LanguageModel instance for model override
            streamTextParams.model = resolveModel(props.model as string | LanguageModel);
          }
        }
        if (props.toolChoice !== undefined && this.canOverride("toolChoice")) {
          // ToolChoice can be 'auto', 'required', 'none', or { type: 'tool', toolName: string }
          const toolChoice = props.toolChoice;
          if (
            toolChoice === "auto" ||
            toolChoice === "required" ||
            toolChoice === "none" ||
            (typeof toolChoice === "object" &&
              toolChoice !== null &&
              "type" in toolChoice &&
              toolChoice.type === "tool")
          ) {
            streamTextParams.toolChoice = toolChoice as ToolChoice<Record<string, unknown>>;
          }
        }
        if (typeof props.maxOutputTokens === "number" && this.canOverride("maxOutputTokens")) {
          streamTextParams.maxOutputTokens = props.maxOutputTokens;
        }
        if (typeof props.temperature === "number" && this.canOverride("temperature")) {
          streamTextParams.temperature = props.temperature;
        }
        if (typeof props.topP === "number" && this.canOverride("topP")) {
          streamTextParams.topP = props.topP;
        }
        if (typeof props.topK === "number" && this.canOverride("topK")) {
          streamTextParams.topK = props.topK;
        }
        if (typeof props.presencePenalty === "number" && this.canOverride("presencePenalty")) {
          streamTextParams.presencePenalty = props.presencePenalty;
        }
        if (typeof props.frequencyPenalty === "number" && this.canOverride("frequencyPenalty")) {
          streamTextParams.frequencyPenalty = props.frequencyPenalty;
        }
        if (Array.isArray(props.stopSequences) && this.canOverride("stopSequences")) {
          // Validate all elements are strings
          if (props.stopSequences.every((item): item is string => typeof item === "string")) {
            streamTextParams.stopSequences = props.stopSequences;
          }
        }
        if (typeof props.seed === "number" && this.canOverride("seed")) {
          streamTextParams.seed = props.seed;
        }
        if (typeof props.maxRetries === "number" && this.canOverride("maxRetries")) {
          streamTextParams.maxRetries = props.maxRetries;
        }
      }

      // Set up MCP clients if configured and process the stream
      const mcpClients: Array<{ close: () => Promise<void> }> = [];

      (async () => {
        try {
          // Add AG-UI state update tools
          streamTextParams.tools = {
            ...streamTextParams.tools,
            AGUISendStateSnapshot: createVercelAISDKTool({
              description: "Replace the entire application state with a new snapshot",
              inputSchema: z.object({
                snapshot: z.any().describe("The complete new state object"),
              }),
              execute: async ({ snapshot }) => {
                return { success: true, snapshot };
              },
            }),
            AGUISendStateDelta: createVercelAISDKTool({
              description: "Apply incremental updates to application state using JSON Patch operations",
              inputSchema: z.object({
                delta: z
                  .array(
                    z.object({
                      op: z.enum(["add", "replace", "remove"]).describe("The operation to perform"),
                      path: z.string().describe("JSON Pointer path (e.g., '/foo/bar')"),
                      value: z
                        .any()
                        .optional()
                        .describe(
                          "The value to set. Required for 'add' and 'replace' operations, ignored for 'remove'.",
                        ),
                    }),
                  )
                  .describe("Array of JSON Patch operations"),
              }),
              execute: async ({ delta }) => {
                return { success: true, delta };
              },
            }),
          };

          // Initialize MCP clients and get their tools
          if (this.config.mcpServers && this.config.mcpServers.length > 0) {
            for (const serverConfig of this.config.mcpServers) {
              let transport;

              if (serverConfig.type === "http") {
                const url = new URL(serverConfig.url);
                transport = new StreamableHTTPClientTransport(url, serverConfig.options);
              } else if (serverConfig.type === "sse") {
                transport = new SSEClientTransport(new URL(serverConfig.url), serverConfig.headers);
              }

              if (transport) {
                const mcpClient = await createMCPClient({ transport });
                mcpClients.push(mcpClient);

                // Get tools from this MCP server and merge with existing tools
                const mcpTools = await mcpClient.tools();
                streamTextParams.tools = { ...streamTextParams.tools, ...mcpTools };
              }
            }
          }

          // Call streamText and process the stream
          const response = streamText(streamTextParams);

          let messageId = randomUUID();

          // Process fullStream events
          for await (const part of response.fullStream) {
            // Handle tool call streaming events (may not be in official types yet)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const partType = (part as any).type;

            if (partType === "tool-call-streaming-start") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const toolCallPart = part as any;
              const startEvent: ToolCallStartEvent = {
                type: EventType.TOOL_CALL_START,
                parentMessageId: messageId,
                toolCallId: toolCallPart.toolCallId,
                toolCallName: toolCallPart.toolName,
              };
              subscriber.next(startEvent);
              continue;
            }

            if (partType === "tool-call-delta") {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const toolCallDelta = part as any;
              const argsEvent: ToolCallArgsEvent = {
                type: EventType.TOOL_CALL_ARGS,
                toolCallId: toolCallDelta.toolCallId,
                delta: toolCallDelta.argsTextDelta,
              };
              subscriber.next(argsEvent);
              continue;
            }

            switch (part.type) {
              case "text-delta": {
                // Accumulate text content - in AI SDK 5.0, the property is 'text'
                const textDelta = "text" in part ? part.text : "";
                // Emit text chunk event
                const textEvent: TextMessageChunkEvent = {
                  type: EventType.TEXT_MESSAGE_CHUNK,
                  role: "assistant",
                  messageId,
                  delta: textDelta,
                };
                subscriber.next(textEvent);
                break;
              }

              case "tool-call": {
                // Tool call completed
                const endEvent: ToolCallEndEvent = {
                  type: EventType.TOOL_CALL_END,
                  toolCallId: part.toolCallId,
                };
                subscriber.next(endEvent);
                break;
              }

              case "tool-result": {
                const toolResult = "output" in part ? part.output : null;
                const toolName = "toolName" in part ? part.toolName : "";

                // Check if this is a state update tool
                if (toolName === "AGUISendStateSnapshot" && toolResult && typeof toolResult === "object") {
                  // Emit StateSnapshotEvent
                  const stateSnapshotEvent: StateSnapshotEvent = {
                    type: EventType.STATE_SNAPSHOT,
                    snapshot: toolResult.snapshot,
                  };
                  subscriber.next(stateSnapshotEvent);
                } else if (toolName === "AGUISendStateDelta" && toolResult && typeof toolResult === "object") {
                  // Emit StateDeltaEvent
                  const stateDeltaEvent: StateDeltaEvent = {
                    type: EventType.STATE_DELTA,
                    delta: toolResult.delta,
                  };
                  subscriber.next(stateDeltaEvent);
                }

                // Always emit the tool result event for the LLM
                const resultEvent: ToolCallResultEvent = {
                  type: EventType.TOOL_CALL_RESULT,
                  role: "tool",
                  messageId: randomUUID(),
                  toolCallId: part.toolCallId,
                  content: JSON.stringify(toolResult),
                };
                subscriber.next(resultEvent);
                break;
              }

              case "finish":
                // Emit run finished event
                const finishedEvent: RunFinishedEvent = {
                  type: EventType.RUN_FINISHED,
                  threadId: input.threadId,
                  runId: input.runId,
                };
                subscriber.next(finishedEvent);

                // Complete the observable
                subscriber.complete();
                break;

              case "error":
                const runErrorEvent: RunErrorEvent = {
                  type: EventType.RUN_ERROR,
                  message: part.error + "",
                };
                subscriber.next(runErrorEvent);

                // Handle error
                subscriber.error(part.error);
                break;
            }
          }
        } catch (error) {
          const runErrorEvent: RunErrorEvent = {
            type: EventType.RUN_ERROR,
            message: error + "",
          };
          subscriber.next(runErrorEvent);

          subscriber.error(error);
        } finally {
          await Promise.all(mcpClients.map((client) => client.close()));
        }
      })();

      // Cleanup function
      return () => {
        // Cleanup MCP clients if stream is unsubscribed
        Promise.all(mcpClients.map((client) => client.close())).catch(() => {
          // Ignore cleanup errors
        });
      };
    });
  }

  clone() {
    return new BasicAgent(this.config);
  }
}

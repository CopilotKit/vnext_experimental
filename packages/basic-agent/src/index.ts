import {
  AbstractAgent,
  AgentSubscriber,
  BaseEvent,
  RunAgentInput,
  RunAgentParameters,
  RunAgentResult,
  EventType,
  Message,
  AssistantMessage,
  ToolMessage,
  ToolCall,
  MessagesSnapshotEvent,
  RunFinishedEvent,
  RunStartedEvent,
  TextMessageChunkEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallStartEvent,
} from "@ag-ui/client";
import {
  streamText,
  LanguageModel,
  ModelMessage,
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

/**
 * Properties that can be overridden by forwardedProps
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
  | "maxRetries";

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
  // Allow any string for flexibility
  | (LanguageModel & {});

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
 * Converts AG-UI messages to Vercel AI SDK ModelMessage format
 */
export function convertMessagesToVercelAISDKMessages(messages: Message[]): ModelMessage[] {
  const result: ModelMessage[] = [];

  for (const message of messages) {
    if (message.role === "assistant") {
      type AssistantContentPart =
        | { type: "text"; text: string }
        | { type: "tool-call"; toolCallId: string; toolName: string; args: unknown };

      const parts: AssistantContentPart[] = message.content ? [{ type: "text" as const, text: message.content }] : [];

      for (const toolCall of message.toolCalls ?? []) {
        parts.push({
          type: "tool-call" as const,
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          args: JSON.parse(toolCall.function.arguments),
        });
      }
      result.push({
        role: "assistant",
        content: parts,
      } as ModelMessage);
    } else if (message.role === "user") {
      result.push({
        role: "user",
        content: message.content || "",
      });
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
      result.push({
        role: "tool",
        content: [
          {
            type: "tool-result" as const,
            toolCallId: message.toolCallId,
            toolName: toolName,
            result: message.content,
          } as unknown,
        ] as unknown,
      } as ModelMessage);
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
export function convertToolsToVercelAITools(tools: RunAgentInput["tools"]): ToolSet {
  const result: Record<string, unknown> = {};

  for (const tool of tools) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    result[tool.name] = createVercelAISDKTool({
      description: tool.description,
      // AI SDK 5.0 renamed 'parameters' to 'inputSchema'
      inputSchema: convertJsonSchemaToZodSchema(tool.parameters as JsonSchema, true),
    } as { description: string; inputSchema: z.ZodSchema });
  }

  return result as ToolSet;
}

/**
 * Configuration for BasicAgent
 */
export interface BasicAgentConfiguration {
  /**
   * The model to use
   */
  model: BasicAgentModel;
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
   * List of properties that can be overridden by forwardedProps.
   */
  overridableProperties?: OverridableProperty[];
  /**
   * Optional list of MCP server configurations
   */
  mcpServers?: MCPClientConfig[];
}

export class BasicAgent extends AbstractAgent {
  private readonly allowedOverrides: Set<OverridableProperty>;
  private readonly maxSteps: number;
  private readonly toolChoice: ToolChoice<Record<string, unknown>>;
  private readonly maxOutputTokens?: number;
  private readonly temperature?: number;
  private readonly topP?: number;
  private readonly topK?: number;
  private readonly presencePenalty?: number;
  private readonly frequencyPenalty?: number;
  private readonly stopSequences?: string[];
  private readonly seed?: number;
  private readonly maxRetries?: number;

  constructor(private config: BasicAgentConfiguration) {
    super();

    // Initialize allowed overrides with defaults
    const defaultOverrides: OverridableProperty[] = ["toolChoice"];
    this.allowedOverrides = new Set(config.overridableProperties ?? defaultOverrides);

    // Initialize properties with defaults or config values
    this.maxSteps = config.maxSteps ?? 1;
    this.toolChoice = config.toolChoice ?? "auto";
    this.maxOutputTokens = config.maxOutputTokens;
    this.temperature = config.temperature;
    this.topP = config.topP;
    this.topK = config.topK;
    this.presencePenalty = config.presencePenalty;
    this.frequencyPenalty = config.frequencyPenalty;
    this.stopSequences = config.stopSequences;
    this.seed = config.seed;
    this.maxRetries = config.maxRetries;
  }

  /**
   * Check if a property can be overridden by forwardedProps
   */
  canOverride(property: OverridableProperty): boolean {
    return this.allowedOverrides.has(property);
  }

  protected run(input: RunAgentInput): Observable<BaseEvent> {
    const finalMessages: Message[] = [...input.messages];

    return new Observable<BaseEvent>((subscriber) => {
      // Emit RUN_STARTED event
      subscriber.next({
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      } as RunStartedEvent);

      // Resolve the model
      const model = resolveModel(this.config.model);

      // Prepare streamText parameters with overrides from forwardedProps
      interface StreamTextParams {
        model: LanguageModel;
        messages: ModelMessage[];
        tools: ToolSet;
        maxSteps: number;
        toolChoice: ToolChoice<Record<string, unknown>>;
        maxTokens?: number;
        temperature?: number;
        topP?: number;
        topK?: number;
        presencePenalty?: number;
        frequencyPenalty?: number;
        stopSequences?: string[];
        seed?: number;
        maxRetries?: number;
        experimental_toolCallStreaming?: boolean;
      }

      const streamTextParams: StreamTextParams = {
        model,
        messages: convertMessagesToVercelAISDKMessages(input.messages),
        tools: convertToolsToVercelAITools(input.tools),
        maxSteps: this.maxSteps,
        toolChoice: this.toolChoice,
      };

      // Set default values from config
      if (this.maxOutputTokens !== undefined) {
        streamTextParams.maxTokens = this.maxOutputTokens;
      }
      if (this.temperature !== undefined) {
        streamTextParams.temperature = this.temperature;
      }
      if (this.topP !== undefined) {
        streamTextParams.topP = this.topP;
      }
      if (this.topK !== undefined) {
        streamTextParams.topK = this.topK;
      }
      if (this.presencePenalty !== undefined) {
        streamTextParams.presencePenalty = this.presencePenalty;
      }
      if (this.frequencyPenalty !== undefined) {
        streamTextParams.frequencyPenalty = this.frequencyPenalty;
      }
      if (this.stopSequences !== undefined) {
        streamTextParams.stopSequences = this.stopSequences;
      }
      if (this.seed !== undefined) {
        streamTextParams.seed = this.seed;
      }
      if (this.maxRetries !== undefined) {
        streamTextParams.maxRetries = this.maxRetries;
      }

      // Apply forwardedProps overrides (if allowed)
      if (input.forwardedProps) {
        const props = input.forwardedProps as Record<string, unknown>;

        // Check and apply each overridable property
        if (props.model !== undefined && this.canOverride("model")) {
          streamTextParams.model = resolveModel(props.model as string | LanguageModel);
        }
        if (props.toolChoice !== undefined && this.canOverride("toolChoice")) {
          streamTextParams.toolChoice = props.toolChoice as ToolChoice<Record<string, unknown>>;
        }
        if (props.maxOutputTokens !== undefined && this.canOverride("maxOutputTokens")) {
          streamTextParams.maxTokens = props.maxOutputTokens as number;
        }
        if (props.temperature !== undefined && this.canOverride("temperature")) {
          streamTextParams.temperature = props.temperature as number;
        }
        if (props.topP !== undefined && this.canOverride("topP")) {
          streamTextParams.topP = props.topP as number;
        }
        if (props.topK !== undefined && this.canOverride("topK")) {
          streamTextParams.topK = props.topK as number;
        }
        if (props.presencePenalty !== undefined && this.canOverride("presencePenalty")) {
          streamTextParams.presencePenalty = props.presencePenalty as number;
        }
        if (props.frequencyPenalty !== undefined && this.canOverride("frequencyPenalty")) {
          streamTextParams.frequencyPenalty = props.frequencyPenalty as number;
        }
        if (props.stopSequences !== undefined && this.canOverride("stopSequences")) {
          streamTextParams.stopSequences = props.stopSequences as string[];
        }
        if (props.seed !== undefined && this.canOverride("seed")) {
          streamTextParams.seed = props.seed as number;
        }
        if (props.maxRetries !== undefined && this.canOverride("maxRetries")) {
          streamTextParams.maxRetries = props.maxRetries as number;
        }
      }

      // Set up MCP clients if configured and process the stream
      const mcpClients: Array<{ close: () => Promise<void> }> = [];

      (async () => {
        try {
          // Initialize MCP clients and get their tools
          if (this.config.mcpServers && this.config.mcpServers.length > 0) {
            for (const serverConfig of this.config.mcpServers) {
              let transport;

              if (serverConfig.type === "http") {
                const url = new URL(serverConfig.url);
                transport = new StreamableHTTPClientTransport(
                  url,
                  serverConfig.options
                );
              } else if (serverConfig.type === "sse") {
                transport = new SSEClientTransport(
                  new URL(serverConfig.url),
                  serverConfig.headers
                );
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
          let assistantMessage: AssistantMessage = {
            id: messageId,
            role: "assistant",
            content: "",
            toolCalls: [],
          };
          finalMessages.push(assistantMessage);

          // Process fullStream events
          for await (const part of response.fullStream) {
            switch (part.type) {
              case "text-delta": {
                // Accumulate text content - in AI SDK 5.0, the property is 'text'
                const textDelta = "text" in part ? part.text : "";
                assistantMessage.content += textDelta;
                // Emit text chunk event
                subscriber.next({
                  type: EventType.TEXT_MESSAGE_CHUNK,
                  role: "assistant",
                  messageId,
                  delta: textDelta,
                } as TextMessageChunkEvent);
                break;
              }

              case "tool-call": {
                // Create tool call object - in AI SDK 5.0, the property is 'input'
                const toolArgs = "input" in part ? part.input : {};
                const toolCall: ToolCall = {
                  id: part.toolCallId,
                  type: "function",
                  function: {
                    name: part.toolName,
                    arguments: JSON.stringify(toolArgs),
                  },
                };
                assistantMessage.toolCalls!.push(toolCall);

                // Emit tool call events
                subscriber.next({
                  type: EventType.TOOL_CALL_START,
                  parentMessageId: messageId,
                  toolCallId: part.toolCallId,
                  toolCallName: part.toolName,
                } as ToolCallStartEvent);

                subscriber.next({
                  type: EventType.TOOL_CALL_ARGS,
                  toolCallId: part.toolCallId,
                  delta: JSON.stringify(toolArgs),
                } as ToolCallArgsEvent);

                subscriber.next({
                  type: EventType.TOOL_CALL_END,
                  toolCallId: part.toolCallId,
                } as ToolCallEndEvent);
                break;
              }

              case "tool-result": {
                // Add tool result message - in AI SDK 5.0, the property is 'output'
                const toolResult = "output" in part ? part.output : null;
                const toolMessage: ToolMessage = {
                  role: "tool",
                  id: randomUUID(),
                  toolCallId: part.toolCallId,
                  content: JSON.stringify(toolResult),
                };
                finalMessages.push(toolMessage);
                break;
              }

              case "finish":
                // Close all MCP clients
                await Promise.all(mcpClients.map(client => client.close()));

                // Emit messages snapshot
                subscriber.next({
                  type: EventType.MESSAGES_SNAPSHOT,
                  messages: finalMessages,
                } as MessagesSnapshotEvent);

                // Emit run finished event
                subscriber.next({
                  type: EventType.RUN_FINISHED,
                  threadId: input.threadId,
                  runId: input.runId,
                } as RunFinishedEvent);

                // Complete the observable
                subscriber.complete();
                break;

              case "error":
                // Close all MCP clients on error
                await Promise.all(mcpClients.map(client => client.close()));
                // Handle error
                subscriber.error(part.error);
                break;
            }
          }
        } catch (error) {
          // Close all MCP clients on exception
          await Promise.all(mcpClients.map(client => client.close()));
          subscriber.error(error);
        }
      })();

      // Cleanup function
      return () => {
        // Cleanup MCP clients if stream is unsubscribed
        Promise.all(mcpClients.map(client => client.close())).catch(() => {
          // Ignore cleanup errors
        });
      };
    });
  }

  clone() {
    return new BasicAgent(this.config);
  }
}

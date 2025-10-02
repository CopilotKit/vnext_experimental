import {
  AbstractAgent,
  AgentSubscriber,
  BaseEvent,
  RunAgentInput,
  RunAgentParameters,
  RunAgentResult,
} from "@ag-ui/client";
import { streamText, LanguageModel } from "ai";
import { Observable } from "rxjs";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { experimental_MCPClient as MCPClient } from "ai";

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
 * Configuration for BasicAgent
 */
export interface BasicAgentConfiguration {
  /**
   * The model to use
   */
  model: BasicAgentModel;
  /**
   * List of properties that can be overridden by forwardedProps.
   */
  overridableProperties?: OverridableProperty[];
  /**
   * Optional list of MCP clients to use for tool execution
   */
  mcpClients?: MCPClient[];
}

export class BasicAgent extends AbstractAgent {
  private readonly allowedOverrides: Set<OverridableProperty>;

  constructor(private config: BasicAgentConfiguration) {
    super();

    // Initialize allowed overrides with defaults
    const defaultOverrides: OverridableProperty[] = ["toolChoice"];
    this.allowedOverrides = new Set(config.overridableProperties ?? defaultOverrides);
  }

  /**
   * Check if a property can be overridden by forwardedProps
   */
  canOverride(property: OverridableProperty): boolean {
    return this.allowedOverrides.has(property);
  }

  protected run(input: RunAgentInput): Observable<BaseEvent> {
    throw new Error("Not implemented");
  }

  clone() {
    return new BasicAgent(this.config);
  }
}

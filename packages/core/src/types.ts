import { ToolCall } from "@ag-ui/client";
import { z } from "zod";

/**
 * Status of a tool call execution
 */
export enum ToolCallStatus {
  InProgress = "inProgress",
  Executing = "executing",
  Complete = "complete",
}

export type FrontendTool<T extends Record<string, unknown> = Record<string, unknown>> = {
  name: string;
  description?: string;
  parameters?: z.ZodType<T>;
  handler?: (args: T, toolCall: ToolCall) => Promise<unknown>;
  followUp?: boolean;
  /**
   * Optional agent ID to constrain this tool to a specific agent.
   * If specified, this tool will only be available to the specified agent.
   */
  agentId?: string;
};

export type Suggestion = {
  label: string;
  value: string;
};

export type DynamicSuggestionsConfig = {
  /**
   * A prompt or instructions for the GPT to generate suggestions.
   */
  instructions: string;
  /**
   * The minimum number of suggestions to generate. Defaults to `1`.
   * @default 1
   */
  minSuggestions?: number;
  /**
   * The maximum number of suggestions to generate. Defaults to `3`.
   * @default 1
   */
  maxSuggestions?: number;

  /**
   * Whether the suggestions are available. Defaults to `enabled`.
   * @default enabled
   */
  available?: "enabled" | "disabled";

  /**
   * The agent ID of the provider of the suggestions. Defaults to `"default"`.
   */
  suggestionsProviderAgentId?: string;

  /**
   * The agent ID of the consumer of the suggestions. Defaults to `"*"` (all agents).
   */
  suggestionsConsumerAgentId?: string;
};

export type StaticSuggestionsConfig = {
  /**
   * The suggestions to display.
   */
  suggestions: Suggestion[];
};

export type SuggestionsConfig = DynamicSuggestionsConfig | StaticSuggestionsConfig;

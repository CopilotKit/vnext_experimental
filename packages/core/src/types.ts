import { z } from "zod";

/**
 * Status of a tool call execution
 */
export enum ToolCallStatus {
  InProgress = "inProgress",
  Executing = "executing",
  Complete = "complete"
}

export type FrontendTool<T extends Record<string, unknown> = Record<string, unknown>> = {
  name: string;
  description?: string;
  parameters?: z.ZodType<T>;
  handler?: (args: T) => Promise<unknown>;
  followUp?: boolean;
  /**
   * Optional agent ID to constrain this tool to a specific agent.
   * If specified, this tool will only be available to the specified agent.
   */
  agentId?: string;
};

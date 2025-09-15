import { Type, TemplateRef } from "@angular/core";
import type { z } from "zod";

/**
 * Angular-specific frontend tool definition.
 * Provides a handler function that executes on the frontend when the tool is called.
 */
export interface AngularFrontendTool<
  T extends Record<string, any> = Record<string, any>,
> {
  /**
   * The name of the tool - must be unique
   */
  name: string;

  /**
   * Description of what the tool does
   */
  description?: string;

  /**
   * Zod schema defining the parameters for the tool
   */
  parameters?: z.ZodSchema<T>;

  /**
   * Handler function that executes when the tool is called
   */
  handler?: (args: T) => Promise<any>;

  /**
   * Optional Angular component or template to render when the tool is called
   */
  render?: Type<any> | TemplateRef<any>;

  /**
   * Whether the agent should follow up after this tool completes.
   * Defaults to true if not specified.
   */
  followUp?: boolean;

  /**
   * Optional agent ID to constrain this tool to a specific agent
   */
  agentId?: string;
}

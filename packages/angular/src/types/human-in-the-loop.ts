import { Type, TemplateRef } from "@angular/core";
import type { z } from "zod";
import { AngularFrontendTool } from "./frontend-tool";
import { ToolCallStatus } from "@copilotkitnext/core";

/**
 * Props passed to human-in-the-loop render components - discriminated union matching React
 */
export type HumanInTheLoopProps<T = unknown> =
  | {
      name: string;
      description: string;
      args: Partial<T>;
      status: ToolCallStatus.InProgress;
      result: undefined;
      respond: undefined;
    }
  | {
      name: string;
      description: string;
      args: T;
      status: ToolCallStatus.Executing;
      result: undefined;
      respond: (result: unknown) => Promise<void>;
    }
  | {
      name: string;
      description: string;
      args: T;
      status: ToolCallStatus.Complete;
      result: string;
      respond: undefined;
    };

/**
 * Angular human-in-the-loop tool definition.
 * Similar to frontend tools but designed for interactive user input scenarios.
 */
export interface AngularHumanInTheLoop<
  T extends Record<string, any> = Record<string, any>,
> extends Omit<AngularFrontendTool<T>, "handler" | "render"> {
  /**
   * Angular component or template to render for user interaction.
   * Required for human-in-the-loop tools.
   */
  render: Type<HumanInTheLoopProps<T>> | TemplateRef<HumanInTheLoopProps<T>>;

  /**
   * Parameters schema is required for human-in-the-loop tools
   */
  parameters: z.ZodType<T>;
}

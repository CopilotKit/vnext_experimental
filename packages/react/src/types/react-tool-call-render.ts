import { z } from "zod";
import { ToolCallStatus } from "@copilotkitnext/core";

export interface ReactToolCallRender<T> {
  name: string;
  args: z.ZodSchema<T>;
  /**
   * Optional agent ID to constrain this tool render to a specific agent.
   * If specified, this render will only be used for the specified agent.
   */
  agentId?: string;
  render: React.ComponentType<
    | {
        args: Partial<T>;
        status: ToolCallStatus.InProgress;
        result: undefined;
      }
    | {
        args: T;
        status: ToolCallStatus.Executing;
        result: undefined;
      }
    | {
        args: T;
        status: ToolCallStatus.Complete;
        result: string;
      }
  >;
}

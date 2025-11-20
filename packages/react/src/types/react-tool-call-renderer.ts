import type { ReactElement } from "react";
import { z } from "zod";
import { ToolCallStatus } from "@copilotkitnext/core";

type RenderProps<T> =
  | {
      name: string;
      args: Partial<T>;
      status: ToolCallStatus.InProgress;
      result: undefined;
    }
  | {
      name: string;
      args: T;
      status: ToolCallStatus.Executing;
      result: undefined;
    }
  | {
      name: string;
      args: T;
      status: ToolCallStatus.Complete;
      result: string;
    };

export interface ReactToolCallRenderer<T> {
  name: string;
  args: z.ZodSchema<T>;
  /**
   * Optional agent ID to constrain this tool renderer to a specific agent.
   * If specified, this renderer will only be used for the specified agent.
   */
  agentId?: string;
  render: (props: RenderProps<T>) => ReactElement | null;
}

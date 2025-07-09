import type { MaybePromise } from "@copilotkit/shared";
import { z } from "zod";

export interface CopilotContext {
  description: string;
  value: string;
}

export type CopilotToolRenderState<T> =
  | {
      status: "inProgress";
      args: Partial<T>;
      result: undefined;
    }
  | {
      status: "executing";
      args: T;
      result: undefined;
    }
  | {
      status: "complete";
      args: T;
      result: any;
    };

export interface CopilotTool<T = unknown> {
  name: string;
  description?: string;
  schema: z.ZodSchema<T>;
  handler?: (params: T) => MaybePromise<unknown>;
  render?: (state: CopilotToolRenderState<T>) => unknown;
}

import { z } from "zod";

export type RenderToolCallStatus = "inProgress" | "executing" | "complete";

export interface RenderToolCall<T> {
  args: z.ZodSchema<T>;
  component: React.ComponentType<
    | {
        name: string;
        description: string;
        args: Partial<T>;
        status: "inProgress";
        result: undefined;
      }
    | {
        name: string;
        description: string;
        args: T;
        status: "executing";
        result: undefined;
      }
    | {
        name: string;
        description: string;
        args: T;
        status: "complete";
        result: unknown;
      }
  >;
}

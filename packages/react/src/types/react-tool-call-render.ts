import { z } from "zod";

export type ReactToolCallRenderStatus = "inProgress" | "executing" | "complete";

export interface ReactToolCallRender<T> {
  args: z.ZodSchema<T>;
  render: React.ComponentType<
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

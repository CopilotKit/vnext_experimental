import { z } from "zod";

export type FrontendTool<T = unknown> = {
  name: string;
  description?: string;
  parameters: z.ZodSchema<T>;
  handler: (args: T) => Promise<unknown>;
};

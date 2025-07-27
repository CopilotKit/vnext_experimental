import { z } from "zod";

export type FrontendTool<T extends Record<string, any> = {}> = {
  name: string;
  description?: string;
  parameters?: z.ZodType<T>;
  handler?: (args: T) => Promise<unknown>;
  followUp?: boolean;
};

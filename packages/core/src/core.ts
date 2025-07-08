import { randomUUID } from "@copilotkit/shared";
import type { MaybePromise } from "@copilotkit/shared";
import { z } from "zod";

interface CopilotContext {
  description: string;
  value: string;
}

interface CopilotTool<T = unknown> {
  name: string;
  schema: z.ZodSchema<T>;
  handler?: (params: T) => MaybePromise<unknown>;
  render?: (params: T) => unknown;
}

export class CopilotKitCore {
  context: Record<string, CopilotContext> = {};
  tools: Record<string, CopilotTool<unknown>> = {};

  addContext({ description, value }: CopilotContext): string {
    const id = randomUUID();
    this.context[id] = { description, value };
    return id;
  }

  removeContext(id: string) {
    delete this.context[id];
  }

  addTool<T = unknown>(tool: CopilotTool<T>) {
    // TODO: warn
    this.tools[tool.name] = tool as CopilotTool<unknown>;
  }

  removeTool(name: string) {
    delete this.tools[name];
  }
}

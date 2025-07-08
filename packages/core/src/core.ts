import { randomUUID } from "@copilotkit/shared";
import type { MaybePromise } from "@copilotkit/shared";
import { z } from "zod";
import { logger } from "@copilotkit/shared";
import type { HttpAgent } from "@ag-ui/client";

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

export interface CopilotKitCoreConfig {
  runtimeUrl: string;
  headers: Record<string, string>;
  properties: Record<string, unknown>;
}

export class CopilotKitCore {
  context: Record<string, CopilotContext> = {};
  tools: Record<string, CopilotTool<unknown>> = {};
  headers: Record<string, string>;
  runtimeUrl: string;
  properties: Record<string, unknown>;

  // https://chatgpt.com/share/686d8cb9-9284-800b-8a12-a03911d50f12
  agents: Promise<Record<string, HttpAgent>>;

  constructor({ headers, runtimeUrl, properties }: CopilotKitCoreConfig) {
    this.headers = headers;
    this.runtimeUrl = runtimeUrl;
    this.properties = properties;
    this.agents = this.fetchAgents();
  }

  private async fetchAgents(): Promise<Record<string, HttpAgent>> {
    // TODO: hook into agents: before request, change tools etc.
    throw new Error("Not implemented");
  }

  addContext({ description, value }: CopilotContext): string {
    const id = randomUUID();
    this.context[id] = { description, value };
    return id;
  }

  removeContext(id: string) {
    delete this.context[id];
  }

  addTool<T = unknown>(tool: CopilotTool<T>) {
    const id = randomUUID();
    for (const t of Object.values(this.tools)) {
      if (t.name === tool.name) {
        logger.warn(`Tool already exists: '${tool.name}', skipping...`);
        return id;
      }
    }

    this.tools[id] = tool as CopilotTool<unknown>;
    return id;
  }

  removeTool(id: string) {
    delete this.tools[id];
  }

  setHeaders(headers: Record<string, string>) {
    this.headers = headers;
  }

  setProperties(properties: Record<string, unknown>) {
    this.properties = properties;
  }
}

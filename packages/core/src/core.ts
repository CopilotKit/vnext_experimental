import { AgentDescription, randomUUID, RuntimeInfo } from "@copilotkit/shared";
import { logger } from "@copilotkit/shared";
import type { CopilotContext, CopilotTool } from "./types";
import { CopilotAgent } from "./agent";
import { AbstractAgent } from "@ag-ui/client";

export interface CopilotKitCoreConfig {
  runtimeUrl?: string;
  agents?: Record<string, AbstractAgent>;
  headers?: Record<string, string>;
  properties?: Record<string, unknown>;
}

export interface CopilotKitCoreAddAgentParams {
  id: string;
  agent: CopilotAgent;
}

export class CopilotKitCore {
  runtimeUrl?: string;
  didLoadRuntime: boolean = false;

  context: Record<string, CopilotContext> = {};
  tools: Record<string, CopilotTool<unknown>> = {};
  agents: Record<string, AbstractAgent> = {};

  headers: Record<string, string>;
  properties: Record<string, unknown>;

  constructor({
    runtimeUrl,
    headers = {},
    properties = {},
    agents = {},
  }: CopilotKitCoreConfig) {
    this.headers = headers;
    this.runtimeUrl = runtimeUrl ? runtimeUrl.replace(/\/$/, "") : undefined;
    this.properties = properties;
    this.agents = agents;

    // Only load runtime info if we have a valid runtime URL
    if (this.runtimeUrl) {
      this.getRuntimeInfo()
        .then(({ agents, version }) => {
          this.agents = { ...this.agents, ...agents };
          this.didLoadRuntime = true;
        })
        .catch((error) => {
          logger.warn(`Failed to load runtime info: ${error.message}`);
        });
    }
  }

  private async getRuntimeInfo() {
    const response = await fetch(`${this.runtimeUrl}/info`, {
      headers: this.headers,
    });
    const {
      version,
      ...runtimeInfo
    }: {
      agents: Record<string, AgentDescription>;
      version: string;
    } = (await response.json()) as RuntimeInfo;

    const agents: Record<string, CopilotAgent> = Object.fromEntries(
      Object.entries(runtimeInfo.agents).map(([id, { description }]) => {
        const agent = new CopilotAgent({
          url: `${this.runtimeUrl}/agent/${id}/run`,
          agentId: id,
          description: description,
        });
        return [id, agent];
      })
    );

    return { agents, version };
  }

  addAgent({ id, agent }: CopilotKitCoreAddAgentParams) {
    this.agents[id] = agent;
  }

  removeAgent(id: string) {
    delete this.agents[id];
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

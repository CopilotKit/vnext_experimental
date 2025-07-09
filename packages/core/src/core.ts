import { AgentDescription, randomUUID } from "@copilotkit/shared";
import { logger } from "@copilotkit/shared";
import type { CopilotContext, CopilotTool } from "./types";
import { CopilotAgent } from "./agent";

export interface CopilotKitCoreConfig {
  runtimeUrl: string;
  headers: Record<string, string>;
  properties: Record<string, unknown>;
}

export interface CopilotKitCoreAddAgentParams {
  id: string;
  agent: CopilotAgent;
}

export class CopilotKitCore {
  static instance: CopilotKitCore;

  static getInstance(config: CopilotKitCoreConfig) {
    if (!CopilotKitCore.instance) {
      CopilotKitCore.instance = new CopilotKitCore(config);
    }
    CopilotKitCore.instance.setHeaders(config.headers);
    CopilotKitCore.instance.setProperties(config.properties);
    return CopilotKitCore.instance;
  }

  context: Record<string, CopilotContext> = {};
  tools: Record<string, CopilotTool<unknown>> = {};
  headers: Record<string, string>;
  runtimeUrl: string;
  properties: Record<string, unknown>;
  agents: Record<string, CopilotAgent> = {};
  didLoadAgents: boolean = false;

  constructor({ headers, runtimeUrl, properties }: CopilotKitCoreConfig) {
    this.headers = headers;
    this.runtimeUrl = runtimeUrl.replace(/\/$/, "");
    this.properties = properties;
    this.getAgents().then((agents) => {
      this.agents = { ...this.agents, ...agents };
      this.didLoadAgents = true;
    });
  }

  private async getAgents(): Promise<Record<string, CopilotAgent>> {
    const response = await fetch(`${this.runtimeUrl}/agents`, {
      headers: this.headers,
    });
    const agentDescriptions: Record<string, AgentDescription> =
      await response.json();

    const agents: Record<string, CopilotAgent> = Object.fromEntries(
      Object.entries(agentDescriptions).map(([id, { description }]) => {
        const agent = new CopilotAgent({
          url: `${this.runtimeUrl}/agent/${id}/run`,
          agentId: id,
          description: description,
        });
        return [id, agent];
      })
    );

    return agents;
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

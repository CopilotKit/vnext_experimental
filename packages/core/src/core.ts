import { AgentDescription, randomUUID, RuntimeInfo } from "@copilotkit/shared";
import { logger } from "@copilotkit/shared";
import { CopilotAgent } from "./agent";
import { AbstractAgent, Context } from "@ag-ui/client";
import { FrontendTool } from "./types";

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

  context: Record<string, Context> = {};
  tools: Record<string, FrontendTool<any>> = {};
  agents: Record<string, AbstractAgent> = {};

  headers: Record<string, string>;
  properties: Record<string, unknown>;

  private localAgents: Record<string, AbstractAgent> = {};
  private remoteAgents: Record<string, AbstractAgent> = {};

  constructor({
    runtimeUrl,
    headers = {},
    properties = {},
    agents = {},
  }: CopilotKitCoreConfig) {
    this.headers = headers;
    this.properties = properties;
    this.localAgents = agents;
    this.agents = this.localAgents;
    this.setRuntimeUrl(runtimeUrl);
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

  private async fetchRemoteAgents() {
    if (this.runtimeUrl) {
      this.getRuntimeInfo()
        .then(({ agents, version }) => {
          this.remoteAgents = agents;
          this.agents = { ...this.localAgents, ...this.remoteAgents };
          this.didLoadRuntime = true;
        })
        .catch((error) => {
          logger.warn(`Failed to load runtime info: ${error.message}`);
        });
    }
  }

  setAgents(agents: Record<string, AbstractAgent>) {
    this.localAgents = agents;
    this.agents = { ...this.localAgents, ...this.remoteAgents };
  }

  addAgent({ id, agent }: CopilotKitCoreAddAgentParams) {
    this.localAgents[id] = agent;
    this.agents = { ...this.localAgents, ...this.remoteAgents };
  }

  removeAgent(id: string) {
    delete this.localAgents[id];
    this.agents = { ...this.localAgents, ...this.remoteAgents };
  }

  getAgent(id: string): CopilotAgent {
    if (id in this.agents) {
      return this.agents[id] as CopilotAgent;
    } else {
      throw new Error(`Agent ${id} not found`);
    }
  }

  addContext({ description, value }: Context): string {
    const id = randomUUID();
    this.context[id] = { description, value };
    return id;
  }

  removeContext(id: string) {
    delete this.context[id];
  }

  setRuntimeUrl(runtimeUrl?: string) {
    this.runtimeUrl = runtimeUrl ? runtimeUrl.replace(/\/$/, "") : undefined;
    this.fetchRemoteAgents();
  }

  addTool<T extends Record<string, any> = {}>(tool: FrontendTool<T>) {
    if (tool.name in this.tools) {
      logger.warn(`Tool already exists: '${tool.name}', skipping.`);
      return;
    }

    this.tools[tool.name] = tool;
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

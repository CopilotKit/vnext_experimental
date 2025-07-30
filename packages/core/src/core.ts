import { AgentDescription, randomUUID, RuntimeInfo } from "@copilotkit/shared";
import { logger } from "@copilotkit/shared";
import { AbstractAgent, Context, HttpAgent, Message } from "@ag-ui/client";
import { FrontendTool } from "./types";
import { CopilotKitHttpAgent } from "./agent";

export interface CopilotKitCoreConfig {
  runtimeUrl?: string;
  agents?: Record<string, AbstractAgent>;
  headers?: Record<string, string>;
  properties?: Record<string, unknown>;
}

export interface CopilotKitCoreAddAgentParams {
  id: string;
  agent: AbstractAgent;
}

export interface RunAgentParams {
  agent: AbstractAgent;
  withMessages?: Message[];
}

export interface CopilotKitCoreSubscriber {
  onRuntimeLoaded?: (event: {
    copilotkit: CopilotKitCore;
  }) => void | Promise<void>;
  onRuntimeLoadError?: (event: {
    copilotkit: CopilotKitCore;
  }) => void | Promise<void>;
}

export class CopilotKitCore {
  runtimeUrl?: string;
  didLoadRuntime: boolean = false;

  context: Record<string, Context> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: Record<string, FrontendTool<any>> = {};
  agents: Record<string, AbstractAgent> = {};

  headers: Record<string, string>;
  properties: Record<string, unknown>;

  version?: string;

  private localAgents: Record<string, AbstractAgent> = {};
  private remoteAgents: Record<string, AbstractAgent> = {};
  private subscribers: Set<CopilotKitCoreSubscriber> = new Set();

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

    const agents: Record<string, AbstractAgent> = Object.fromEntries(
      Object.entries(runtimeInfo.agents).map(([id, { description }]) => {
        const agent = new CopilotKitHttpAgent({
          runtimeUrl: this.runtimeUrl,
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
          this.version = version;

          this.subscribers.forEach(async (subscriber) => {
            try {
              await subscriber.onRuntimeLoaded?.({ copilotkit: this });
            } catch (error) {
              logger.error(
                "Error in CopilotKitCore subscriber (onRuntimeLoaded):",
                error
              );
            }
          });
        })
        .catch((error) => {
          this.subscribers.forEach(async (subscriber) => {
            try {
              await subscriber.onRuntimeLoadError?.({ copilotkit: this });
            } catch (error) {
              logger.error(
                "Error in CopilotKitCore subscriber (onRuntimeLoadError):",
                error
              );
            }
          });
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

  getAgent(id: string): AbstractAgent | undefined {
    if (id in this.agents) {
      return this.agents[id] as AbstractAgent;
    } else {
      if (!this.didLoadRuntime) {
        return undefined;
      } else {
        throw new Error(`Agent ${id} not found`);
      }
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

  addTool<T extends Record<string, unknown> = Record<string, unknown>>(
    tool: FrontendTool<T>
  ) {
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

  subscribe(subscriber: CopilotKitCoreSubscriber): () => void {
    this.subscribers.add(subscriber);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriber);
    };
  }

  unsubscribe(subscriber: CopilotKitCoreSubscriber) {
    this.subscribers.delete(subscriber);
  }

  // TODO: AG-UI needs to expose the runAgent result type
  async runAgent({
    agent,
    withMessages,
  }: RunAgentParams): Promise<Awaited<ReturnType<typeof agent.runAgent>>> {
    if (withMessages) {
      agent.addMessages(withMessages);
    }

    const runAgentResult = await agent.runAgent({
      forwardedProps: this.properties,
    });

    const { newMessages } = runAgentResult;

    let needsFollowUp = false;

    for (const message of newMessages) {
      if (message.role === "assistant") {
        for (const toolCall of message.toolCalls || []) {
          if (
            newMessages.findIndex(
              (m) => m.role === "tool" && m.toolCallId === toolCall.id
            ) === -1
          ) {
            if (toolCall.function.name in this.tools) {
              const tool = this.tools[toolCall.function.name];
              let toolCallResult = "";
              if (tool?.handler) {
                const args = JSON.parse(toolCall.function.arguments);
                try {
                  const result = await tool.handler(args);
                  toolCallResult =
                    typeof result === "string"
                      ? result
                      : JSON.stringify(result);
                } catch (error) {
                  toolCallResult = `Error: ${error instanceof Error ? error.message : String(error)}`;
                }
              }

              const messageIndex = agent.messages.findIndex(
                (m) => m.id === message.id
              );
              const toolMessage = {
                id: randomUUID(),
                role: "tool" as const,
                toolCallId: toolCall.id,
                content: toolCallResult,
              };
              agent.messages.splice(messageIndex + 1, 0, toolMessage);

              if (tool?.followUp !== false) {
                needsFollowUp = true;
              }
            }
          }
        }
      }
    }

    if (needsFollowUp) {
      return await this.runAgent({ agent });
    }

    return runAgentResult;
  }
}

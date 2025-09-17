import {
  AgentDescription,
  randomUUID,
  RuntimeInfo,
} from "@copilotkitnext/shared";
import { logger } from "@copilotkitnext/shared";
import {
  AbstractAgent,
  Context,
  HttpAgent,
  Message,
  RunAgentResult,
} from "@ag-ui/client";
import { FrontendTool } from "./types";
import { ProxiedCopilotRuntimeAgent } from "./agent";

export interface CopilotKitCoreConfig {
  runtimeUrl?: string;
  agents?: Record<string, AbstractAgent>;
  headers?: Record<string, string>;
  properties?: Record<string, unknown>;
  tools?: FrontendTool<any>[];
}

export interface CopilotKitCoreAddAgentParams {
  id: string;
  agent: AbstractAgent;
}

export interface RunAgentParams {
  agent: AbstractAgent;
  withMessages?: Message[];
  agentId?: string;
}

export interface ConnectAgentParams {
  agent: AbstractAgent;
  agentId?: string;
}

export interface GetToolParams {
  toolName: string;
  agentId?: string;
}

export interface CopilotKitCoreSubscriber {
  onRuntimeLoaded?: (event: {
    copilotkit: CopilotKitCore;
  }) => void | Promise<void>;
  onRuntimeLoadError?: (event: {
    copilotkit: CopilotKitCore;
  }) => void | Promise<void>;
  onToolExecutingStart?: (event: {
    toolCallId: string;
    agentId?: string;
  }) => void | Promise<void>;
  onToolExecutingEnd?: (event: {
    toolCallId: string;
    agentId?: string;
  }) => void | Promise<void>;
}

export class CopilotKitCore {
  runtimeUrl?: string;
  didLoadRuntime: boolean = false;

  context: Record<string, Context> = {};
  agents: Record<string, AbstractAgent> = {};

  headers: Record<string, string>;
  properties: Record<string, unknown>;

  version?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tools: FrontendTool<any>[] = [];
  private localAgents: Record<string, AbstractAgent> = {};
  private remoteAgents: Record<string, AbstractAgent> = {};
  private subscribers: Set<CopilotKitCoreSubscriber> = new Set();
  private executingToolCallIds: Set<string> = new Set();

  constructor({
    runtimeUrl,
    headers = {},
    properties = {},
    agents = {},
    tools = [],
  }: CopilotKitCoreConfig) {
    this.headers = headers;
    this.properties = properties;
    this.localAgents = agents;
    this.agents = this.localAgents;
    this.tools = tools;

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
        const agent = new ProxiedCopilotRuntimeAgent({
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
    // Check if a tool with the same name and agentId already exists
    const existingToolIndex = this.tools.findIndex(
      (t) => t.name === tool.name && t.agentId === tool.agentId
    );

    if (existingToolIndex !== -1) {
      logger.warn(
        `Tool already exists: '${tool.name}' for agent '${tool.agentId || "global"}', skipping.`
      );
      return;
    }

    this.tools.push(tool);
  }

  removeTool(id: string, agentId?: string) {
    this.tools = this.tools.filter((tool) => {
      // Remove tool if both name and agentId match
      if (agentId !== undefined) {
        return !(tool.name === id && tool.agentId === agentId);
      }
      // If no agentId specified, only remove global tools with matching name
      return !(tool.name === id && !tool.agentId);
    });
  }

  /**
   * Get a tool by name and optionally by agentId.
   * If agentId is provided, it will first look for an agent-specific tool,
   * then fall back to a global tool with the same name.
   */
  getTool(params: GetToolParams): FrontendTool<any> | undefined {
    const { toolName, agentId } = params;

    // If agentId is provided, first look for agent-specific tool
    if (agentId) {
      const agentTool = this.tools.find(
        (tool) => tool.name === toolName && tool.agentId === agentId
      );
      if (agentTool) {
        return agentTool;
      }
    }

    // Fall back to global tool (no agentId)
    return this.tools.find((tool) => tool.name === toolName && !tool.agentId);
  }

  /**
   * Get all tools as an array.
   * Useful for compatibility with code that needs to iterate over all tools.
   */
  getAllTools(): FrontendTool<any>[] {
    return [...this.tools];
  }

  /**
   * Set all tools at once. Replaces existing tools.
   */
  setTools(tools: FrontendTool<any>[]) {
    this.tools = [...tools];
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

  async connectAgent({
    agent,
    agentId,
  }: ConnectAgentParams): Promise<RunAgentResult> {
    const runAgentResult = await agent.connectAgent({
      forwardedProps: this.properties,
    });

    return this.processAgentResult({ runAgentResult, agent, agentId });
  }

  async runAgent({
    agent,
    withMessages,
    agentId,
  }: RunAgentParams): Promise<RunAgentResult> {
    if (withMessages) {
      agent.addMessages(withMessages);
    }
    const runAgentResult = await agent.runAgent({
      forwardedProps: this.properties,
    });
    return this.processAgentResult({ runAgentResult, agent, agentId });
  }

  private async processAgentResult({
    runAgentResult,
    agent,
    agentId,
  }: {
    runAgentResult: RunAgentResult;
    agent: AbstractAgent;
    agentId: string | undefined;
  }): Promise<RunAgentResult> {
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
            const tool = this.getTool({
              toolName: toolCall.function.name,
              agentId,
            });
            if (tool) {
              // Check if tool is constrained to a specific agent
              if (tool?.agentId && tool.agentId !== agentId) {
                // Tool is not available for this agent, skip it
                continue;
              }

              let toolCallResult = "";
              if (tool?.handler) {
                const args = JSON.parse(toolCall.function.arguments);
                try {
                  // mark executing start
                  this.executingToolCallIds.add(toolCall.id);
                  for (const sub of this.subscribers) {
                    try {
                      await sub.onToolExecutingStart?.({
                        toolCallId: toolCall.id,
                        agentId,
                      });
                    } catch (err) {
                      logger.error(
                        "Subscriber onToolExecutingStart error:",
                        err
                      );
                    }
                  }
                  const result = await tool.handler(args);
                  if (result === undefined || result === null) {
                    toolCallResult = "";
                  } else if (typeof result === "string") {
                    toolCallResult = result;
                  } else {
                    toolCallResult = JSON.stringify(result);
                  }
                } catch (error) {
                  toolCallResult = `Error: ${error instanceof Error ? error.message : String(error)}`;
                } finally {
                  // mark executing end
                  this.executingToolCallIds.delete(toolCall.id);
                  for (const sub of this.subscribers) {
                    try {
                      await sub.onToolExecutingEnd?.({
                        toolCallId: toolCall.id,
                        agentId,
                      });
                    } catch (err) {
                      logger.error("Subscriber onToolExecutingEnd error:", err);
                    }
                  }
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
            } else {
              // Wildcard fallback for undefined tools
              const wildcardTool = this.getTool({ toolName: "*", agentId });
              if (wildcardTool) {
                // Check if wildcard tool is constrained to a specific agent
                if (wildcardTool?.agentId && wildcardTool.agentId !== agentId) {
                  // Wildcard tool is not available for this agent, skip it
                  continue;
                }

                let toolCallResult = "";
                if (wildcardTool?.handler) {
                  // Pass both the tool name and original args to the wildcard handler
                  const wildcardArgs = {
                    toolName: toolCall.function.name,
                    args: JSON.parse(toolCall.function.arguments),
                  };
                  try {
                    // mark executing start
                    this.executingToolCallIds.add(toolCall.id);
                    for (const sub of this.subscribers) {
                      try {
                        await sub.onToolExecutingStart?.({
                          toolCallId: toolCall.id,
                          agentId,
                        });
                      } catch (err) {
                        logger.error(
                          "Subscriber onToolExecutingStart error:",
                          err
                        );
                      }
                    }
                    const result = await wildcardTool.handler(wildcardArgs);
                    if (result === undefined || result === null) {
                      toolCallResult = "";
                    } else if (typeof result === "string") {
                      toolCallResult = result;
                    } else {
                      toolCallResult = JSON.stringify(result);
                    }
                  } catch (error) {
                    toolCallResult = `Error: ${error instanceof Error ? error.message : String(error)}`;
                  } finally {
                    // mark executing end
                    this.executingToolCallIds.delete(toolCall.id);
                    for (const sub of this.subscribers) {
                      try {
                        await sub.onToolExecutingEnd?.({
                          toolCallId: toolCall.id,
                          agentId,
                        });
                      } catch (err) {
                        logger.error(
                          "Subscriber onToolExecutingEnd error:",
                          err
                        );
                      }
                    }
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

                if (wildcardTool?.followUp !== false) {
                  needsFollowUp = true;
                }
              }
            }
          }
        }
      }
    }

    if (needsFollowUp) {
      return await this.runAgent({ agent, agentId });
    }

    return runAgentResult;
  }

  getExecutingToolCallIds(): ReadonlySet<string> {
    return this.executingToolCallIds;
  }
}

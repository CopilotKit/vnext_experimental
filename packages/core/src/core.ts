import {
  AgentDescription,
  randomUUID,
  RuntimeInfo,
} from "@copilotkitnext/shared";
import { logger } from "@copilotkitnext/shared";
import { AbstractAgent, Context, Message, RunAgentResult } from "@ag-ui/client";
import { FrontendTool } from "./types";
import { ProxiedCopilotRuntimeAgent } from "./agent";
import { zodToJsonSchema } from "zod-to-json-schema";

/** Configuration options for `CopilotKitCore`. */
export interface CopilotKitCoreConfig {
  /** The endpoint of the CopilotRuntime. */
  runtimeUrl?: string;
  /** Mapping from agent name to its `AbstractAgent` instance. */
  agents?: Record<string, AbstractAgent>;
  /** Headers appended to every HTTP request made by `CopilotKitCore`. */
  headers?: Record<string, string>;
  /** Properties sent as `forwardedProps` to the AG-UI agent. */
  properties?: Record<string, unknown>;
  /** Ordered collection of frontend tools available to the core. */
  tools?: FrontendTool<any>[];
}

export interface CopilotKitCoreAddAgentParams {
  id: string;
  agent: AbstractAgent;
}

export interface CopilotKitCoreRunAgentParams {
  agent: AbstractAgent;
  withMessages?: Message[];
  agentId?: string;
}

export interface CopilotKitCoreConnectAgentParams {
  agent: AbstractAgent;
  agentId?: string;
}

export interface CopilotKitCoreGetToolParams {
  toolName: string;
  agentId?: string;
}

export interface CopilotKitCoreSubscriber {
  onRuntimeConnectionStatusChanged?: (event: {
    copilotkit: CopilotKitCore;
    status: CopilotKitCoreRuntimeConnectionStatus;
  }) => void | Promise<void>;
  onToolExecutionStart?: (event: {
    toolCallId: string;
    agentId?: string;
  }) => void | Promise<void>;
  onToolExecutionEnd?: (event: {
    toolCallId: string;
    agentId?: string;
  }) => void | Promise<void>;
}

export enum CopilotKitCoreRuntimeConnectionStatus {
  Disconnected = "disconnected",
  Connected = "connected",
  Connecting = "connecting",
  Error = "error",
}

export class CopilotKitCore {
  _context: Record<string, Context> = {};
  get context(): Readonly<Record<string, Context>> {
    return this._context;
  }

  private _agents: Record<string, AbstractAgent> = {};
  get agents(): Readonly<Record<string, AbstractAgent>> {
    return this._agents;
  }

  headers: Record<string, string>;
  properties: Record<string, unknown>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _tools: FrontendTool<any>[] = [];
  get tools(): Readonly<FrontendTool<any>[]> {
    return this._tools;
  }

  private _runtimeUrl?: string;
  get runtimeUrl(): string | undefined {
    return this._runtimeUrl;
  }

  set runtimeUrl(runtimeUrl: string | undefined) {
    const normalizedRuntimeUrl = runtimeUrl
      ? runtimeUrl.replace(/\/$/, "")
      : undefined;

    if (this._runtimeUrl === normalizedRuntimeUrl) {
      return;
    }
    this._runtimeUrl = normalizedRuntimeUrl;
    void this.updateRuntimeConnection();
  }

  private _runtimeVersion?: string;
  get runtimeVersion(): string | undefined {
    return this._runtimeVersion;
  }

  private _runtimeConnectionStatus: CopilotKitCoreRuntimeConnectionStatus =
    CopilotKitCoreRuntimeConnectionStatus.Disconnected;

  get runtimeConnectionStatus(): CopilotKitCoreRuntimeConnectionStatus {
    return this._runtimeConnectionStatus;
  }

  private localAgents: Record<string, AbstractAgent> = {};
  private remoteAgents: Record<string, AbstractAgent> = {};
  private subscribers: Set<CopilotKitCoreSubscriber> = new Set();

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
    this._agents = this.localAgents;
    this._tools = tools;
    this.runtimeUrl = runtimeUrl;
  }

  private async updateRuntimeConnection() {
    if (!this.runtimeUrl) {
      this._runtimeConnectionStatus =
        CopilotKitCoreRuntimeConnectionStatus.Disconnected;
      this._runtimeVersion = undefined;
      this.remoteAgents = {};
      this._agents = this.localAgents;

      this.subscribers.forEach(async (subscriber) => {
        try {
          await subscriber.onRuntimeConnectionStatusChanged?.({
            copilotkit: this,
            status: CopilotKitCoreRuntimeConnectionStatus.Disconnected,
          });
        } catch (error) {
          logger.error(
            "Error in CopilotKitCore subscriber (onRuntimeConnectionStatusChanged):",
            error
          );
        }
      });
      return;
    }

    this._runtimeConnectionStatus =
      CopilotKitCoreRuntimeConnectionStatus.Connecting;

    this.subscribers.forEach(async (subscriber) => {
      try {
        await subscriber.onRuntimeConnectionStatusChanged?.({
          copilotkit: this,
          status: CopilotKitCoreRuntimeConnectionStatus.Connecting,
        });
      } catch (error) {
        logger.error(
          "Error in CopilotKitCore subscriber (onRuntimeConnectionStatusChanged):",
          error
        );
      }
    });

    try {
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

      this.remoteAgents = agents;
      this._agents = { ...this.localAgents, ...this.remoteAgents };
      this._runtimeConnectionStatus =
        CopilotKitCoreRuntimeConnectionStatus.Connected;
      this._runtimeVersion = version;

      this.subscribers.forEach(async (subscriber) => {
        try {
          await subscriber.onRuntimeConnectionStatusChanged?.({
            copilotkit: this,
            status: CopilotKitCoreRuntimeConnectionStatus.Connected,
          });
        } catch (error) {
          logger.error(
            "Error in CopilotKitCore subscriber (onRuntimeConnectionStatusChanged):",
            error
          );
        }
      });
    } catch (error) {
      this._runtimeConnectionStatus =
        CopilotKitCoreRuntimeConnectionStatus.Error;
      this._runtimeVersion = undefined;
      this.remoteAgents = {};
      this._agents = this.localAgents;

      this.subscribers.forEach(async (subscriber) => {
        try {
          await subscriber.onRuntimeConnectionStatusChanged?.({
            copilotkit: this,
            status: CopilotKitCoreRuntimeConnectionStatus.Error,
          });
        } catch (err) {
          logger.error(
            "Error in CopilotKitCore subscriber (onRuntimeConnectionStatusChanged):",
            err
          );
        }
      });
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      logger.warn(
        `Failed to load runtime info (${this.runtimeUrl}/info): ${message}`
      );
    }
  }

  setAgents(agents: Record<string, AbstractAgent>) {
    this.localAgents = agents;
    this._agents = { ...this.localAgents, ...this.remoteAgents };
  }

  addAgent({ id, agent }: CopilotKitCoreAddAgentParams) {
    this.localAgents[id] = agent;
    this._agents = { ...this.localAgents, ...this.remoteAgents };
  }

  removeAgent(id: string) {
    delete this.localAgents[id];
    this._agents = { ...this.localAgents, ...this.remoteAgents };
  }

  getAgent(id: string): AbstractAgent | undefined {
    if (id in this._agents) {
      return this._agents[id] as AbstractAgent;
    } else {
      if (
        this.runtimeUrl !== undefined &&
        (this.runtimeConnectionStatus ===
          CopilotKitCoreRuntimeConnectionStatus.Disconnected ||
          this.runtimeConnectionStatus ===
            CopilotKitCoreRuntimeConnectionStatus.Connecting)
      ) {
        return undefined;
      } else {
        throw new Error(`Agent ${id} not found`);
      }
    }
  }

  addContext({ description, value }: Context): string {
    const id = randomUUID();
    this._context[id] = { description, value };
    return id;
  }

  removeContext(id: string) {
    delete this._context[id];
  }

  addTool<T extends Record<string, unknown> = Record<string, unknown>>(
    tool: FrontendTool<T>
  ) {
    // Check if a tool with the same name and agentId already exists
    const existingToolIndex = this._tools.findIndex(
      (t) => t.name === tool.name && t.agentId === tool.agentId
    );

    if (existingToolIndex !== -1) {
      logger.warn(
        `Tool already exists: '${tool.name}' for agent '${tool.agentId || "global"}', skipping.`
      );
      return;
    }

    this._tools.push(tool);
  }

  removeTool(id: string, agentId?: string) {
    this._tools = this._tools.filter((tool) => {
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
  getTool(params: CopilotKitCoreGetToolParams): FrontendTool<any> | undefined {
    const { toolName, agentId } = params;

    // If agentId is provided, first look for agent-specific tool
    if (agentId) {
      const agentTool = this._tools.find(
        (tool) => tool.name === toolName && tool.agentId === agentId
      );
      if (agentTool) {
        return agentTool;
      }
    }

    // Fall back to global tool (no agentId)
    return this._tools.find((tool) => tool.name === toolName && !tool.agentId);
  }

  /**
   * Set all tools at once. Replaces existing tools.
   */
  setTools(tools: FrontendTool<any>[]) {
    this._tools = [...tools];
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
  }: CopilotKitCoreConnectAgentParams): Promise<RunAgentResult> {
    const runAgentResult = await agent.connectAgent({
      forwardedProps: this.properties,
      tools: this.buildFrontendTools(agentId),
    });

    return this.processAgentResult({ runAgentResult, agent, agentId });
  }

  async runAgent({
    agent,
    withMessages,
    agentId,
  }: CopilotKitCoreRunAgentParams): Promise<RunAgentResult> {
    if (withMessages) {
      agent.addMessages(withMessages);
    }
    const runAgentResult = await agent.runAgent({
      forwardedProps: this.properties,
      tools: this.buildFrontendTools(agentId),
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
                  for (const sub of this.subscribers) {
                    try {
                      await sub.onToolExecutionStart?.({
                        toolCallId: toolCall.id,
                        agentId,
                      });
                    } catch (err) {
                      logger.error(
                        "Subscriber onToolExecutionStart error:",
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

                  for (const sub of this.subscribers) {
                    try {
                      await sub.onToolExecutionEnd?.({
                        toolCallId: toolCall.id,
                        agentId,
                      });
                    } catch (err) {
                      logger.error("Subscriber onToolExecutionEnd error:", err);
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
                    for (const sub of this.subscribers) {
                      try {
                        await sub.onToolExecutionStart?.({
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
                    for (const sub of this.subscribers) {
                      try {
                        await sub.onToolExecutionEnd?.({
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

  private buildFrontendTools(agentId?: string) {
    return this._tools
      .filter((tool) => !tool.agentId || tool.agentId === agentId)
      .map((tool) => ({
        name: tool.name,
        description: tool.description ?? "",
        parameters: createToolSchema(tool),
      }));
  }
}

const EMPTY_TOOL_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const satisfies Record<string, unknown>;

function createToolSchema(tool: FrontendTool<any>): Record<string, unknown> {
  if (!tool.parameters) {
    return EMPTY_TOOL_SCHEMA;
  }

  const rawSchema = zodToJsonSchema(tool.parameters, {
    $refStrategy: "none",
  });

  if (!rawSchema || typeof rawSchema !== "object") {
    return { ...EMPTY_TOOL_SCHEMA };
  }

  const { $schema, ...schema } = rawSchema as Record<string, unknown>;

  if (typeof schema.type !== "string") {
    schema.type = "object";
  }
  if (typeof schema.properties !== "object" || schema.properties === null) {
    schema.properties = {};
  }
  if (schema.additionalProperties === undefined) {
    schema.additionalProperties = false;
  }

  return schema;
}

import {
  AgentDescription,
  DEFAULT_AGENT_ID,
  randomUUID,
  RuntimeInfo,
  logger,
} from "@copilotkitnext/shared";
import {
  AbstractAgent,
  AgentSubscriber,
  Context,
  Message,
  RunAgentResult,
} from "@ag-ui/client";
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
    copilotkit: CopilotKitCore;
    toolCallId: string;
    agentId: string;
    toolName: string;
    args: unknown;
  }) => void | Promise<void>;
  onToolExecutionEnd?: (event: {
    copilotkit: CopilotKitCore;
    toolCallId: string;
    agentId: string;
    toolName: string;
    result: string;
    error?: string;
  }) => void | Promise<void>;
  onAgentsChanged?: (event: {
    copilotkit: CopilotKitCore;
    agents: Readonly<Record<string, AbstractAgent>>;
  }) => void | Promise<void>;
  onContextChanged?: (event: {
    copilotkit: CopilotKitCore;
    context: Readonly<Record<string, Context>>;
  }) => void | Promise<void>;
  onPropertiesChanged?: (event: {
    copilotkit: CopilotKitCore;
    properties: Readonly<Record<string, unknown>>;
  }) => void | Promise<void>;
  onHeadersChanged?: (event: {
    copilotkit: CopilotKitCore;
    headers: Readonly<Record<string, string>>;
  }) => void | Promise<void>;
  onError?: (event: { copilotkit: CopilotKitCore; error: Error }) =>
    | void
    | Promise<void>;
}

export enum CopilotKitCoreRuntimeConnectionStatus {
  Disconnected = "disconnected",
  Connected = "connected",
  Connecting = "connecting",
  Error = "error",
}

export class CopilotKitCore {
  headers: Record<string, string>;
  properties: Record<string, unknown>;

  private _context: Record<string, Context> = {};
  private _agents: Record<string, AbstractAgent> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _tools: FrontendTool<any>[] = [];

  private localAgents: Record<string, AbstractAgent> = {};
  private remoteAgents: Record<string, AbstractAgent> = {};
  private subscribers: Set<CopilotKitCoreSubscriber> = new Set();

  private _runtimeUrl?: string;
  private _runtimeVersion?: string;
  private _runtimeConnectionStatus: CopilotKitCoreRuntimeConnectionStatus =
    CopilotKitCoreRuntimeConnectionStatus.Disconnected;

  constructor({
    runtimeUrl,
    headers = {},
    properties = {},
    agents = {},
    tools = [],
  }: CopilotKitCoreConfig) {
    this.headers = headers;
    this.properties = properties;
    this.localAgents = this.assignAgentIds(agents);
    this._agents = this.localAgents;
    this._tools = tools;
    this.setRuntimeUrl(runtimeUrl);
  }

  private assignAgentIds(agents: Record<string, AbstractAgent>) {
    Object.entries(agents).forEach(([id, agent]) => {
      if (agent && !agent.agentId) {
        agent.agentId = id;
      }
    });
    return agents;
  }

  private async notifySubscribers(
    handler: (subscriber: CopilotKitCoreSubscriber) =>
      | void
      | Promise<void>,
    errorMessage: string
  ) {
    await Promise.all(
      Array.from(this.subscribers).map(async (subscriber) => {
        try {
          await handler(subscriber);
        } catch (error) {
          logger.error(errorMessage, error);
        }
      })
    );
  }

  private resolveAgentId(
    agent: AbstractAgent,
    providedAgentId?: string
  ): string {
    if (providedAgentId) {
      return providedAgentId;
    }
    if (agent.agentId) {
      return agent.agentId;
    }
    const found = Object.entries(this._agents).find(([, storedAgent]) => {
      return storedAgent === agent;
    });
    if (found) {
      agent.agentId = found[0];
      return found[0];
    }
    agent.agentId = DEFAULT_AGENT_ID;
    return DEFAULT_AGENT_ID;
  }

  /**
   * Snapshot accessors
   */
  get context(): Readonly<Record<string, Context>> {
    return this._context;
  }

  get agents(): Readonly<Record<string, AbstractAgent>> {
    return this._agents;
  }

  get tools(): Readonly<FrontendTool<any>[]> {
    return this._tools;
  }

  get runtimeUrl(): string | undefined {
    return this._runtimeUrl;
  }

  setRuntimeUrl(runtimeUrl: string | undefined) {
    const normalizedRuntimeUrl = runtimeUrl
      ? runtimeUrl.replace(/\/$/, "")
      : undefined;

    if (this._runtimeUrl === normalizedRuntimeUrl) {
      return;
    }

    this._runtimeUrl = normalizedRuntimeUrl;
    void this.updateRuntimeConnection();
  }

  get runtimeVersion(): string | undefined {
    return this._runtimeVersion;
  }

  get runtimeConnectionStatus(): CopilotKitCoreRuntimeConnectionStatus {
    return this._runtimeConnectionStatus;
  }

  /**
   * Runtime connection
   */
  private async updateRuntimeConnection() {
    if (!this.runtimeUrl) {
      this._runtimeConnectionStatus =
        CopilotKitCoreRuntimeConnectionStatus.Disconnected;
      this._runtimeVersion = undefined;
      this.remoteAgents = {};
      this._agents = this.localAgents;

      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onRuntimeConnectionStatusChanged?.({
            copilotkit: this,
            status: CopilotKitCoreRuntimeConnectionStatus.Disconnected,
          }),
        "Error in CopilotKitCore subscriber (onRuntimeConnectionStatusChanged):"
      );

      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onAgentsChanged?.({
            copilotkit: this,
            agents: this._agents,
          }),
        "Subscriber onAgentsChanged error:"
      );
      return;
    }

    this._runtimeConnectionStatus =
      CopilotKitCoreRuntimeConnectionStatus.Connecting;

    await this.notifySubscribers(
      (subscriber) =>
        subscriber.onRuntimeConnectionStatusChanged?.({
          copilotkit: this,
          status: CopilotKitCoreRuntimeConnectionStatus.Connecting,
        }),
      "Error in CopilotKitCore subscriber (onRuntimeConnectionStatusChanged):"
    );

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

      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onRuntimeConnectionStatusChanged?.({
            copilotkit: this,
            status: CopilotKitCoreRuntimeConnectionStatus.Connected,
          }),
        "Error in CopilotKitCore subscriber (onRuntimeConnectionStatusChanged):"
      );

      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onAgentsChanged?.({
            copilotkit: this,
            agents: this._agents,
          }),
        "Subscriber onAgentsChanged error:"
      );
    } catch (error) {
      this._runtimeConnectionStatus =
        CopilotKitCoreRuntimeConnectionStatus.Error;
      this._runtimeVersion = undefined;
      this.remoteAgents = {};
      this._agents = this.localAgents;

      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onRuntimeConnectionStatusChanged?.({
            copilotkit: this,
            status: CopilotKitCoreRuntimeConnectionStatus.Error,
          }),
        "Error in CopilotKitCore subscriber (onRuntimeConnectionStatusChanged):"
      );

      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onAgentsChanged?.({
            copilotkit: this,
            agents: this._agents,
          }),
        "Subscriber onAgentsChanged error:"
      );
      const message =
        error instanceof Error ? error.message : JSON.stringify(error);
      logger.warn(
        `Failed to load runtime info (${this.runtimeUrl}/info): ${message}`
      );
      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onError?.({
            copilotkit: this,
            error: error instanceof Error ? error : new Error(String(error)),
          }),
        "Subscriber onError error:"
      );
    }
  }

  /**
   * Configuration updates
   */
  setHeaders(headers: Record<string, string>) {
    this.headers = headers;
    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onHeadersChanged?.({
          copilotkit: this,
          headers: this.headers,
        }),
      "Subscriber onHeadersChanged error:"
    );
  }

  setProperties(properties: Record<string, unknown>) {
    this.properties = properties;
    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onPropertiesChanged?.({
          copilotkit: this,
          properties: this.properties,
        }),
      "Subscriber onPropertiesChanged error:"
    );
  }

  setAgents(agents: Record<string, AbstractAgent>) {
    this.localAgents = this.assignAgentIds(agents);
    this._agents = { ...this.localAgents, ...this.remoteAgents };
    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onAgentsChanged?.({
          copilotkit: this,
          agents: this._agents,
        }),
      "Subscriber onAgentsChanged error:"
    );
  }

  addAgent({ id, agent }: CopilotKitCoreAddAgentParams) {
    this.localAgents[id] = agent;
    if (!agent.agentId) {
      agent.agentId = id;
    }
    this._agents = { ...this.localAgents, ...this.remoteAgents };
    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onAgentsChanged?.({
          copilotkit: this,
          agents: this._agents,
        }),
      "Subscriber onAgentsChanged error:"
    );
  }

  removeAgent(id: string) {
    delete this.localAgents[id];
    this._agents = { ...this.localAgents, ...this.remoteAgents };
    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onAgentsChanged?.({
          copilotkit: this,
          agents: this._agents,
        }),
      "Subscriber onAgentsChanged error:"
    );
  }

  getAgent(id: string): AbstractAgent | undefined {
    if (id in this._agents) {
      return this._agents[id] as AbstractAgent;
    }

    if (
      this.runtimeUrl !== undefined &&
      (this.runtimeConnectionStatus ===
        CopilotKitCoreRuntimeConnectionStatus.Disconnected ||
        this.runtimeConnectionStatus ===
          CopilotKitCoreRuntimeConnectionStatus.Connecting)
    ) {
      return undefined;
    } else {
      console.warn(`Agent ${id} not found`);
      return undefined;
    }
  }

  /**
   * Context management
   */
  addContext({ description, value }: Context): string {
    const id = randomUUID();
    this._context[id] = { description, value };
    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onContextChanged?.({
          copilotkit: this,
          context: this._context,
        }),
      "Subscriber onContextChanged error:"
    );
    return id;
  }

  removeContext(id: string) {
    delete this._context[id];
    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onContextChanged?.({
          copilotkit: this,
          context: this._context,
        }),
      "Subscriber onContextChanged error:"
    );
  }

  /**
   * Tool management
   */
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

  /**
   * Subscription lifecycle
   */
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

  /**
   * Agent connectivity
   */
  async connectAgent({
    agent,
    agentId,
  }: CopilotKitCoreConnectAgentParams): Promise<RunAgentResult> {
    try {
      const runAgentResult = await agent.connectAgent(
        {
          forwardedProps: this.properties,
          tools: this.buildFrontendTools(agentId),
        },
        this.createAgentErrorSubscriber(agent, agentId)
      );

      return this.processAgentResult({ runAgentResult, agent, agentId });
    } catch (error) {
      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onError?.({
            copilotkit: this,
            error: error instanceof Error ? error : new Error(String(error)),
          }),
        "Subscriber onError error:"
      );
      throw error;
    }
  }

  async runAgent({
    agent,
    withMessages,
    agentId,
  }: CopilotKitCoreRunAgentParams): Promise<RunAgentResult> {
    if (withMessages) {
      agent.addMessages(withMessages);
    }
    try {
      const runAgentResult = await agent.runAgent(
        {
          forwardedProps: this.properties,
          tools: this.buildFrontendTools(agentId),
        },
        this.createAgentErrorSubscriber(agent, agentId)
      );
      return this.processAgentResult({ runAgentResult, agent, agentId });
    } catch (error) {
      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onError?.({
            copilotkit: this,
            error: error instanceof Error ? error : new Error(String(error)),
          }),
        "Subscriber onError error:"
      );
      throw error;
    }
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
    const effectiveAgentId = this.resolveAgentId(agent, agentId);

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
              let errorMessage: string | undefined;
              let isArgumentError = false;
              if (tool?.handler) {
                let parsedArgs: unknown;
                try {
                  parsedArgs = JSON.parse(toolCall.function.arguments);
                } catch (error) {
                  const parseError =
                    error instanceof Error
                      ? error
                      : new Error(String(error));
                  errorMessage = parseError.message;
                  isArgumentError = true;
                  await this.notifySubscribers(
                    (subscriber) =>
                      subscriber.onError?.({
                        copilotkit: this,
                        error: parseError,
                      }),
                    "Subscriber onError error:"
                  );
                }

                await this.notifySubscribers(
                  (subscriber) =>
                    subscriber.onToolExecutionStart?.({
                      copilotkit: this,
                      toolCallId: toolCall.id,
                      agentId: effectiveAgentId,
                      toolName: toolCall.function.name,
                      args: parsedArgs,
                    }),
                  "Subscriber onToolExecutionStart error:"
                );

                if (!errorMessage) {
                  try {
                    const result = await tool.handler(parsedArgs as any);
                    if (result === undefined || result === null) {
                      toolCallResult = "";
                    } else if (typeof result === "string") {
                      toolCallResult = result;
                    } else {
                      toolCallResult = JSON.stringify(result);
                    }
                  } catch (error) {
                    const handlerError =
                      error instanceof Error
                        ? error
                        : new Error(String(error));
                    errorMessage = handlerError.message;
                    await this.notifySubscribers(
                      (subscriber) =>
                        subscriber.onError?.({
                          copilotkit: this,
                          error: handlerError,
                        }),
                      "Subscriber onError error:"
                    );
                  }
                }

                if (errorMessage) {
                  toolCallResult = `Error: ${errorMessage}`;
                }

                await this.notifySubscribers(
                  (subscriber) =>
                    subscriber.onToolExecutionEnd?.({
                      copilotkit: this,
                      toolCallId: toolCall.id,
                      agentId: effectiveAgentId,
                      toolName: toolCall.function.name,
                      result: errorMessage ? "" : toolCallResult,
                      error: errorMessage,
                    }),
                  "Subscriber onToolExecutionEnd error:"
                );

                if (isArgumentError) {
                  throw new Error(errorMessage ?? "Tool execution failed");
                }
              }

              if (!errorMessage || !isArgumentError) {
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

                if (!errorMessage && tool?.followUp !== false) {
                  needsFollowUp = true;
                }
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
                let errorMessage: string | undefined;
                let isArgumentError = false;
                if (wildcardTool?.handler) {
                  let parsedArgs: unknown;
                  try {
                    parsedArgs = JSON.parse(toolCall.function.arguments);
                  } catch (error) {
                    const parseError =
                      error instanceof Error
                        ? error
                        : new Error(String(error));
                    errorMessage = parseError.message;
                    isArgumentError = true;
                    await this.notifySubscribers(
                      (subscriber) =>
                        subscriber.onError?.({
                          copilotkit: this,
                          error: parseError,
                        }),
                      "Subscriber onError error:"
                    );
                  }

                  const wildcardArgs = {
                    toolName: toolCall.function.name,
                    args: parsedArgs,
                  };

                  await this.notifySubscribers(
                    (subscriber) =>
                      subscriber.onToolExecutionStart?.({
                        copilotkit: this,
                        toolCallId: toolCall.id,
                        agentId: effectiveAgentId,
                        toolName: toolCall.function.name,
                        args: wildcardArgs,
                      }),
                    "Subscriber onToolExecutionStart error:"
                  );

                  if (!errorMessage) {
                    try {
                      const result = await wildcardTool.handler(wildcardArgs as any);
                      if (result === undefined || result === null) {
                        toolCallResult = "";
                      } else if (typeof result === "string") {
                        toolCallResult = result;
                      } else {
                        toolCallResult = JSON.stringify(result);
                      }
                    } catch (error) {
                      const handlerError =
                        error instanceof Error
                          ? error
                          : new Error(String(error));
                      errorMessage = handlerError.message;
                      await this.notifySubscribers(
                        (subscriber) =>
                          subscriber.onError?.({
                            copilotkit: this,
                            error: handlerError,
                          }),
                        "Subscriber onError error:"
                      );
                    }
                  }

                  if (errorMessage) {
                    toolCallResult = `Error: ${errorMessage}`;
                  }

                  await this.notifySubscribers(
                    (subscriber) =>
                      subscriber.onToolExecutionEnd?.({
                        copilotkit: this,
                        toolCallId: toolCall.id,
                        agentId: effectiveAgentId,
                        toolName: toolCall.function.name,
                        result: errorMessage ? "" : toolCallResult,
                        error: errorMessage,
                      }),
                    "Subscriber onToolExecutionEnd error:"
                  );

                  if (isArgumentError) {
                    throw new Error(errorMessage ?? "Tool execution failed");
                  }
                }

                if (!errorMessage || !isArgumentError) {
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

                  if (!errorMessage && wildcardTool?.followUp !== false) {
                    needsFollowUp = true;
                  }
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

  private createAgentErrorSubscriber(
    agent: AbstractAgent,
    agentId?: string
  ): AgentSubscriber {
    const notifyError = async (error: Error) => {
      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onError?.({
            copilotkit: this,
            error,
          }),
        "Subscriber onError error:"
      );
    };

    return {
      onRunFailed: async ({ error }: { error: Error }) => {
        await notifyError(error);
      },
      onRunErrorEvent: async ({ event }) => {
        const eventError =
          event?.rawEvent instanceof Error
            ? event.rawEvent
            : event?.rawEvent?.error instanceof Error
              ? event.rawEvent.error
              : undefined;

        const errorMessage =
          typeof event?.rawEvent?.error === "string"
            ? event.rawEvent.error
            : event?.message ?? "Agent run error";

        const rawError = eventError ?? new Error(errorMessage);

        if (event?.code && !(rawError as any).code) {
          (rawError as any).code = event.code;
        }

        await notifyError(rawError);
      },
    };
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

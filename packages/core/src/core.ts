import { AgentDescription, randomUUID, RuntimeInfo, logger, partialJSONParse } from "@copilotkitnext/shared";
import { AbstractAgent, AgentSubscriber, Context, HttpAgent, Message, RunAgentResult, Tool } from "@ag-ui/client";
import {
  DynamicSuggestionsConfig,
  FrontendTool,
  StaticSuggestionsConfig,
  Suggestion,
  SuggestionsConfig,
} from "./types";
import { ProxiedCopilotRuntimeAgent } from "./agent";
import { zodToJsonSchema } from "zod-to-json-schema";

/** Configuration options for `CopilotKitCore`. */
export interface CopilotKitCoreConfig {
  /** The endpoint of the CopilotRuntime. */
  runtimeUrl?: string;
  /** Mapping from agent name to its `AbstractAgent` instance. For development only - production requires CopilotRuntime. */
  agents__unsafe_dev_only?: Record<string, AbstractAgent>;
  /** Headers appended to every HTTP request made by `CopilotKitCore`. */
  headers?: Record<string, string>;
  /** Properties sent as `forwardedProps` to the AG-UI agent. */
  properties?: Record<string, unknown>;
  /** Ordered collection of frontend tools available to the core. */
  tools?: FrontendTool<any>[];
  /** Suggestions config for the core. */
  suggestionsConfig?: SuggestionsConfig[];
}

export interface CopilotKitCoreAddAgentParams {
  id: string;
  agent: AbstractAgent;
}

export interface CopilotKitCoreRunAgentParams {
  agent: AbstractAgent;
  withMessages?: Message[];
}

export interface CopilotKitCoreConnectAgentParams {
  agent: AbstractAgent;
}

export interface CopilotKitCoreGetToolParams {
  toolName: string;
  agentId?: string;
}

export type CopilotKitCoreGetSuggestionsResult = {
  suggestions: Suggestion[];
  isLoading: boolean;
};

export enum CopilotKitCoreErrorCode {
  RUNTIME_INFO_FETCH_FAILED = "runtime_info_fetch_failed",
  AGENT_CONNECT_FAILED = "agent_connect_failed",
  AGENT_RUN_FAILED = "agent_run_failed",
  AGENT_RUN_FAILED_EVENT = "agent_run_failed_event",
  AGENT_RUN_ERROR_EVENT = "agent_run_error_event",
  TOOL_ARGUMENT_PARSE_FAILED = "tool_argument_parse_failed",
  TOOL_HANDLER_FAILED = "tool_handler_failed",
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
  onSuggestionsConfigChanged?: (event: {
    copilotkit: CopilotKitCore;
    suggestionsConfig: Readonly<Record<string, SuggestionsConfig>>;
  }) => void | Promise<void>;
  onSuggestionsChanged?: (event: {
    copilotkit: CopilotKitCore;
    agentId: string;
    suggestions: Suggestion[];
  }) => void | Promise<void>;
  onSuggestionsLoadingStart?: (event: { copilotkit: CopilotKitCore; agentId: string }) => void | Promise<void>;
  onSuggestionsLoadingEnd?: (event: { copilotkit: CopilotKitCore; agentId: string }) => void | Promise<void>;
  onPropertiesChanged?: (event: {
    copilotkit: CopilotKitCore;
    properties: Readonly<Record<string, unknown>>;
  }) => void | Promise<void>;
  onHeadersChanged?: (event: {
    copilotkit: CopilotKitCore;
    headers: Readonly<Record<string, string>>;
  }) => void | Promise<void>;
  onError?: (event: {
    copilotkit: CopilotKitCore;
    error: Error;
    code: CopilotKitCoreErrorCode;
    context: Record<string, any>;
  }) => void | Promise<void>;
}

export enum CopilotKitCoreRuntimeConnectionStatus {
  Disconnected = "disconnected",
  Connected = "connected",
  Connecting = "connecting",
  Error = "error",
}

export class CopilotKitCore {
  private _headers: Record<string, string>;
  private _properties: Record<string, unknown>;

  private _context: Record<string, Context> = {};
  private _suggestionsConfig: Record<string, SuggestionsConfig> = {};
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

  private _suggestions: Record<string, Record<string, Suggestion[]>> = {};
  private _runningSuggestions: Record<string, AbstractAgent[]> = {};

  constructor({
    runtimeUrl,
    headers = {},
    properties = {},
    agents__unsafe_dev_only = {},
    tools = [],
    suggestionsConfig = [],
  }: CopilotKitCoreConfig) {
    this._headers = headers;
    this._properties = properties;
    this.localAgents = this.assignAgentIds(agents__unsafe_dev_only);
    this.applyHeadersToAgents(this.localAgents);
    this._agents = this.localAgents;
    this._tools = tools;
    for (const config of suggestionsConfig) {
      this._suggestionsConfig[randomUUID()] = config;
    }
    this.setRuntimeUrl(runtimeUrl);
  }

  private applyHeadersToAgent(agent: AbstractAgent) {
    if (agent instanceof HttpAgent) {
      agent.headers = { ...this.headers };
    }
  }

  private applyHeadersToAgents(agents: Record<string, AbstractAgent>) {
    Object.values(agents).forEach((agent) => {
      this.applyHeadersToAgent(agent);
    });
  }

  private assignAgentIds(agents: Record<string, AbstractAgent>) {
    Object.entries(agents).forEach(([id, agent]) => {
      if (agent) {
        this.validateAndAssignAgentId(id, agent);
      }
    });
    return agents;
  }

  private validateAndAssignAgentId(registrationId: string, agent: AbstractAgent) {
    if (agent.agentId && agent.agentId !== registrationId) {
      throw new Error(
        `Agent registration mismatch: Agent with ID "${agent.agentId}" cannot be registered under key "${registrationId}". ` +
          `The agent ID must match the registration key or be undefined.`,
      );
    }
    if (!agent.agentId) {
      agent.agentId = registrationId;
    }
  }

  private async notifySubscribers(
    handler: (subscriber: CopilotKitCoreSubscriber) => void | Promise<void>,
    errorMessage: string,
  ) {
    await Promise.all(
      Array.from(this.subscribers).map(async (subscriber) => {
        try {
          await handler(subscriber);
        } catch (error) {
          logger.error(errorMessage, error);
        }
      }),
    );
  }

  private async emitError({
    error,
    code,
    context = {},
  }: {
    error: Error;
    code: CopilotKitCoreErrorCode;
    context?: Record<string, any>;
  }) {
    await this.notifySubscribers(
      (subscriber) =>
        subscriber.onError?.({
          copilotkit: this,
          error,
          code,
          context,
        }),
      "Subscriber onError error:",
    );
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
    const normalizedRuntimeUrl = runtimeUrl ? runtimeUrl.replace(/\/$/, "") : undefined;

    if (this._runtimeUrl === normalizedRuntimeUrl) {
      return;
    }

    this._runtimeUrl = normalizedRuntimeUrl;
    void this.updateRuntimeConnection();
  }

  get runtimeVersion(): string | undefined {
    return this._runtimeVersion;
  }

  get headers(): Readonly<Record<string, string>> {
    return this._headers;
  }

  get properties(): Readonly<Record<string, unknown>> {
    return this._properties;
  }

  get runtimeConnectionStatus(): CopilotKitCoreRuntimeConnectionStatus {
    return this._runtimeConnectionStatus;
  }

  /**
   * Runtime connection
   */
  private async updateRuntimeConnection() {
    if (!this.runtimeUrl) {
      this._runtimeConnectionStatus = CopilotKitCoreRuntimeConnectionStatus.Disconnected;
      this._runtimeVersion = undefined;
      this.remoteAgents = {};
      this._agents = this.localAgents;

      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onRuntimeConnectionStatusChanged?.({
            copilotkit: this,
            status: CopilotKitCoreRuntimeConnectionStatus.Disconnected,
          }),
        "Error in CopilotKitCore subscriber (onRuntimeConnectionStatusChanged):",
      );

      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onAgentsChanged?.({
            copilotkit: this,
            agents: this._agents,
          }),
        "Subscriber onAgentsChanged error:",
      );
      return;
    }

    this._runtimeConnectionStatus = CopilotKitCoreRuntimeConnectionStatus.Connecting;

    await this.notifySubscribers(
      (subscriber) =>
        subscriber.onRuntimeConnectionStatusChanged?.({
          copilotkit: this,
          status: CopilotKitCoreRuntimeConnectionStatus.Connecting,
        }),
      "Error in CopilotKitCore subscriber (onRuntimeConnectionStatusChanged):",
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
            agentId: id, // Runtime agents always have their ID set correctly
            description: description,
          });
          this.applyHeadersToAgent(agent);
          return [id, agent];
        }),
      );

      this.remoteAgents = agents;
      this._agents = { ...this.localAgents, ...this.remoteAgents };
      this._runtimeConnectionStatus = CopilotKitCoreRuntimeConnectionStatus.Connected;
      this._runtimeVersion = version;

      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onRuntimeConnectionStatusChanged?.({
            copilotkit: this,
            status: CopilotKitCoreRuntimeConnectionStatus.Connected,
          }),
        "Error in CopilotKitCore subscriber (onRuntimeConnectionStatusChanged):",
      );

      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onAgentsChanged?.({
            copilotkit: this,
            agents: this._agents,
          }),
        "Subscriber onAgentsChanged error:",
      );
    } catch (error) {
      this._runtimeConnectionStatus = CopilotKitCoreRuntimeConnectionStatus.Error;
      this._runtimeVersion = undefined;
      this.remoteAgents = {};
      this._agents = this.localAgents;

      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onRuntimeConnectionStatusChanged?.({
            copilotkit: this,
            status: CopilotKitCoreRuntimeConnectionStatus.Error,
          }),
        "Error in CopilotKitCore subscriber (onRuntimeConnectionStatusChanged):",
      );

      await this.notifySubscribers(
        (subscriber) =>
          subscriber.onAgentsChanged?.({
            copilotkit: this,
            agents: this._agents,
          }),
        "Subscriber onAgentsChanged error:",
      );
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      logger.warn(`Failed to load runtime info (${this.runtimeUrl}/info): ${message}`);
      const runtimeError = error instanceof Error ? error : new Error(String(error));
      await this.emitError({
        error: runtimeError,
        code: CopilotKitCoreErrorCode.RUNTIME_INFO_FETCH_FAILED,
        context: {
          runtimeUrl: this.runtimeUrl,
        },
      });
    }
  }

  /**
   * Configuration updates
   */
  setHeaders(headers: Record<string, string>) {
    this._headers = headers;
    this.applyHeadersToAgents(this._agents);
    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onHeadersChanged?.({
          copilotkit: this,
          headers: this.headers,
        }),
      "Subscriber onHeadersChanged error:",
    );
  }

  setProperties(properties: Record<string, unknown>) {
    this._properties = properties;
    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onPropertiesChanged?.({
          copilotkit: this,
          properties: this.properties,
        }),
      "Subscriber onPropertiesChanged error:",
    );
  }

  setAgents__unsafe_dev_only(agents: Record<string, AbstractAgent>) {
    // Validate all agents before making any changes
    Object.entries(agents).forEach(([id, agent]) => {
      if (agent) {
        this.validateAndAssignAgentId(id, agent);
      }
    });
    this.localAgents = agents;
    this._agents = { ...this.localAgents, ...this.remoteAgents };
    this.applyHeadersToAgents(this._agents);
    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onAgentsChanged?.({
          copilotkit: this,
          agents: this._agents,
        }),
      "Subscriber onAgentsChanged error:",
    );
  }

  addAgent__unsafe_dev_only({ id, agent }: CopilotKitCoreAddAgentParams) {
    this.validateAndAssignAgentId(id, agent);
    this.localAgents[id] = agent;
    this.applyHeadersToAgent(agent);
    this._agents = { ...this.localAgents, ...this.remoteAgents };
    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onAgentsChanged?.({
          copilotkit: this,
          agents: this._agents,
        }),
      "Subscriber onAgentsChanged error:",
    );
  }

  removeAgent__unsafe_dev_only(id: string) {
    delete this.localAgents[id];
    this._agents = { ...this.localAgents, ...this.remoteAgents };
    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onAgentsChanged?.({
          copilotkit: this,
          agents: this._agents,
        }),
      "Subscriber onAgentsChanged error:",
    );
  }

  getAgent(id: string): AbstractAgent | undefined {
    if (id in this._agents) {
      return this._agents[id] as AbstractAgent;
    }

    if (
      this.runtimeUrl !== undefined &&
      (this.runtimeConnectionStatus === CopilotKitCoreRuntimeConnectionStatus.Disconnected ||
        this.runtimeConnectionStatus === CopilotKitCoreRuntimeConnectionStatus.Connecting)
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
      "Subscriber onContextChanged error:",
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
      "Subscriber onContextChanged error:",
    );
  }

  /**
   * Suggestions management
   */
  addSuggestionsConfig(config: SuggestionsConfig) {
    const id = randomUUID();
    this._suggestionsConfig[id] = config;
    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onSuggestionsConfigChanged?.({
          copilotkit: this,
          suggestionsConfig: this._suggestionsConfig,
        }),
      "Subscriber onSuggestionsConfigChanged error:",
    );
    return id;
  }

  removeSuggestionsConfig(id: string) {
    delete this._suggestionsConfig[id];
    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onSuggestionsConfigChanged?.({
          copilotkit: this,
          suggestionsConfig: this._suggestionsConfig,
        }),
      "Subscriber onSuggestionsConfigChanged error:",
    );
  }

  public reloadSuggestions(agentId: string) {
    this.clearSuggestions(agentId);

    let hasAnySuggestions = false;
    for (const config of Object.values(this._suggestionsConfig)) {
      if (isDynamicSuggestionsConfig(config)) {
        if (
          config.suggestionsConsumerAgentId === undefined ||
          config.suggestionsConsumerAgentId === "*" ||
          config.suggestionsConsumerAgentId === agentId
        ) {
          const suggestionId = randomUUID();
          if (!hasAnySuggestions) {
            hasAnySuggestions = true;
            void this.notifySubscribers(
              (subscriber) =>
                subscriber.onSuggestionsLoadingStart?.({
                  copilotkit: this,
                  agentId,
                }),
              "Subscriber onSuggestionsLoadingStart error:",
            );
          }
          void this.generateSuggestions(suggestionId, config, agentId);
        }
      } else if (isStaticSuggestionsConfig(config)) {
        // TODO implement static suggestions
      }
    }
  }

  public clearSuggestions(agentId: string) {
    if (this._runningSuggestions[agentId]) {
      for (const agent of this._runningSuggestions[agentId]) {
        agent.abortRun();
      }
      delete this._runningSuggestions[agentId];
    }
    this._suggestions[agentId] = {};

    void this.notifySubscribers(
      (subscriber) =>
        subscriber.onSuggestionsChanged?.({
          copilotkit: this,
          agentId,
          suggestions: [],
        }),
      "Subscriber onSuggestionsChanged error:",
    );
  }

  public getSuggestions(agentId: string): CopilotKitCoreGetSuggestionsResult {
    const suggestions = Object.values(this._suggestions[agentId] ?? {}).flat();
    const isLoading = (this._runningSuggestions[agentId]?.length ?? 0) > 0;
    return { suggestions, isLoading };
  }

  /**
   * Tool management
   */
  addTool<T extends Record<string, unknown> = Record<string, unknown>>(tool: FrontendTool<T>) {
    // Check if a tool with the same name and agentId already exists
    const existingToolIndex = this._tools.findIndex((t) => t.name === tool.name && t.agentId === tool.agentId);

    if (existingToolIndex !== -1) {
      logger.warn(`Tool already exists: '${tool.name}' for agent '${tool.agentId || "global"}', skipping.`);
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
      const agentTool = this._tools.find((tool) => tool.name === toolName && tool.agentId === agentId);
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
  async connectAgent({ agent }: CopilotKitCoreConnectAgentParams): Promise<RunAgentResult> {
    try {
      if (agent instanceof HttpAgent) {
        agent.headers = { ...this.headers };
      }

      const runAgentResult = await agent.connectAgent(
        {
          forwardedProps: this.properties,
          tools: this.buildFrontendTools(agent.agentId),
        },
        this.createAgentErrorSubscriber(agent),
      );

      return this.processAgentResult({ runAgentResult, agent });
    } catch (error) {
      const connectError = error instanceof Error ? error : new Error(String(error));
      const context: Record<string, any> = {};
      if (agent.agentId) {
        context.agentId = agent.agentId;
      }
      await this.emitError({
        error: connectError,
        code: CopilotKitCoreErrorCode.AGENT_CONNECT_FAILED,
        context,
      });
      throw error;
    }
  }

  async runAgent({ agent, withMessages }: CopilotKitCoreRunAgentParams): Promise<RunAgentResult> {
    if (agent instanceof HttpAgent) {
      agent.headers = { ...this.headers };
    }

    if (withMessages) {
      agent.addMessages(withMessages);
    }
    try {
      const runAgentResult = await agent.runAgent(
        {
          forwardedProps: this.properties,
          tools: this.buildFrontendTools(agent.agentId),
        },
        this.createAgentErrorSubscriber(agent),
      );
      return this.processAgentResult({ runAgentResult, agent });
    } catch (error) {
      const runError = error instanceof Error ? error : new Error(String(error));
      const context: Record<string, any> = {};
      if (agent.agentId) {
        context.agentId = agent.agentId;
      }
      if (withMessages) {
        context.messageCount = withMessages.length;
      }
      await this.emitError({
        error: runError,
        code: CopilotKitCoreErrorCode.AGENT_RUN_FAILED,
        context,
      });
      throw error;
    }
  }

  private async processAgentResult({
    runAgentResult,
    agent,
  }: {
    runAgentResult: RunAgentResult;
    agent: AbstractAgent;
  }): Promise<RunAgentResult> {
    const { newMessages } = runAgentResult;
    // Agent ID is guaranteed to be set by validateAndAssignAgentId
    const agentId = agent.agentId!;

    let needsFollowUp = false;

    for (const message of newMessages) {
      if (message.role === "assistant") {
        for (const toolCall of message.toolCalls || []) {
          if (newMessages.findIndex((m) => m.role === "tool" && m.toolCallId === toolCall.id) === -1) {
            const tool = this.getTool({
              toolName: toolCall.function.name,
              agentId: agent.agentId,
            });
            if (tool) {
              // Check if tool is constrained to a specific agent
              if (tool?.agentId && tool.agentId !== agent.agentId) {
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
                  const parseError = error instanceof Error ? error : new Error(String(error));
                  errorMessage = parseError.message;
                  isArgumentError = true;
                  await this.emitError({
                    error: parseError,
                    code: CopilotKitCoreErrorCode.TOOL_ARGUMENT_PARSE_FAILED,
                    context: {
                      agentId: agentId,
                      toolCallId: toolCall.id,
                      toolName: toolCall.function.name,
                      rawArguments: toolCall.function.arguments,
                      toolType: "specific",
                      messageId: message.id,
                    },
                  });
                }

                await this.notifySubscribers(
                  (subscriber) =>
                    subscriber.onToolExecutionStart?.({
                      copilotkit: this,
                      toolCallId: toolCall.id,
                      agentId: agentId,
                      toolName: toolCall.function.name,
                      args: parsedArgs,
                    }),
                  "Subscriber onToolExecutionStart error:",
                );

                if (!errorMessage) {
                  try {
                    const result = await tool.handler(parsedArgs as any, toolCall);
                    if (result === undefined || result === null) {
                      toolCallResult = "";
                    } else if (typeof result === "string") {
                      toolCallResult = result;
                    } else {
                      toolCallResult = JSON.stringify(result);
                    }
                  } catch (error) {
                    const handlerError = error instanceof Error ? error : new Error(String(error));
                    errorMessage = handlerError.message;
                    await this.emitError({
                      error: handlerError,
                      code: CopilotKitCoreErrorCode.TOOL_HANDLER_FAILED,
                      context: {
                        agentId: agentId,
                        toolCallId: toolCall.id,
                        toolName: toolCall.function.name,
                        parsedArgs,
                        toolType: "specific",
                        messageId: message.id,
                      },
                    });
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
                      agentId: agentId,
                      toolName: toolCall.function.name,
                      result: errorMessage ? "" : toolCallResult,
                      error: errorMessage,
                    }),
                  "Subscriber onToolExecutionEnd error:",
                );

                if (isArgumentError) {
                  throw new Error(errorMessage ?? "Tool execution failed");
                }
              }

              if (!errorMessage || !isArgumentError) {
                const messageIndex = agent.messages.findIndex((m) => m.id === message.id);
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
              const wildcardTool = this.getTool({ toolName: "*", agentId: agent.agentId });
              if (wildcardTool) {
                // Check if wildcard tool is constrained to a specific agent
                if (wildcardTool?.agentId && wildcardTool.agentId !== agent.agentId) {
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
                    const parseError = error instanceof Error ? error : new Error(String(error));
                    errorMessage = parseError.message;
                    isArgumentError = true;
                    await this.emitError({
                      error: parseError,
                      code: CopilotKitCoreErrorCode.TOOL_ARGUMENT_PARSE_FAILED,
                      context: {
                        agentId: agentId,
                        toolCallId: toolCall.id,
                        toolName: toolCall.function.name,
                        rawArguments: toolCall.function.arguments,
                        toolType: "wildcard",
                        messageId: message.id,
                      },
                    });
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
                        agentId: agentId,
                        toolName: toolCall.function.name,
                        args: wildcardArgs,
                      }),
                    "Subscriber onToolExecutionStart error:",
                  );

                  if (!errorMessage) {
                    try {
                      const result = await wildcardTool.handler(wildcardArgs as any, toolCall);
                      if (result === undefined || result === null) {
                        toolCallResult = "";
                      } else if (typeof result === "string") {
                        toolCallResult = result;
                      } else {
                        toolCallResult = JSON.stringify(result);
                      }
                    } catch (error) {
                      const handlerError = error instanceof Error ? error : new Error(String(error));
                      errorMessage = handlerError.message;
                      await this.emitError({
                        error: handlerError,
                        code: CopilotKitCoreErrorCode.TOOL_HANDLER_FAILED,
                        context: {
                          agentId: agentId,
                          toolCallId: toolCall.id,
                          toolName: toolCall.function.name,
                          parsedArgs: wildcardArgs,
                          toolType: "wildcard",
                          messageId: message.id,
                        },
                      });
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
                        agentId: agentId,
                        toolName: toolCall.function.name,
                        result: errorMessage ? "" : toolCallResult,
                        error: errorMessage,
                      }),
                    "Subscriber onToolExecutionEnd error:",
                  );

                  if (isArgumentError) {
                    throw new Error(errorMessage ?? "Tool execution failed");
                  }
                }

                if (!errorMessage || !isArgumentError) {
                  const messageIndex = agent.messages.findIndex((m) => m.id === message.id);
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
      return await this.runAgent({ agent });
    }

    void this.reloadSuggestions(agentId);

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

  private createAgentErrorSubscriber(agent: AbstractAgent): AgentSubscriber {
    const emitAgentError = async (
      error: Error,
      code: CopilotKitCoreErrorCode,
      extraContext: Record<string, any> = {},
    ) => {
      const context: Record<string, any> = { ...extraContext };
      if (agent.agentId) {
        context.agentId = agent.agentId;
      }
      await this.emitError({
        error,
        code,
        context,
      });
    };

    return {
      onRunFailed: async ({ error }: { error: Error }) => {
        await emitAgentError(error, CopilotKitCoreErrorCode.AGENT_RUN_FAILED_EVENT, {
          source: "onRunFailed",
        });
      },
      onRunErrorEvent: async ({ event }) => {
        const eventError =
          event?.rawEvent instanceof Error
            ? event.rawEvent
            : event?.rawEvent?.error instanceof Error
              ? event.rawEvent.error
              : undefined;

        const errorMessage =
          typeof event?.rawEvent?.error === "string" ? event.rawEvent.error : (event?.message ?? "Agent run error");

        const rawError = eventError ?? new Error(errorMessage);

        if (event?.code && !(rawError as any).code) {
          (rawError as any).code = event.code;
        }

        await emitAgentError(rawError, CopilotKitCoreErrorCode.AGENT_RUN_ERROR_EVENT, {
          source: "onRunErrorEvent",
          event,
          runtimeErrorCode: event?.code,
        });
      },
    };
  }

  private async generateSuggestions(
    suggestionId: string,
    config: DynamicSuggestionsConfig,
    suggestionsConsumerAgentId: string,
  ): Promise<void> {
    let agent: AbstractAgent | undefined = undefined;
    try {
      const suggestionsProviderAgent = this.getAgent(config.suggestionsProviderAgentId ?? "default");
      if (!suggestionsProviderAgent) {
        throw new Error(`Suggestions provider agent not found: ${config.suggestionsProviderAgentId}`);
      }
      const suggestionsConsumerAgent = this.getAgent(suggestionsConsumerAgentId);
      if (!suggestionsConsumerAgent) {
        throw new Error(`Suggestions consumer agent not found: ${suggestionsConsumerAgentId}`);
      }

      const clonedAgent: AbstractAgent = suggestionsProviderAgent.clone();
      agent = clonedAgent;
      agent.agentId = suggestionId;
      agent.threadId = suggestionId;
      agent.messages = JSON.parse(JSON.stringify(suggestionsConsumerAgent.messages));
      agent.state = JSON.parse(JSON.stringify(suggestionsConsumerAgent.state));

      // Initialize suggestion storage for this agent/suggestion combo
      this._suggestions[suggestionsConsumerAgentId] = {
        ...(this._suggestions[suggestionsConsumerAgentId] ?? {}),
        [suggestionId]: [],
      };
      this._runningSuggestions[suggestionsConsumerAgentId] = [
        ...(this._runningSuggestions[suggestionsConsumerAgentId] ?? []),
        agent,
      ];

      agent.addMessage({
        id: suggestionId,
        role: "user",
        content: [
          `Suggest what the user could say next. Provide clear, highly relevant suggestions by calling the \`copilotkitSuggest\` tool.`,
          `Provide at least ${config.minSuggestions ?? 1} and at most ${config.maxSuggestions ?? 3} suggestions.`,
          `The user has the following tools available: ${JSON.stringify(this.buildFrontendTools(suggestionsConsumerAgentId))}.`,
          ` ${config.instructions}`,
        ].join("\n"),
      });

      await agent.runAgent(
        {
          context: Object.values(this._context),
          forwardedProps: {
            ...this.properties,
            toolChoice: { type: "function", function: { name: "copilotkitSuggest" } },
          },
          tools: [suggestTool],
        },
        {
          onMessagesChanged: ({ messages }) => {
            const idx = messages.findIndex((message) => message.id === suggestionId);
            if (idx == -1) {
              return;
            }

            const newMessages = messages.slice(idx + 1);
            const suggestions: Suggestion[] = [];
            for (const message of newMessages) {
              if (message.role === "assistant" && message.toolCalls) {
                for (const toolCall of message.toolCalls) {
                  if (toolCall.function.name === "copilotkitSuggest") {
                    // Join all argument chunks into a single string for parsing
                    // arguments can be either a string or an array of strings
                    const fullArgs = Array.isArray(toolCall.function.arguments)
                      ? toolCall.function.arguments.join("")
                      : toolCall.function.arguments;
                    const parsed = partialJSONParse(fullArgs);
                    if (parsed && typeof parsed === "object" && "suggestions" in parsed) {
                      const parsedSuggestions = (parsed as any).suggestions;
                      if (Array.isArray(parsedSuggestions)) {
                        for (const item of parsedSuggestions) {
                          if (item && typeof item === "object" && "title" in item) {
                            suggestions.push({
                              title: item.title ?? "",
                              message: item.message ?? "",
                            });
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            if (
              this._suggestions[suggestionsConsumerAgentId] &&
              this._suggestions[suggestionsConsumerAgentId][suggestionId]
            ) {
              this._suggestions[suggestionsConsumerAgentId][suggestionId] = suggestions;
              void this.notifySubscribers(
                (subscriber) =>
                  subscriber.onSuggestionsChanged?.({
                    copilotkit: this,
                    agentId: suggestionsConsumerAgentId,
                    suggestions,
                  }),
                "Subscriber onSuggestionsChanged error: suggestions changed",
              );
            }
          },
        },
      );
    } catch (error) {
      console.warn("Error generating suggestions:", error);
    } finally {
      // Remove this agent from running suggestions
      if (agent && this._runningSuggestions[suggestionsConsumerAgentId]) {
        this._runningSuggestions[suggestionsConsumerAgentId] = this._runningSuggestions[
          suggestionsConsumerAgentId
        ].filter((a) => a !== agent);

        // If no more suggestions are running, emit loading end event
        if (this._runningSuggestions[suggestionsConsumerAgentId].length === 0) {
          delete this._runningSuggestions[suggestionsConsumerAgentId];
          await this.notifySubscribers(
            (subscriber) =>
              subscriber.onSuggestionsLoadingEnd?.({
                copilotkit: this,
                agentId: suggestionsConsumerAgentId,
              }),
            "Subscriber onSuggestionsLoadingEnd error:",
          );
        }
      }
    }
  }
}

function isDynamicSuggestionsConfig(config: SuggestionsConfig): config is DynamicSuggestionsConfig {
  return "instructions" in config;
}

function isStaticSuggestionsConfig(config: SuggestionsConfig): config is StaticSuggestionsConfig {
  return "suggestions" in config;
}

const suggestTool: Tool = {
  name: "copilotkitSuggest",
  description: "Suggest what the user could say next",
  parameters: {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        description: "List of suggestions shown to the user as buttons.",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "The title of the suggestion. This is shown as a button and should be short.",
            },
            message: {
              type: "string",
              description:
                "The message to send when the suggestion is clicked. This should be a clear, complete sentence " +
                "and will be sent as an instruction to the AI.",
            },
          },
          required: ["title", "message"],
          additionalProperties: false,
        },
      },
    },
    required: ["suggestions"],
    additionalProperties: false,
  },
};

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

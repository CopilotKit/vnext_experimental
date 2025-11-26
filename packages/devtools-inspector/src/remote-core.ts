import {
  CopilotKitCoreErrorCode,
  CopilotKitCoreRuntimeConnectionStatus,
  type CopilotKitCoreSubscriber,
} from "@copilotkitnext/core";
import type {
  AgentEventType,
  AgentSnapshot,
  AgentsPayload,
  ContextPayload,
  EventsPatchPayload,
  InitInstancePayload,
  InspectorEvent,
  RuntimeStatusPayload,
  ToolsPayload,
} from "./types";

type AgentSubscriberLike = {
  onRunStartedEvent?: (params: { event: unknown }) => void;
  onRunFinishedEvent?: (params: { event: unknown; result?: unknown }) => void;
  onRunErrorEvent?: (params: { event: unknown }) => void;
  onTextMessageStartEvent?: (params: { event: unknown }) => void;
  onTextMessageContentEvent?: (params: { event: unknown; textMessageBuffer?: string }) => void;
  onTextMessageEndEvent?: (params: { event: unknown; textMessageBuffer?: string }) => void;
  onToolCallStartEvent?: (params: { event: unknown }) => void;
  onToolCallArgsEvent?: (params: {
    event: unknown;
    toolCallBuffer?: string;
    toolCallName?: string;
    partialToolCallArgs?: Record<string, unknown>;
  }) => void;
  onToolCallEndEvent?: (params: { event: unknown; toolCallArgs?: Record<string, unknown>; toolCallName?: string }) => void;
  onToolCallResultEvent?: (params: { event: unknown }) => void;
  onStateSnapshotEvent?: (params: { event: unknown }) => void;
  onStateDeltaEvent?: (params: { event: unknown }) => void;
  onMessagesSnapshotEvent?: (params: { event: unknown }) => void;
  onRawEvent?: (params: { event: unknown }) => void;
  onCustomEvent?: (params: { event: unknown }) => void;
  onEvent?: (params: { event: unknown }) => void;
  onMessagesChanged?: (params?: unknown) => void;
  onStateChanged?: (params?: unknown) => void;
};

const createDefaultParams = (agent: RemoteAgent) => ({
  agent,
  messages: agent.messages ?? [],
  state: agent.state ?? {},
  input: {},
});

class RemoteAgent {
  agentId: string;
  toolHandlers?: Record<string, unknown>;
  toolRenderers?: Record<string, unknown>;
  state?: unknown;
  messages?: unknown[];

  private subscribers: Set<AgentSubscriberLike> = new Set();

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  updateSnapshot(snapshot: AgentSnapshot): void {
    this.toolHandlers = snapshot.toolHandlers;
    this.toolRenderers = snapshot.toolRenderers;

    if ("state" in snapshot) {
      this.state = snapshot.state;
      this.notifyStateChanged();
    }

    if (snapshot.messages) {
      this.messages = snapshot.messages as unknown[];
      this.notifyMessagesChanged();
    }
  }

  emitEvents(events: InspectorEvent[]): void {
    for (const event of events) {
      this.dispatchEvent(event);
    }
  }

  subscribe(subscriber: AgentSubscriberLike): { unsubscribe: () => void } {
    this.subscribers.add(subscriber);
    return {
      unsubscribe: () => {
        this.subscribers.delete(subscriber);
      },
    };
  }

  private dispatchEvent(event: InspectorEvent): void {
    const params = createDefaultParams(this);
    const payload = event.payload as Record<string, unknown>;

    for (const subscriber of this.subscribers) {
      switch (event.type as AgentEventType) {
        case "RUN_STARTED":
          subscriber.onRunStartedEvent?.({ ...params, event: payload });
          break;
        case "RUN_FINISHED":
          subscriber.onRunFinishedEvent?.({
            ...params,
            event: (payload as { event?: unknown }).event ?? payload,
            result: (payload as { result?: unknown }).result,
          });
          break;
        case "RUN_ERROR":
          subscriber.onRunErrorEvent?.({ ...params, event: payload });
          break;
        case "TEXT_MESSAGE_START":
          subscriber.onTextMessageStartEvent?.({ ...params, event: payload });
          break;
        case "TEXT_MESSAGE_CONTENT":
          subscriber.onTextMessageContentEvent?.({
            ...params,
            event: payload,
            textMessageBuffer: (payload as { textMessageBuffer?: string }).textMessageBuffer ?? "",
          });
          break;
        case "TEXT_MESSAGE_END":
          subscriber.onTextMessageEndEvent?.({
            ...params,
            event: payload,
            textMessageBuffer: (payload as { textMessageBuffer?: string }).textMessageBuffer ?? "",
          });
          break;
        case "TOOL_CALL_START":
          subscriber.onToolCallStartEvent?.({ ...params, event: payload });
          break;
        case "TOOL_CALL_ARGS":
          subscriber.onToolCallArgsEvent?.({
            ...params,
            event: payload,
            toolCallBuffer: (payload as { toolCallBuffer?: string }).toolCallBuffer ?? "",
            toolCallName: (payload as { toolCallName?: string }).toolCallName ?? "",
            partialToolCallArgs: (payload as { partialToolCallArgs?: Record<string, unknown> }).partialToolCallArgs ?? {},
          });
          break;
        case "TOOL_CALL_END":
          subscriber.onToolCallEndEvent?.({
            ...params,
            event: payload,
            toolCallName: (payload as { toolCallName?: string }).toolCallName ?? "",
            toolCallArgs: (payload as { toolCallArgs?: Record<string, unknown> }).toolCallArgs ?? {},
          });
          break;
        case "TOOL_CALL_RESULT":
          subscriber.onToolCallResultEvent?.({ ...params, event: payload });
          break;
        case "STATE_SNAPSHOT":
          subscriber.onStateSnapshotEvent?.({ ...params, event: payload });
          this.notifyStateChanged();
          break;
        case "STATE_DELTA":
          subscriber.onStateDeltaEvent?.({ ...params, event: payload });
          this.notifyStateChanged();
          break;
        case "MESSAGES_SNAPSHOT":
          subscriber.onMessagesSnapshotEvent?.({ ...params, event: payload });
          this.notifyMessagesChanged();
          break;
        case "RAW_EVENT":
          subscriber.onRawEvent?.({ ...params, event: payload });
          break;
        case "CUSTOM_EVENT":
          subscriber.onCustomEvent?.({ ...params, event: payload });
          break;
        default:
          // Unknown event types are still surfaced to generic handlers if available.
          subscriber.onEvent?.({ ...params, event: payload as unknown as { type: string } });
          break;
      }
    }
  }

  private notifyMessagesChanged(): void {
    const params = createDefaultParams(this);
    for (const subscriber of this.subscribers) {
      subscriber.onMessagesChanged?.(params);
    }
  }

  private notifyStateChanged(): void {
    const params = createDefaultParams(this);
    for (const subscriber of this.subscribers) {
      subscriber.onStateChanged?.(params);
    }
  }
}

export class RemoteCopilotCore
{
  runtimeConnectionStatus: CopilotKitCoreRuntimeConnectionStatus = CopilotKitCoreRuntimeConnectionStatus.Disconnected;
  properties: Readonly<Record<string, unknown>> = {};
  context: Record<string, { value?: unknown; description?: string }> = {};
  tools: unknown[] = [];

  agents: Record<string, RemoteAgent> = {};

  private subscribers: Set<CopilotKitCoreSubscriber> = new Set();
  private lastError: { code?: CopilotKitCoreErrorCode; message: string } | null = null;

  reset(payload: InitInstancePayload): void {
    this.updateStatus(payload.status ?? { runtimeStatus: CopilotKitCoreRuntimeConnectionStatus.Disconnected, properties: {} });
    this.applyAgents({ agents: payload.agents ?? [] });
    this.updateTools({ tools: payload.tools ?? [] });
    this.updateContext({ context: payload.context ?? {} });

    if (payload.events?.length) {
      this.applyEvents({ events: payload.events });
    }
  }

  updateStatus(payload: RuntimeStatusPayload): void {
    this.runtimeConnectionStatus = payload.runtimeStatus ?? CopilotKitCoreRuntimeConnectionStatus.Disconnected;
    this.properties = payload.properties ?? {};
    const incomingCode = payload.lastError?.code;
    const normalizedCode = incomingCode && Object.values(CopilotKitCoreErrorCode).includes(incomingCode as CopilotKitCoreErrorCode)
      ? (incomingCode as CopilotKitCoreErrorCode)
      : undefined;
    this.lastError = payload.lastError ? { code: normalizedCode, message: payload.lastError.message } : null;

    this.notify((subscriber) =>
      subscriber.onRuntimeConnectionStatusChanged?.({
        copilotkit: this as unknown as import("@copilotkitnext/core").CopilotKitCore,
        status: this.runtimeConnectionStatus,
      }),
    );

    this.notify((subscriber) =>
      subscriber.onPropertiesChanged?.({
        copilotkit: this as unknown as import("@copilotkitnext/core").CopilotKitCore,
        properties: this.properties,
      }),
    );

    if (this.lastError) {
      const errCode = this.lastError.code ?? CopilotKitCoreErrorCode.AGENT_RUN_FAILED;
      this.notify((subscriber) =>
        subscriber.onError?.({
          copilotkit: this as unknown as import("@copilotkitnext/core").CopilotKitCore,
          error: new Error(this.lastError?.message),
          code: errCode,
          context: {},
        }),
      );
    }
  }

  updateTools(payload: ToolsPayload): void {
    this.tools = payload.tools ?? [];
    this.notifyAgentsChanged();
  }

  updateContext(payload: ContextPayload): void {
    this.context = payload.context ?? {};
    this.notify((subscriber) =>
      subscriber.onContextChanged?.({
        copilotkit: this as unknown as import("@copilotkitnext/core").CopilotKitCore,
        context: this.context as unknown as Readonly<Record<string, { value: string; description: string }>>,
      }),
    );
  }

  applyAgents(payload: AgentsPayload): void {
    const incomingIds = new Set<string>();
    for (const snapshot of payload.agents) {
      if (!snapshot.agentId) continue;
      incomingIds.add(snapshot.agentId);
      const existing = this.agents[snapshot.agentId] ?? new RemoteAgent(snapshot.agentId);
      existing.updateSnapshot(snapshot);
      this.agents[snapshot.agentId] = existing;
    }

    for (const agentId of Object.keys(this.agents)) {
      if (!incomingIds.has(agentId)) {
        delete this.agents[agentId];
      }
    }

    this.notifyAgentsChanged();
  }

  applyEvents(payload: EventsPatchPayload): void {
    if (!payload.events?.length) {
      return;
    }

    const grouped = new Map<string, InspectorEvent[]>();
    for (const event of payload.events) {
      if (!grouped.has(event.agentId)) {
        grouped.set(event.agentId, []);
      }
      grouped.get(event.agentId)!.push(event);
    }

    for (const [agentId, events] of grouped.entries()) {
      if (!this.agents[agentId]) {
        this.agents[agentId] = new RemoteAgent(agentId);
      }
      this.agents[agentId]!.emitEvents(events);
    }
  }

  subscribe(subscriber: CopilotKitCoreSubscriber): { unsubscribe: () => void } {
    this.subscribers.add(subscriber);
    return {
      unsubscribe: () => this.subscribers.delete(subscriber),
    };
  }

  private notify(handler: (subscriber: CopilotKitCoreSubscriber) => void): void {
    for (const subscriber of this.subscribers) {
      handler(subscriber);
    }
  }

  private notifyAgentsChanged(): void {
    this.notify((subscriber) =>
      subscriber.onAgentsChanged?.({
        copilotkit: this as unknown as import("@copilotkitnext/core").CopilotKitCore,
        agents: this.agents as unknown as Readonly<Record<string, import("@ag-ui/client").AbstractAgent>>,
      }),
    );
  }
}

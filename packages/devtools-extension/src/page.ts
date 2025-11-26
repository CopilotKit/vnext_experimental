import type { AbstractAgent, AgentSubscriber } from "@ag-ui/client";
import {
  CopilotKitCoreRuntimeConnectionStatus,
  type CopilotKitCore,
  type CopilotKitCoreSubscriber,
} from "@copilotkitnext/core";
import type { FrontendTool } from "@copilotkitnext/core";
import type {
  AgentSnapshot,
  AgentsPayload,
  EventsPatchPayload,
  InitInstancePayload,
  InspectorEvent,
  RuntimeStatusPayload,
} from "@copilotkitnext/devtools-inspector";
import { chunkEnvelope } from "./shared/chunking";
import { MAX_AGENT_EVENTS, MAX_TOTAL_EVENTS, PAGE_SOURCE, type Envelope } from "./shared/protocol";
import {
  extractTools,
  normalizeAgentMessages,
  normalizeContextStore,
  normalizeEventPayload,
  sanitizeForLogging,
} from "./shared/normalize";

class PageBridge {
  private core: CopilotKitCore | null = null;
  private coreUnsubscribe: (() => void) | null = null;
  private attachTimer: number | null = null;
  private agentSubscriptions: Map<string, () => void> = new Map();
  private agentMessages: Map<string, AgentSnapshot["messages"]> = new Map();
  private agentStates: Map<string, AgentSnapshot["state"]> = new Map();
  private agentEvents: Map<string, InspectorEvent[]> = new Map();
  private flattenedEvents: InspectorEvent[] = [];
  private eventCounter = 0;
  private lastError: { code?: string; message: string } | null = null;
  private toolsPoller: number | null = null;
  private lastToolsSignature = "";

  start(): void {
    this.installGlobalHook();
    this.tryAttach();
    this.attachTimer = window.setInterval(() => {
      if (!this.core) {
        this.tryAttach();
      }
    }, 1200);
  }

  private tryAttach(): void {
    if (this.core) {
      return;
    }

    const globalWindow = window as unknown as Record<string, unknown>;
    const candidates: Array<unknown> = [
      globalWindow.__COPILOTKIT_CORE__,
      (globalWindow.copilotkit as { core?: unknown } | undefined)?.core,
      globalWindow.copilotkitCore,
      (globalWindow.__COPILOTKIT_DEVTOOLS__ as { core?: unknown } | undefined)?.core,
    ];

    const found = candidates.find((candidate) => !!candidate && typeof candidate === "object") as CopilotKitCore | undefined;
    if (found) {
      this.attachToCore(found);
      if (this.attachTimer !== null) {
        window.clearInterval(this.attachTimer);
      }
    }
  }

  private attachToCore(core: CopilotKitCore): void {
    (window as GlobalWithDevtools).__COPILOTKIT_DEVTOOLS__!.core = core;
    this.detachFromCore();
    this.core = core;
    this.startToolsPolling();

    const subscriber: CopilotKitCoreSubscriber = {
      onRuntimeConnectionStatusChanged: ({ status }) => {
        this.emitStatus({ runtimeStatus: status, properties: core.properties, lastError: this.lastError });
      },
      onPropertiesChanged: ({ properties }) => {
        this.emitStatus({ runtimeStatus: core.runtimeConnectionStatus, properties, lastError: this.lastError });
      },
      onError: ({ code, error }) => {
        this.lastError = { code, message: error.message };
        this.emitStatus({ runtimeStatus: core.runtimeConnectionStatus, properties: core.properties, lastError: this.lastError });
        this.postMessage("ERROR", { message: error.message, code });
      },
      onAgentsChanged: ({ agents }) => {
        this.processAgentsChanged(agents);
      },
      onContextChanged: ({ context }) => {
        this.emitContext(context);
      },
    };

    this.coreUnsubscribe = core.subscribe(subscriber).unsubscribe;
    this.processAgentsChanged(core.agents);
    this.emitInitSnapshot();
  }

  private detachFromCore(): void {
    if (this.coreUnsubscribe) {
      this.coreUnsubscribe();
    }
    this.core = null;
    this.coreUnsubscribe = null;
    this.stopToolsPolling();
    this.agentSubscriptions.forEach((unsubscribe) => unsubscribe());
    this.agentSubscriptions.clear();
    this.agentMessages.clear();
    this.agentStates.clear();
    this.agentEvents.clear();
    this.flattenedEvents = [];
    this.eventCounter = 0;
    this.lastError = null;
  }

  private emitStatus(status?: RuntimeStatusPayload): void {
    if (!this.core && !status) {
      return;
    }

    const payload: RuntimeStatusPayload = status ?? {
      runtimeStatus: this.core?.runtimeConnectionStatus ?? CopilotKitCoreRuntimeConnectionStatus.Disconnected,
      properties: this.core?.properties ?? {},
      lastError: this.lastError,
    };

    this.postMessage("STATUS", payload);
  }

  private emitContext(context?: Readonly<Record<string, unknown>> | null): void {
    if (!this.core && !context) {
      return;
    }
    this.postMessage("CONTEXT", { context: normalizeContextStore(context ?? this.core?.context) });
  }

  private emitTools(): void {
    if (!this.core) {
      return;
    }
    const tools = extractTools(
      (this.core as unknown as { tools?: FrontendTool<Record<string, unknown>>[] | undefined }).tools ?? [],
      this.core.agents,
    );
    const signature = JSON.stringify(sanitizeForLogging(tools));
    if (signature === this.lastToolsSignature) {
      return;
    }
    this.lastToolsSignature = signature;
    this.postMessage("TOOLS", { tools });
  }

  private startToolsPolling(): void {
    this.stopToolsPolling();
    // Push an initial tools payload so the panel sees existing tools immediately.
    this.emitTools();
    this.toolsPoller = window.setInterval(() => {
      this.emitTools();
    }, 1000);
  }

  private stopToolsPolling(): void {
    if (this.toolsPoller !== null) {
      window.clearInterval(this.toolsPoller);
      this.toolsPoller = null;
    }
    this.lastToolsSignature = "";
  }

  private emitAgents(agentIds?: string[]): void {
    const ids = agentIds ?? Array.from(this.agentSubscriptions.keys());
    const agents: AgentSnapshot[] = [];

    for (const agentId of ids) {
      const agent = this.core?.agents?.[agentId];
      if (!agent) continue;
      agents.push({
        agentId,
        toolHandlers: (agent as { toolHandlers?: Record<string, unknown> }).toolHandlers,
        toolRenderers: (agent as { toolRenderers?: Record<string, unknown> }).toolRenderers,
        state: this.agentStates.get(agentId),
        messages: this.agentMessages.get(agentId),
      });
    }

    const payload: AgentsPayload = { agents };

    this.postMessage("AGENTS", payload);
  }

  private emitInitSnapshot(): void {
    if (!this.core) {
      return;
    }

    const payload: InitInstancePayload = {
      status: {
        runtimeStatus: this.core.runtimeConnectionStatus,
        properties: this.core.properties,
        lastError: this.lastError,
      },
      context: normalizeContextStore(this.core.context),
      tools: extractTools(
        (this.core as unknown as { tools?: FrontendTool<Record<string, unknown>>[] | undefined }).tools ?? [],
        this.core.agents,
      ),
      agents: Array.from(this.agentSubscriptions.keys()).flatMap((agentId) => {
        const agent = this.core!.agents?.[agentId];
        if (!agent) return [];
        return [
          {
            agentId,
            toolHandlers: (agent as { toolHandlers?: Record<string, unknown> } | undefined)?.toolHandlers,
            toolRenderers: (agent as { toolRenderers?: Record<string, unknown> } | undefined)?.toolRenderers,
            state: this.agentStates.get(agentId),
            messages: this.agentMessages.get(agentId),
          },
        ];
      }),
      events: this.flattenedEvents,
    };

    this.postMessage("INIT_INSTANCE", payload);
  }

  private processAgentsChanged(agents: Readonly<Record<string, AbstractAgent>>): void {
    const seen = new Set<string>();

    for (const agent of Object.values(agents)) {
      if (!agent?.agentId) {
        continue;
      }
      seen.add(agent.agentId);
      this.subscribeToAgent(agent);
    }

    for (const agentId of Array.from(this.agentSubscriptions.keys())) {
      if (!seen.has(agentId)) {
        this.unsubscribeFromAgent(agentId);
        this.agentStates.delete(agentId);
        this.agentMessages.delete(agentId);
        this.agentEvents.delete(agentId);
      }
    }

    this.emitAgents();
    this.emitTools();
  }

  private subscribeToAgent(agent: AbstractAgent): void {
    if (!agent?.agentId) {
      return;
    }

    const agentId = agent.agentId;
    this.unsubscribeFromAgent(agentId);

    const subscriber: AgentSubscriber = {
      onRunStartedEvent: ({ event }) => this.recordAgentEvent(agentId, "RUN_STARTED", event),
      onRunFinishedEvent: ({ event, result }) => this.recordAgentEvent(agentId, "RUN_FINISHED", { event, result }),
      onRunErrorEvent: ({ event }) => this.recordAgentEvent(agentId, "RUN_ERROR", event),
      onTextMessageStartEvent: ({ event }) => this.recordAgentEvent(agentId, "TEXT_MESSAGE_START", event),
      onTextMessageContentEvent: ({ event, textMessageBuffer }) =>
        this.recordAgentEvent(agentId, "TEXT_MESSAGE_CONTENT", { event, textMessageBuffer }),
      onTextMessageEndEvent: ({ event, textMessageBuffer }) =>
        this.recordAgentEvent(agentId, "TEXT_MESSAGE_END", { event, textMessageBuffer }),
      onToolCallStartEvent: ({ event }) => this.recordAgentEvent(agentId, "TOOL_CALL_START", event),
      onToolCallArgsEvent: ({ event, toolCallBuffer, toolCallName, partialToolCallArgs }) =>
        this.recordAgentEvent(agentId, "TOOL_CALL_ARGS", { event, toolCallBuffer, toolCallName, partialToolCallArgs }),
      onToolCallEndEvent: ({ event, toolCallArgs, toolCallName }) =>
        this.recordAgentEvent(agentId, "TOOL_CALL_END", { event, toolCallArgs, toolCallName }),
      onToolCallResultEvent: ({ event }) => this.recordAgentEvent(agentId, "TOOL_CALL_RESULT", event),
      onStateSnapshotEvent: ({ event }) => {
        this.recordAgentEvent(agentId, "STATE_SNAPSHOT", event);
        this.syncAgentState(agent);
      },
      onStateDeltaEvent: ({ event }) => {
        this.recordAgentEvent(agentId, "STATE_DELTA", event);
        this.syncAgentState(agent);
      },
      onMessagesSnapshotEvent: ({ event }) => {
        this.recordAgentEvent(agentId, "MESSAGES_SNAPSHOT", event);
        this.syncAgentMessages(agent);
      },
      onMessagesChanged: () => this.syncAgentMessages(agent),
      onRawEvent: ({ event }) => this.recordAgentEvent(agentId, "RAW_EVENT", event),
      onCustomEvent: ({ event }) => this.recordAgentEvent(agentId, "CUSTOM_EVENT", event),
    };

    const { unsubscribe } = agent.subscribe(subscriber);
    this.agentSubscriptions.set(agentId, unsubscribe);
    this.syncAgentMessages(agent);
    this.syncAgentState(agent);

    if (!this.agentEvents.has(agentId)) {
      this.agentEvents.set(agentId, []);
    }
  }

  private unsubscribeFromAgent(agentId: string): void {
    const unsubscribe = this.agentSubscriptions.get(agentId);
    if (unsubscribe) {
      unsubscribe();
      this.agentSubscriptions.delete(agentId);
    }
  }

  private recordAgentEvent(agentId: string, type: InspectorEvent["type"], payload: unknown): void {
    const eventId = `${agentId}:${++this.eventCounter}`;
    const normalizedPayload = normalizeEventPayload(type, payload);
    const event: InspectorEvent = {
      id: eventId,
      agentId,
      type,
      timestamp: Date.now(),
      payload: normalizedPayload,
    };

    const currentEvents = this.agentEvents.get(agentId) ?? [];
    const nextAgentEvents = [event, ...currentEvents].slice(0, MAX_AGENT_EVENTS);
    this.agentEvents.set(agentId, nextAgentEvents);

    this.flattenedEvents = [event, ...this.flattenedEvents];
    if (this.flattenedEvents.length > MAX_TOTAL_EVENTS) {
      const removed = this.flattenedEvents.splice(MAX_TOTAL_EVENTS);
      for (const ev of removed) {
        const perAgent = this.agentEvents.get(ev.agentId);
        if (perAgent) {
          this.agentEvents.set(ev.agentId, perAgent.filter((item) => item.id !== ev.id));
        }
      }
    }

    this.emitEventsPatch([event]);

    // Keep messages in sync for message-related events so the agents view stays populated.
    if (this.isMessageEvent(type)) {
      const agent = this.core?.agents?.[agentId];
      if (agent) {
        this.syncAgentMessages(agent);
      }
    }
  }

  private emitEventsPatch(events: InspectorEvent[]): void {
    const payload: EventsPatchPayload = { events };
    this.postMessage("EVENTS_PATCH", payload);
  }

  private isMessageEvent(type: InspectorEvent["type"]): boolean {
    return (
      type === "TEXT_MESSAGE_START" ||
      type === "TEXT_MESSAGE_CONTENT" ||
      type === "TEXT_MESSAGE_END" ||
      type === "MESSAGES_SNAPSHOT"
    );
  }

  private syncAgentMessages(agent: AbstractAgent): void {
    if (!agent?.agentId) {
      return;
    }

    const messages = normalizeAgentMessages((agent as { messages?: unknown }).messages);
    if (messages) {
      this.agentMessages.set(agent.agentId, messages);
    } else {
      this.agentMessages.delete(agent.agentId);
    }

    this.emitAgents([agent.agentId]);
  }

  private syncAgentState(agent: AbstractAgent): void {
    if (!agent?.agentId) {
      return;
    }

    const state = (agent as { state?: unknown }).state;
    if (state === undefined || state === null) {
      this.agentStates.delete(agent.agentId);
    } else {
      this.agentStates.set(agent.agentId, sanitizeForLogging(state));
    }

    this.emitAgents([agent.agentId]);
  }

  private postMessage(type: Envelope["type"], payload?: Envelope["payload"]): void {
    const envelope: Envelope = {
      source: PAGE_SOURCE,
      type,
      payload,
    };

    const chunks = chunkEnvelope(envelope);
    for (const chunk of chunks) {
      window.postMessage(chunk, "*");
    }
  }

  private installGlobalHook(): void {
    const globalWindow = window as GlobalWithDevtools;
    if (!globalWindow.__COPILOTKIT_DEVTOOLS__) {
      const hook = {
        core: undefined as CopilotKitCore | undefined,
        setCore: (nextCore: CopilotKitCore) => {
          hook.core = nextCore;
          this.attachToCore(nextCore);
        },
      };
      globalWindow.__COPILOTKIT_DEVTOOLS__ = hook;
    } else if (globalWindow.__COPILOTKIT_DEVTOOLS__?.core) {
      this.attachToCore(globalWindow.__COPILOTKIT_DEVTOOLS__.core);
    }
  }
}

(() => {
  const bridge = new PageBridge();
  bridge.start();
})();

type GlobalWithDevtools = Window & {
  __COPILOTKIT_DEVTOOLS__?: {
    core?: CopilotKitCore;
    setCore: (core: CopilotKitCore) => void;
  };
};

import { CopilotKitCoreRuntimeConnectionStatus } from "@copilotkitnext/core";
import type {
  AgentsPayload,
  ContextPayload,
  EventsPatchPayload,
  InitInstancePayload,
  InspectorEvent,
  RuntimeStatusPayload,
  ToolsPayload,
} from "@copilotkitnext/devtools-inspector";
import { chunkEnvelope, reassembleEnvelope } from "./shared/chunking";
import {
  EXTENSION_SOURCE,
  MAX_AGENT_EVENTS,
  MAX_TOTAL_EVENTS,
  PAGE_SOURCE,
  type Envelope,
  type MessageType,
} from "./shared/protocol";

type TabCache = {
  status?: RuntimeStatusPayload;
  agents?: AgentsPayload;
  tools?: ToolsPayload;
  context?: ContextPayload;
  events: InspectorEvent[];
};

const tabPorts = new Map<number, chrome.runtime.Port>();
const monitorPorts = new Map<number, Set<chrome.runtime.Port>>();
const tabChunkBuffers = new Map<number, Map<string, { header: Envelope; chunks: string[] }>>();
const monitorChunkBuffers = new Map<chrome.runtime.Port, Map<string, { header: Envelope; chunks: string[] }>>();
const caches = new Map<number, TabCache>();

const getCache = (tabId: number): TabCache => {
  if (!caches.has(tabId)) {
    caches.set(tabId, { events: [] });
  }
  return caches.get(tabId)!;
};

const enforceEventCaps = (events: InspectorEvent[]): InspectorEvent[] => {
  const capped: InspectorEvent[] = [];
  const perAgentCounts = new Map<string, number>();

  for (const event of events) {
    const currentCount = perAgentCounts.get(event.agentId) ?? 0;
    if (currentCount >= MAX_AGENT_EVENTS) {
      continue;
    }
    perAgentCounts.set(event.agentId, currentCount + 1);
    capped.push(event);
    if (capped.length >= MAX_TOTAL_EVENTS) {
      break;
    }
  }

  return capped;
};

const applyEventsPatch = (tabId: number, payload: EventsPatchPayload): EventsPatchPayload => {
  const cache = getCache(tabId);
  const merged = [...(payload.events ?? []), ...(cache.events ?? [])];
  cache.events = enforceEventCaps(merged);
  return { events: payload.events ?? [] };
};

const sendToPort = (port: chrome.runtime.Port, envelope: Envelope): void => {
  const chunks = chunkEnvelope(envelope);
  chunks.forEach((chunk) => port.postMessage(chunk));
};

const broadcastToMonitors = (tabId: number, envelope: Envelope): void => {
  const ports = monitorPorts.get(tabId);
  if (!ports?.size) {
    return;
  }
  for (const port of ports) {
    sendToPort(port, envelope);
  }
};

const replayCacheToMonitor = (tabId: number, port: chrome.runtime.Port): void => {
  const cache = getCache(tabId);
  const initPayload: InitInstancePayload = {
    status:
      cache.status ??
      ({
        runtimeStatus: CopilotKitCoreRuntimeConnectionStatus.Disconnected,
        properties: {},
      } satisfies RuntimeStatusPayload),
    agents: cache.agents?.agents ?? [],
    tools: cache.tools?.tools ?? [],
    context: cache.context?.context ?? {},
    events: cache.events ?? [],
  };

  sendToPort(port, {
    source: EXTENSION_SOURCE,
    type: "INIT_INSTANCE",
    tabId,
    payload: initPayload,
  });
};

const broadcastDisconnectedStatus = (tabId: number): void => {
  const cache = getCache(tabId);
  cache.status = {
    runtimeStatus: CopilotKitCoreRuntimeConnectionStatus.Disconnected,
    properties: cache.status?.properties ?? {},
  };

  broadcastToMonitors(tabId, {
    source: EXTENSION_SOURCE,
    type: "STATUS",
    tabId,
    payload: cache.status,
  });
};

const handleTabMessage = (tabId: number, envelope: Envelope): void => {
  const cache = getCache(tabId);
  const { type } = envelope;

  switch (type as MessageType) {
    case "INIT_INSTANCE": {
      const payload = (envelope.payload ?? {}) as InitInstancePayload;
      cache.status = payload.status ?? cache.status;
      cache.agents = payload.agents ? { agents: payload.agents } : cache.agents;
      cache.tools = payload.tools ? { tools: payload.tools } : cache.tools;
      cache.context = payload.context ? { context: payload.context } : cache.context;
      cache.events = enforceEventCaps(payload.events ?? []);
      broadcastToMonitors(tabId, { ...envelope, source: EXTENSION_SOURCE, tabId });
      break;
    }
    case "STATUS": {
      const payload = envelope.payload as RuntimeStatusPayload;
      cache.status = payload;
      broadcastToMonitors(tabId, { ...envelope, source: EXTENSION_SOURCE, tabId });
      break;
    }
    case "AGENTS": {
      cache.agents = envelope.payload as AgentsPayload;
      broadcastToMonitors(tabId, { ...envelope, source: EXTENSION_SOURCE, tabId });
      break;
    }
    case "TOOLS": {
      cache.tools = envelope.payload as ToolsPayload;
      broadcastToMonitors(tabId, { ...envelope, source: EXTENSION_SOURCE, tabId });
      break;
    }
    case "CONTEXT": {
      cache.context = envelope.payload as ContextPayload;
      broadcastToMonitors(tabId, { ...envelope, source: EXTENSION_SOURCE, tabId });
      break;
    }
    case "EVENTS_PATCH": {
      const payload = applyEventsPatch(tabId, envelope.payload as EventsPatchPayload);
      broadcastToMonitors(tabId, { ...envelope, payload, source: EXTENSION_SOURCE, tabId });
      break;
    }
    case "CLEAR": {
      cache.events = [];
      broadcastToMonitors(tabId, { ...envelope, source: EXTENSION_SOURCE, tabId });
      break;
    }
    case "ERROR": {
      broadcastToMonitors(tabId, { ...envelope, source: EXTENSION_SOURCE, tabId });
      break;
    }
    default:
      break;
  }
};

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "tab") {
    const tabId = port.sender?.tab?.id;
    if (typeof tabId !== "number") {
      port.disconnect();
      return;
    }

    tabPorts.set(tabId, port);
    const buffer = new Map<string, { header: Envelope; chunks: string[] }>();
    tabChunkBuffers.set(tabId, buffer);

    port.onMessage.addListener((message) => {
      const assembled = reassembleEnvelope(message as Envelope, buffer);
      if (!assembled || assembled.source !== PAGE_SOURCE) {
        return;
      }
      handleTabMessage(tabId, assembled);
    });

    port.onDisconnect.addListener(() => {
      broadcastDisconnectedStatus(tabId);
      tabPorts.delete(tabId);
      tabChunkBuffers.delete(tabId);
    });
    return;
  }

  if (port.name.startsWith("monitor")) {
    const tabId = Number(port.name.replace("monitor", ""));
    if (!Number.isFinite(tabId)) {
      port.disconnect();
      return;
    }

    if (!monitorPorts.has(tabId)) {
      monitorPorts.set(tabId, new Set());
    }
    monitorPorts.get(tabId)!.add(port);
    const buffer = new Map<string, { header: Envelope; chunks: string[] }>();
    monitorChunkBuffers.set(port, buffer);

    port.onMessage.addListener((message) => {
      const assembled = reassembleEnvelope(message as Envelope, buffer);
      if (!assembled) {
        return;
      }

      if (assembled.type === "REQUEST_INIT") {
        replayCacheToMonitor(tabId, port);
        return;
      }

      if (assembled.type === "PANEL_READY") {
        replayCacheToMonitor(tabId, port);
      }
    });

    port.onDisconnect.addListener(() => {
      monitorPorts.get(tabId)?.delete(port);
      monitorChunkBuffers.delete(port);
      if (monitorPorts.get(tabId)?.size === 0) {
        monitorPorts.delete(tabId);
      }
    });
  }
});

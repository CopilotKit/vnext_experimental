import type {
  AgentsPayload,
  ContextPayload,
  EventsPatchPayload,
  InitInstancePayload,
  RuntimeStatusPayload,
  ToolsPayload,
} from "@copilotkitnext/devtools-inspector";

export const PAGE_SOURCE = "@copilotkit-page" as const;
export const EXTENSION_SOURCE = "@copilotkit-extension" as const;

export type MessageType =
  | "INIT_INSTANCE"
  | "STATUS"
  | "AGENTS"
  | "TOOLS"
  | "CONTEXT"
  | "EVENTS_PATCH"
  | "CLEAR"
  | "ERROR"
  | "REQUEST_INIT"
  | "PANEL_READY";

export type Envelope<T = unknown> = {
  source: typeof PAGE_SOURCE | typeof EXTENSION_SOURCE;
  type: MessageType;
  payload?: T;
  payloadChunk?: string;
  split?: "start" | "chunk" | "end";
  id?: string;
  tabId?: number;
};

export type ExtensionPayload =
  | InitInstancePayload
  | RuntimeStatusPayload
  | AgentsPayload
  | ToolsPayload
  | ContextPayload
  | EventsPatchPayload
  | { message?: string };

export const MAX_AGENT_EVENTS = 200;
export const MAX_TOTAL_EVENTS = 500;
export const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024;
export const PAYLOAD_CHUNK_SIZE = 5 * 1024 * 1024;

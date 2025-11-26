import type { CopilotKitCoreRuntimeConnectionStatus } from "@copilotkitnext/core";

export type SanitizedValue =
  | string
  | number
  | boolean
  | null
  | SanitizedValue[]
  | {
      [key: string]: SanitizedValue;
    };

export type AgentEventType =
  | "RUN_STARTED"
  | "RUN_FINISHED"
  | "RUN_ERROR"
  | "TEXT_MESSAGE_START"
  | "TEXT_MESSAGE_CONTENT"
  | "TEXT_MESSAGE_END"
  | "TOOL_CALL_START"
  | "TOOL_CALL_ARGS"
  | "TOOL_CALL_END"
  | "TOOL_CALL_RESULT"
  | "STATE_SNAPSHOT"
  | "STATE_DELTA"
  | "MESSAGES_SNAPSHOT"
  | "RAW_EVENT"
  | "CUSTOM_EVENT";

export type InspectorToolCall = {
  id?: string;
  function?: {
    name?: string;
    arguments?: SanitizedValue | string;
  };
  toolName?: string;
  status?: string;
};

export type InspectorMessage = {
  id?: string;
  role: string;
  contentText: string;
  contentRaw?: SanitizedValue;
  toolCalls: InspectorToolCall[];
};

export type InspectorToolDefinition = {
  agentId: string;
  name: string;
  description?: string;
  parameters?: unknown;
  type: "handler" | "renderer";
};

export type InspectorEvent = {
  id: string;
  agentId: string;
  type: AgentEventType | string;
  timestamp: number;
  payload: SanitizedValue;
};

export type ContextEntry = {
  description?: string;
  value: unknown;
};

export type AgentSnapshot = {
  agentId: string;
  toolHandlers?: Record<string, unknown>;
  toolRenderers?: Record<string, unknown>;
  state?: SanitizedValue | null;
  messages?: InspectorMessage[];
};

export type AgentsPayload = {
  agents: AgentSnapshot[];
};

export type RuntimeStatusPayload = {
  runtimeStatus: CopilotKitCoreRuntimeConnectionStatus | null;
  properties: Readonly<Record<string, unknown>>;
  lastError?: { code?: string; message: string } | null;
};

export type ToolsPayload = {
  tools: InspectorToolDefinition[];
};

export type ContextPayload = {
  context: Record<string, ContextEntry>;
};

export type EventsPatchPayload = {
  events: InspectorEvent[];
};

export type InitInstancePayload = {
  status?: RuntimeStatusPayload;
  agents?: AgentSnapshot[];
  tools?: InspectorToolDefinition[];
  context?: Record<string, ContextEntry>;
  events?: InspectorEvent[];
};

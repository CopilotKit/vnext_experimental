import type { AbstractAgent } from "@ag-ui/client";
import type {
  AgentEventType,
  InspectorMessage,
  InspectorToolCall,
  InspectorToolDefinition,
  SanitizedValue,
} from "@copilotkitnext/devtools-inspector";
import type { FrontendTool } from "@copilotkitnext/core";

export function sanitizeForLogging(value: unknown, depth = 0, seen = new WeakSet<object>()): SanitizedValue {
  if (value === undefined) {
    return "[undefined]";
  }

  if (value === null || typeof value === "number" || typeof value === "boolean" || typeof value === "string") {
    return value as SanitizedValue;
  }

  if (typeof value === "bigint" || typeof value === "symbol" || typeof value === "function") {
    return String(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    if (depth >= 4) {
      return "[Truncated depth]";
    }
    return value.map((item) => sanitizeForLogging(item, depth + 1, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value as object)) {
      return "[Circular]";
    }
    seen.add(value as object);

    if (depth >= 4) {
      return "[Truncated depth]";
    }

    const result: Record<string, SanitizedValue> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = sanitizeForLogging(entry, depth + 1, seen);
    }
    return result;
  }

  return String(value);
}

export function normalizeEventPayload(_type: AgentEventType | string, payload: unknown): SanitizedValue {
  if (payload && typeof payload === "object" && "event" in (payload as Record<string, unknown>)) {
    const { event, ...rest } = payload as Record<string, unknown>;
    const cleaned = Object.keys(rest).length === 0 ? event : { event, ...rest };
    return sanitizeForLogging(cleaned);
  }

  return sanitizeForLogging(payload);
}

function normalizeMessageContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const parts = content
      .map((entry) => {
        if (typeof entry === "string") {
          return entry;
        }
        if (entry && typeof entry === "object") {
          const record = entry as Record<string, unknown>;
          if (typeof record.text === "string") {
            return record.text;
          }
          if (typeof record.content === "string") {
            return record.content;
          }
          if (record.type === "text" && typeof record.value === "string") {
            return record.value;
          }
        }
        return "";
      })
      .filter(Boolean);

    if (parts.length) {
      return parts.join("\n\n");
    }
  }

  if (content && typeof content === "object" && "text" in (content as Record<string, unknown>)) {
    const maybeText = (content as Record<string, unknown>).text;
    if (typeof maybeText === "string") {
      return maybeText;
    }
  }

  if (content === null || content === undefined) {
    return "";
  }

  if (typeof content === "object") {
    try {
      return JSON.stringify(sanitizeForLogging(content));
    } catch {
      return "";
    }
  }

  return String(content);
}

function normalizeToolCalls(raw: unknown): InspectorToolCall[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const call = entry as Record<string, unknown>;
      const fn = call.function as Record<string, unknown> | undefined;
      const functionName =
        typeof fn?.name === "string" ? fn.name : typeof call.toolName === "string" ? call.toolName : undefined;
      const args = fn && "arguments" in fn ? (fn as Record<string, unknown>).arguments : call.arguments;

      const normalized: InspectorToolCall = {
        id: typeof call.id === "string" ? call.id : undefined,
        toolName: typeof call.toolName === "string" ? call.toolName : functionName,
        status: typeof call.status === "string" ? call.status : undefined,
      };

      if (functionName) {
        normalized.function = {
          name: functionName,
          arguments: sanitizeForLogging(args),
        };
      }

      return normalized;
    })
    .filter((call): call is InspectorToolCall => Boolean(call));
}

function normalizeAgentMessage(message: unknown): InspectorMessage | null {
  if (!message || typeof message !== "object") {
    return null;
  }

  const raw = message as Record<string, unknown>;
  const role = typeof raw.role === "string" ? raw.role : "unknown";
  const contentText = normalizeMessageContent(raw.content);
  const toolCalls = normalizeToolCalls(raw.toolCalls);

  return {
    id: typeof raw.id === "string" ? raw.id : undefined,
    role,
    contentText,
    contentRaw: raw.content !== undefined ? sanitizeForLogging(raw.content) : undefined,
    toolCalls,
  };
}

export function normalizeAgentMessages(messages: unknown): InspectorMessage[] | null {
  if (!Array.isArray(messages)) {
    return null;
  }

  const normalized = messages
    .map((message) => normalizeAgentMessage(message))
    .filter((msg): msg is InspectorMessage => msg !== null);

  return normalized;
}

export function normalizeContextStore(
  context: Readonly<Record<string, unknown>> | null | undefined,
): Record<string, { description?: string; value: unknown }> {
  if (!context || typeof context !== "object") {
    return {};
  }

  const normalized: Record<string, { description?: string; value: unknown }> = {};
  for (const [key, entry] of Object.entries(context)) {
    if (entry && typeof entry === "object" && "value" in (entry as Record<string, unknown>)) {
      const candidate = entry as Record<string, unknown>;
      const description =
        typeof candidate.description === "string" && candidate.description.trim().length > 0
          ? candidate.description
          : undefined;
      normalized[key] = { description, value: candidate.value };
    } else {
      normalized[key] = { value: entry };
    }
  }

  return normalized;
}

export function extractTools(
  coreTools: ReadonlyArray<FrontendTool<Record<string, unknown>>> | undefined,
  agents: Readonly<Record<string, AbstractAgent>>,
): InspectorToolDefinition[] {
  const tools: InspectorToolDefinition[] = [];

  for (const coreTool of coreTools ?? []) {
    tools.push({
      agentId: (coreTool.agentId as string) ?? "",
      name: coreTool.name,
      description: coreTool.description,
      parameters: coreTool.parameters,
      type: "handler",
    });
  }

  for (const [agentId, agent] of Object.entries(agents)) {
    if (!agent) continue;

    const handlers = (agent as { toolHandlers?: Record<string, unknown> }).toolHandlers;
    if (handlers && typeof handlers === "object") {
      for (const [toolName, handler] of Object.entries(handlers)) {
        if (handler && typeof handler === "object") {
          const handlerObj = handler as Record<string, unknown>;
          tools.push({
            agentId,
            name: toolName,
            description:
              (typeof handlerObj.description === "string" && handlerObj.description) ||
              (handlerObj.tool as { description?: string } | undefined)?.description,
            parameters:
              handlerObj.parameters ?? (handlerObj.tool as { parameters?: unknown } | undefined)?.parameters,
            type: "handler",
          });
        }
      }
    }

    const renderers = (agent as { toolRenderers?: Record<string, unknown> }).toolRenderers;
    if (renderers && typeof renderers === "object") {
      for (const [toolName, renderer] of Object.entries(renderers)) {
        if (tools.some((tool) => tool.agentId === agentId && tool.name === toolName)) {
          continue;
        }
        if (renderer && typeof renderer === "object") {
          const rendererObj = renderer as Record<string, unknown>;
          tools.push({
            agentId,
            name: toolName,
            description:
              (typeof rendererObj.description === "string" && rendererObj.description) ||
              (rendererObj.tool as { description?: string } | undefined)?.description,
            parameters:
              rendererObj.parameters ?? (rendererObj.tool as { parameters?: unknown } | undefined)?.parameters,
            type: "renderer",
          });
        }
      }
    }
  }

  return tools;
}

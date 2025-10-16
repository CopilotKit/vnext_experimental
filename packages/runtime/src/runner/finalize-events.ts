import { randomUUID } from "node:crypto";
import {
  BaseEvent,
  EventType,
  RunErrorEvent,
} from "@ag-ui/client";

interface FinalizeRunOptions {
  stopRequested?: boolean;
  interruptionMessage?: string;
}

const defaultInterruptionMessage = "Run stopped by user";

export function finalizeRunEvents(
  events: BaseEvent[],
  options: FinalizeRunOptions = {},
): BaseEvent[] {
  const { stopRequested = false, interruptionMessage = defaultInterruptionMessage } = options;

  const appended: BaseEvent[] = [];

  const openMessageIds = new Set<string>();
  const openToolCalls = new Map<
    string,
    {
      hasEnd: boolean;
      hasResult: boolean;
    }
  >();

  for (const event of events) {
    switch (event.type) {
      case EventType.TEXT_MESSAGE_START: {
        const messageId = (event as { messageId?: string }).messageId;
        if (typeof messageId === "string") {
          openMessageIds.add(messageId);
        }
        break;
      }
      case EventType.TEXT_MESSAGE_END: {
        const messageId = (event as { messageId?: string }).messageId;
        if (typeof messageId === "string") {
          openMessageIds.delete(messageId);
        }
        break;
      }
      case EventType.TOOL_CALL_START: {
        const toolCallId = (event as { toolCallId?: string }).toolCallId;
        if (typeof toolCallId === "string") {
          openToolCalls.set(toolCallId, {
            hasEnd: false,
            hasResult: false,
          });
        }
        break;
      }
      case EventType.TOOL_CALL_END: {
        const toolCallId = (event as { toolCallId?: string }).toolCallId;
        const info = toolCallId ? openToolCalls.get(toolCallId) : undefined;
        if (info) {
          info.hasEnd = true;
        }
        break;
      }
      case EventType.TOOL_CALL_RESULT: {
        const toolCallId = (event as { toolCallId?: string }).toolCallId;
        const info = toolCallId ? openToolCalls.get(toolCallId) : undefined;
        if (info) {
          info.hasResult = true;
        }
        break;
      }
      default:
        break;
    }
  }

  if (stopRequested) {
    for (const messageId of openMessageIds) {
      const endEvent = {
        type: EventType.TEXT_MESSAGE_END,
        messageId,
      } as BaseEvent;
      events.push(endEvent);
      appended.push(endEvent);
    }

    for (const [toolCallId, info] of openToolCalls) {
      if (!info.hasEnd) {
        const endEvent = {
          type: EventType.TOOL_CALL_END,
          toolCallId,
        } as BaseEvent;
        events.push(endEvent);
        appended.push(endEvent);
      }

      if (!info.hasResult) {
        const resultEvent = {
          type: EventType.TOOL_CALL_RESULT,
          toolCallId,
          messageId: `${toolCallId ?? randomUUID()}-result`,
          role: "tool",
          content: JSON.stringify({ status: "interrupted" }),
        } as BaseEvent;
        events.push(resultEvent);
        appended.push(resultEvent);
      }
    }

    const hasTerminalEvent = events.some(
      (event) => event.type === EventType.RUN_FINISHED || event.type === EventType.RUN_ERROR,
    );

    if (!hasTerminalEvent) {
      const errorEvent: RunErrorEvent = {
        type: EventType.RUN_ERROR,
        message: interruptionMessage,
        code: "STOPPED",
      };
      events.push(errorEvent);
      appended.push(errorEvent);
    }
  }

  return appended;
}

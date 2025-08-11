import { ReplaySubject } from "rxjs";
import {
  BaseEvent,
  EventType,
  TextMessageContentEvent,
  TextMessageEndEvent,
  TextMessageStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallResultEvent,
  ToolCallStartEvent,
  Message,
} from "@ag-ui/client";

export interface EventStore {
  subject: ReplaySubject<BaseEvent> | null;
  isRunning: boolean;
  abortController: AbortController;
  seenMessageIds: Set<string>;
  currentRunId: string | null;
  currentRunEvents: BaseEvent[];
}

export function convertMessageToEvents(message: Message): BaseEvent[] {
  const events: BaseEvent[] = [];

  if (
    (message.role === "assistant" ||
      message.role === "user" ||
      message.role === "developer" ||
      message.role === "system") &&
    message.content
  ) {
    const textStartEvent: TextMessageStartEvent = {
      type: EventType.TEXT_MESSAGE_START,
      messageId: message.id,
      role: message.role,
    };
    events.push(textStartEvent);

    const textContentEvent: TextMessageContentEvent = {
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId: message.id,
      delta: message.content,
    };
    events.push(textContentEvent);

    const textEndEvent: TextMessageEndEvent = {
      type: EventType.TEXT_MESSAGE_END,
      messageId: message.id,
    };
    events.push(textEndEvent);
  }

  if (message.role === "assistant" && message.toolCalls) {
    for (const toolCall of message.toolCalls) {
      const toolStartEvent: ToolCallStartEvent = {
        type: EventType.TOOL_CALL_START,
        toolCallId: toolCall.id,
        toolCallName: toolCall.function.name,
        parentMessageId: message.id,
      };
      events.push(toolStartEvent);

      const toolArgsEvent: ToolCallArgsEvent = {
        type: EventType.TOOL_CALL_ARGS,
        toolCallId: toolCall.id,
        delta: toolCall.function.arguments,
      };
      events.push(toolArgsEvent);

      const toolEndEvent: ToolCallEndEvent = {
        type: EventType.TOOL_CALL_END,
        toolCallId: toolCall.id,
      };
      events.push(toolEndEvent);
    }
  }

  if (message.role === "tool" && message.toolCallId) {
    const toolResultEvent: ToolCallResultEvent = {
      type: EventType.TOOL_CALL_RESULT,
      messageId: message.id,
      toolCallId: message.toolCallId,
      content: message.content,
      role: "tool",
    };
    events.push(toolResultEvent);
  }

  return events;
}

export function emitMessageEvents(
  message: Message,
  nextSubject: ReplaySubject<BaseEvent>,
  currentRunEvents: BaseEvent[],
  seenMessageIds: Set<string>
): void {
  if (!seenMessageIds.has(message.id)) {
    seenMessageIds.add(message.id);
    const events = convertMessageToEvents(message);
    for (const event of events) {
      nextSubject.next(event);
      currentRunEvents.push(event);
    }
  }
}

export function processInputMessages(
  messages: Message[] | undefined,
  nextSubject: ReplaySubject<BaseEvent>,
  currentRunEvents: BaseEvent[],
  seenMessageIds: Set<string>
): void {
  if (messages) {
    for (const message of messages) {
      emitMessageEvents(message, nextSubject, currentRunEvents, seenMessageIds);
    }
  }
}

export function completeRun(
  store: EventStore,
  runSubject: ReplaySubject<BaseEvent>,
  nextSubject: ReplaySubject<BaseEvent>
): void {
  store.isRunning = false;
  store.currentRunId = null;
  store.currentRunEvents = [];
  runSubject.complete();
  nextSubject.complete();
}

export function emitHistoricEventsToConnection(
  compactedHistoric: BaseEvent[],
  connectionSubject: ReplaySubject<BaseEvent>
): Set<string> {
  const emittedMessageIds = new Set<string>();
  
  for (const event of compactedHistoric) {
    connectionSubject.next(event);
    if ('messageId' in event && typeof event.messageId === 'string') {
      emittedMessageIds.add(event.messageId);
    }
  }
  
  return emittedMessageIds;
}

export function bridgeActiveRunToConnection(
  store: EventStore | undefined | null,
  emittedMessageIds: Set<string>,
  connectionSubject: ReplaySubject<BaseEvent>
): void {
  if (store && store.subject && store.isRunning) {
    store.subject.subscribe({
      next: (event) => {
        if ('messageId' in event && typeof event.messageId === 'string' && emittedMessageIds.has(event.messageId)) {
          return;
        }
        connectionSubject.next(event);
      },
      complete: () => connectionSubject.complete(),
      error: (err) => connectionSubject.error(err)
    });
  } else {
    connectionSubject.complete();
  }
}
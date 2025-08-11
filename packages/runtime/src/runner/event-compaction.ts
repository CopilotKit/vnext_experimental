import {
  BaseEvent,
  EventType,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
} from "@ag-ui/client";

/**
 * Compacts streaming events by consolidating multiple deltas into single events.
 * For text messages: multiple content deltas become one concatenated delta.
 * Events between related streaming events are reordered to keep streaming events together.
 * 
 * @param events - Array of events to compact
 * @returns Compacted array of events
 */
export function compactEvents(events: BaseEvent[]): BaseEvent[] {
  const compacted: BaseEvent[] = [];
  const pendingTextMessages = new Map<string, {
    start?: TextMessageStartEvent;
    contents: TextMessageContentEvent[];
    end?: TextMessageEndEvent;
    otherEvents: BaseEvent[];
  }>();

  for (const event of events) {
    // Handle text message streaming events
    if (event.type === EventType.TEXT_MESSAGE_START) {
      const startEvent = event as TextMessageStartEvent;
      const messageId = startEvent.messageId;
      
      if (!pendingTextMessages.has(messageId)) {
        pendingTextMessages.set(messageId, {
          contents: [],
          otherEvents: []
        });
      }
      
      const pending = pendingTextMessages.get(messageId)!;
      pending.start = startEvent;
    } else if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
      const contentEvent = event as TextMessageContentEvent;
      const messageId = contentEvent.messageId;
      
      if (!pendingTextMessages.has(messageId)) {
        pendingTextMessages.set(messageId, {
          contents: [],
          otherEvents: []
        });
      }
      
      const pending = pendingTextMessages.get(messageId)!;
      pending.contents.push(contentEvent);
    } else if (event.type === EventType.TEXT_MESSAGE_END) {
      const endEvent = event as TextMessageEndEvent;
      const messageId = endEvent.messageId;
      
      if (!pendingTextMessages.has(messageId)) {
        pendingTextMessages.set(messageId, {
          contents: [],
          otherEvents: []
        });
      }
      
      const pending = pendingTextMessages.get(messageId)!;
      pending.end = endEvent;
      
      // Flush this message's events
      flushTextMessage(messageId, pending, compacted);
      pendingTextMessages.delete(messageId);
    } else {
      // For non-text-message events, check if we're in the middle of any text messages
      let addedToBuffer = false;
      
      for (const [messageId, pending] of pendingTextMessages) {
        // If we have a start but no end yet, this event is "in between"
        if (pending.start && !pending.end) {
          pending.otherEvents.push(event);
          addedToBuffer = true;
          break; // Only add to one message's buffer
        }
      }
      
      // If not in the middle of any message, add directly to compacted
      if (!addedToBuffer) {
        compacted.push(event);
      }
    }
  }

  // Flush any remaining incomplete messages
  for (const [messageId, pending] of pendingTextMessages) {
    flushTextMessage(messageId, pending, compacted);
  }

  return compacted;
}

function flushTextMessage(
  messageId: string,
  pending: {
    start?: TextMessageStartEvent;
    contents: TextMessageContentEvent[];
    end?: TextMessageEndEvent;
    otherEvents: BaseEvent[];
  },
  compacted: BaseEvent[]
): void {
  // Add start event if present
  if (pending.start) {
    compacted.push(pending.start);
  }

  // Compact all content events into one
  if (pending.contents.length > 0) {
    const concatenatedDelta = pending.contents
      .map(c => c.delta)
      .join('');
    
    const compactedContent: TextMessageContentEvent = {
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId: messageId,
      delta: concatenatedDelta,
    };
    
    compacted.push(compactedContent);
  }

  // Add end event if present
  if (pending.end) {
    compacted.push(pending.end);
  }

  // Add any events that were in between
  for (const otherEvent of pending.otherEvents) {
    compacted.push(otherEvent);
  }
}
import { describe, it, expect } from "vitest";
import { compactEvents } from "../event-compaction";
import { BaseEvent, EventType } from "@ag-ui/client";

describe("Event Compaction", () => {
  it("should compact multiple text message content events into one", () => {
    const events: BaseEvent[] = [
      { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Hello" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: " " },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "world" },
      { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
    ];

    const compacted = compactEvents(events);

    expect(compacted).toHaveLength(3);
    expect(compacted[0].type).toBe(EventType.TEXT_MESSAGE_START);
    expect(compacted[1].type).toBe(EventType.TEXT_MESSAGE_CONTENT);
    expect((compacted[1] as any).delta).toBe("Hello world");
    expect(compacted[2].type).toBe(EventType.TEXT_MESSAGE_END);
  });

  it("should move interleaved events to after text message events", () => {
    const events: BaseEvent[] = [
      { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "assistant" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Processing" },
      { type: EventType.CUSTOM, id: "custom1", name: "thinking" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "..." },
      { type: EventType.CUSTOM, id: "custom2", name: "done-thinking" },
      { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
    ];

    const compacted = compactEvents(events);

    expect(compacted).toHaveLength(5);
    // Text message events should come first
    expect(compacted[0].type).toBe(EventType.TEXT_MESSAGE_START);
    expect(compacted[1].type).toBe(EventType.TEXT_MESSAGE_CONTENT);
    expect((compacted[1] as any).delta).toBe("Processing...");
    expect(compacted[2].type).toBe(EventType.TEXT_MESSAGE_END);
    // Other events should come after
    expect(compacted[3].type).toBe(EventType.CUSTOM);
    expect((compacted[3] as any).id).toBe("custom1");
    expect(compacted[4].type).toBe(EventType.CUSTOM);
    expect((compacted[4] as any).id).toBe("custom2");
  });

  it("should handle multiple messages independently", () => {
    const events: BaseEvent[] = [
      { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Hi" },
      { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
      { type: EventType.TEXT_MESSAGE_START, messageId: "msg2", role: "assistant" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg2", delta: "Hello" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg2", delta: " there" },
      { type: EventType.TEXT_MESSAGE_END, messageId: "msg2" },
    ];

    const compacted = compactEvents(events);

    expect(compacted).toHaveLength(6);
    // First message
    expect(compacted[0].type).toBe(EventType.TEXT_MESSAGE_START);
    expect((compacted[0] as any).messageId).toBe("msg1");
    expect(compacted[1].type).toBe(EventType.TEXT_MESSAGE_CONTENT);
    expect((compacted[1] as any).delta).toBe("Hi");
    expect(compacted[2].type).toBe(EventType.TEXT_MESSAGE_END);
    // Second message
    expect(compacted[3].type).toBe(EventType.TEXT_MESSAGE_START);
    expect((compacted[3] as any).messageId).toBe("msg2");
    expect(compacted[4].type).toBe(EventType.TEXT_MESSAGE_CONTENT);
    expect((compacted[4] as any).delta).toBe("Hello there");
    expect(compacted[5].type).toBe(EventType.TEXT_MESSAGE_END);
  });

  it("should handle incomplete messages", () => {
    const events: BaseEvent[] = [
      { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Incomplete" },
      // No END event
    ];

    const compacted = compactEvents(events);

    expect(compacted).toHaveLength(2);
    expect(compacted[0].type).toBe(EventType.TEXT_MESSAGE_START);
    expect(compacted[1].type).toBe(EventType.TEXT_MESSAGE_CONTENT);
    expect((compacted[1] as any).delta).toBe("Incomplete");
  });

  it("should pass through non-text-message events unchanged", () => {
    const events: BaseEvent[] = [
      { type: EventType.CUSTOM, id: "custom1", name: "event1" },
      { type: EventType.TOOL_CALL_START, toolCallId: "tool1", toolCallName: "search" },
      { type: EventType.TOOL_CALL_END, toolCallId: "tool1" },
    ];

    const compacted = compactEvents(events);

    expect(compacted).toEqual(events);
  });

  it("should handle empty content deltas", () => {
    const events: BaseEvent[] = [
      { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Hello" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "" },
      { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
    ];

    const compacted = compactEvents(events);

    expect(compacted).toHaveLength(3);
    expect((compacted[1] as any).delta).toBe("Hello");
  });
});
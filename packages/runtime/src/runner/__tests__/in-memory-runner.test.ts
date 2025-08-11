import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAgentRunner } from "../in-memory";
import {
  AbstractAgent,
  BaseEvent,
  EventType,
  Message,
  RunAgentInput,
  TextMessageContentEvent,
  TextMessageEndEvent,
  TextMessageStartEvent,
  ToolCallResultEvent,
} from "@ag-ui/client";
import { firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";

class TestAgent extends AbstractAgent {
  private events: BaseEvent[] = [];

  constructor(events: BaseEvent[] = []) {
    super();
    this.events = events;
  }

  async runAgent(
    input: RunAgentInput,
    options: {
      onEvent: (event: { event: BaseEvent }) => void;
      onNewMessage?: (args: { message: Message }) => void;
      onRunStartedEvent?: () => void;
    }
  ): Promise<void> {
    // Call onRunStartedEvent to trigger message injection
    if (options.onRunStartedEvent) {
      options.onRunStartedEvent();
    }

    // Emit test events
    for (const event of this.events) {
      options.onEvent({ event });
    }

    // Call onNewMessage for assistant messages we generate
    if (options.onNewMessage) {
      const assistantMessage: Message = {
        id: "assistant-msg-1",
        role: "assistant",
        content: "Test response",
      };
      options.onNewMessage({ message: assistantMessage });
    }
  }

  clone(): AbstractAgent {
    return new TestAgent(this.events);
  }
}

describe("InMemoryAgentRunner", () => {
  let runner: InMemoryAgentRunner;

  beforeEach(() => {
    runner = new InMemoryAgentRunner();
  });

  describe("Event Storage", () => {
    it("should not store empty events", async () => {
      const threadId = "test-thread-no-empty";
      const agent = new TestAgent([]);
      
      const input: RunAgentInput = {
        messages: [],
        state: {},
        threadId,
        runId: "run-1",
      };

      await firstValueFrom(
        runner.run({ threadId, agent, input }).pipe(toArray())
      );

      // Connect and get stored events
      const storedEvents = await firstValueFrom(
        runner.connect({ threadId }).pipe(toArray())
      );

      // No events should be stored
      expect(storedEvents).toHaveLength(0);
    });

    it("should store and compact text message events", async () => {
      const threadId = "test-thread-compact";
      
      const events: BaseEvent[] = [
        {
          type: EventType.TEXT_MESSAGE_START,
          messageId: "msg-1",
          role: "assistant",
        } as TextMessageStartEvent,
        {
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: "msg-1",
          delta: "Hello",
        } as TextMessageContentEvent,
        {
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: "msg-1",
          delta: " world",
        } as TextMessageContentEvent,
        {
          type: EventType.TEXT_MESSAGE_END,
          messageId: "msg-1",
        } as TextMessageEndEvent,
      ];

      const agent = new TestAgent(events);
      const input: RunAgentInput = {
        messages: [],
        state: {},
        threadId,
        runId: "run-1",
      };

      await firstValueFrom(
        runner.run({ threadId, agent, input }).pipe(toArray())
      );

      // Connect and get stored events
      const storedEvents = await firstValueFrom(
        runner.connect({ threadId }).pipe(toArray())
      );

      // Should have start, single content (compacted), and end events
      expect(storedEvents).toHaveLength(3);
      expect(storedEvents[0].type).toBe(EventType.TEXT_MESSAGE_START);
      expect(storedEvents[1].type).toBe(EventType.TEXT_MESSAGE_CONTENT);
      expect((storedEvents[1] as TextMessageContentEvent).delta).toBe("Hello world");
      expect(storedEvents[2].type).toBe(EventType.TEXT_MESSAGE_END);
    });

    it("should not store duplicate message IDs across multiple runs", async () => {
      const threadId = "test-thread-no-duplicates";
      const userMessage: Message = {
        id: "user-msg-1",
        role: "user",
        content: "Hello",
      };

      // First run
      const agent1 = new TestAgent([
        {
          type: EventType.TEXT_MESSAGE_START,
          messageId: "assistant-msg-1",
          role: "assistant",
        } as TextMessageStartEvent,
        {
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: "assistant-msg-1",
          delta: "Hi from run 1",
        } as TextMessageContentEvent,
        {
          type: EventType.TEXT_MESSAGE_END,
          messageId: "assistant-msg-1",
        } as TextMessageEndEvent,
      ]);

      const input1: RunAgentInput = {
        messages: [userMessage],
        state: {},
        threadId,
        runId: "run-1",
      };

      await firstValueFrom(
        runner.run({ threadId, agent: agent1, input: input1 }).pipe(toArray())
      );

      // Second run with same user message plus new one
      const newUserMessage: Message = {
        id: "user-msg-2",
        role: "user",
        content: "How are you?",
      };

      const agent2 = new TestAgent([
        {
          type: EventType.TEXT_MESSAGE_START,
          messageId: "assistant-msg-2",
          role: "assistant",
        } as TextMessageStartEvent,
        {
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: "assistant-msg-2",
          delta: "Hi from run 2",
        } as TextMessageContentEvent,
        {
          type: EventType.TEXT_MESSAGE_END,
          messageId: "assistant-msg-2",
        } as TextMessageEndEvent,
      ]);

      const input2: RunAgentInput = {
        messages: [userMessage, newUserMessage],
        state: {},
        threadId,
        runId: "run-2",
      };

      await firstValueFrom(
        runner.run({ threadId, agent: agent2, input: input2 }).pipe(toArray())
      );

      // Connect and get all stored events
      const storedEvents = await firstValueFrom(
        runner.connect({ threadId }).pipe(toArray())
      );

      // Count unique message IDs
      const messageIds = new Set<string>();
      for (const event of storedEvents) {
        if ('messageId' in event && event.messageId) {
          messageIds.add(event.messageId);
        }
      }

      // Should have: user-msg-1, assistant-msg-1, user-msg-2, assistant-msg-2
      expect(messageIds.size).toBe(4);
      expect(messageIds.has("user-msg-1")).toBe(true);
      expect(messageIds.has("assistant-msg-1")).toBe(true);
      expect(messageIds.has("user-msg-2")).toBe(true);
      expect(messageIds.has("assistant-msg-2")).toBe(true);

      // Check that each message ID appears only once in start events
      const startEvents = storedEvents.filter(e => e.type === EventType.TEXT_MESSAGE_START);
      const startMessageIds = startEvents.map(e => (e as any).messageId);
      const uniqueStartIds = new Set(startMessageIds);
      expect(startMessageIds.length).toBe(uniqueStartIds.size);
    });

    it("should store all types of new messages (user, assistant, tool, system, developer)", async () => {
      const threadId = "test-thread-all-messages";
      
      const messages: Message[] = [
        { id: "user-1", role: "user", content: "User message" },
        { id: "system-1", role: "system", content: "System message" },
        { id: "developer-1", role: "developer", content: "Developer message" },
        { id: "tool-1", role: "tool", content: "Tool result", toolCallId: "tool-call-1" },
      ];

      const agent = new TestAgent([
        {
          type: EventType.TEXT_MESSAGE_START,
          messageId: "assistant-1",
          role: "assistant",
        } as TextMessageStartEvent,
        {
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: "assistant-1",
          delta: "Assistant response",
        } as TextMessageContentEvent,
        {
          type: EventType.TEXT_MESSAGE_END,
          messageId: "assistant-1",
        } as TextMessageEndEvent,
      ]);

      const input: RunAgentInput = {
        messages,
        state: {},
        threadId,
        runId: "run-1",
      };

      await firstValueFrom(
        runner.run({ threadId, agent, input }).pipe(toArray())
      );

      // Connect and get stored events
      const storedEvents = await firstValueFrom(
        runner.connect({ threadId }).pipe(toArray())
      );

      // Collect all message IDs
      const messageIds = new Set<string>();
      for (const event of storedEvents) {
        if ('messageId' in event && event.messageId) {
          messageIds.add(event.messageId);
        }
      }

      // Should have all message types
      expect(messageIds.has("user-1")).toBe(true);
      expect(messageIds.has("system-1")).toBe(true);
      expect(messageIds.has("developer-1")).toBe(true);
      expect(messageIds.has("tool-1")).toBe(true);
      expect(messageIds.has("assistant-1")).toBe(true);

      // Check tool result event
      const toolEvents = storedEvents.filter(e => e.type === EventType.TOOL_CALL_RESULT);
      expect(toolEvents).toHaveLength(1);
      const toolEvent = toolEvents[0] as ToolCallResultEvent;
      expect(toolEvent.messageId).toBe("tool-1");
      expect(toolEvent.content).toBe("Tool result");
      expect(toolEvent.toolCallId).toBe("tool-call-1");
    });

    it("should only store new messages for each run", async () => {
      const threadId = "test-thread-only-new";
      
      // First run
      const message1: Message = { id: "msg-1", role: "user", content: "First" };
      const agent1 = new TestAgent([]);
      const input1: RunAgentInput = {
        messages: [message1],
        state: {},
        threadId,
        runId: "run-1",
      };

      await firstValueFrom(
        runner.run({ threadId, agent: agent1, input: input1 }).pipe(toArray())
      );

      // Second run with old message and new message
      const message2: Message = { id: "msg-2", role: "user", content: "Second" };
      const agent2 = new TestAgent([]);
      const input2: RunAgentInput = {
        messages: [message1, message2], // Include old message for context
        state: {},
        threadId,
        runId: "run-2",
      };

      await firstValueFrom(
        runner.run({ threadId, agent: agent2, input: input2 }).pipe(toArray())
      );

      // Third run with all old messages and one new
      const message3: Message = { id: "msg-3", role: "user", content: "Third" };
      const agent3 = new TestAgent([]);
      const input3: RunAgentInput = {
        messages: [message1, message2, message3],
        state: {},
        threadId,
        runId: "run-3",
      };

      await firstValueFrom(
        runner.run({ threadId, agent: agent3, input: input3 }).pipe(toArray())
      );

      // Connect and verify each message appears only once
      const storedEvents = await firstValueFrom(
        runner.connect({ threadId }).pipe(toArray())
      );

      // Count start events for each message
      const startEvents = storedEvents.filter(e => e.type === EventType.TEXT_MESSAGE_START);
      const messageIdCounts = new Map<string, number>();
      
      for (const event of startEvents) {
        const messageId = (event as any).messageId;
        messageIdCounts.set(messageId, (messageIdCounts.get(messageId) || 0) + 1);
      }

      // Each message should appear exactly once
      expect(messageIdCounts.get("msg-1")).toBe(1);
      expect(messageIdCounts.get("msg-2")).toBe(1);
      expect(messageIdCounts.get("msg-3")).toBe(1);
    });

    it("should handle tool messages correctly", async () => {
      const threadId = "test-thread-tool-messages";
      
      const toolMessage: Message = {
        id: "tool-msg-1",
        role: "tool",
        content: "Tool execution result",
        toolCallId: "tool-call-123",
      };

      const agent = new TestAgent([]);
      const input: RunAgentInput = {
        messages: [toolMessage],
        state: {},
        threadId,
        runId: "run-1",
      };

      await firstValueFrom(
        runner.run({ threadId, agent, input }).pipe(toArray())
      );

      // Connect and get stored events
      const storedEvents = await firstValueFrom(
        runner.connect({ threadId }).pipe(toArray())
      );

      // Should have the tool result event
      const toolEvents = storedEvents.filter(e => e.type === EventType.TOOL_CALL_RESULT);
      expect(toolEvents).toHaveLength(1);
      
      const toolEvent = toolEvents[0] as ToolCallResultEvent;
      expect(toolEvent.messageId).toBe("tool-msg-1");
      expect(toolEvent.toolCallId).toBe("tool-call-123");
      expect(toolEvent.content).toBe("Tool execution result");
      expect(toolEvent.role).toBe("tool");
    });
  });

  describe("Run Isolation", () => {
    it("should store each run's events separately", async () => {
      const threadId = "test-thread-isolation";
      
      // First run
      const agent1 = new TestAgent([
        {
          type: EventType.TEXT_MESSAGE_START,
          messageId: "run1-msg",
          role: "assistant",
        } as TextMessageStartEvent,
        {
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: "run1-msg",
          delta: "From run 1",
        } as TextMessageContentEvent,
        {
          type: EventType.TEXT_MESSAGE_END,
          messageId: "run1-msg",
        } as TextMessageEndEvent,
      ]);

      await firstValueFrom(
        runner.run({
          threadId,
          agent: agent1,
          input: { messages: [], state: {}, threadId, runId: "run-1" },
        }).pipe(toArray())
      );

      // Second run
      const agent2 = new TestAgent([
        {
          type: EventType.TEXT_MESSAGE_START,
          messageId: "run2-msg",
          role: "assistant",
        } as TextMessageStartEvent,
        {
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId: "run2-msg",
          delta: "From run 2",
        } as TextMessageContentEvent,
        {
          type: EventType.TEXT_MESSAGE_END,
          messageId: "run2-msg",
        } as TextMessageEndEvent,
      ]);

      await firstValueFrom(
        runner.run({
          threadId,
          agent: agent2,
          input: { messages: [], state: {}, threadId, runId: "run-2" },
        }).pipe(toArray())
      );

      // Connect and verify both runs' events are present
      const storedEvents = await firstValueFrom(
        runner.connect({ threadId }).pipe(toArray())
      );

      const messageIds = new Set<string>();
      for (const event of storedEvents) {
        if ('messageId' in event && event.messageId) {
          messageIds.add(event.messageId);
        }
      }

      expect(messageIds.has("run1-msg")).toBe(true);
      expect(messageIds.has("run2-msg")).toBe(true);
    });
  });
});
import { describe, it, expect, beforeEach } from "vitest";
import { InProcessAgentRunner } from "../runner/in-process";
import {
  AbstractAgent,
  BaseEvent,
  RunAgentInput,
  Message,
  RunStartedEvent,
  EventType,
} from "@ag-ui/client";
import { EMPTY, firstValueFrom, Observable } from "rxjs";
import { toArray } from "rxjs/operators";

// Type helpers for event filtering
type EventWithType = BaseEvent & { type: string };
type EventWithId = BaseEvent & { id: string };
type EventWithMessageId = BaseEvent & { messageId: string };
type EventWithMessageIdAndDelta = BaseEvent & {
  messageId: string;
  delta: string;
};

// Mock agent that can handle messages and callbacks
class MessageAwareAgent extends AbstractAgent {
  private events: BaseEvent[] = [];
  public receivedMessages: Message[] = [];
  public onNewMessageCalled = 0;
  public onRunStartedCalled = 0;

  constructor(events: BaseEvent[] = []) {
    super();
    this.events = events;
  }

  protected run(input: RunAgentInput): Observable<BaseEvent> {
    return EMPTY;
  }

  async runAgent(
    input: RunAgentInput,
    options: {
      onEvent: (event: { event: BaseEvent }) => void;
      onNewMessage?: (args: { message: Message }) => void;
      onRunStartedEvent?: (args: { event: BaseEvent }) => void;
    }
    // @ts-expect-error
  ): Promise<RunAgentResult> {
    // Call onRunStartedEvent if provided
    if (options.onRunStartedEvent) {
      this.onRunStartedCalled++;
      const runStartedEvent = {
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      } as RunStartedEvent;
      options.onRunStartedEvent({ event: runStartedEvent });
    }

    // Emit the agent's own events
    for (const event of this.events) {
      options.onEvent({ event });
    }
  }
}

describe("InProcessAgentRunner - Message Injection", () => {
  let runner: InProcessAgentRunner;

  beforeEach(() => {
    runner = new InProcessAgentRunner();
  });

  describe("Message Injection on Run", () => {
    it("should inject user messages as events when running an agent", async () => {
      const threadId = "test-thread-messages-1";
      const userMessage: Message = {
        id: "user-msg-1",
        role: "user",
        content: "Hello, agent!",
      };

      const agentEvents: BaseEvent[] = [
        {
          type: EventType.CUSTOM,
          id: "agent-response-1",
          timestamp: Date.now(),
          name: "agent-response",
          value: { text: "Hello, user!" },
        } as BaseEvent,
      ];

      const agent = new MessageAwareAgent(agentEvents);
      const input: RunAgentInput = {
        messages: [userMessage],
        state: {},
        threadId,
        runId: "run-1",
        tools: [],
        context: [],
      };

      // Run the agent
      const runObservable = runner.run({ threadId, agent, input });
      const runEvents = await firstValueFrom(runObservable.pipe(toArray()));

      // run() should only return agent events, not injected messages
      expect(runEvents).toHaveLength(1);
      expect((runEvents[0] as EventWithId).id).toBe("agent-response-1");

      // connect() should have all events including injected messages
      const connectObservable = runner.connect({ threadId });
      const allEvents = await firstValueFrom(connectObservable.pipe(toArray()));

      // Should have: RunStartedEvent + user message events (Start, Content, End) + agent event
      expect(allEvents.length).toBeGreaterThanOrEqual(5);

      // Find the injected user message events
      const textStartEvents = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TEXT_MESSAGE_START
      );
      const textContentEvents = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TEXT_MESSAGE_CONTENT
      );
      const textEndEvents = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TEXT_MESSAGE_END
      );

      expect(textStartEvents).toHaveLength(1);
      expect(textStartEvents[0]).toMatchObject({
        type: "TextMessageStartEvent",
        messageId: "user-msg-1",
      });

      expect(textContentEvents).toHaveLength(1);
      expect(textContentEvents[0]).toMatchObject({
        type: "TextMessageContentEvent",
        messageId: "user-msg-1",
        delta: "Hello, agent!",
      });

      expect(textEndEvents).toHaveLength(1);
      expect(textEndEvents[0]).toMatchObject({
        type: "TextMessageEndEvent",
        messageId: "user-msg-1",
      });

      // Verify the agent callbacks
      expect(agent.onNewMessageCalled).toBe(0); // onNewMessage is not called by the test agent
      expect(agent.onRunStartedCalled).toBe(1);
    });

    it("should inject assistant messages as proper TextMessage events", async () => {
      const threadId = "test-thread-messages-2";
      const assistantMessage: Message = {
        id: "assistant-msg-1",
        role: "assistant",
        content: "I can help you with that!",
      };

      const agent = new MessageAwareAgent([]);
      const input: RunAgentInput = {
        messages: [assistantMessage],
        state: {},
        threadId,
        runId: "run-2",
        tools: [],
        context: [],
      };

      // Run the agent
      await firstValueFrom(
        runner.run({ threadId, agent, input }).pipe(toArray())
      );

      // Check events via connect
      const allEvents = await firstValueFrom(
        runner.connect({ threadId }).pipe(toArray())
      );

      // Find the injected message events
      const textStartEvents = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TEXT_MESSAGE_START
      );
      const textContentEvents = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TEXT_MESSAGE_CONTENT
      );
      const textEndEvents = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TEXT_MESSAGE_END
      );

      expect(textStartEvents).toHaveLength(1);
      expect(textStartEvents[0]).toMatchObject({
        type: "TextMessageStartEvent",
        messageId: "assistant-msg-1",
        role: "assistant",
      });

      expect(textContentEvents).toHaveLength(1);
      expect(textContentEvents[0]).toMatchObject({
        type: "TextMessageContentEvent",
        messageId: "assistant-msg-1",
        delta: "I can help you with that!",
      });

      expect(textEndEvents).toHaveLength(1);
      expect(textEndEvents[0]).toMatchObject({
        type: "TextMessageEndEvent",
        messageId: "assistant-msg-1",
      });
    });

    it("should inject tool call messages as proper ToolCall events", async () => {
      const threadId = "test-thread-messages-3";
      const toolCallMessage: Message = {
        id: "assistant-msg-2",
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "tool-call-1",
            type: "function",
            function: {
              name: "get_weather",
              arguments: '{"location": "New York"}',
            },
          },
        ],
      };

      const agent = new MessageAwareAgent([]);
      const input: RunAgentInput = {
        messages: [toolCallMessage],
        state: {},
        threadId,
        runId: "run-3",
        tools: [],
        context: [],
      };

      // Run the agent
      await firstValueFrom(
        runner.run({ threadId, agent, input }).pipe(toArray())
      );

      // Check events via connect
      const allEvents = await firstValueFrom(
        runner.connect({ threadId }).pipe(toArray())
      );

      // Find the injected tool call events
      const toolStartEvents = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TOOL_CALL_START
      );
      const toolArgsEvents = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TOOL_CALL_ARGS
      );
      const toolEndEvents = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TOOL_CALL_END
      );

      expect(toolStartEvents).toHaveLength(1);
      expect(toolStartEvents[0]).toMatchObject({
        type: "ToolCallStartEvent",
        toolCallId: "tool-call-1",
        toolCallName: "get_weather",
        parentMessageId: "assistant-msg-2",
      });

      expect(toolArgsEvents).toHaveLength(1);
      expect(toolArgsEvents[0]).toMatchObject({
        type: "ToolCallArgsEvent",
        toolCallId: "tool-call-1",
        delta: '{"location": "New York"}',
      });

      expect(toolEndEvents).toHaveLength(1);
      expect(toolEndEvents[0]).toMatchObject({
        type: "ToolCallEndEvent",
        toolCallId: "tool-call-1",
      });
    });

    it("should inject developer and system messages as TextMessage events", async () => {
      const threadId = "test-thread-messages-dev-sys";
      const developerMessage: Message = {
        id: "dev-msg-1",
        role: "developer",
        content: "You are a helpful assistant.",
      };
      const systemMessage: Message = {
        id: "sys-msg-1",
        role: "system",
        content: "System prompt: Be concise.",
      };

      const agent = new MessageAwareAgent([]);
      const input: RunAgentInput = {
        messages: [developerMessage, systemMessage],
        state: {},
        threadId,
        runId: "run-dev-sys",
        tools: [],
        context: [],
      };

      // Run the agent
      await firstValueFrom(
        runner.run({ threadId, agent, input }).pipe(toArray())
      );

      // Check events via connect
      const allEvents = await firstValueFrom(
        runner.connect({ threadId }).pipe(toArray())
      );

      // Find the injected message events
      const textStartEvents = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TEXT_MESSAGE_START
      );
      const textContentEvents = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TEXT_MESSAGE_CONTENT
      );
      const textEndEvents = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TEXT_MESSAGE_END
      );

      // Should have 2 sets of text message events (one for each message)
      expect(textStartEvents).toHaveLength(2);
      expect(textContentEvents).toHaveLength(2);
      expect(textEndEvents).toHaveLength(2);

      // Verify developer message events
      expect(
        textStartEvents.some(
          (e) => (e as EventWithMessageId).messageId === "dev-msg-1"
        )
      ).toBe(true);
      expect(
        textContentEvents.some((e) => {
          const evt = e as EventWithMessageIdAndDelta;
          return (
            evt.messageId === "dev-msg-1" &&
            evt.delta === "You are a helpful assistant."
          );
        })
      ).toBe(true);

      // Verify system message events
      expect(
        textStartEvents.some(
          (e) => (e as EventWithMessageId).messageId === "sys-msg-1"
        )
      ).toBe(true);
      expect(
        textContentEvents.some((e) => {
          const evt = e as EventWithMessageIdAndDelta;
          return (
            evt.messageId === "sys-msg-1" &&
            evt.delta === "System prompt: Be concise."
          );
        })
      ).toBe(true);
    });

    it("should inject tool result messages as ToolCallResult events", async () => {
      const threadId = "test-thread-messages-4";
      const toolResultMessage: Message = {
        id: "tool-result-1",
        role: "tool",
        content: "72°F and sunny",
        toolCallId: "tool-call-1",
      };

      const agent = new MessageAwareAgent([]);
      const input: RunAgentInput = {
        messages: [toolResultMessage],
        state: {},
        threadId,
        runId: "run-4",
        tools: [],
        context: [],
      };

      // Run the agent
      await firstValueFrom(
        runner.run({ threadId, agent, input }).pipe(toArray())
      );

      // Check events via connect
      const allEvents = await firstValueFrom(
        runner.connect({ threadId }).pipe(toArray())
      );

      // Find the injected tool result events
      const toolResultEvents = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TOOL_CALL_RESULT
      );

      expect(toolResultEvents).toHaveLength(1);
      expect(toolResultEvents[0]).toMatchObject({
        type: "ToolCallResultEvent",
        messageId: "tool-result-1",
        toolCallId: "tool-call-1",
        content: "72°F and sunny",
        role: "tool",
      });
    });
  });

  describe("Consecutive Runs with Different Messages", () => {
    it("should accumulate messages across multiple runs", async () => {
      const threadId = "test-thread-consecutive-1";

      // First run with a user message
      const userMessage1: Message = {
        id: "user-msg-1",
        role: "user",
        content: "What's the weather?",
      };

      const agent1 = new MessageAwareAgent([
        {
          type: EventType.CUSTOM,
          id: "agent-1-response",
          timestamp: Date.now(),
          name: "agent-response",
          value: { text: "Let me check..." },
        } as BaseEvent,
      ]);

      const input1: RunAgentInput = {
        messages: [userMessage1],
        state: {},
        threadId,
        runId: "run-1",
        tools: [],
        context: [],
      };

      await firstValueFrom(
        runner.run({ threadId, agent: agent1, input: input1 }).pipe(toArray())
      );

      // Second run with assistant and tool messages
      const assistantMessage: Message = {
        id: "assistant-msg-1",
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "tool-call-1",
            type: "function",
            function: {
              name: "get_weather",
              arguments: '{"location": "current"}',
            },
          },
        ],
      };

      const toolResultMessage: Message = {
        id: "tool-result-1",
        role: "tool",
        content: "72°F and sunny in New York",
        toolCallId: "tool-call-1",
      };

      const agent2 = new MessageAwareAgent([
        {
          type: EventType.CUSTOM,
          id: "agent-2-response",
          timestamp: Date.now(),
          name: "agent-response",
          value: { text: "It's 72°F and sunny!" },
        } as BaseEvent,
      ]);

      const input2: RunAgentInput = {
        messages: [userMessage1, assistantMessage, toolResultMessage],
        state: {},
        threadId,
        runId: "run-2",
        tools: [],
        context: [],
      };

      await firstValueFrom(
        runner.run({ threadId, agent: agent2, input: input2 }).pipe(toArray())
      );

      // Connect should have all events from both runs
      const allEvents = await firstValueFrom(
        runner.connect({ threadId }).pipe(toArray())
      );

      // Should have events from both runs plus injected message events
      expect(allEvents.length).toBeGreaterThan(4);

      // Verify we have both agent responses
      const agentResponses = allEvents.filter(
        (e) => e.type === EventType.CUSTOM
      );
      expect(
        agentResponses.some((e) => (e as EventWithId).id === "agent-1-response")
      ).toBe(true);
      expect(
        agentResponses.some((e) => (e as EventWithId).id === "agent-2-response")
      ).toBe(true);

      // Verify we have the tool call events
      const toolCallStarts = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TOOL_CALL_START
      );
      expect(toolCallStarts).toHaveLength(1);

      // Verify we have the tool result event
      const toolResults = allEvents.filter(
        (e) => (e as EventWithType).type === EventType.TOOL_CALL_RESULT
      );
      expect(toolResults).toHaveLength(1);
    });

    it("should track seen message IDs and not duplicate messages", async () => {
      const threadId = "test-thread-duplicate-1";

      const sharedMessage: Message = {
        id: "shared-msg-1",
        role: "assistant",
        content: "This message appears in both runs",
      };

      const newMessage: Message = {
        id: "new-msg-1",
        role: "assistant",
        content: "This is a new message",
      };

      // First run with shared message
      const agent1 = new MessageAwareAgent([]);
      const input1: RunAgentInput = {
        messages: [sharedMessage],
        state: {},
        threadId,
        runId: "run-1",
        tools: [],
        context: [],
      };

      await firstValueFrom(
        runner.run({ threadId, agent: agent1, input: input1 }).pipe(toArray())
      );

      // Second run with shared message and new message
      const agent2 = new MessageAwareAgent([]);
      const input2: RunAgentInput = {
        messages: [sharedMessage, newMessage],
        state: {},
        threadId,
        runId: "run-2",
        tools: [],
        context: [],
      };

      await firstValueFrom(
        runner.run({ threadId, agent: agent2, input: input2 }).pipe(toArray())
      );

      // Connect should have events without duplicates
      const allEvents = await firstValueFrom(
        runner.connect({ threadId }).pipe(toArray())
      );

      // Count TextMessageStart events for our messages
      const textStartEvents = allEvents.filter((e) => {
        const evt = e as EventWithType & { messageId?: string };
        return (
          evt.type === EventType.TEXT_MESSAGE_START &&
          (evt.messageId === "shared-msg-1" || evt.messageId === "new-msg-1")
        );
      });

      // Should have exactly 2 TextMessageStart events (one for each unique message)
      expect(textStartEvents).toHaveLength(2);
      expect(
        textStartEvents.some(
          (e) => (e as EventWithMessageId).messageId === "shared-msg-1"
        )
      ).toBe(true);
      expect(
        textStartEvents.some(
          (e) => (e as EventWithMessageId).messageId === "new-msg-1"
        )
      ).toBe(true);
    });
  });
});

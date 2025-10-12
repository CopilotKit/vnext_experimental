import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAgentRunner } from "../in-memory";
import {
  AbstractAgent,
  BaseEvent,
  RunAgentInput,
  EventType,
  Message,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
} from "@ag-ui/client";
import { EMPTY, firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";

type RunCallbacks = {
  onEvent: (event: { event: BaseEvent }) => void;
  onNewMessage?: (args: { message: Message }) => void;
  onRunStartedEvent?: () => void;
};

// Mock agent for testing
class MockAgent extends AbstractAgent {
  private events: BaseEvent[];

  constructor(events: BaseEvent[] = []) {
    super();
    this.events = events;
  }

  async runAgent(input: RunAgentInput, callbacks: RunCallbacks): Promise<void> {
    if (callbacks.onRunStartedEvent) {
      callbacks.onRunStartedEvent();
    }

    for (const event of this.events) {
      callbacks.onEvent({ event });
    }
  }

  clone(): AbstractAgent {
    return new MockAgent(this.events);
  }

  protected run(): ReturnType<AbstractAgent["run"]> {
    return EMPTY;
  }

  protected connect(): ReturnType<AbstractAgent["connect"]> {
    return EMPTY;
  }
}

describe("Thread Listing - InMemoryAgentRunner", () => {
  let runner: InMemoryAgentRunner;

  beforeEach(() => {
    runner = new InMemoryAgentRunner();
    runner.clearAllThreads();
  });

  it("should return empty list when no threads exist", async () => {
    const result = await runner.listThreads({ scope: { resourceId: "test-user" }, limit: 10 });

    expect(result.threads).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("should list threads after runs are created", async () => {
    const events: BaseEvent[] = [
      { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" } as TextMessageStartEvent,
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Hello World" } as TextMessageContentEvent,
      { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" } as TextMessageEndEvent,
    ];

    const agent = new MockAgent(events);

    const observable1 = runner.run({
      threadId: "thread-1",
      agent,
      input: { threadId: "thread-1", runId: "run-1", messages: [], state: {} },
      scope: { resourceId: "test-user" },
    });
    await firstValueFrom(observable1.pipe(toArray()));

    const observable2 = runner.run({
      threadId: "thread-2",
      agent,
      input: { threadId: "thread-2", runId: "run-2", messages: [], state: {} },
      scope: { resourceId: "test-user" },
    });
    await firstValueFrom(observable2.pipe(toArray()));

    const result = await runner.listThreads({ scope: { resourceId: "test-user" }, limit: 10 });

    expect(result.threads).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("should include correct metadata", async () => {
    const events: BaseEvent[] = [
      { type: EventType.TEXT_MESSAGE_START, messageId: "msg-inmem", role: "user" } as TextMessageStartEvent,
      {
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: "msg-inmem",
        delta: "In-memory message",
      } as TextMessageContentEvent,
      { type: EventType.TEXT_MESSAGE_END, messageId: "msg-inmem" } as TextMessageEndEvent,
    ];

    const agent = new MockAgent(events);
    const observable = runner.run({
      threadId: "thread-inmem",
      agent,
      input: { threadId: "thread-inmem", runId: "run-inmem", messages: [], state: {} },
      scope: { resourceId: "test-user" },
    });
    await firstValueFrom(observable.pipe(toArray()));

    const metadata = await runner.getThreadMetadata("thread-inmem", { resourceId: "test-user" });

    expect(metadata).toBeDefined();
    expect(metadata!.threadId).toBe("thread-inmem");
    expect(metadata!.firstMessage).toBe("In-memory message");
  });

  it("should return null for non-existent thread", async () => {
    const metadata = await runner.getThreadMetadata("non-existent", { resourceId: "test-user" });
    expect(metadata).toBeNull();
  });

  describe("Pagination Edge Cases", () => {
    it("should handle limit = 0", async () => {
      const events: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" } as TextMessageStartEvent,
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Test" } as TextMessageContentEvent,
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" } as TextMessageEndEvent,
      ];

      const agent = new MockAgent(events);

      // Create some threads
      for (let i = 0; i < 5; i++) {
        await firstValueFrom(
          runner
            .run({
              threadId: `thread-${i}`,
              agent,
              input: { threadId: `thread-${i}`, runId: "run-1", messages: [], state: {} },
              scope: { resourceId: "test-user" },
            })
            .pipe(toArray()),
        );
      }

      // Request 0 threads - should return empty array
      const result = await runner.listThreads({ scope: { resourceId: "test-user" }, limit: 0 });

      // Define expected behavior: empty results
      expect(result.threads).toEqual([]);
      // Total should still reflect actual count
      expect(result.total).toBe(5);
    });

    it("should handle very large offset without performance issues", async () => {
      const events: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" } as TextMessageStartEvent,
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Test" } as TextMessageContentEvent,
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" } as TextMessageEndEvent,
      ];

      const agent = new MockAgent(events);

      // Create a small number of threads
      for (let i = 0; i < 3; i++) {
        await firstValueFrom(
          runner
            .run({
              threadId: `thread-${i}`,
              agent,
              input: { threadId: `thread-${i}`, runId: "run-1", messages: [], state: {} },
              scope: { resourceId: "test-user" },
            })
            .pipe(toArray()),
        );
      }

      const offset = 1_000_000;
      const startTime = Date.now();

      // Should return empty results quickly, not timeout
      const result = await runner.listThreads({ scope: { resourceId: "test-user" }, limit: 10, offset });

      const duration = Date.now() - startTime;

      // Should complete quickly (under 1 second for this simple case)
      expect(duration).toBeLessThan(1000);

      // Should return empty results since offset exceeds total
      expect(result.threads).toEqual([]);
      expect(result.total).toBe(3);
    });

    it("should handle threads added between page fetches", async () => {
      const events: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" } as TextMessageStartEvent,
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Test" } as TextMessageContentEvent,
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" } as TextMessageEndEvent,
      ];

      const agent = new MockAgent(events);

      // Create initial threads (1-10)
      for (let i = 1; i <= 10; i++) {
        await firstValueFrom(
          runner
            .run({
              threadId: `thread-${i}`,
              agent,
              input: { threadId: `thread-${i}`, runId: "run-1", messages: [], state: {} },
              scope: { resourceId: "test-user" },
            })
            .pipe(toArray()),
        );
        // Small delay to ensure consistent ordering
        await new Promise((resolve) => setTimeout(resolve, 2));
      }

      // Fetch page 1 (threads 1-10 with limit 10, offset 0)
      const page1 = await runner.listThreads({ scope: { resourceId: "test-user" }, limit: 10, offset: 0 });
      expect(page1.threads).toHaveLength(10);
      expect(page1.total).toBe(10);

      // Add 5 new threads between page fetches
      for (let i = 11; i <= 15; i++) {
        await firstValueFrom(
          runner
            .run({
              threadId: `thread-${i}`,
              agent,
              input: { threadId: `thread-${i}`, runId: "run-1", messages: [], state: {} },
              scope: { resourceId: "test-user" },
            })
            .pipe(toArray()),
        );
        await new Promise((resolve) => setTimeout(resolve, 2));
      }

      // Fetch page 2 - verify consistency
      const page2 = await runner.listThreads({ scope: { resourceId: "test-user" }, limit: 10, offset: 10 });

      // Should get remaining threads
      expect(page2.threads.length).toBeGreaterThan(0);
      expect(page2.total).toBe(15);

      // Note: Offset-based pagination with concurrent inserts can cause:
      // - Duplicates (threads appearing in multiple pages)
      // - Missing items (threads skipped due to offset shift)
      // This is a known limitation of offset pagination.
      // The test verifies the system handles this gracefully without crashing.

      // Total should reflect all threads
      expect(page2.total).toBe(15);

      // Page 2 should have threads (the exact count may vary due to ordering)
      expect(page2.threads.length).toBeLessThanOrEqual(10);
    });

    it("should handle negative offset gracefully", async () => {
      const events: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" } as TextMessageStartEvent,
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Test" } as TextMessageContentEvent,
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" } as TextMessageEndEvent,
      ];

      const agent = new MockAgent(events);

      // Create some threads
      for (let i = 0; i < 3; i++) {
        await firstValueFrom(
          runner
            .run({
              threadId: `thread-${i}`,
              agent,
              input: { threadId: `thread-${i}`, runId: "run-1", messages: [], state: {} },
              scope: { resourceId: "test-user" },
            })
            .pipe(toArray()),
        );
      }

      // Negative offset should be treated as 0 or return error
      const result = await runner.listThreads({ scope: { resourceId: "test-user" }, limit: 10, offset: -5 });

      // Should either treat as 0 (return results) or return empty
      expect(result.threads.length).toBeLessThanOrEqual(3);
      expect(result.total).toBe(3);
    });

    it("should handle limit exceeding total threads", async () => {
      const events: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" } as TextMessageStartEvent,
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Test" } as TextMessageContentEvent,
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" } as TextMessageEndEvent,
      ];

      const agent = new MockAgent(events);

      // Create only 3 threads
      for (let i = 0; i < 3; i++) {
        await firstValueFrom(
          runner
            .run({
              threadId: `thread-${i}`,
              agent,
              input: { threadId: `thread-${i}`, runId: "run-1", messages: [], state: {} },
              scope: { resourceId: "test-user" },
            })
            .pipe(toArray()),
        );
      }

      // Request limit of 100, should return all 3
      const result = await runner.listThreads({ scope: { resourceId: "test-user" }, limit: 100 });

      expect(result.threads).toHaveLength(3);
      expect(result.total).toBe(3);
    });
  });
});

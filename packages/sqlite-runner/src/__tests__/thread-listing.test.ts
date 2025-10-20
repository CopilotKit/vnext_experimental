import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteAgentRunner } from "../sqlite-runner";
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
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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

describe("Thread Listing - SqliteAgentRunner", () => {
  let tempDir: string;
  let dbPath: string;
  let runner: SqliteAgentRunner;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "thread-test-"));
    dbPath = path.join(tempDir, "test.db");
    runner = new SqliteAgentRunner({ dbPath });
  });

  afterEach(() => {
    runner.close();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  });

  it("should return empty list when no threads exist", async () => {
    const result = await runner.listThreads({ limit: 10 });

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

    // Create first thread
    const observable1 = runner.run({
      threadId: "thread-1",
      agent,
      input: { threadId: "thread-1", runId: "run-1", messages: [], state: {} },
    });
    await firstValueFrom(observable1.pipe(toArray()));

    // Create second thread
    const observable2 = runner.run({
      threadId: "thread-2",
      agent,
      input: { threadId: "thread-2", runId: "run-2", messages: [], state: {} },
    });
    await firstValueFrom(observable2.pipe(toArray()));

    const result = await runner.listThreads({ limit: 10 });

    expect(result.threads).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.threads.map((t) => t.threadId).sort()).toEqual(["thread-1", "thread-2"]);
  });

  it("should include thread metadata", async () => {
    const events: BaseEvent[] = [
      { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" } as TextMessageStartEvent,
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Test message" } as TextMessageContentEvent,
      { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" } as TextMessageEndEvent,
    ];

    const agent = new MockAgent(events);
    const observable = runner.run({
      threadId: "thread-1",
      agent,
      input: { threadId: "thread-1", runId: "run-1", messages: [], state: {} },
    });
    await firstValueFrom(observable.pipe(toArray()));

    const result = await runner.listThreads({ limit: 10 });
    const thread = result.threads[0];

    expect(thread).toBeDefined();
    expect(thread.threadId).toBe("thread-1");
    expect(thread.createdAt).toBeGreaterThan(0);
    expect(thread.lastActivityAt).toBeGreaterThan(0);
    expect(thread.isRunning).toBe(false);
    expect(thread.messageCount).toBeGreaterThanOrEqual(1);
    expect(thread.firstMessage).toBe("Test message");
  });

  it("should respect limit parameter", async () => {
    const events: BaseEvent[] = [
      { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" } as TextMessageStartEvent,
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Hello" } as TextMessageContentEvent,
      { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" } as TextMessageEndEvent,
    ];

    const agent = new MockAgent(events);

    // Create 5 threads
    for (let i = 0; i < 5; i++) {
      const observable = runner.run({
        threadId: `thread-${i}`,
        agent,
        input: { threadId: `thread-${i}`, runId: `run-${i}`, messages: [], state: {} },
      });
      await firstValueFrom(observable.pipe(toArray()));
    }

    const result = await runner.listThreads({ limit: 3 });

    expect(result.threads).toHaveLength(3);
    expect(result.total).toBe(5);
  });

  it("should respect offset parameter for pagination", async () => {
    const events: BaseEvent[] = [
      { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" } as TextMessageStartEvent,
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Hello" } as TextMessageContentEvent,
      { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" } as TextMessageEndEvent,
    ];

    const agent = new MockAgent(events);

    // Create 5 threads
    for (let i = 0; i < 5; i++) {
      const observable = runner.run({
        threadId: `thread-${i}`,
        agent,
        input: { threadId: `thread-${i}`, runId: `run-${i}`, messages: [], state: {} },
      });
      await firstValueFrom(observable.pipe(toArray()));
    }

    const page1 = await runner.listThreads({ limit: 2, offset: 0 });
    const page2 = await runner.listThreads({ limit: 2, offset: 2 });

    expect(page1.threads).toHaveLength(2);
    expect(page2.threads).toHaveLength(2);

    // Ensure different threads
    const page1Ids = page1.threads.map((t) => t.threadId);
    const page2Ids = page2.threads.map((t) => t.threadId);
    const overlap = page1Ids.filter((id) => page2Ids.includes(id));
    expect(overlap).toHaveLength(0);
  });

  it("should get metadata for a specific thread", async () => {
    const events: BaseEvent[] = [
      { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" } as TextMessageStartEvent,
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Specific thread" } as TextMessageContentEvent,
      { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" } as TextMessageEndEvent,
    ];

    const agent = new MockAgent(events);
    const observable = runner.run({
      threadId: "thread-specific",
      agent,
      input: { threadId: "thread-specific", runId: "run-1", messages: [], state: {} },
    });
    await firstValueFrom(observable.pipe(toArray()));

    const metadata = await runner.getThreadMetadata("thread-specific");

    expect(metadata).toBeDefined();
    expect(metadata!.threadId).toBe("thread-specific");
    expect(metadata!.firstMessage).toBe("Specific thread");
  });

  it("should return null for non-existent thread", async () => {
    const metadata = await runner.getThreadMetadata("non-existent");
    expect(metadata).toBeNull();
  });

  it("should sort threads by last activity (most recent first)", async () => {
    const events: BaseEvent[] = [
      { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" } as TextMessageStartEvent,
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Hello" } as TextMessageContentEvent,
      { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" } as TextMessageEndEvent,
    ];

    const agent = new MockAgent(events);

    // Create threads with delays to ensure different timestamps
    for (let i = 0; i < 3; i++) {
      const observable = runner.run({
        threadId: `thread-${i}`,
        agent,
        input: { threadId: `thread-${i}`, runId: `run-${i}`, messages: [], state: {} },
      });
      await firstValueFrom(observable.pipe(toArray()));
      await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
    }

    const result = await runner.listThreads({ limit: 10 });

    // Verify descending order (most recent first)
    for (let i = 0; i < result.threads.length - 1; i++) {
      expect(result.threads[i].lastActivityAt).toBeGreaterThanOrEqual(result.threads[i + 1].lastActivityAt);
    }
  });
});

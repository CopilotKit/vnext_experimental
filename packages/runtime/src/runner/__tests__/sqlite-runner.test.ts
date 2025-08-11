import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteAgentRunner } from "../sqlite";
import { InMemoryAgentRunner } from "../in-memory";
import { AbstractAgent, BaseEvent, RunAgentInput, EventType } from "@ag-ui/client";
import { firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";
import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock agent for testing
class MockAgent extends AbstractAgent {
  private events: BaseEvent[];

  constructor(events: BaseEvent[] = []) {
    super();
    this.events = events;
  }

  async runAgent(
    input: RunAgentInput,
    options: { 
      onEvent: (event: { event: BaseEvent }) => void;
      onNewMessage?: (args: { message: any }) => void;
      onRunStartedEvent?: () => void;
    }
  ): Promise<void> {
    // Call onRunStartedEvent if provided
    if (options.onRunStartedEvent) {
      options.onRunStartedEvent();
    }
    
    // Emit all events
    for (const event of this.events) {
      options.onEvent({ event });
    }
  }

  clone(): AbstractAgent {
    return new MockAgent(this.events);
  }
}

describe("SqliteAgentRunner", () => {
  let tempDir: string;
  let dbPath: string;
  let runner: SqliteAgentRunner;

  beforeEach(() => {
    // Create a temporary directory for test database
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sqlite-test-"));
    dbPath = path.join(tempDir, "test.db");
    runner = new SqliteAgentRunner({ dbPath });
  });

  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  });

  describe("Basic functionality", () => {
    it("should run an agent and emit events", async () => {
      const threadId = "test-thread-1";
      const events: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Hello" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
      ];

      const agent = new MockAgent(events);
      const input: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      const runObservable = runner.run({ threadId, agent, input });
      const emittedEvents = await firstValueFrom(runObservable.pipe(toArray()));

      expect(emittedEvents).toHaveLength(3);
      expect(emittedEvents[0].type).toBe(EventType.TEXT_MESSAGE_START);
    });

    it("should persist events across runner instances", async () => {
      const threadId = "test-thread-persistence";
      const events: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Persisted" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
      ];

      const agent = new MockAgent(events);
      const input: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      // Run with first instance
      await firstValueFrom(runner.run({ threadId, agent, input }).pipe(toArray()));

      // Create new runner instance with same database
      const newRunner = new SqliteAgentRunner({ dbPath });

      // Connect should return persisted events
      const persistedEvents = await firstValueFrom(
        newRunner.connect({ threadId }).pipe(toArray())
      );

      expect(persistedEvents).toHaveLength(3);
      expect(persistedEvents[1].type).toBe(EventType.TEXT_MESSAGE_CONTENT);
      expect((persistedEvents[1] as any).delta).toBe("Persisted");
    });

    it("should handle concurrent connections", async () => {
      const threadId = "test-thread-concurrent";
      const events: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Test" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
      ];

      const agent = new MockAgent(events);
      const input: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      // Run the agent
      await firstValueFrom(runner.run({ threadId, agent, input }).pipe(toArray()));

      // Create multiple concurrent connections
      const connection1 = runner.connect({ threadId });
      const connection2 = runner.connect({ threadId });
      const connection3 = runner.connect({ threadId });

      const [events1, events2, events3] = await Promise.all([
        firstValueFrom(connection1.pipe(toArray())),
        firstValueFrom(connection2.pipe(toArray())),
        firstValueFrom(connection3.pipe(toArray())),
      ]);

      // All connections should receive the same events
      expect(events1).toHaveLength(3);
      expect(events2).toHaveLength(3);
      expect(events3).toHaveLength(3);
      expect(events1).toEqual(events2);
      expect(events2).toEqual(events3);
    });

    it("should track running state correctly", async () => {
      const threadId = "test-thread-running";
      const agent = new MockAgent([]);
      const input: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      // Initially not running
      expect(await runner.isRunning({ threadId })).toBe(false);

      // Start running
      const runPromise = firstValueFrom(
        runner.run({ threadId, agent, input }).pipe(toArray())
      );

      // Should be running now
      expect(await runner.isRunning({ threadId })).toBe(true);

      // Wait for completion
      await runPromise;

      // Should not be running after completion
      expect(await runner.isRunning({ threadId })).toBe(false);
    });

    it("should prevent concurrent runs on same thread", async () => {
      const threadId = "test-thread-no-concurrent";
      const agent = new MockAgent([]);
      const input: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      // Start first run (don't await)
      runner.run({ threadId, agent, input }).subscribe();

      // Try to start second run immediately
      expect(() => {
        runner.run({ threadId, agent, input: { ...input, runId: "run2" } });
      }).toThrow("Thread already running");
    });
  });

  describe("Event compaction", () => {
    it("should store compacted events in the database", async () => {
      const threadId = "test-thread-compaction";
      
      // Create events that should be compacted
      const events1: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Hello " },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "world" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
      ];

      const agent1 = new MockAgent(events1);
      const input1: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      // Run first agent
      await firstValueFrom(runner.run({ threadId, agent: agent1, input: input1 }).pipe(toArray()));

      // Add more events - each run stores only its own events
      const events2: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg2", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg2", delta: "Second " },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg2", delta: "message" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg2" },
      ];

      const agent2 = new MockAgent(events2);
      const input2: RunAgentInput = {
        threadId,
        runId: "run2",
        messages: [],
      };

      // Run second agent
      await firstValueFrom(runner.run({ threadId, agent: agent2, input: input2 }).pipe(toArray()));

      // Check database directly to verify compaction
      const db = new Database(dbPath);
      const rows = db.prepare("SELECT events FROM agent_runs WHERE thread_id = ?").all(threadId) as any[];
      db.close();

      // Parse events from both runs
      const run1Events = JSON.parse(rows[0].events);
      const run2Events = JSON.parse(rows[1].events);

      // First run should have only its own compacted events
      // We expect: START, single CONTENT with "Hello world", END
      expect(run1Events).toHaveLength(3);
      const contentEvents1 = run1Events.filter((e: any) => e.type === EventType.TEXT_MESSAGE_CONTENT);
      expect(contentEvents1).toHaveLength(1);
      expect(contentEvents1[0].delta).toBe("Hello world");
      expect(run1Events[0].messageId).toBe("msg1");

      // Second run should have only its own compacted events
      expect(run2Events).toHaveLength(3);
      const contentEvents2 = run2Events.filter((e: any) => e.type === EventType.TEXT_MESSAGE_CONTENT);
      expect(contentEvents2).toHaveLength(1);
      expect(contentEvents2[0].delta).toBe("Second message");
      expect(run2Events[0].messageId).toBe("msg2");
      
      // Verify runs have different message IDs (no cross-contamination)
      const run1MessageIds = new Set(run1Events.filter((e: any) => e.messageId).map((e: any) => e.messageId));
      const run2MessageIds = new Set(run2Events.filter((e: any) => e.messageId).map((e: any) => e.messageId));
      
      // Ensure no overlap between message IDs in different runs
      for (const id of run1MessageIds) {
        expect(run2MessageIds.has(id)).toBe(false);
      }
    });

    it("should never store empty events after text message compaction", async () => {
      const threadId = "test-thread-text-compaction-not-empty";
      
      // First run: multiple text content events that will be compacted
      const events1: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "H" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "e" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "l" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "l" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "o" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
      ];

      const agent1 = new MockAgent(events1);
      const input1: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      await firstValueFrom(runner.run({ threadId, agent: agent1, input: input1 }).pipe(toArray()));

      // Second run: more text content events
      const events2: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg2", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg2", delta: "W" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg2", delta: "o" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg2", delta: "r" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg2", delta: "l" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg2", delta: "d" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg2" },
      ];

      const agent2 = new MockAgent(events2);
      const input2: RunAgentInput = {
        threadId,
        runId: "run2",
        messages: [],
      };

      await firstValueFrom(runner.run({ threadId, agent: agent2, input: input2 }).pipe(toArray()));

      // Check database directly
      const db = new Database(dbPath);
      const rows = db.prepare("SELECT run_id, events FROM agent_runs WHERE thread_id = ? ORDER BY created_at").all(threadId) as any[];
      db.close();

      expect(rows).toHaveLength(2);
      
      // Both runs should have non-empty compacted events
      const run1Events = JSON.parse(rows[0].events);
      const run2Events = JSON.parse(rows[1].events);
      
      // Verify run1 events are not empty and properly compacted
      expect(run1Events).not.toHaveLength(0);
      expect(run1Events).toHaveLength(3); // START, compacted CONTENT, END
      expect(run1Events[0].type).toBe(EventType.TEXT_MESSAGE_START);
      expect(run1Events[1].type).toBe(EventType.TEXT_MESSAGE_CONTENT);
      expect(run1Events[1].delta).toBe("Hello"); // All characters concatenated
      expect(run1Events[2].type).toBe(EventType.TEXT_MESSAGE_END);
      
      // Verify run2 events are not empty and properly compacted
      expect(run2Events).not.toHaveLength(0);
      expect(run2Events).toHaveLength(3); // START, compacted CONTENT, END
      expect(run2Events[0].type).toBe(EventType.TEXT_MESSAGE_START);
      expect(run2Events[1].type).toBe(EventType.TEXT_MESSAGE_CONTENT);
      expect(run2Events[1].delta).toBe("World"); // All characters concatenated
      expect(run2Events[2].type).toBe(EventType.TEXT_MESSAGE_END);
    });

    it("should handle complex compaction scenarios with multiple message types", async () => {
      const threadId = "test-thread-complex-compaction";
      
      // First run: Mix of events including text messages and other events
      const events1: BaseEvent[] = [
        { type: EventType.RUN_STARTED, runId: "run1" },
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Part " },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "1" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
        { type: EventType.RUN_FINISHED, runId: "run1" },
      ];

      const agent1 = new MockAgent(events1);
      const input1: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      await firstValueFrom(runner.run({ threadId, agent: agent1, input: input1 }).pipe(toArray()));

      // Second run: Another message that could potentially compact to empty
      const events2: BaseEvent[] = [
        { type: EventType.RUN_STARTED, runId: "run2" },
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg2", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg2", delta: "Part " },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg2", delta: "2" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg2" },
        { type: EventType.RUN_FINISHED, runId: "run2" },
      ];

      const agent2 = new MockAgent(events2);
      const input2: RunAgentInput = {
        threadId,
        runId: "run2",
        messages: [],
      };

      await firstValueFrom(runner.run({ threadId, agent: agent2, input: input2 }).pipe(toArray()));

      // Third run: Test with already compacted previous events
      const events3: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg3", role: "user" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg3", delta: "Part " },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg3", delta: "3" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg3" },
      ];

      const agent3 = new MockAgent(events3);
      const input3: RunAgentInput = {
        threadId,
        runId: "run3",
        messages: [],
      };

      await firstValueFrom(runner.run({ threadId, agent: agent3, input: input3 }).pipe(toArray()));

      // Check database directly
      const db = new Database(dbPath);
      const rows = db.prepare("SELECT run_id, events FROM agent_runs WHERE thread_id = ? ORDER BY created_at").all(threadId) as any[];
      db.close();

      expect(rows).toHaveLength(3);
      
      // All runs should have non-empty events
      for (let i = 0; i < rows.length; i++) {
        const events = JSON.parse(rows[i].events);
        expect(events).not.toHaveLength(0);
        expect(events.length).toBeGreaterThan(0);
        
        // Verify text messages are properly compacted
        const textContentEvents = events.filter((e: any) => e.type === EventType.TEXT_MESSAGE_CONTENT);
        textContentEvents.forEach((event: any) => {
          expect(event.delta).toBeTruthy();
          expect(event.delta).not.toBe("");
        });
      }
    });

    it("should retrieve already-compacted events without re-compacting", async () => {
      const threadId = "test-thread-no-recompact";
      
      // Create events that would be compacted
      const events: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Part 1 " },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Part 2 " },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Part 3" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
      ];

      const agent = new MockAgent(events);
      const input: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      // Run and store compacted events
      await firstValueFrom(runner.run({ threadId, agent, input }).pipe(toArray()));

      // Connect and retrieve events
      const retrievedEvents = await firstValueFrom(
        runner.connect({ threadId }).pipe(toArray())
      );

      // Should have compacted format: START, single CONTENT, END
      expect(retrievedEvents).toHaveLength(3);
      expect(retrievedEvents[0].type).toBe(EventType.TEXT_MESSAGE_START);
      expect(retrievedEvents[1].type).toBe(EventType.TEXT_MESSAGE_CONTENT);
      expect((retrievedEvents[1] as any).delta).toBe("Part 1 Part 2 Part 3");
      expect(retrievedEvents[2].type).toBe(EventType.TEXT_MESSAGE_END);
    });

    it("should handle edge case where new events are identical to compacted previous events", async () => {
      const threadId = "test-thread-identical-after-compaction";
      
      // First run: send a compacted-looking message
      const events1: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Hello World" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
      ];

      const agent1 = new MockAgent(events1);
      const input1: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      await firstValueFrom(runner.run({ threadId, agent: agent1, input: input1 }).pipe(toArray()));

      // Second run: send events that would compact to the same thing
      const events2: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg2", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg2", delta: "Hello " },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg2", delta: "World" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg2" },
      ];

      const agent2 = new MockAgent(events2);
      const input2: RunAgentInput = {
        threadId,
        runId: "run2",
        messages: [],
      };

      await firstValueFrom(runner.run({ threadId, agent: agent2, input: input2 }).pipe(toArray()));

      // Check database directly
      const db = new Database(dbPath);
      const rows = db.prepare("SELECT run_id, events FROM agent_runs WHERE thread_id = ? ORDER BY created_at").all(threadId) as any[];
      db.close();

      expect(rows).toHaveLength(2);
      
      // Both runs should have events stored
      const run1Events = JSON.parse(rows[0].events);
      const run2Events = JSON.parse(rows[1].events);
      
      // Both should be non-empty
      expect(run1Events).not.toHaveLength(0);
      expect(run2Events).not.toHaveLength(0);
      
      // Both should have proper structure
      expect(run1Events).toHaveLength(3);
      expect(run2Events).toHaveLength(3);
      
      // Verify the content is correct
      expect(run1Events[1].delta).toBe("Hello World");
      expect(run2Events[1].delta).toBe("Hello World");
      
      // Messages should have different IDs
      expect(run1Events[0].messageId).toBe("msg1");
      expect(run2Events[0].messageId).toBe("msg2");
    });
  });

  describe("Comparison with InMemoryAgentRunner", () => {
    it("should behave identically to InMemoryAgentRunner for basic operations", async () => {
      const threadId = "test-thread-comparison";
      const events: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Test message" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
      ];

      const agent = new MockAgent(events);
      const input: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      // Run with SQLite runner
      const sqliteRunner = new SqliteAgentRunner({ dbPath });
      const sqliteRunEvents = await firstValueFrom(
        sqliteRunner.run({ threadId, agent: agent.clone(), input }).pipe(toArray())
      );
      const sqliteConnectEvents = await firstValueFrom(
        sqliteRunner.connect({ threadId }).pipe(toArray())
      );

      // Run with InMemory runner
      const memoryRunner = new InMemoryAgentRunner();
      const memoryRunEvents = await firstValueFrom(
        memoryRunner.run({ threadId, agent: agent.clone(), input }).pipe(toArray())
      );
      const memoryConnectEvents = await firstValueFrom(
        memoryRunner.connect({ threadId }).pipe(toArray())
      );

      // Both should emit the same events
      expect(sqliteRunEvents).toEqual(memoryRunEvents);
      expect(sqliteConnectEvents).toEqual(memoryConnectEvents);
    });
  });

  describe("Input message handling", () => {
    it("should store NEW input messages but NOT old ones", async () => {
      const threadId = "test-thread-input-storage";
      
      // First run: create some messages
      const events1: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "first-run-msg", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "first-run-msg", delta: "First run message" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "first-run-msg" },
      ];

      const agent1 = new MockAgent(events1);
      const input1: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      await firstValueFrom(runner.run({ threadId, agent: agent1, input: input1 }).pipe(toArray()));

      // Second run: pass OLD message and a NEW message as input
      const events2: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "second-run-msg", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "second-run-msg", delta: "Second run message" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "second-run-msg" },
      ];

      const agent2 = new MockAgent(events2);
      const input2: RunAgentInput = {
        threadId,
        runId: "run2",
        messages: [
          {
            id: "first-run-msg",  // This is OLD - from run1, should NOT be stored again
            role: "assistant",
            content: "First run message"
          },
          {
            id: "new-user-msg",  // This is NEW - should be stored in run2
            role: "user",
            content: "This is a NEW user message that SHOULD be stored in run2"
          }
        ],
      };

      await firstValueFrom(runner.run({ threadId, agent: agent2, input: input2 }).pipe(toArray()));

      // Check database directly
      const db = new Database(dbPath);
      const rows = db.prepare("SELECT run_id, events FROM agent_runs WHERE thread_id = ? ORDER BY created_at").all(threadId) as any[];
      db.close();

      expect(rows).toHaveLength(2);
      
      // First run should only have its own message
      const run1Events = JSON.parse(rows[0].events);
      const run1MessageIds = run1Events.filter((e: any) => e.messageId).map((e: any) => e.messageId);
      expect(run1MessageIds).toContain("first-run-msg");
      expect(run1MessageIds).not.toContain("new-user-msg");
      expect(run1MessageIds).not.toContain("second-run-msg");
      
      // Second run should have the NEW user message and agent response, but NOT the old message
      const run2Events = JSON.parse(rows[1].events);
      const run2MessageIds = run2Events.filter((e: any) => e.messageId).map((e: any) => e.messageId);
      expect(run2MessageIds).toContain("second-run-msg"); // Agent's response
      expect(run2MessageIds).toContain("new-user-msg");   // NEW user message - SHOULD be stored
      expect(run2MessageIds).not.toContain("first-run-msg"); // OLD message - should NOT be stored again
      
      // Verify the second run has the right messages
      const uniqueRun2MessageIds = [...new Set(run2MessageIds)];
      expect(uniqueRun2MessageIds).toHaveLength(2); // Should have exactly 2 message IDs
      expect(uniqueRun2MessageIds).toContain("new-user-msg");
      expect(uniqueRun2MessageIds).toContain("second-run-msg");
    });
  });

  describe("Complete conversation flow", () => {
    it("should store ALL types of NEW messages including tool results", async () => {
      const threadId = "test-thread-all-message-types";
      
      // Run 1: User message with tool call and result
      const agent1 = new MockAgent([
        { type: EventType.TOOL_CALL_START, toolCallId: "tool-1", toolName: "calculator" },
        { type: EventType.TOOL_CALL_ARGS, toolCallId: "tool-1", delta: '{"a": 1, "b": 2}' },
        { type: EventType.TOOL_CALL_END, toolCallId: "tool-1" },
      ]);
      
      const input1: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [
          { id: "user-1", role: "user", content: "Calculate 1+2" },
          { id: "assistant-1", role: "assistant", content: "Let me calculate that", toolCalls: [
            { id: "tool-1", type: "function", function: { name: "calculator", arguments: JSON.stringify({ a: 1, b: 2 }) } }
          ]},
          { id: "tool-result-1", role: "tool", toolCallId: "tool-1", content: "3" }
        ],
      };
      
      await firstValueFrom(runner.run({ threadId, agent: agent1, input: input1 }).pipe(toArray()));
      
      // Run 2: Add more messages including system and developer
      const agent2 = new MockAgent([
        { type: EventType.TEXT_MESSAGE_START, messageId: "assistant-2", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "assistant-2", delta: "The answer is 3" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "assistant-2" },
      ]);
      
      const input2: RunAgentInput = {
        threadId,
        runId: "run2",
        messages: [
          // Old messages from run 1
          { id: "user-1", role: "user", content: "Calculate 1+2" },
          { id: "assistant-1", role: "assistant", content: "Let me calculate that", toolCalls: [
            { id: "tool-1", type: "function", function: { name: "calculator", arguments: JSON.stringify({ a: 1, b: 2 }) } }
          ]},
          { id: "tool-result-1", role: "tool", toolCallId: "tool-1", content: "3" },
          // New messages for run 2
          { id: "system-1", role: "system", content: "Be concise" },
          { id: "developer-1", role: "developer", content: "Use simple language" },
          { id: "user-2", role: "user", content: "What was the result?" }
        ],
      };
      
      await firstValueFrom(runner.run({ threadId, agent: agent2, input: input2 }).pipe(toArray()));
      
      // Check database
      const db = new Database(dbPath);
      const rows = db.prepare("SELECT run_id, events FROM agent_runs WHERE thread_id = ? ORDER BY created_at").all(threadId) as any[];
      db.close();
      
      expect(rows).toHaveLength(2);
      
      // Run 1 should have all the initial messages
      const run1Events = JSON.parse(rows[0].events);
      const run1MessageIds = [...new Set(run1Events.filter((e: any) => e.messageId).map((e: any) => e.messageId))];
      const run1ToolIds = [...new Set(run1Events.filter((e: any) => e.toolCallId).map((e: any) => e.toolCallId))];
      
      expect(run1MessageIds).toContain("user-1");
      expect(run1MessageIds).toContain("assistant-1");
      expect(run1ToolIds).toContain("tool-1"); // Tool events from both input and agent
      
      // Verify tool result event is stored
      const toolResultEvents = run1Events.filter((e: any) => e.type === EventType.TOOL_CALL_RESULT);
      expect(toolResultEvents).toHaveLength(1);
      expect(toolResultEvents[0].toolCallId).toBe("tool-1");
      expect(toolResultEvents[0].content).toBe("3");
      
      // Run 2 should have ONLY the new messages
      const run2Events = JSON.parse(rows[1].events);
      const run2MessageIds = [...new Set(run2Events.filter((e: any) => e.messageId).map((e: any) => e.messageId))];
      
      expect(run2MessageIds).toContain("system-1");    // NEW system message
      expect(run2MessageIds).toContain("developer-1"); // NEW developer message
      expect(run2MessageIds).toContain("user-2");      // NEW user message
      expect(run2MessageIds).toContain("assistant-2"); // NEW assistant response
      
      // Should NOT contain old messages
      expect(run2MessageIds).not.toContain("user-1");
      expect(run2MessageIds).not.toContain("assistant-1");
      
      // Should NOT contain old tool results
      const run2ToolResults = run2Events.filter((e: any) => e.type === EventType.TOOL_CALL_RESULT);
      expect(run2ToolResults.filter((e: any) => e.toolCallId === "tool-1")).toHaveLength(0);
      
      // Verify we captured all 4 new message types in run 2
      const run2EventTypes = new Set(run2Events.map((e: any) => e.type));
      expect(run2EventTypes.has(EventType.TEXT_MESSAGE_START)).toBe(true);
      expect(run2EventTypes.has(EventType.TEXT_MESSAGE_CONTENT)).toBe(true);
      expect(run2EventTypes.has(EventType.TEXT_MESSAGE_END)).toBe(true);
    });

    it("should correctly store a multi-turn conversation", async () => {
      const threadId = "test-thread-conversation";
      
      // Run 1: Initial user message and agent response
      const agent1 = new MockAgent([
        { type: EventType.TEXT_MESSAGE_START, messageId: "agent-1", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "agent-1", delta: "Hello! How can I help?" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "agent-1" },
      ]);
      
      const input1: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [
          { id: "user-1", role: "user", content: "Hi!" }
        ],
      };
      
      await firstValueFrom(runner.run({ threadId, agent: agent1, input: input1 }).pipe(toArray()));
      
      // Run 2: Second user message and agent response
      const agent2 = new MockAgent([
        { type: EventType.TEXT_MESSAGE_START, messageId: "agent-2", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "agent-2", delta: "The weather is nice today!" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "agent-2" },
      ]);
      
      const input2: RunAgentInput = {
        threadId,
        runId: "run2",
        messages: [
          { id: "user-1", role: "user", content: "Hi!" },
          { id: "agent-1", role: "assistant", content: "Hello! How can I help?" },
          { id: "user-2", role: "user", content: "What's the weather?" }
        ],
      };
      
      await firstValueFrom(runner.run({ threadId, agent: agent2, input: input2 }).pipe(toArray()));
      
      // Check database
      const db = new Database(dbPath);
      const rows = db.prepare("SELECT run_id, events FROM agent_runs WHERE thread_id = ? ORDER BY created_at").all(threadId) as any[];
      db.close();
      
      expect(rows).toHaveLength(2);
      
      // Run 1 should have user-1 and agent-1
      const run1Events = JSON.parse(rows[0].events);
      const run1MessageIds = [...new Set(run1Events.filter((e: any) => e.messageId).map((e: any) => e.messageId))];
      expect(run1MessageIds).toHaveLength(2);
      expect(run1MessageIds).toContain("user-1");
      expect(run1MessageIds).toContain("agent-1");
      
      // Run 2 should have ONLY user-2 and agent-2 (not the old messages)
      const run2Events = JSON.parse(rows[1].events);
      const run2MessageIds = [...new Set(run2Events.filter((e: any) => e.messageId).map((e: any) => e.messageId))];
      expect(run2MessageIds).toHaveLength(2);
      expect(run2MessageIds).toContain("user-2");
      expect(run2MessageIds).toContain("agent-2");
      expect(run2MessageIds).not.toContain("user-1");
      expect(run2MessageIds).not.toContain("agent-1");
    });
  });

  describe("Database integrity", () => {
    it("should create all required tables", () => {
      const db = new Database(dbPath);
      
      // Check agent_runs table exists
      const agentRunsTable = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_runs'"
      ).get();
      expect(agentRunsTable).toBeDefined();

      // Check run_state table exists
      const runStateTable = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='run_state'"
      ).get();
      expect(runStateTable).toBeDefined();

      // Check schema_version table exists
      const schemaVersionTable = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'"
      ).get();
      expect(schemaVersionTable).toBeDefined();

      db.close();
    });

    it("should handle database file creation", () => {
      // Database file should be created
      expect(fs.existsSync(dbPath)).toBe(true);
    });

    it("should never store empty events array", async () => {
      const threadId = "test-thread-no-empty";
      
      // Test with events that should be stored
      const events: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Test" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
      ];

      const agent = new MockAgent(events);
      const input: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      // Run the agent
      await firstValueFrom(runner.run({ threadId, agent, input }).pipe(toArray()));

      // Check database directly
      const db = new Database(dbPath);
      const rows = db.prepare("SELECT events FROM agent_runs WHERE thread_id = ?").all(threadId) as any[];
      db.close();

      // Should have one run
      expect(rows).toHaveLength(1);
      
      // Parse and check events are not empty
      const storedEvents = JSON.parse(rows[0].events);
      expect(storedEvents).not.toHaveLength(0);
      expect(storedEvents.length).toBeGreaterThan(0);
      expect(storedEvents).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: EventType.TEXT_MESSAGE_START }),
        expect.objectContaining({ type: EventType.TEXT_MESSAGE_CONTENT }),
        expect.objectContaining({ type: EventType.TEXT_MESSAGE_END }),
      ]));
    });

    it("should store correct events after compaction on subsequent runs", async () => {
      const threadId = "test-thread-subsequent-runs";
      
      // First run with initial events
      const events1: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg1", role: "user" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg1", delta: "Hello" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg1" },
      ];

      const agent1 = new MockAgent(events1);
      const input1: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      await firstValueFrom(runner.run({ threadId, agent: agent1, input: input1 }).pipe(toArray()));

      // Second run with new events
      const events2: BaseEvent[] = [
        { type: EventType.TEXT_MESSAGE_START, messageId: "msg2", role: "assistant" },
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId: "msg2", delta: "World" },
        { type: EventType.TEXT_MESSAGE_END, messageId: "msg2" },
      ];

      const agent2 = new MockAgent(events2);
      const input2: RunAgentInput = {
        threadId,
        runId: "run2",
        messages: [],
      };

      await firstValueFrom(runner.run({ threadId, agent: agent2, input: input2 }).pipe(toArray()));

      // Check database directly
      const db = new Database(dbPath);
      const rows = db.prepare("SELECT run_id, events FROM agent_runs WHERE thread_id = ? ORDER BY created_at").all(threadId) as any[];
      db.close();

      // Should have two runs
      expect(rows).toHaveLength(2);
      
      // Both runs should have non-empty events
      const run1Events = JSON.parse(rows[0].events);
      const run2Events = JSON.parse(rows[1].events);
      
      expect(run1Events).not.toHaveLength(0);
      expect(run2Events).not.toHaveLength(0);
      
      // First run should have ONLY the first message events
      expect(run1Events).toEqual(expect.arrayContaining([
        expect.objectContaining({ messageId: "msg1" }),
      ]));
      expect(run1Events.every((e: any) => !e.messageId || e.messageId === "msg1")).toBe(true);
      
      // Second run should have ONLY the second message events
      expect(run2Events).toEqual(expect.arrayContaining([
        expect.objectContaining({ messageId: "msg2" }),
      ]));
      expect(run2Events.every((e: any) => !e.messageId || e.messageId === "msg2")).toBe(true);
      
      // Verify no message duplication across runs
      const run1MessageIds = new Set(run1Events.filter((e: any) => e.messageId).map((e: any) => e.messageId));
      const run2MessageIds = new Set(run2Events.filter((e: any) => e.messageId).map((e: any) => e.messageId));
      const intersection = [...run1MessageIds].filter(id => run2MessageIds.has(id));
      expect(intersection).toHaveLength(0);
    });

    it("should handle edge case with no new events after compaction", async () => {
      const threadId = "test-thread-edge-case";
      
      // Run with duplicate events that might compact to nothing new
      const events: BaseEvent[] = [
        { type: EventType.RUN_STARTED, runId: "run1" },
        { type: EventType.RUN_FINISHED, runId: "run1" },
      ];

      const agent = new MockAgent(events);
      const input: RunAgentInput = {
        threadId,
        runId: "run1",
        messages: [],
      };

      await firstValueFrom(runner.run({ threadId, agent, input }).pipe(toArray()));

      // Check database
      const db = new Database(dbPath);
      const rows = db.prepare("SELECT events FROM agent_runs WHERE thread_id = ?").all(threadId) as any[];
      db.close();

      // Should have stored the run
      expect(rows).toHaveLength(1);
      
      // Events should be stored (even if they are minimal after compaction)
      const storedEvents = JSON.parse(rows[0].events);
      expect(Array.isArray(storedEvents)).toBe(true);
    });
  });
});
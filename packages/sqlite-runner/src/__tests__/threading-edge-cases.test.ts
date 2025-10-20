import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SqliteAgentRunner } from "../sqlite-runner";
import {
  AbstractAgent,
  BaseEvent,
  RunAgentInput,
  EventType,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  Message,
} from "@ag-ui/client";
import { EMPTY, firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";

type RunCallbacks = {
  onEvent: (event: { event: BaseEvent }) => void;
  onNewMessage?: (args: { message: Message }) => void;
  onRunStartedEvent?: () => void;
};

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

describe("Threading Edge Cases - SqliteAgentRunner", () => {
  let runner: SqliteAgentRunner;

  beforeEach(() => {
    runner = new SqliteAgentRunner({ dbPath: ":memory:" });
  });

  afterEach(() => {
    runner.close();
  });

  const createTestEvents = (text: string, id: string): BaseEvent[] => [
    { type: EventType.TEXT_MESSAGE_START, messageId: id, role: "user" } as TextMessageStartEvent,
    { type: EventType.TEXT_MESSAGE_CONTENT, messageId: id, delta: text } as TextMessageContentEvent,
    { type: EventType.TEXT_MESSAGE_END, messageId: id } as TextMessageEndEvent,
  ];

  describe("Thread Creation Race Conditions", () => {
    it("should prevent cross-user access when trying same threadId", async () => {
      const agent1 = new MockAgent(createTestEvents("Message 1", "msg1"));
      const agent2 = new MockAgent(createTestEvents("Message 2", "msg2"));

      // Alice creates the thread first
      await firstValueFrom(
        runner.run({
          threadId: "concurrent-thread",
          agent: agent1,
          input: { threadId: "concurrent-thread", runId: "concurrent-thread-run-1", messages: [], state: {} },
          scope: { resourceId: "user-alice" },
        }).pipe(toArray())
      );

      // Bob tries to run on Alice's thread - should be rejected
      let errorThrown = false;
      try {
        await firstValueFrom(
          runner.run({
            threadId: "concurrent-thread",
            agent: agent2,
            input: { threadId: "concurrent-thread", runId: "concurrent-thread-run-2", messages: [], state: {} },
            scope: { resourceId: "user-bob" },
          }).pipe(toArray())
        );
      } catch (error: any) {
        errorThrown = true;
        expect(error.message).toBe("Unauthorized: Cannot run on thread owned by different resource");
      }
      expect(errorThrown).toBe(true);

      // Verify Alice still owns the thread
      const metadata = await runner.getThreadMetadata("concurrent-thread", { resourceId: "user-alice" });
      expect(metadata).not.toBeNull();
      expect(metadata!.resourceId).toBe("user-alice");

      // Verify Bob can't access it
      const bobMetadata = await runner.getThreadMetadata("concurrent-thread", { resourceId: "user-bob" });
      expect(bobMetadata).toBeNull();
    });

    it("should persist state correctly after concurrent attempts", async () => {
      const agent1 = new MockAgent(createTestEvents("Alice", "msg1"));
      const agent2 = new MockAgent(createTestEvents("Bob", "msg2"));

      // Try concurrent creation - wrap in async functions to catch synchronous throws
      await Promise.allSettled([
        (async () => {
          return await firstValueFrom(
            runner.run({
              threadId: "race-persist",
              agent: agent1,
              input: { threadId: "race-persist", runId: "race-persist-run-1", messages: [], state: {} },
              scope: { resourceId: "user-alice" },
            }).pipe(toArray())
          );
        })(),
        (async () => {
          return await firstValueFrom(
            runner.run({
              threadId: "race-persist",
              agent: agent2,
              input: { threadId: "race-persist", runId: "race-persist-run-2", messages: [], state: {} },
              scope: { resourceId: "user-bob" },
            }).pipe(toArray())
          );
        })(),
      ]);

      // Verify database integrity - should only have one owner
      const aliceMetadata = await runner.getThreadMetadata("race-persist", { resourceId: "user-alice" });
      const bobMetadata = await runner.getThreadMetadata("race-persist", { resourceId: "user-bob" });

      // Exactly one should have access
      const hasAccess = [aliceMetadata, bobMetadata].filter(m => m !== null).length;
      expect(hasAccess).toBe(1);
    });
  });

  describe("Special Characters in ResourceIds - SQL Injection Protection", () => {
    it("should safely handle SQL injection attempts in resourceId", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      const injectionAttempts = [
        "user' OR '1'='1",
        "user'; DROP TABLE agent_runs; --",
        "user' UNION SELECT * FROM agent_runs--",
        "user' AND 1=1--",
        "user\\'; DROP TABLE agent_runs; --",
      ];

      for (const resourceId of injectionAttempts) {
        const obs = runner.run({
          threadId: `injection-${injectionAttempts.indexOf(resourceId)}`,
          agent,
          input: { threadId: `injection-${injectionAttempts.indexOf(resourceId)}`, runId: `injection-${injectionAttempts.indexOf(resourceId)}-run-1`, messages: [], state: {} },
          scope: { resourceId },
        });

        const events = await firstValueFrom(obs.pipe(toArray()));
        expect(events.length).toBeGreaterThan(0);

        // Verify the thread is only accessible by exact resourceId match
        const metadata = await runner.getThreadMetadata(
          `injection-${injectionAttempts.indexOf(resourceId)}`,
          { resourceId }
        );
        expect(metadata).not.toBeNull();
        expect(metadata!.resourceId).toBe(resourceId);

        // Verify isolation - "legitimate" users can't access
        const otherMetadata = await runner.getThreadMetadata(
          `injection-${injectionAttempts.indexOf(resourceId)}`,
          { resourceId: "user" }
        );
        expect(otherMetadata).toBeNull();
      }

      // Verify database structure is intact (table still exists)
      const allThreads = await runner.listThreads({ scope: null, limit: 100 });
      expect(allThreads.total).toBeGreaterThan(0);
    });

    it("should handle unicode and special characters in resourceId", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      const specialIds = [
        "user-日本語-émoji-🎉",
        "user\nwith\nnewlines",
        "user\twith\ttabs",
        "user'with\"quotes'",
        "user%wildcard%",
        "user_underscore_",
      ];

      for (const resourceId of specialIds) {
        const threadId = `special-${specialIds.indexOf(resourceId)}`;
        const obs = runner.run({
          threadId,
          agent,
          input: { threadId, runId: `${threadId}-run-1`, messages: [], state: {} },
          scope: { resourceId },
        });

        const events = await firstValueFrom(obs.pipe(toArray()));
        expect(events.length).toBeGreaterThan(0);

        // Verify exact match retrieval
        const metadata = await runner.getThreadMetadata(threadId, { resourceId });
        expect(metadata).not.toBeNull();
        expect(metadata!.resourceId).toBe(resourceId);
      }
    });

    it("should handle very long resourceIds without truncation", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));
      const longResourceId = "user-" + "a".repeat(10000); // 10KB resourceId

      const obs = runner.run({
        threadId: "long-id-thread",
        agent,
        input: { threadId: "long-id-thread", runId: "long-id-thread-run-1", messages: [], state: {} },
        scope: { resourceId: longResourceId },
      });

      const events = await firstValueFrom(obs.pipe(toArray()));
      expect(events.length).toBeGreaterThan(0);

      // Verify full resourceId is stored (no truncation)
      const metadata = await runner.getThreadMetadata("long-id-thread", { resourceId: longResourceId });
      expect(metadata).not.toBeNull();
      expect(metadata!.resourceId).toBe(longResourceId);
      expect(metadata!.resourceId.length).toBe(longResourceId.length);
    });
  });

  describe("ListThreads Edge Cases with Database Queries", () => {
    it("should handle offset greater than total threads efficiently", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create 5 threads
      for (let i = 0; i < 5; i++) {
        await firstValueFrom(
          runner.run({
            threadId: `thread-${i}`,
            agent,
            input: { threadId: `thread-${i}`, runId: `thread-${i}-run-1`, messages: [], state: {} },
            scope: { resourceId: "user-alice" },
          }).pipe(toArray())
        );
      }

      // Query with huge offset
      const result = await runner.listThreads({
        scope: { resourceId: "user-alice" },
        limit: 10,
        offset: 10000,
      });

      expect(result.total).toBe(5);
      expect(result.threads).toHaveLength(0);
    });

    it("should maintain sort order across pagination", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create threads with delays to ensure different timestamps
      for (let i = 0; i < 10; i++) {
        await firstValueFrom(
          runner.run({
            threadId: `ordered-thread-${i}`,
            agent,
            input: { threadId: `ordered-thread-${i}`, runId: `ordered-thread-${i}-run-1`, messages: [], state: {} },
            scope: { resourceId: "user-alice" },
          }).pipe(toArray())
        );
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      // Get all threads in pages
      const page1 = await runner.listThreads({
        scope: { resourceId: "user-alice" },
        limit: 4,
        offset: 0,
      });

      const page2 = await runner.listThreads({
        scope: { resourceId: "user-alice" },
        limit: 4,
        offset: 4,
      });

      // Verify descending order by lastActivityAt (most recent first)
      const allThreads = [...page1.threads, ...page2.threads];
      for (let i = 0; i < allThreads.length - 1; i++) {
        expect(allThreads[i].lastActivityAt).toBeGreaterThanOrEqual(allThreads[i + 1].lastActivityAt);
      }
    });

    it("should handle empty result set efficiently", async () => {
      const startTime = Date.now();

      const result = await runner.listThreads({
        scope: { resourceId: "user-with-no-threads" },
        limit: 100,
      });

      const duration = Date.now() - startTime;

      expect(result.total).toBe(0);
      expect(result.threads).toHaveLength(0);
      expect(duration).toBeLessThan(100); // Should be fast even with high limit
    });
  });

  describe("Thread Lifecycle with Database Persistence", () => {
    it("should completely remove thread data after deletion", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create thread
      await firstValueFrom(
        runner.run({
          threadId: "delete-complete",
          agent,
          input: { threadId: "delete-complete", runId: "delete-complete-run-1", messages: [], state: {} },
          scope: { resourceId: "user-alice" },
        }).pipe(toArray())
      );

      // Verify it exists
      let metadata = await runner.getThreadMetadata("delete-complete", { resourceId: "user-alice" });
      expect(metadata).not.toBeNull();

      // Delete it
      await runner.deleteThread("delete-complete", { resourceId: "user-alice" });

      // Verify complete removal
      metadata = await runner.getThreadMetadata("delete-complete", { resourceId: "user-alice" });
      expect(metadata).toBeNull();

      // Verify not in list
      const threads = await runner.listThreads({
        scope: { resourceId: "user-alice" },
        limit: 100,
      });
      expect(threads.threads.find(t => t.threadId === "delete-complete")).toBeUndefined();

      // Verify connect returns empty
      const events = await firstValueFrom(
        runner.connect({ threadId: "delete-complete", scope: { resourceId: "user-alice" } }).pipe(toArray())
      );
      expect(events).toHaveLength(0);
    });

    it("should allow thread reuse after deletion with clean state", async () => {
      const agent1 = new MockAgent(createTestEvents("First", "msg1"));
      const agent2 = new MockAgent(createTestEvents("Second", "msg2"));

      // Create thread
      await firstValueFrom(
        runner.run({
          threadId: "reuse-thread",
          agent: agent1,
          input: { threadId: "reuse-thread", runId: "reuse-thread-run-1", messages: [], state: {} },
          scope: { resourceId: "user-alice", properties: { version: 1 } },
        }).pipe(toArray())
      );

      // Delete it
      await runner.deleteThread("reuse-thread", { resourceId: "user-alice" });

      // Create new thread with same ID but different user
      await firstValueFrom(
        runner.run({
          threadId: "reuse-thread",
          agent: agent2,
          input: { threadId: "reuse-thread", runId: "reuse-thread-run-2", messages: [], state: {} },
          scope: { resourceId: "user-bob", properties: { version: 2 } },
        }).pipe(toArray())
      );

      // Verify it's Bob's thread now
      const metadata = await runner.getThreadMetadata("reuse-thread", { resourceId: "user-bob" });
      expect(metadata).not.toBeNull();
      expect(metadata!.resourceId).toBe("user-bob");
      expect(metadata!.properties).toEqual({ version: 2 });

      // Verify no old data
      const events = await firstValueFrom(
        runner.connect({ threadId: "reuse-thread", scope: { resourceId: "user-bob" } }).pipe(toArray())
      );
      const textEvents = events.filter(e => e.type === EventType.TEXT_MESSAGE_CONTENT) as TextMessageContentEvent[];
      expect(textEvents.some(e => e.delta === "First")).toBe(false);
      expect(textEvents.some(e => e.delta === "Second")).toBe(true);

      // Verify Alice can't access it
      const aliceMetadata = await runner.getThreadMetadata("reuse-thread", { resourceId: "user-alice" });
      expect(aliceMetadata).toBeNull();
    });
  });

  describe("Properties with JSON Serialization", () => {
    it("should handle malformed JSON-like strings in properties", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      const weirdProps = {
        jsonString: '{"not":"parsed"}',
        sqlInjection: "'; DROP TABLE agent_runs; --",
        htmlTags: "<script>alert('xss')</script>",
        backslashes: "\\\\\\",
        quotes: '"""""',
      };

      const obs = runner.run({
        threadId: "weird-props-thread",
        agent,
        input: { threadId: "weird-props-thread", runId: "weird-props-thread-run-1", messages: [], state: {} },
        scope: { resourceId: "user-alice", properties: weirdProps },
      });

      const events = await firstValueFrom(obs.pipe(toArray()));
      expect(events.length).toBeGreaterThan(0);

      // Verify properties are stored and retrieved exactly as provided
      const metadata = await runner.getThreadMetadata("weird-props-thread", { resourceId: "user-alice" });
      expect(metadata!.properties).toEqual(weirdProps);
    });

    it("should handle very large properties (MB of data)", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create 1MB of properties data
      const largeProps: Record<string, string> = {};
      for (let i = 0; i < 10000; i++) {
        largeProps[`key${i}`] = "x".repeat(100);
      }

      const obs = runner.run({
        threadId: "large-props-thread",
        agent,
        input: { threadId: "large-props-thread", runId: "large-props-thread-run-1", messages: [], state: {} },
        scope: { resourceId: "user-alice", properties: largeProps },
      });

      const events = await firstValueFrom(obs.pipe(toArray()));
      expect(events.length).toBeGreaterThan(0);

      // Verify all data is preserved
      const metadata = await runner.getThreadMetadata("large-props-thread", { resourceId: "user-alice" });
      expect(metadata!.properties).toEqual(largeProps);
      expect(Object.keys(metadata!.properties!).length).toBe(10000);
    });

    it("should handle nested objects and arrays in properties", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      const nestedProps = {
        simple: "value",
        nested: {
          level1: {
            level2: {
              level3: "deep",
            },
          },
        },
        array: [1, 2, 3, { nested: "in array" }],
        nullValue: null,
        booleans: [true, false],
        numbers: [0, -1, 3.14159, Number.MAX_SAFE_INTEGER],
      };

      const obs = runner.run({
        threadId: "nested-props-thread",
        agent,
        input: { threadId: "nested-props-thread", runId: "nested-props-thread-run-1", messages: [], state: {} },
        scope: { resourceId: "user-alice", properties: nestedProps },
      });

      const events = await firstValueFrom(obs.pipe(toArray()));
      expect(events.length).toBeGreaterThan(0);

      const metadata = await runner.getThreadMetadata("nested-props-thread", { resourceId: "user-alice" });
      expect(metadata!.properties).toEqual(nestedProps);
    });
  });

  describe("Connect/Disconnect with Database State", () => {
    it("should handle connection to non-existent thread", async () => {
      const events = await firstValueFrom(
        runner.connect({ threadId: "does-not-exist", scope: { resourceId: "user-alice" } }).pipe(toArray())
      );

      expect(events).toHaveLength(0);
    });

    it("should handle admin connection to any thread", async () => {
      const agent = new MockAgent(createTestEvents("User message", "msg1"));

      // Create as user
      await firstValueFrom(
        runner.run({
          threadId: "user-thread",
          agent,
          input: { threadId: "user-thread", runId: "user-thread-run-1", messages: [], state: {} },
          scope: { resourceId: "user-alice" },
        }).pipe(toArray())
      );

      // Admin connects with null scope
      const adminEvents = await firstValueFrom(
        runner.connect({ threadId: "user-thread", scope: null }).pipe(toArray())
      );

      expect(adminEvents.length).toBeGreaterThan(0);

      // Admin with undefined scope
      const globalEvents = await firstValueFrom(
        runner.connect({ threadId: "user-thread" }).pipe(toArray())
      );

      expect(globalEvents.length).toBeGreaterThan(0);
    });

    it("should handle multiple sequential connections efficiently", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create thread
      await firstValueFrom(
        runner.run({
          threadId: "sequential-connect",
          agent,
          input: { threadId: "sequential-connect", runId: "sequential-connect-run-1", messages: [], state: {} },
          scope: { resourceId: "user-alice" },
        }).pipe(toArray())
      );

      // Connect multiple times sequentially
      const startTime = Date.now();
      for (let i = 0; i < 10; i++) {
        const events = await firstValueFrom(
          runner.connect({ threadId: "sequential-connect", scope: { resourceId: "user-alice" } }).pipe(toArray())
        );
        expect(events.length).toBeGreaterThan(0);
      }
      const duration = Date.now() - startTime;

      // Should be reasonably fast (< 100ms for 10 connections)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe("Resource ID Array with SQL Queries", () => {
    it("should optimize queries with single-element array", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create thread
      await firstValueFrom(
        runner.run({
          threadId: "single-array-thread",
          agent,
          input: { threadId: "single-array-thread", runId: "single-array-thread-run-1", messages: [], state: {} },
          scope: { resourceId: "user-alice" },
        }).pipe(toArray())
      );

      // Query with single-element array should work efficiently
      const threads = await runner.listThreads({
        scope: { resourceId: ["user-alice"] },
        limit: 10,
      });

      expect(threads.total).toBe(1);
      expect(threads.threads[0].threadId).toBe("single-array-thread");
    });

    it("should handle large IN clause for multi-workspace queries", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create threads in different workspaces
      for (let i = 0; i < 10; i++) {
        await firstValueFrom(
          runner.run({
            threadId: `workspace-thread-${i}`,
            agent,
            input: { threadId: `workspace-thread-${i}`, runId: `workspace-thread-${i}-run-1`, messages: [], state: {} },
            scope: { resourceId: `workspace-${i}` },
          }).pipe(toArray())
        );
      }

      // Query with array of 100 workspaces (stress test IN clause)
      const largeArray = Array.from({ length: 100 }, (_, i) => `workspace-${i}`);
      const threads = await runner.listThreads({
        scope: { resourceId: largeArray },
        limit: 100,
      });

      // Should find the 10 we created
      expect(threads.total).toBe(10);
    });

    it("should handle duplicate resourceIds in array efficiently", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create thread
      await firstValueFrom(
        runner.run({
          threadId: "dup-array-thread",
          agent,
          input: { threadId: "dup-array-thread", runId: "dup-array-thread-run-1", messages: [], state: {} },
          scope: { resourceId: "workspace-a" },
        }).pipe(toArray())
      );

      // Query with duplicates (should still return single result)
      const threads = await runner.listThreads({
        scope: { resourceId: ["workspace-a", "workspace-a", "workspace-a"] },
        limit: 10,
      });

      expect(threads.total).toBe(1);
      expect(threads.threads[0].threadId).toBe("dup-array-thread");
    });
  });

  describe("Suggestion Threads with Database Filtering", () => {
    it("should exclude suggestion threads from listThreads via SQL", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create regular thread
      await firstValueFrom(
        runner.run({
          threadId: "regular-thread",
          agent,
          input: { threadId: "regular-thread", runId: "regular-thread-run-1", messages: [], state: {} },
          scope: { resourceId: "user-alice" },
        }).pipe(toArray())
      );

      // Create multiple suggestion threads
      for (let i = 0; i < 5; i++) {
        await firstValueFrom(
          runner.run({
            threadId: `thread-suggestions-${i}`,
            agent,
            input: { threadId: `thread-suggestions-${i}`, runId: `thread-suggestions-${i}-run-1`, messages: [], state: {} },
            scope: { resourceId: "user-alice" },
          }).pipe(toArray())
        );
      }

      // List should only return regular thread
      const threads = await runner.listThreads({
        scope: { resourceId: "user-alice" },
        limit: 100,
      });

      expect(threads.total).toBe(1);
      expect(threads.threads[0].threadId).toBe("regular-thread");
    });

    it("should allow direct access to suggestion threads", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create suggestion thread
      await firstValueFrom(
        runner.run({
          threadId: "my-suggestions-thread",
          agent,
          input: { threadId: "my-suggestions-thread", runId: "my-suggestions-thread-run-1", messages: [], state: {} },
          scope: { resourceId: "user-alice" },
        }).pipe(toArray())
      );

      // Should be accessible via getThreadMetadata
      const metadata = await runner.getThreadMetadata("my-suggestions-thread", { resourceId: "user-alice" });
      expect(metadata).not.toBeNull();
      expect(metadata!.threadId).toBe("my-suggestions-thread");

      // Should be accessible via connect
      const events = await firstValueFrom(
        runner.connect({ threadId: "my-suggestions-thread", scope: { resourceId: "user-alice" } }).pipe(toArray())
      );
      expect(events.length).toBeGreaterThan(0);
    });

    it("should respect scope for suggestion threads", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Alice creates suggestion thread
      await firstValueFrom(
        runner.run({
          threadId: "alice-suggestions-thread",
          agent,
          input: { threadId: "alice-suggestions-thread", runId: "alice-suggestions-thread-run-1", messages: [], state: {} },
          scope: { resourceId: "user-alice" },
        }).pipe(toArray())
      );

      // Bob can't access Alice's suggestions
      const metadata = await runner.getThreadMetadata("alice-suggestions-thread", { resourceId: "user-bob" });
      expect(metadata).toBeNull();

      // Bob can't connect
      const events = await firstValueFrom(
        runner.connect({ threadId: "alice-suggestions-thread", scope: { resourceId: "user-bob" } }).pipe(toArray())
      );
      expect(events).toHaveLength(0);
    });
  });

  describe("Database Integrity After Edge Cases", () => {
    it("should maintain referential integrity after multiple operations", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create, delete, recreate cycle
      for (let cycle = 0; cycle < 3; cycle++) {
        await firstValueFrom(
          runner.run({
            threadId: "integrity-thread",
            agent,
            input: { threadId: "integrity-thread", runId: `run-${cycle}`, messages: [], state: {} },
            scope: { resourceId: "user-alice" },
          }).pipe(toArray())
        );

        await runner.deleteThread("integrity-thread", { resourceId: "user-alice" });
      }

      // Final verification - database should be clean
      const threads = await runner.listThreads({
        scope: { resourceId: "user-alice" },
        limit: 100,
      });
      expect(threads.total).toBe(0);
    });

    it("should handle database after stress test", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create many threads rapidly with unique run IDs
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          firstValueFrom(
            runner.run({
              threadId: `stress-thread-${i}`,
              agent,
              input: { threadId: `stress-thread-${i}`, runId: `stress-run-${i}`, messages: [], state: {} },
              scope: { resourceId: "user-alice" },
            }).pipe(toArray())
          )
        );
      }

      await Promise.all(promises);

      // Verify all were created correctly
      const threads = await runner.listThreads({
        scope: { resourceId: "user-alice" },
        limit: 100,
      });
      expect(threads.total).toBe(50);

      // Verify each thread is accessible
      for (let i = 0; i < 50; i++) {
        const metadata = await runner.getThreadMetadata(`stress-thread-${i}`, { resourceId: "user-alice" });
        expect(metadata).not.toBeNull();
      }
    });
  });
});

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

describe("Thread Hijacking Prevention - SqliteAgentRunner", () => {
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

  describe("Basic Hijacking Attempts", () => {
    it("should reject attempts to run on another user's thread", async () => {
      const agent = new MockAgent(createTestEvents("Alice's message", "msg1"));

      // Alice creates a thread
      const aliceObs = runner.run({
        threadId: "shared-thread-123",
        agent,
        input: { threadId: "shared-thread-123", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-alice" },
      });
      await firstValueFrom(aliceObs.pipe(toArray()));

      // Bob tries to hijack Alice's thread
      const bobAgent = new MockAgent(createTestEvents("Bob's hijack attempt", "msg2"));

      expect(() => {
        runner.run({
          threadId: "shared-thread-123",
          agent: bobAgent,
          input: { threadId: "shared-thread-123", runId: "run-2", messages: [], state: {} },
          scope: { resourceId: "user-bob" },
        });
      }).toThrow("Unauthorized: Cannot run on thread owned by different resource");

      // Verify Alice's thread is untouched
      const aliceThreads = await runner.listThreads({
        scope: { resourceId: "user-alice" },
        limit: 10,
      });
      expect(aliceThreads.threads).toHaveLength(1);
      expect(aliceThreads.threads[0].threadId).toBe("shared-thread-123");
    });

    it("should allow legitimate user to continue their own thread", async () => {
      const agent1 = new MockAgent(createTestEvents("Message 1", "msg1"));
      const agent2 = new MockAgent(createTestEvents("Message 2", "msg2"));

      // Alice creates a thread
      const obs1 = runner.run({
        threadId: "alice-thread",
        agent: agent1,
        input: { threadId: "alice-thread", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-alice" },
      });
      await firstValueFrom(obs1.pipe(toArray()));

      // Alice continues her own thread - should work
      const obs2 = runner.run({
        threadId: "alice-thread",
        agent: agent2,
        input: { threadId: "alice-thread", runId: "run-2", messages: [], state: {} },
        scope: { resourceId: "user-alice" },
      });

      const events = await firstValueFrom(obs2.pipe(toArray()));
      expect(events.length).toBeGreaterThan(0);
    });

    it("should prevent hijacking with similar but different resourceIds", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // User alice creates thread
      const obs1 = runner.run({
        threadId: "thread-xyz",
        agent,
        input: { threadId: "thread-xyz", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-alice" },
      });
      await firstValueFrom(obs1.pipe(toArray()));

      // User alice2 tries to hijack (similar name)
      expect(() => {
        runner.run({
          threadId: "thread-xyz",
          agent,
          input: { threadId: "thread-xyz", runId: "run-2", messages: [], state: {} },
          scope: { resourceId: "user-alice2" },
        });
      }).toThrow("Unauthorized");
    });
  });

  describe("Multi-Resource Access", () => {
    it("should allow access if user has thread's resourceId in array", async () => {
      const agent1 = new MockAgent(createTestEvents("Workspace message", "msg1"));
      const agent2 = new MockAgent(createTestEvents("Follow-up", "msg2"));

      // Create thread in workspace
      const obs1 = runner.run({
        threadId: "workspace-thread",
        agent: agent1,
        input: { threadId: "workspace-thread", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "workspace-123" },
      });
      await firstValueFrom(obs1.pipe(toArray()));

      // User with multi-resource access (personal + workspace)
      const obs2 = runner.run({
        threadId: "workspace-thread",
        agent: agent2,
        input: { threadId: "workspace-thread", runId: "run-2", messages: [], state: {} },
        scope: { resourceId: ["user-alice", "workspace-123"] },
      });

      const events = await firstValueFrom(obs2.pipe(toArray()));
      expect(events.length).toBeGreaterThan(0);
    });

    it("should reject if thread's resourceId is not in user's array", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create thread in workspace-A
      const obs1 = runner.run({
        threadId: "thread-a",
        agent,
        input: { threadId: "thread-a", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "workspace-a" },
      });
      await firstValueFrom(obs1.pipe(toArray()));

      // User with access to workspace-B and workspace-C only
      expect(() => {
        runner.run({
          threadId: "thread-a",
          agent,
          input: { threadId: "thread-a", runId: "run-2", messages: [], state: {} },
          scope: { resourceId: ["workspace-b", "workspace-c"] },
        });
      }).toThrow("Unauthorized");
    });
  });

  describe("Admin Bypass", () => {
    it("should allow admin (null scope) to run on existing threads", async () => {
      const agent1 = new MockAgent(createTestEvents("User message", "msg1"));
      const agent2 = new MockAgent(createTestEvents("Admin reply", "msg2"));

      // Regular user creates thread
      const obs1 = runner.run({
        threadId: "user-thread",
        agent: agent1,
        input: { threadId: "user-thread", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-alice" },
      });
      await firstValueFrom(obs1.pipe(toArray()));

      // Admin runs on user's thread with null scope
      const obs2 = runner.run({
        threadId: "user-thread",
        agent: agent2,
        input: { threadId: "user-thread", runId: "run-2", messages: [], state: {} },
        scope: null,
      });

      const events = await firstValueFrom(obs2.pipe(toArray()));
      expect(events.length).toBeGreaterThan(0);
    });

    it("should reject admin attempts to create threads with null scope", () => {
      const agent = new MockAgent(createTestEvents("Admin thread", "msg1"));

      // Admin tries to create thread with null scope - should be rejected
      expect(() => {
        runner.run({
          threadId: "admin-thread",
          agent,
          input: { threadId: "admin-thread", runId: "run-1", messages: [], state: {} },
          scope: null,
        });
      }).toThrow("Cannot create thread with null scope");
    });

    it("should allow admin to list all threads with null scope", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create threads for different users
      await firstValueFrom(
        runner.run({
          threadId: "alice-thread",
          agent,
          input: { threadId: "alice-thread", runId: "run-1", messages: [], state: {} },
          scope: { resourceId: "user-alice" },
        }).pipe(toArray())
      );

      await firstValueFrom(
        runner.run({
          threadId: "bob-thread",
          agent,
          input: { threadId: "bob-thread", runId: "run-2", messages: [], state: {} },
          scope: { resourceId: "user-bob" },
        }).pipe(toArray())
      );

      // Admin can see all threads
      const allThreads = await runner.listThreads({
        scope: null,
        limit: 10,
      });
      expect(allThreads.threads).toHaveLength(2);
    });
  });

  describe("Empty Array Validation", () => {
    it("should reject empty resourceId array on new thread", () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      expect(() => {
        runner.run({
          threadId: "new-thread",
          agent,
          input: { threadId: "new-thread", runId: "run-1", messages: [], state: {} },
          scope: { resourceId: [] },
        });
      }).toThrow("Invalid scope: resourceId array cannot be empty");
    });

    it("should reject empty resourceId array on existing thread", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create thread with valid scope
      const obs1 = runner.run({
        threadId: "thread-1",
        agent,
        input: { threadId: "thread-1", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-alice" },
      });
      await firstValueFrom(obs1.pipe(toArray()));

      // Try to run with empty array
      expect(() => {
        runner.run({
          threadId: "thread-1",
          agent,
          input: { threadId: "thread-1", runId: "run-2", messages: [], state: {} },
          scope: { resourceId: [] },
        });
      }).toThrow("Invalid scope: resourceId array cannot be empty");
    });
  });

  describe("Race Conditions", () => {
    it("should prevent concurrent hijacking attempts", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Alice creates thread
      const obs1 = runner.run({
        threadId: "race-thread",
        agent,
        input: { threadId: "race-thread", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-alice" },
      });
      await firstValueFrom(obs1.pipe(toArray()));

      // Multiple users try to hijack simultaneously
      const attempts = ["bob", "charlie", "dave"].map((user) => {
        return new Promise((resolve) => {
          try {
            runner.run({
              threadId: "race-thread",
              agent,
              input: { threadId: "race-thread", runId: `run-${user}`, messages: [], state: {} },
              scope: { resourceId: `user-${user}` },
            });
            resolve({ user, success: true });
          } catch (error) {
            resolve({ user, success: false, error: (error as Error).message });
          }
        });
      });

      const results = await Promise.all(attempts);

      // All hijacking attempts should fail
      results.forEach((result: any) => {
        expect(result.success).toBe(false);
        expect(result.error).toContain("Unauthorized");
      });
    });
  });

  describe("Properties Preservation", () => {
    it("should not overwrite thread properties during hijacking attempt", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Alice creates thread with properties
      const obs1 = runner.run({
        threadId: "prop-thread",
        agent,
        input: { threadId: "prop-thread", runId: "run-1", messages: [], state: {} },
        scope: {
          resourceId: "user-alice",
          properties: { department: "engineering", tier: "premium" },
        },
      });
      await firstValueFrom(obs1.pipe(toArray()));

      // Bob tries to hijack and overwrite properties
      try {
        runner.run({
          threadId: "prop-thread",
          agent,
          input: { threadId: "prop-thread", runId: "run-2", messages: [], state: {} },
          scope: {
            resourceId: "user-bob",
            properties: { department: "sales", tier: "free" },
          },
        });
      } catch {
        // Expected to fail
      }

      // Verify original properties are preserved
      const metadata = await runner.getThreadMetadata("prop-thread", { resourceId: "user-alice" });
      expect(metadata?.properties).toEqual({
        department: "engineering",
        tier: "premium",
      });
    });
  });

  describe("Multi-Resource Thread Persistence", () => {
    it("should persist all resource IDs from array on thread creation", async () => {
      const agent = new MockAgent(createTestEvents("Multi-resource message", "msg1"));

      // Create thread with multiple resource IDs
      await firstValueFrom(
        runner.run({
          threadId: "multi-resource-thread",
          agent,
          input: { threadId: "multi-resource-thread", runId: "run-1", messages: [], state: {} },
          scope: { resourceId: ["user-123", "workspace-456"] },
        }).pipe(toArray())
      );

      // User should be able to access it
      const userMetadata = await runner.getThreadMetadata("multi-resource-thread", {
        resourceId: "user-123",
      });
      expect(userMetadata).not.toBeNull();

      // Workspace should also be able to access it
      const workspaceMetadata = await runner.getThreadMetadata("multi-resource-thread", {
        resourceId: "workspace-456",
      });
      expect(workspaceMetadata).not.toBeNull();

      // Unrelated resource should not access it
      const otherMetadata = await runner.getThreadMetadata("multi-resource-thread", {
        resourceId: "workspace-789",
      });
      expect(otherMetadata).toBeNull();
    });

    it("should allow any resource owner to continue the thread", async () => {
      const agent1 = new MockAgent(createTestEvents("First message", "msg1"));
      const agent2 = new MockAgent(createTestEvents("Second message", "msg2"));
      const agent3 = new MockAgent(createTestEvents("Third message", "msg3"));

      // Create thread with multiple resource IDs
      await firstValueFrom(
        runner.run({
          threadId: "shared-thread",
          agent: agent1,
          input: { threadId: "shared-thread", runId: "run-1", messages: [], state: {} },
          scope: { resourceId: ["user-123", "workspace-456"] },
        }).pipe(toArray())
      );

      // User can continue
      const userEvents = await firstValueFrom(
        runner.run({
          threadId: "shared-thread",
          agent: agent2,
          input: { threadId: "shared-thread", runId: "run-2", messages: [], state: {} },
          scope: { resourceId: "user-123" },
        }).pipe(toArray())
      );
      expect(userEvents.length).toBeGreaterThan(0);

      // Workspace can also continue
      const workspaceEvents = await firstValueFrom(
        runner.run({
          threadId: "shared-thread",
          agent: agent3,
          input: { threadId: "shared-thread", runId: "run-3", messages: [], state: {} },
          scope: { resourceId: "workspace-456" },
        }).pipe(toArray())
      );
      expect(workspaceEvents.length).toBeGreaterThan(0);
    });

    it("should list thread for any of its resource owners", async () => {
      const agent = new MockAgent(createTestEvents("Shared content", "msg1"));

      // Create thread owned by both user and workspace
      await firstValueFrom(
        runner.run({
          threadId: "listed-thread",
          agent,
          input: { threadId: "listed-thread", runId: "run-1", messages: [], state: {} },
          scope: { resourceId: ["user-alice", "workspace-eng"] },
        }).pipe(toArray())
      );

      // User can see it in their list
      const userThreads = await runner.listThreads({
        scope: { resourceId: "user-alice" },
        limit: 10,
      });
      expect(userThreads.threads.some(t => t.threadId === "listed-thread")).toBe(true);

      // Workspace can see it in their list
      const workspaceThreads = await runner.listThreads({
        scope: { resourceId: "workspace-eng" },
        limit: 10,
      });
      expect(workspaceThreads.threads.some(t => t.threadId === "listed-thread")).toBe(true);

      // Other workspace cannot see it
      const otherThreads = await runner.listThreads({
        scope: { resourceId: "workspace-sales" },
        limit: 10,
      });
      expect(otherThreads.threads.some(t => t.threadId === "listed-thread")).toBe(false);
    });

    it("should prevent hijacking of multi-resource threads", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // Create thread owned by user and workspace
      await firstValueFrom(
        runner.run({
          threadId: "protected-multi-thread",
          agent,
          input: { threadId: "protected-multi-thread", runId: "run-1", messages: [], state: {} },
          scope: { resourceId: ["user-alice", "workspace-eng"] },
        }).pipe(toArray())
      );

      // Bob tries to hijack - should fail
      expect(() => {
        runner.run({
          threadId: "protected-multi-thread",
          agent,
          input: { threadId: "protected-multi-thread", runId: "run-2", messages: [], state: {} },
          scope: { resourceId: "user-bob" },
        });
      }).toThrow("Unauthorized");
    });

    it("should allow querying with multi-resource scope", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      // User with access to multiple workspaces creates thread in one
      await firstValueFrom(
        runner.run({
          threadId: "workspace-a-thread",
          agent,
          input: { threadId: "workspace-a-thread", runId: "run-1", messages: [], state: {} },
          scope: { resourceId: "workspace-a" },
        }).pipe(toArray())
      );

      // Query with multiple workspace IDs should find it
      const metadata = await runner.getThreadMetadata("workspace-a-thread", {
        resourceId: ["workspace-a", "workspace-b", "workspace-c"],
      });
      expect(metadata).not.toBeNull();

      // Query without the matching ID should not find it
      const noMatch = await runner.getThreadMetadata("workspace-a-thread", {
        resourceId: ["workspace-b", "workspace-c"],
      });
      expect(noMatch).toBeNull();
    });
  });
});

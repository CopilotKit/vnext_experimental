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

describe("Resource Scoping - InMemoryAgentRunner", () => {
  let runner: InMemoryAgentRunner;

  beforeEach(() => {
    runner = new InMemoryAgentRunner();
    // Clear any state from previous tests
    runner.clearAllThreads();
  });

  const createTestEvents = (messageText: string, messageId: string): BaseEvent[] => [
    { type: EventType.TEXT_MESSAGE_START, messageId, role: "user" } as TextMessageStartEvent,
    { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: messageText } as TextMessageContentEvent,
    { type: EventType.TEXT_MESSAGE_END, messageId } as TextMessageEndEvent,
  ];

  describe("Scope Isolation", () => {
    it("should prevent hijacking existing threads from other users", async () => {
      const agent = new MockAgent(createTestEvents("Alice's thread", "msg1"));

      // Alice creates a thread
      const aliceObs = runner.run({
        threadId: "thread-123",
        agent,
        input: { threadId: "thread-123", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-alice" },
      });
      await firstValueFrom(aliceObs.pipe(toArray()));

      // Bob tries to run on Alice's thread - should be rejected
      const bobAgent = new MockAgent(createTestEvents("Bob hijacking", "msg2"));
      expect(() => {
        runner.run({
          threadId: "thread-123",
          agent: bobAgent,
          input: { threadId: "thread-123", runId: "run-2", messages: [], state: {} },
          scope: { resourceId: "user-bob" },
        });
      }).toThrow("Unauthorized: Cannot run on thread owned by different resource");
    });

    it("should reject empty resourceId arrays", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      expect(() => {
        runner.run({
          threadId: "thread-empty",
          agent,
          input: { threadId: "thread-empty", runId: "run-1", messages: [], state: {} },
          scope: { resourceId: [] },
        });
      }).toThrow("Invalid scope: resourceId array cannot be empty");
    });

    it("should isolate threads by resourceId", async () => {
      const agent1 = new MockAgent(createTestEvents("User 1 message", "msg1"));
      const agent2 = new MockAgent(createTestEvents("User 2 message", "msg2"));

      // Create thread for user-1
      const obs1 = runner.run({
        threadId: "thread-1",
        agent: agent1,
        input: { threadId: "thread-1", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-1" },
      });
      await firstValueFrom(obs1.pipe(toArray()));

      // Create thread for user-2
      const obs2 = runner.run({
        threadId: "thread-2",
        agent: agent2,
        input: { threadId: "thread-2", runId: "run-2", messages: [], state: {} },
        scope: { resourceId: "user-2" },
      });
      await firstValueFrom(obs2.pipe(toArray()));

      // User 1 should only see their thread
      const user1Threads = await runner.listThreads({
        scope: { resourceId: "user-1" },
        limit: 10,
      });
      expect(user1Threads.threads).toHaveLength(1);
      expect(user1Threads.threads[0].threadId).toBe("thread-1");
      expect(user1Threads.threads[0].resourceId).toBe("user-1");

      // User 2 should only see their thread
      const user2Threads = await runner.listThreads({
        scope: { resourceId: "user-2" },
        limit: 10,
      });
      expect(user2Threads.threads).toHaveLength(1);
      expect(user2Threads.threads[0].threadId).toBe("thread-2");
      expect(user2Threads.threads[0].resourceId).toBe("user-2");
    });

    it("should return 404-style empty result when accessing another user's thread", async () => {
      const agent = new MockAgent(createTestEvents("User 1 message", "msg1"));

      // Create thread for user-1
      const obs = runner.run({
        threadId: "thread-user1",
        agent,
        input: { threadId: "thread-user1", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-1" },
      });
      await firstValueFrom(obs.pipe(toArray()));

      // User 2 attempts to connect to user 1's thread - should get empty (404)
      const connectObs = runner.connect({
        threadId: "thread-user1",
        scope: { resourceId: "user-2" },
      });

      const events = await firstValueFrom(connectObs.pipe(toArray()));
      expect(events).toEqual([]);
    });

    it("should return null when getting metadata for another user's thread", async () => {
      const agent = new MockAgent(createTestEvents("User 1 message", "msg1"));

      // Create thread for user-1
      const obs = runner.run({
        threadId: "thread-user1",
        agent,
        input: { threadId: "thread-user1", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-1" },
      });
      await firstValueFrom(obs.pipe(toArray()));

      // User 2 attempts to get metadata - should return null (404)
      const metadata = await runner.getThreadMetadata("thread-user1", { resourceId: "user-2" });
      expect(metadata).toBeNull();
    });

    it("should silently succeed when deleting another user's thread (idempotent)", async () => {
      const agent = new MockAgent(createTestEvents("User 1 message", "msg1"));

      // Create thread for user-1
      const obs = runner.run({
        threadId: "thread-user1",
        agent,
        input: { threadId: "thread-user1", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-1" },
      });
      await firstValueFrom(obs.pipe(toArray()));

      // User 2 attempts to delete user 1's thread - should silently succeed
      await expect(
        runner.deleteThread("thread-user1", { resourceId: "user-2" })
      ).resolves.toBeUndefined();

      // Verify thread still exists for user 1
      const metadata = await runner.getThreadMetadata("thread-user1", { resourceId: "user-1" });
      expect(metadata).not.toBeNull();
    });
  });

  describe("Multi-Resource Access (Array Queries)", () => {
    it("should allow access to threads from multiple resourceIds", async () => {
      const agent = new MockAgent(createTestEvents("Test message", "msg1"));

      // Create thread in personal workspace
      const obs1 = runner.run({
        threadId: "thread-personal",
        agent,
        input: { threadId: "thread-personal", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-1-personal" },
      });
      await firstValueFrom(obs1.pipe(toArray()));

      // Create thread in team workspace
      const obs2 = runner.run({
        threadId: "thread-team",
        agent,
        input: { threadId: "thread-team", runId: "run-2", messages: [], state: {} },
        scope: { resourceId: "workspace-123" },
      });
      await firstValueFrom(obs2.pipe(toArray()));

      // Create thread for another user
      const obs3 = runner.run({
        threadId: "thread-other",
        agent,
        input: { threadId: "thread-other", runId: "run-3", messages: [], state: {} },
        scope: { resourceId: "user-2-personal" },
      });
      await firstValueFrom(obs3.pipe(toArray()));

      // User with access to both personal and team workspace
      const threads = await runner.listThreads({
        scope: { resourceId: ["user-1-personal", "workspace-123"] },
        limit: 10,
      });

      // Should see both personal and team threads, but not other user's thread
      expect(threads.threads).toHaveLength(2);
      const threadIds = threads.threads.map((t) => t.threadId).sort();
      expect(threadIds).toEqual(["thread-personal", "thread-team"]);
    });

    it("should allow connecting to thread from any resourceId in array", async () => {
      const agent = new MockAgent(createTestEvents("Workspace message", "msg1"));

      // Create thread in workspace
      const obs = runner.run({
        threadId: "thread-workspace",
        agent,
        input: { threadId: "thread-workspace", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "workspace-456" },
      });
      await firstValueFrom(obs.pipe(toArray()));

      // User with access to multiple workspaces should be able to connect
      const connectObs = runner.connect({
        threadId: "thread-workspace",
        scope: { resourceId: ["user-1-personal", "workspace-456", "workspace-789"] },
      });

      const events = await firstValueFrom(connectObs.pipe(toArray()));
      expect(events.length).toBeGreaterThan(0);
    });

    it("should get metadata for thread with multi-resource scope", async () => {
      const agent = new MockAgent(createTestEvents("Team thread", "msg1"));

      // Create thread in team workspace
      const obs = runner.run({
        threadId: "thread-team",
        agent,
        input: { threadId: "thread-team", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "workspace-999" },
      });
      await firstValueFrom(obs.pipe(toArray()));

      // User with array scope including this workspace
      const metadata = await runner.getThreadMetadata("thread-team", {
        resourceId: ["user-1-personal", "workspace-999"],
      });

      expect(metadata).not.toBeNull();
      expect(metadata!.threadId).toBe("thread-team");
      expect(metadata!.resourceId).toBe("workspace-999");
    });

    it("should return null for metadata when resourceId not in array", async () => {
      const agent = new MockAgent(createTestEvents("Private thread", "msg1"));

      // Create thread in workspace
      const obs = runner.run({
        threadId: "thread-private",
        agent,
        input: { threadId: "thread-private", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "workspace-secret" },
      });
      await firstValueFrom(obs.pipe(toArray()));

      // User with different workspaces
      const metadata = await runner.getThreadMetadata("thread-private", {
        resourceId: ["workspace-1", "workspace-2"],
      });

      expect(metadata).toBeNull();
    });

    it("should handle empty array gracefully", async () => {
      const agent = new MockAgent(createTestEvents("Test", "msg1"));

      const obs = runner.run({
        threadId: "thread-1",
        agent,
        input: { threadId: "thread-1", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-1" },
      });
      await firstValueFrom(obs.pipe(toArray()));

      // Empty array should not match anything
      const threads = await runner.listThreads({
        scope: { resourceId: [] },
        limit: 10,
      });

      expect(threads.threads).toHaveLength(0);
    });
  });

  describe("Admin Bypass (Null Scope)", () => {
    it("should list all threads when scope is null", async () => {
      const agent = new MockAgent(createTestEvents("Test message", "msg1"));

      // Create threads for different users
      const obs1 = runner.run({
        threadId: "thread-user1",
        agent,
        input: { threadId: "thread-user1", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-1" },
      });
      await firstValueFrom(obs1.pipe(toArray()));

      const obs2 = runner.run({
        threadId: "thread-user2",
        agent,
        input: { threadId: "thread-user2", runId: "run-2", messages: [], state: {} },
        scope: { resourceId: "user-2" },
      });
      await firstValueFrom(obs2.pipe(toArray()));

      const obs3 = runner.run({
        threadId: "thread-user3",
        agent,
        input: { threadId: "thread-user3", runId: "run-3", messages: [], state: {} },
        scope: { resourceId: "user-3" },
      });
      await firstValueFrom(obs3.pipe(toArray()));

      // Admin with null scope should see all threads
      const adminThreads = await runner.listThreads({
        scope: null,
        limit: 10,
      });

      expect(adminThreads.threads).toHaveLength(3);
      const threadIds = adminThreads.threads.map((t) => t.threadId).sort();
      expect(threadIds).toEqual(["thread-user1", "thread-user2", "thread-user3"]);
    });

    it("should get metadata for any thread when scope is null", async () => {
      const agent = new MockAgent(createTestEvents("User thread", "msg1"));

      // Create thread for user-1
      const obs = runner.run({
        threadId: "thread-user1",
        agent,
        input: { threadId: "thread-user1", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-1" },
      });
      await firstValueFrom(obs.pipe(toArray()));

      // Admin should be able to get metadata
      const metadata = await runner.getThreadMetadata("thread-user1", null);

      expect(metadata).not.toBeNull();
      expect(metadata!.threadId).toBe("thread-user1");
      expect(metadata!.resourceId).toBe("user-1");
    });

    it("should delete any thread when scope is null", async () => {
      const agent = new MockAgent(createTestEvents("User thread", "msg1"));

      // Create thread for user-1
      const obs = runner.run({
        threadId: "thread-user1",
        agent,
        input: { threadId: "thread-user1", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-1" },
      });
      await firstValueFrom(obs.pipe(toArray()));

      // Admin deletes thread
      await runner.deleteThread("thread-user1", null);

      // Verify thread is deleted even for the owner
      const metadata = await runner.getThreadMetadata("thread-user1", { resourceId: "user-1" });
      expect(metadata).toBeNull();
    });

    it("should connect to any thread when scope is null", async () => {
      const agent = new MockAgent(createTestEvents("User message", "msg1"));

      // Create thread for user-1
      const obs = runner.run({
        threadId: "thread-user1",
        agent,
        input: { threadId: "thread-user1", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-1" },
      });
      await firstValueFrom(obs.pipe(toArray()));

      // Admin connects with null scope
      const connectObs = runner.connect({
        threadId: "thread-user1",
        scope: null,
      });

      const events = await firstValueFrom(connectObs.pipe(toArray()));
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe("Properties Field", () => {
    it("should store and retrieve properties", async () => {
      const agent = new MockAgent(createTestEvents("Test message", "msg1"));

      // Create thread with properties
      const obs = runner.run({
        threadId: "thread-with-props",
        agent,
        input: { threadId: "thread-with-props", runId: "run-1", messages: [], state: {} },
        scope: {
          resourceId: "user-1",
          properties: { organizationId: "org-123", department: "engineering" },
        },
      });
      await firstValueFrom(obs.pipe(toArray()));

      // Get metadata and verify properties
      const metadata = await runner.getThreadMetadata("thread-with-props", { resourceId: "user-1" });

      expect(metadata).not.toBeNull();
      expect(metadata!.properties).toEqual({
        organizationId: "org-123",
        department: "engineering",
      });
    });

    it("should handle undefined properties", async () => {
      const agent = new MockAgent(createTestEvents("Test message", "msg1"));

      // Create thread without properties
      const obs = runner.run({
        threadId: "thread-no-props",
        agent,
        input: { threadId: "thread-no-props", runId: "run-1", messages: [], state: {} },
        scope: { resourceId: "user-1" },
      });
      await firstValueFrom(obs.pipe(toArray()));

      // Get metadata and verify properties is undefined
      const metadata = await runner.getThreadMetadata("thread-no-props", { resourceId: "user-1" });

      expect(metadata).not.toBeNull();
      expect(metadata!.properties).toBeUndefined();
    });

    it("should include properties in list results", async () => {
      const agent = new MockAgent(createTestEvents("Test message", "msg1"));

      // Create thread with properties
      const obs = runner.run({
        threadId: "thread-1",
        agent,
        input: { threadId: "thread-1", runId: "run-1", messages: [], state: {} },
        scope: {
          resourceId: "user-1",
          properties: { tier: "premium", region: "us-east" },
        },
      });
      await firstValueFrom(obs.pipe(toArray()));

      // List threads
      const threads = await runner.listThreads({
        scope: { resourceId: "user-1" },
        limit: 10,
      });

      expect(threads.threads).toHaveLength(1);
      expect(threads.threads[0].properties).toEqual({
        tier: "premium",
        region: "us-east",
      });
    });
  });
});

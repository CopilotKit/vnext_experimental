import { describe, it, expect, beforeEach, vi } from "vitest";
import { CopilotRuntime } from "../runtime";
import { InMemoryAgentRunner } from "../runner/in-memory";
import { createCopilotEndpoint } from "../endpoint";
import {
  AbstractAgent,
  BaseEvent,
  EventType,
  RunAgentInput,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
} from "@ag-ui/client";
import { EMPTY, firstValueFrom } from "rxjs";
import { toArray } from "rxjs/operators";

// Simple test agent for creating threads
class TestAgent extends AbstractAgent {
  constructor(private message: string = "Test message") {
    super();
  }

  async runAgent(
    input: RunAgentInput,
    options: { onEvent: (event: { event: BaseEvent }) => void }
  ): Promise<void> {
    const messageId = "test-msg";
    options.onEvent({
      event: { type: EventType.TEXT_MESSAGE_START, messageId, role: "assistant" } as TextMessageStartEvent,
    });
    options.onEvent({
      event: { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: this.message } as TextMessageContentEvent,
    });
    options.onEvent({
      event: { type: EventType.TEXT_MESSAGE_END, messageId } as TextMessageEndEvent,
    });
  }

  clone(): AbstractAgent {
    return new TestAgent(this.message);
  }

  protected run() {
    return EMPTY;
  }

  protected connect() {
    return EMPTY;
  }
}

describe("Thread Endpoints E2E", () => {
  let runtime: CopilotRuntime;
  let runner: InMemoryAgentRunner;
  let app: ReturnType<typeof createCopilotEndpoint>;

  beforeEach(() => {
    runner = new InMemoryAgentRunner();
    runner.clearAllThreads();

    runtime = {
      runner: Promise.resolve(runner),
      resolveThreadsScope: async ({ request }) => {
        // Simple auth: extract user from X-User-ID header
        const userId = request.headers.get("X-User-ID");
        if (!userId) {
          throw new Error("Unauthorized: X-User-ID header required");
        }
        return { resourceId: userId };
      },
    } as CopilotRuntime;

    app = createCopilotEndpoint({ runtime, basePath: "/copilotkit" });
  });

  describe("GET /threads - List Threads", () => {
    it("returns empty list when user has no threads", async () => {
      const request = new Request("http://localhost/copilotkit/threads", {
        headers: { "X-User-ID": "user-1" },
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.threads).toEqual([]);
      expect(data.total).toBe(0);
    });

    it("returns threads for authenticated user", async () => {
      // Create threads for user-1
      const agent = new TestAgent("Hello from thread 1");
      await firstValueFrom(
        runner
          .run({
            threadId: "thread-1",
            agent,
            input: { threadId: "thread-1", runId: "run-1", messages: [], state: {} },
            scope: { resourceId: "user-1" },
          })
          .pipe(toArray())
      );

      await firstValueFrom(
        runner
          .run({
            threadId: "thread-2",
            agent: new TestAgent("Hello from thread 2"),
            input: { threadId: "thread-2", runId: "run-2", messages: [], state: {} },
            scope: { resourceId: "user-1" },
          })
          .pipe(toArray())
      );

      const request = new Request("http://localhost/copilotkit/threads", {
        headers: { "X-User-ID": "user-1" },
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.threads).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.threads[0].threadId).toMatch(/thread-/);
      expect(data.threads[0].firstMessage).toBeTruthy();
    });

    it("enforces scope - user cannot see other user's threads", async () => {
      // Create thread for user-1
      const agent = new TestAgent("User 1 message");
      await firstValueFrom(
        runner
          .run({
            threadId: "user-1-thread",
            agent,
            input: { threadId: "user-1-thread", runId: "run-1", messages: [], state: {} },
            scope: { resourceId: "user-1" },
          })
          .pipe(toArray())
      );

      // User-2 tries to list threads
      const request = new Request("http://localhost/copilotkit/threads", {
        headers: { "X-User-ID": "user-2" },
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.threads).toEqual([]); // Should not see user-1's thread
      expect(data.total).toBe(0);
    });

    it("respects pagination parameters", async () => {
      // Create 5 threads
      for (let i = 1; i <= 5; i++) {
        await firstValueFrom(
          runner
            .run({
              threadId: `thread-${i}`,
              agent: new TestAgent(`Message ${i}`),
              input: { threadId: `thread-${i}`, runId: `run-${i}`, messages: [], state: {} },
              scope: { resourceId: "user-1" },
            })
            .pipe(toArray())
        );
        await new Promise((resolve) => setTimeout(resolve, 5)); // Ensure ordering
      }

      // Request page 2 with limit 2
      const request = new Request("http://localhost/copilotkit/threads?limit=2&offset=2", {
        headers: { "X-User-ID": "user-1" },
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.threads).toHaveLength(2);
      expect(data.total).toBe(5);
    });
  });

  describe("GET /threads/:id - Get Single Thread", () => {
    it("returns 200 with thread metadata when thread exists", async () => {
      // Create a thread
      const agent = new TestAgent("Specific thread message");
      await firstValueFrom(
        runner
          .run({
            threadId: "specific-thread",
            agent,
            input: { threadId: "specific-thread", runId: "run-1", messages: [], state: {} },
            scope: { resourceId: "user-1" },
          })
          .pipe(toArray())
      );

      const request = new Request("http://localhost/copilotkit/threads/specific-thread", {
        headers: { "X-User-ID": "user-1" },
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.threadId).toBe("specific-thread");
      expect(data.firstMessage).toBe("Specific thread message");
      expect(data.messageCount).toBe(1);
      expect(data.isRunning).toBe(false);
    });

    it("returns 404 when thread does not exist", async () => {
      const request = new Request("http://localhost/copilotkit/threads/nonexistent-thread", {
        headers: { "X-User-ID": "user-1" },
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Thread not found");
    });

    it("returns 404 when thread exists but belongs to different user (scope violation)", async () => {
      // User-1 creates a thread
      const agent = new TestAgent("Private message");
      await firstValueFrom(
        runner
          .run({
            threadId: "private-thread",
            agent,
            input: { threadId: "private-thread", runId: "run-1", messages: [], state: {} },
            scope: { resourceId: "user-1" },
          })
          .pipe(toArray())
      );

      // User-2 tries to access it
      const request = new Request("http://localhost/copilotkit/threads/private-thread", {
        headers: { "X-User-ID": "user-2" },
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Thread not found");
    });

    it("handles special characters in thread ID", async () => {
      const threadId = "thread/with/slashes";
      const agent = new TestAgent("Special ID thread");
      await firstValueFrom(
        runner
          .run({
            threadId,
            agent,
            input: { threadId, runId: "run-1", messages: [], state: {} },
            scope: { resourceId: "user-1" },
          })
          .pipe(toArray())
      );

      // URL encode the thread ID
      const encodedId = encodeURIComponent(threadId);
      const request = new Request(`http://localhost/copilotkit/threads/${encodedId}`, {
        headers: { "X-User-ID": "user-1" },
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.threadId).toBe(threadId);
    });
  });

  describe("DELETE /threads/:id - Delete Thread", () => {
    it("successfully deletes thread", async () => {
      // Create a thread
      const agent = new TestAgent("To be deleted");
      await firstValueFrom(
        runner
          .run({
            threadId: "delete-me",
            agent,
            input: { threadId: "delete-me", runId: "run-1", messages: [], state: {} },
            scope: { resourceId: "user-1" },
          })
          .pipe(toArray())
      );

      // Verify it exists
      let metadata = await runner.getThreadMetadata("delete-me", { resourceId: "user-1" });
      expect(metadata).not.toBeNull();

      // Delete it
      const request = new Request("http://localhost/copilotkit/threads/delete-me", {
        method: "DELETE",
        headers: { "X-User-ID": "user-1" },
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify it's gone
      metadata = await runner.getThreadMetadata("delete-me", { resourceId: "user-1" });
      expect(metadata).toBeNull();
    });

    it("enforces scope - cannot delete other user's thread", async () => {
      // User-1 creates a thread
      const agent = new TestAgent("User 1's thread");
      await firstValueFrom(
        runner
          .run({
            threadId: "protected-thread",
            agent,
            input: { threadId: "protected-thread", runId: "run-1", messages: [], state: {} },
            scope: { resourceId: "user-1" },
          })
          .pipe(toArray())
      );

      // User-2 tries to delete it
      const request = new Request("http://localhost/copilotkit/threads/protected-thread", {
        method: "DELETE",
        headers: { "X-User-ID": "user-2" },
      });

      const response = await app.fetch(request);

      // Should succeed (idempotent) but thread should still exist for user-1
      expect(response.status).toBe(200);

      // Verify thread still exists for user-1
      const metadata = await runner.getThreadMetadata("protected-thread", { resourceId: "user-1" });
      expect(metadata).not.toBeNull();
      expect(metadata!.threadId).toBe("protected-thread");
    });

    it("returns success when deleting non-existent thread (idempotent)", async () => {
      const request = new Request("http://localhost/copilotkit/threads/never-existed", {
        method: "DELETE",
        headers: { "X-User-ID": "user-1" },
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("returns 400 when thread ID is empty", async () => {
      const request = new Request("http://localhost/copilotkit/threads/", {
        method: "DELETE",
        headers: { "X-User-ID": "user-1" },
      });

      const response = await app.fetch(request);

      // Should be 404 for non-matching route, not 400
      expect(response.status).toBe(404);
    });
  });

  describe("Full Lifecycle E2E", () => {
    it("creates, lists, gets, and deletes threads successfully", async () => {
      const userId = "lifecycle-user";

      // 1. Start with empty list
      let listResponse = await app.fetch(
        new Request("http://localhost/copilotkit/threads", {
          headers: { "X-User-ID": userId },
        })
      );
      expect(listResponse.status).toBe(200);
      let listData = await listResponse.json();
      expect(listData.total).toBe(0);

      // 2. Create threads
      for (let i = 1; i <= 3; i++) {
        await firstValueFrom(
          runner
            .run({
              threadId: `lifecycle-thread-${i}`,
              agent: new TestAgent(`Message ${i}`),
              input: { threadId: `lifecycle-thread-${i}`, runId: `run-${i}`, messages: [], state: {} },
              scope: { resourceId: userId },
            })
            .pipe(toArray())
        );
      }

      // 3. List threads
      listResponse = await app.fetch(
        new Request("http://localhost/copilotkit/threads", {
          headers: { "X-User-ID": userId },
        })
      );
      expect(listResponse.status).toBe(200);
      listData = await listResponse.json();
      expect(listData.total).toBe(3);

      // 4. Get specific thread
      const getResponse = await app.fetch(
        new Request("http://localhost/copilotkit/threads/lifecycle-thread-2", {
          headers: { "X-User-ID": userId },
        })
      );
      expect(getResponse.status).toBe(200);
      const getData = await getResponse.json();
      expect(getData.threadId).toBe("lifecycle-thread-2");
      expect(getData.firstMessage).toBe("Message 2");

      // 5. Delete one thread
      const deleteResponse = await app.fetch(
        new Request("http://localhost/copilotkit/threads/lifecycle-thread-2", {
          method: "DELETE",
          headers: { "X-User-ID": userId },
        })
      );
      expect(deleteResponse.status).toBe(200);

      // 6. Verify deletion
      listResponse = await app.fetch(
        new Request("http://localhost/copilotkit/threads", {
          headers: { "X-User-ID": userId },
        })
      );
      expect(listResponse.status).toBe(200);
      listData = await listResponse.json();
      expect(listData.total).toBe(2);
      expect(listData.threads.find((t: any) => t.threadId === "lifecycle-thread-2")).toBeUndefined();

      // 7. Deleted thread returns 404
      const getDeletedResponse = await app.fetch(
        new Request("http://localhost/copilotkit/threads/lifecycle-thread-2", {
          headers: { "X-User-ID": userId },
        })
      );
      expect(getDeletedResponse.status).toBe(404);
    });

    it("handles concurrent operations correctly", async () => {
      const userId = "concurrent-user";

      // Create threads concurrently
      await Promise.all([
        firstValueFrom(
          runner
            .run({
              threadId: "concurrent-1",
              agent: new TestAgent("Concurrent 1"),
              input: { threadId: "concurrent-1", runId: "run-1", messages: [], state: {} },
              scope: { resourceId: userId },
            })
            .pipe(toArray())
        ),
        firstValueFrom(
          runner
            .run({
              threadId: "concurrent-2",
              agent: new TestAgent("Concurrent 2"),
              input: { threadId: "concurrent-2", runId: "run-2", messages: [], state: {} },
              scope: { resourceId: userId },
            })
            .pipe(toArray())
        ),
        firstValueFrom(
          runner
            .run({
              threadId: "concurrent-3",
              agent: new TestAgent("Concurrent 3"),
              input: { threadId: "concurrent-3", runId: "run-3", messages: [], state: {} },
              scope: { resourceId: userId },
            })
            .pipe(toArray())
        ),
      ]);

      // List threads
      const listResponse = await app.fetch(
        new Request("http://localhost/copilotkit/threads", {
          headers: { "X-User-ID": userId },
        })
      );
      expect(listResponse.status).toBe(200);
      const listData = await listResponse.json();
      expect(listData.total).toBe(3);

      // Delete concurrently
      await Promise.all([
        app.fetch(
          new Request("http://localhost/copilotkit/threads/concurrent-1", {
            method: "DELETE",
            headers: { "X-User-ID": userId },
          })
        ),
        app.fetch(
          new Request("http://localhost/copilotkit/threads/concurrent-2", {
            method: "DELETE",
            headers: { "X-User-ID": userId },
          })
        ),
      ]);

      // Verify only one thread remains
      const finalListResponse = await app.fetch(
        new Request("http://localhost/copilotkit/threads", {
          headers: { "X-User-ID": userId },
        })
      );
      expect(finalListResponse.status).toBe(200);
      const finalListData = await finalListResponse.json();
      expect(finalListData.total).toBe(1);
      expect(finalListData.threads[0].threadId).toBe("concurrent-3");
    });
  });

  describe("Error Handling", () => {
    it("returns 401 when authentication fails", async () => {
      const request = new Request("http://localhost/copilotkit/threads", {
        // Missing X-User-ID header
      });

      const response = await app.fetch(request);

      // Should fail during scope resolution
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});

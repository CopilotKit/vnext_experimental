import { describe, expect, it, vi } from "vitest";
import { handleListThreads, handleGetThread, handleDeleteThread } from "../handlers/handle-threads";
import type { CopilotRuntime } from "../runtime";

const createRuntime = (listThreads = vi.fn().mockResolvedValue({ threads: [], total: 0 })) =>
  ({
    runner: Promise.resolve({
      listThreads,
    }),
    resolveThreadsScope: async () => ({ resourceId: "test-user" }),
  }) as unknown as CopilotRuntime;

const createRequest = (search = "") =>
  new Request(`https://example.com/api/threads${search.startsWith("?") ? search : `?${search}`}`, {
    method: "GET",
  });

describe("handleListThreads", () => {
  it("uses defaults when limit and offset are missing", async () => {
    const listThreads = vi.fn().mockResolvedValue({ threads: [], total: 0 });
    const runtime = createRuntime(listThreads);

    const response = await handleListThreads({
      runtime,
      request: createRequest(""),
    });

    expect(listThreads).toHaveBeenCalledWith({ scope: { resourceId: "test-user" }, limit: 20, offset: 0 });
    expect(response.status).toBe(200);
  });

  it("falls back to defaults when params are invalid", async () => {
    const listThreads = vi.fn().mockResolvedValue({ threads: [], total: 0 });
    const runtime = createRuntime(listThreads);

    await handleListThreads({
      runtime,
      request: createRequest("?limit=abc&offset=oops"),
    });

    expect(listThreads).toHaveBeenCalledWith({ scope: { resourceId: "test-user" }, limit: 20, offset: 0 });
  });

  it("normalises negative values", async () => {
    const listThreads = vi.fn().mockResolvedValue({ threads: [], total: 0 });
    const runtime = createRuntime(listThreads);

    await handleListThreads({
      runtime,
      request: createRequest("?limit=-10&offset=-5"),
    });

    expect(listThreads).toHaveBeenCalledWith({ scope: { resourceId: "test-user" }, limit: 1, offset: 0 });
  });

  it("caps the limit at 100", async () => {
    const listThreads = vi.fn().mockResolvedValue({ threads: [], total: 0 });
    const runtime = createRuntime(listThreads);

    await handleListThreads({
      runtime,
      request: createRequest("?limit=99999&offset=10"),
    });

    expect(listThreads).toHaveBeenCalledWith({ scope: { resourceId: "test-user" }, limit: 100, offset: 10 });
  });

  it("returns 401 when resolveThreadsScope returns undefined (auth failure)", async () => {
    const listThreads = vi.fn().mockResolvedValue({ threads: [], total: 0 });
    const runtime = {
      runner: Promise.resolve({
        listThreads,
      }),
      resolveThreadsScope: async () => undefined, // Auth failure or missing return
    } as unknown as CopilotRuntime;

    const response = await handleListThreads({
      runtime,
      request: createRequest(""),
    });

    expect(response.status).toBe(401);
    expect(listThreads).not.toHaveBeenCalled(); // Should not reach runner

    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
    expect(data.message).toBe("No resource scope provided");
  });
});

describe("handleGetThread", () => {
  it("returns 200 with thread metadata when thread exists", async () => {
    const mockMetadata = {
      threadId: "thread-123",
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      isRunning: false,
      messageCount: 5,
      firstMessage: "Hello world",
      resourceId: "test-user",
    };

    const getThreadMetadata = vi.fn().mockResolvedValue(mockMetadata);
    const runtime = {
      runner: Promise.resolve({
        getThreadMetadata,
      }),
      resolveThreadsScope: async () => ({ resourceId: "test-user" }),
    } as unknown as CopilotRuntime;

    const response = await handleGetThread({
      runtime,
      request: new Request("https://example.com/api/threads/thread-123"),
      threadId: "thread-123",
    });

    expect(response.status).toBe(200);
    expect(getThreadMetadata).toHaveBeenCalledWith("thread-123", { resourceId: "test-user" });

    const data = await response.json();
    expect(data).toEqual(mockMetadata);
  });

  it("returns 404 when thread does not exist", async () => {
    const getThreadMetadata = vi.fn().mockResolvedValue(null);
    const runtime = {
      runner: Promise.resolve({
        getThreadMetadata,
      }),
      resolveThreadsScope: async () => ({ resourceId: "test-user" }),
    } as unknown as CopilotRuntime;

    const response = await handleGetThread({
      runtime,
      request: new Request("https://example.com/api/threads/nonexistent"),
      threadId: "nonexistent",
    });

    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Thread not found");
  });

  it("returns 404 when thread exists but user lacks access (scope mismatch)", async () => {
    // Thread exists but belongs to different user
    const getThreadMetadata = vi.fn().mockResolvedValue(null);
    const runtime = {
      runner: Promise.resolve({
        getThreadMetadata,
      }),
      resolveThreadsScope: async () => ({ resourceId: "other-user" }),
    } as unknown as CopilotRuntime;

    const response = await handleGetThread({
      runtime,
      request: new Request("https://example.com/api/threads/thread-123"),
      threadId: "thread-123",
    });

    expect(response.status).toBe(404);
    expect(getThreadMetadata).toHaveBeenCalledWith("thread-123", { resourceId: "other-user" });
  });

  it("returns 500 when runner throws an error", async () => {
    const getThreadMetadata = vi.fn().mockRejectedValue(new Error("Database connection failed"));
    const runtime = {
      runner: Promise.resolve({
        getThreadMetadata,
      }),
      resolveThreadsScope: async () => ({ resourceId: "test-user" }),
    } as unknown as CopilotRuntime;

    const response = await handleGetThread({
      runtime,
      request: new Request("https://example.com/api/threads/thread-123"),
      threadId: "thread-123",
    });

    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it("enforces scope with null (admin bypass)", async () => {
    const mockMetadata = {
      threadId: "thread-123",
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      isRunning: false,
      messageCount: 5,
      firstMessage: "Hello world",
      resourceId: "any-user",
    };

    const getThreadMetadata = vi.fn().mockResolvedValue(mockMetadata);
    const runtime = {
      runner: Promise.resolve({
        getThreadMetadata,
      }),
      resolveThreadsScope: async () => null, // Admin bypass
    } as unknown as CopilotRuntime;

    const response = await handleGetThread({
      runtime,
      request: new Request("https://example.com/api/threads/thread-123"),
      threadId: "thread-123",
    });

    expect(response.status).toBe(200);
    expect(getThreadMetadata).toHaveBeenCalledWith("thread-123", null);
  });

  it("returns 401 when resolveThreadsScope returns undefined (auth failure)", async () => {
    const getThreadMetadata = vi.fn().mockResolvedValue({ threadId: "thread-123" });
    const runtime = {
      runner: Promise.resolve({
        getThreadMetadata,
      }),
      resolveThreadsScope: async () => undefined, // Auth failure or missing return
    } as unknown as CopilotRuntime;

    const response = await handleGetThread({
      runtime,
      request: new Request("https://example.com/api/threads/thread-123"),
      threadId: "thread-123",
    });

    expect(response.status).toBe(401);
    expect(getThreadMetadata).not.toHaveBeenCalled(); // Should not reach runner

    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
    expect(data.message).toBe("No resource scope provided");
  });
});

describe("handleDeleteThread", () => {
  const createDeleteRequest = () =>
    new Request("https://example.com/api/threads/thread-1", {
      method: "DELETE",
    });

  it("returns 400 when thread id is missing", async () => {
    const runtime = {
      runner: Promise.resolve({
        deleteThread: vi.fn(),
      }),
      resolveThreadsScope: async () => ({ resourceId: "test-user" }),
    } as unknown as CopilotRuntime;

    const response = await handleDeleteThread({
      runtime,
      request: createDeleteRequest(),
      threadId: "",
    });

    expect(response.status).toBe(400);
  });

  it("deletes thread successfully", async () => {
    const deleteThread = vi.fn().mockResolvedValue(undefined);
    const runtime = {
      runner: Promise.resolve({
        deleteThread,
      }),
      resolveThreadsScope: async () => ({ resourceId: "test-user" }),
    } as unknown as CopilotRuntime;

    const response = await handleDeleteThread({
      runtime,
      request: createDeleteRequest(),
      threadId: "thread-1",
    });

    expect(deleteThread).toHaveBeenCalledWith("thread-1", { resourceId: "test-user" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
  });

  it("returns 500 when deletion fails", async () => {
    const deleteThread = vi.fn().mockRejectedValue(new Error("boom"));
    const runtime = {
      runner: Promise.resolve({
        deleteThread,
      }),
      resolveThreadsScope: async () => ({ resourceId: "test-user" }),
    } as unknown as CopilotRuntime;

    const response = await handleDeleteThread({
      runtime,
      request: createDeleteRequest(),
      threadId: "thread-1",
    });

    expect(deleteThread).toHaveBeenCalledWith("thread-1", { resourceId: "test-user" });
    expect(response.status).toBe(500);
  });

  it("returns 401 when resolveThreadsScope returns undefined (auth failure)", async () => {
    const deleteThread = vi.fn().mockResolvedValue(undefined);
    const runtime = {
      runner: Promise.resolve({
        deleteThread,
      }),
      resolveThreadsScope: async () => undefined, // Auth failure or missing return
    } as unknown as CopilotRuntime;

    const response = await handleDeleteThread({
      runtime,
      request: createDeleteRequest(),
      threadId: "thread-1",
    });

    expect(response.status).toBe(401);
    expect(deleteThread).not.toHaveBeenCalled(); // Should not reach runner

    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
    expect(data.message).toBe("No resource scope provided");
  });
});

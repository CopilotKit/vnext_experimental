import { describe, expect, it, vi } from "vitest";
import { handleStopAgent } from "../handlers/handle-stop";
import type { CopilotRuntime } from "../runtime";

describe("handleStopAgent", () => {
  const createRequest = () =>
    new Request("https://example.com/api/copilotkit/stop", {
      method: "POST",
    });

  it("returns 404 when agent does not exist", async () => {
    const runtime = {
      agents: Promise.resolve({}),
      runner: Promise.resolve({
        stop: vi.fn(),
      }),
      resolveThreadsScope: async () => ({ resourceId: "test-user" }),
    } as unknown as CopilotRuntime;

    const response = await handleStopAgent({
      runtime,
      request: createRequest(),
      agentId: "nonexistent-agent",
      threadId: "thread-123",
    });

    expect(response.status).toBe(404);

    const data = await response.json();
    expect(data.error).toBe("Agent not found");
  });

  it("returns 401 when resolveThreadsScope returns undefined (auth failure)", async () => {
    const stop = vi.fn();
    const getThreadMetadata = vi.fn();
    const runtime = {
      agents: Promise.resolve({
        "test-agent": {},
      }),
      runner: Promise.resolve({
        stop,
        getThreadMetadata,
      }),
      resolveThreadsScope: async () => undefined, // Auth failure or missing return
    } as unknown as CopilotRuntime;

    const response = await handleStopAgent({
      runtime,
      request: createRequest(),
      agentId: "test-agent",
      threadId: "thread-123",
    });

    expect(response.status).toBe(401);
    expect(getThreadMetadata).not.toHaveBeenCalled(); // Should not reach metadata check
    expect(stop).not.toHaveBeenCalled(); // Should not reach stop

    const data = await response.json();
    expect(data.error).toBe("Unauthorized");
    expect(data.message).toBe("No resource scope provided");
  });

  it("returns 404 when thread does not exist or user lacks access", async () => {
    const stop = vi.fn();
    const getThreadMetadata = vi.fn().mockResolvedValue(null);
    const runtime = {
      agents: Promise.resolve({
        "test-agent": {},
      }),
      runner: Promise.resolve({
        stop,
        getThreadMetadata,
      }),
      resolveThreadsScope: async () => ({ resourceId: "test-user" }),
    } as unknown as CopilotRuntime;

    const response = await handleStopAgent({
      runtime,
      request: createRequest(),
      agentId: "test-agent",
      threadId: "thread-123",
    });

    expect(response.status).toBe(404);
    expect(getThreadMetadata).toHaveBeenCalledWith("thread-123", { resourceId: "test-user" });
    expect(stop).not.toHaveBeenCalled(); // Should not reach stop if thread not found

    const data = await response.json();
    expect(data.error).toBe("Thread not found");
  });

  it("stops the agent successfully when authorized", async () => {
    const stop = vi.fn().mockResolvedValue(true);
    const getThreadMetadata = vi.fn().mockResolvedValue({
      threadId: "thread-123",
      resourceId: "test-user",
    });
    const runtime = {
      agents: Promise.resolve({
        "test-agent": {},
      }),
      runner: Promise.resolve({
        stop,
        getThreadMetadata,
      }),
      resolveThreadsScope: async () => ({ resourceId: "test-user" }),
    } as unknown as CopilotRuntime;

    const response = await handleStopAgent({
      runtime,
      request: createRequest(),
      agentId: "test-agent",
      threadId: "thread-123",
    });

    expect(response.status).toBe(200);
    expect(getThreadMetadata).toHaveBeenCalledWith("thread-123", { resourceId: "test-user" });
    expect(stop).toHaveBeenCalledWith({ threadId: "thread-123" });

    const data = await response.json();
    expect(data.stopped).toBe(true);
    expect(data.interrupt).toBeDefined();
  });

  it("returns 200 with stopped: false when no active run exists", async () => {
    const stop = vi.fn().mockResolvedValue(false);
    const getThreadMetadata = vi.fn().mockResolvedValue({
      threadId: "thread-123",
      resourceId: "test-user",
    });
    const runtime = {
      agents: Promise.resolve({
        "test-agent": {},
      }),
      runner: Promise.resolve({
        stop,
        getThreadMetadata,
      }),
      resolveThreadsScope: async () => ({ resourceId: "test-user" }),
    } as unknown as CopilotRuntime;

    const response = await handleStopAgent({
      runtime,
      request: createRequest(),
      agentId: "test-agent",
      threadId: "thread-123",
    });

    expect(response.status).toBe(200);
    expect(getThreadMetadata).toHaveBeenCalledWith("thread-123", { resourceId: "test-user" });
    expect(stop).toHaveBeenCalledWith({ threadId: "thread-123" });

    const data = await response.json();
    expect(data.stopped).toBe(false);
  });

  it("allows admin (null scope) to stop any thread", async () => {
    const stop = vi.fn().mockResolvedValue(true);
    const getThreadMetadata = vi.fn().mockResolvedValue({
      threadId: "thread-123",
      resourceId: "other-user", // Different user
    });
    const runtime = {
      agents: Promise.resolve({
        "test-agent": {},
      }),
      runner: Promise.resolve({
        stop,
        getThreadMetadata,
      }),
      resolveThreadsScope: async () => null, // Admin bypass
    } as unknown as CopilotRuntime;

    const response = await handleStopAgent({
      runtime,
      request: createRequest(),
      agentId: "test-agent",
      threadId: "thread-123",
    });

    expect(response.status).toBe(200);
    expect(getThreadMetadata).toHaveBeenCalledWith("thread-123", null);
    expect(stop).toHaveBeenCalledWith({ threadId: "thread-123" });
  });

  it("prevents user from stopping another user's thread", async () => {
    const stop = vi.fn();
    const getThreadMetadata = vi.fn().mockResolvedValue(null); // Returns null when scope doesn't match
    const runtime = {
      agents: Promise.resolve({
        "test-agent": {},
      }),
      runner: Promise.resolve({
        stop,
        getThreadMetadata,
      }),
      resolveThreadsScope: async () => ({ resourceId: "attacker-user" }),
    } as unknown as CopilotRuntime;

    const response = await handleStopAgent({
      runtime,
      request: createRequest(),
      agentId: "test-agent",
      threadId: "victim-thread",
    });

    expect(response.status).toBe(404); // Not 403, to prevent enumeration
    expect(getThreadMetadata).toHaveBeenCalledWith("victim-thread", { resourceId: "attacker-user" });
    expect(stop).not.toHaveBeenCalled(); // Should not reach stop

    const data = await response.json();
    expect(data.error).toBe("Thread not found");
  });
});

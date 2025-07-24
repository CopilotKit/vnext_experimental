import { handleRunAgent } from "../handlers/handle-run";
import { CopilotKitRuntime } from "../runtime";
import { describe, it, expect } from "vitest";

describe("handleRunAgent", () => {
  const createMockRuntime = (
    agents: Record<string, unknown> = {}
  ): CopilotKitRuntime => {
    return {
      agents: Promise.resolve(agents),
      transcriptionService: undefined,
      beforeRequestMiddleware: undefined,
      afterRequestMiddleware: undefined,
    } as CopilotKitRuntime;
  };

  const createMockRequest = (): Request => {
    return new Request("https://example.com/agent/test/run", {
      method: "POST",
    });
  };

  it("should return 404 when agent does not exist", async () => {
    const runtime = createMockRuntime({}); // Empty agents
    const request = createMockRequest();
    const agentName = "nonexistent-agent";

    const response = await handleRunAgent({
      runtime,
      request,
      agentName,
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body).toEqual({
      error: "Agent not found",
      message: "Agent 'nonexistent-agent' does not exist",
    });
  });

  it("should return 200 when agent exists", async () => {
    const mockAgent = {
      description: "Test agent",
      constructor: { name: "TestAgent" },
    };
    const runtime = createMockRuntime({ "test-agent": mockAgent });
    const request = createMockRequest();
    const agentName = "test-agent";

    const response = await handleRunAgent({
      runtime,
      request,
      agentName,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body).toEqual({
      message: "Hello, world!",
    });
  });

  it("should return 500 when runtime.agents throws an error", async () => {
    const runtime = {
      agents: Promise.reject(new Error("Database connection failed")),
      transcriptionService: undefined,
      beforeRequestMiddleware: undefined,
      afterRequestMiddleware: undefined,
    } as CopilotKitRuntime;
    const request = createMockRequest();
    const agentName = "test-agent";

    const response = await handleRunAgent({
      runtime,
      request,
      agentName,
    });

    expect(response.status).toBe(500);
    expect(response.headers.get("Content-Type")).toBe("application/json");

    const body = await response.json();
    expect(body).toEqual({
      error: "Failed to run agent",
      message: "Database connection failed",
    });
  });
});

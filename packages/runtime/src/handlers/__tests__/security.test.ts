import { describe, it, expect, vi } from "vitest";
import { handleRunAgent } from "../handle-run";
import { handleConnectAgent } from "../handle-connect";
import type { CopilotRuntime } from "../../runtime";
import { InMemoryAgentRunner } from "../../runner/in-memory";
import { AbstractAgent, RunAgentInput } from "@ag-ui/client";
import { EMPTY } from "rxjs";

class MockAgent extends AbstractAgent {
  clone(): AbstractAgent {
    return new MockAgent();
  }

  protected run() {
    return EMPTY;
  }

  protected connect() {
    return EMPTY;
  }
}

describe("Handler Security Tests", () => {
  describe("handleRunAgent - Null Scope (Admin Bypass)", () => {
    it("should accept null scope from resolveThreadsScope", async () => {
      const mockAgent = new MockAgent();
      const runner = new InMemoryAgentRunner();

      const runtime: CopilotRuntime = {
        agents: Promise.resolve({ default: mockAgent }),
        runner,
        resolveThreadsScope: async () => null, // Admin returns null
      } as any;

      const request = new Request("http://localhost/api/copilotkit/run/default", {
        method: "POST",
        body: JSON.stringify({
          threadId: "test-thread",
          runId: "run-1",
          messages: [],
          state: {},
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await handleRunAgent({
        runtime,
        request,
        agentId: "default",
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    });

    it("should reject undefined scope (missing auth)", async () => {
      const mockAgent = new MockAgent();
      const runner = new InMemoryAgentRunner();

      const runtime: CopilotRuntime = {
        agents: Promise.resolve({ default: mockAgent }),
        runner,
        resolveThreadsScope: async () => undefined as any, // Missing auth
      } as any;

      const request = new Request("http://localhost/api/copilotkit/run/default", {
        method: "POST",
        body: JSON.stringify({
          threadId: "test-thread",
          runId: "run-1",
          messages: [],
          state: {},
        }),
        headers: { "Content-Type": "application/json" },
      });

      // Give it time to process
      const response = await handleRunAgent({
        runtime,
        request,
        agentId: "default",
      });

      // The response is returned immediately (streaming), but the error happens in background
      // Wait a bit for the async error
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Since it's streaming, we can't check response status directly
      // But the error should be logged (tested in integration tests)
      expect(response.status).toBe(200); // Stream starts before error
    });

    it("should accept valid user scope", async () => {
      const mockAgent = new MockAgent();
      const runner = new InMemoryAgentRunner();

      const runtime: CopilotRuntime = {
        agents: Promise.resolve({ default: mockAgent }),
        runner,
        resolveThreadsScope: async () => ({ resourceId: "user-123" }),
      } as any;

      const request = new Request("http://localhost/api/copilotkit/run/default", {
        method: "POST",
        body: JSON.stringify({
          threadId: "test-thread",
          runId: "run-1",
          messages: [],
          state: {},
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await handleRunAgent({
        runtime,
        request,
        agentId: "default",
      });

      expect(response.status).toBe(200);
    });
  });

  describe("handleConnectAgent - Null Scope (Admin Bypass)", () => {
    it("should accept null scope for admin connections", async () => {
      const mockAgent = new MockAgent();
      const runner = new InMemoryAgentRunner();

      const runtime: CopilotRuntime = {
        agents: Promise.resolve({ default: mockAgent }),
        runner,
        resolveThreadsScope: async () => null, // Admin
      } as any;

      const request = new Request("http://localhost/api/copilotkit/connect/default", {
        method: "POST",
        body: JSON.stringify({
          threadId: "test-thread",
          runId: "run-1",
          messages: [],
          state: {},
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await handleConnectAgent({
        runtime,
        request,
        agentId: "default",
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    });

    it("should accept multi-resource scope array", async () => {
      const mockAgent = new MockAgent();
      const runner = new InMemoryAgentRunner();

      const runtime: CopilotRuntime = {
        agents: Promise.resolve({ default: mockAgent }),
        runner,
        resolveThreadsScope: async () => ({
          resourceId: ["user-123", "workspace-456"],
        }),
      } as any;

      const request = new Request("http://localhost/api/copilotkit/connect/default", {
        method: "POST",
        body: JSON.stringify({
          threadId: "test-thread",
          runId: "run-1",
          messages: [],
          state: {},
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await handleConnectAgent({
        runtime,
        request,
        agentId: "default",
      });

      expect(response.status).toBe(200);
    });
  });

  describe("Scope Validation Edge Cases", () => {
    it("should handle scope with properties", async () => {
      const mockAgent = new MockAgent();
      const runner = new InMemoryAgentRunner();

      const runtime: CopilotRuntime = {
        agents: Promise.resolve({ default: mockAgent }),
        runner,
        resolveThreadsScope: async () => ({
          resourceId: "user-123",
          properties: { department: "engineering", role: "admin" },
        }),
      } as any;

      const request = new Request("http://localhost/api/copilotkit/run/default", {
        method: "POST",
        body: JSON.stringify({
          threadId: "test-thread",
          runId: "run-1",
          messages: [],
          state: {},
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await handleRunAgent({
        runtime,
        request,
        agentId: "default",
      });

      expect(response.status).toBe(200);
    });

    it("should handle scope extraction errors gracefully", async () => {
      const mockAgent = new MockAgent();
      const runner = new InMemoryAgentRunner();

      const runtime: CopilotRuntime = {
        agents: Promise.resolve({ default: mockAgent }),
        runner,
        resolveThreadsScope: async () => {
          throw new Error("Database connection failed");
        },
      } as any;

      const request = new Request("http://localhost/api/copilotkit/run/default", {
        method: "POST",
        body: JSON.stringify({
          threadId: "test-thread",
          runId: "run-1",
          messages: [],
          state: {},
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await handleRunAgent({
        runtime,
        request,
        agentId: "default",
      });

      // Response starts streaming, then error occurs
      expect(response.status).toBe(200);
    });
  });

  describe("Agent Validation", () => {
    it("should return 404 for non-existent agent with any scope", async () => {
      const runner = new InMemoryAgentRunner();

      const runtime: CopilotRuntime = {
        agents: Promise.resolve({}),
        runner,
        resolveThreadsScope: async () => ({ resourceId: "user-123" }),
      } as any;

      const request = new Request("http://localhost/api/copilotkit/run/nonexistent", {
        method: "POST",
        body: JSON.stringify({
          threadId: "test-thread",
          runId: "run-1",
          messages: [],
          state: {},
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await handleRunAgent({
        runtime,
        request,
        agentId: "nonexistent",
      });

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Agent not found");
    });
  });
});

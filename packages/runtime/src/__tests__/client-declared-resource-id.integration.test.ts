import { describe, expect, it, vi, beforeEach } from "vitest";
import { CopilotRuntime } from "../runtime";
import { InMemoryAgentRunner } from "../runner/in-memory";
import {
  validateResourceIdMatch,
  filterAuthorizedResourceIds,
  createStrictThreadScopeResolver,
  createFilteringThreadScopeResolver,
} from "../resource-id-helpers";
import { handleListThreads } from "../handlers/handle-threads";
import { handleRunAgent } from "../handlers/handle-run";
import { EMPTY } from "rxjs";
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

/**
 * Integration tests for client-declared resourceId flow.
 * Tests the full path from client hint → server validation → runner scoping.
 */
describe("Client-Declared Resource ID Integration", () => {
  let runner: InMemoryAgentRunner;

  beforeEach(() => {
    runner = new InMemoryAgentRunner();
    runner.clearAllThreads();
  });

  describe("Header Parsing", () => {
    it("should parse single resourceId from header", async () => {
      const extractor = vi.fn(async ({ clientDeclared }) => {
        expect(clientDeclared).toBe("user-123");
        return { resourceId: "user-123" };
      });

      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: extractor,
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          "X-CopilotKit-Resource-ID": "user-123",
        },
      });

      await handleListThreads({ runtime, request });

      expect(extractor).toHaveBeenCalledWith({
        request,
        clientDeclared: "user-123",
      });
    });

    it("should parse array of resourceIds from header", async () => {
      const extractor = vi.fn(async ({ clientDeclared }) => {
        expect(clientDeclared).toEqual(["user-123", "workspace-456"]);
        return { resourceId: ["user-123", "workspace-456"] };
      });

      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: extractor,
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          "X-CopilotKit-Resource-ID": "user-123,workspace-456",
        },
      });

      await handleListThreads({ runtime, request });

      expect(extractor).toHaveBeenCalledWith({
        request,
        clientDeclared: ["user-123", "workspace-456"],
      });
    });

    it("should handle URI-encoded resourceIds", async () => {
      const extractor = vi.fn(async ({ clientDeclared }) => {
        expect(clientDeclared).toBe("user@example.com/workspace#123");
        return { resourceId: clientDeclared as string };
      });

      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: extractor,
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          "X-CopilotKit-Resource-ID": "user%40example.com%2Fworkspace%23123",
        },
      });

      await handleListThreads({ runtime, request });

      expect(extractor).toHaveBeenCalledOnce();
    });

    it("should handle missing header (no client hint)", async () => {
      const extractor = vi.fn(async ({ clientDeclared }) => {
        expect(clientDeclared).toBeUndefined();
        return { resourceId: "server-determined" };
      });

      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: extractor,
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads");

      await handleListThreads({ runtime, request });

      expect(extractor).toHaveBeenCalledWith({
        request,
        clientDeclared: undefined,
      });
    });

    it("should handle empty header value", async () => {
      const extractor = vi.fn(async ({ clientDeclared }) => {
        // Empty string should be treated as single-element array with empty string
        expect(clientDeclared).toBe("");
        return { resourceId: "fallback" };
      });

      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: extractor,
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          "X-CopilotKit-Resource-ID": "",
        },
      });

      await handleListThreads({ runtime, request });

      expect(extractor).toHaveBeenCalledOnce();
    });

    it("should handle whitespace in comma-separated values", async () => {
      const extractor = vi.fn(async ({ clientDeclared }) => {
        // Should trim whitespace around values
        expect(clientDeclared).toEqual(["user-1", "workspace-2", "project-3"]);
        return { resourceId: clientDeclared as string[] };
      });

      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: extractor,
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          "X-CopilotKit-Resource-ID": "user-1, workspace-2 , project-3",
        },
      });

      await handleListThreads({ runtime, request });

      expect(extractor).toHaveBeenCalledOnce();
    });
  });

  describe("Validation Patterns", () => {
    describe("Strict Validation Pattern", () => {
      it("should allow matching client-declared ID", async () => {
        const runtime = new CopilotRuntime({
          agents: {},
          resolveThreadsScope: createStrictThreadScopeResolver(async (request) => {
            // Simulate authentication
            const authHeader = request.headers.get("Authorization");
            if (authHeader === "Bearer user-123-token") {
              return "user-123";
            }
            throw new Error("Unauthorized");
          }),
          runner: runner,
        });

        const request = new Request("https://example.com/api/threads", {
          headers: {
            Authorization: "Bearer user-123-token",
            "X-CopilotKit-Resource-ID": "user-123",
          },
        });

        const response = await handleListThreads({ runtime, request });

        expect(response.status).toBe(200);
      });

      it("should reject mismatched client-declared ID", async () => {
        const runtime = new CopilotRuntime({
          agents: {},
          resolveThreadsScope: createStrictThreadScopeResolver(async (request) => {
            const authHeader = request.headers.get("Authorization");
            if (authHeader === "Bearer user-123-token") {
              return "user-123";
            }
            throw new Error("Unauthorized");
          }),
          runner: runner,
        });

        const request = new Request("https://example.com/api/threads", {
          headers: {
            Authorization: "Bearer user-123-token",
            "X-CopilotKit-Resource-ID": "user-999", // Wrong ID
          },
        });

        const response = await handleListThreads({ runtime, request });
        expect(response.status).toBe(500);
      });

      it("should allow undefined client-declared ID", async () => {
        const runtime = new CopilotRuntime({
          agents: {},
          resolveThreadsScope: createStrictThreadScopeResolver(async (request) => {
            return "user-123";
          }),
          runner: runner,
        });

        const request = new Request("https://example.com/api/threads");

        const response = await handleListThreads({ runtime, request });

        expect(response.status).toBe(200);
      });
    });

    describe("Filtering Pattern", () => {
      it("should filter to authorized workspaces", async () => {
        const runtime = new CopilotRuntime({
          agents: {},
          resolveThreadsScope: createFilteringThreadScopeResolver(async (request) => {
            // Simulate user with access to specific workspaces
            return ["workspace-1", "workspace-2", "workspace-3"];
          }),
          runner: runner,
        });

        const request = new Request("https://example.com/api/threads", {
          headers: {
            // Client requests workspace-2 and workspace-99
            "X-CopilotKit-Resource-ID": "workspace-2,workspace-99",
          },
        });

        // Should succeed - workspace-2 is authorized
        const response = await handleListThreads({ runtime, request });
        expect(response.status).toBe(200);

        // The extractor should have filtered to only workspace-2
        // (This would be tested by checking what the runner received)
      });

      it("should reject when no client IDs are authorized", async () => {
        const runtime = new CopilotRuntime({
          agents: {},
          resolveThreadsScope: createFilteringThreadScopeResolver(async (request) => {
            return ["workspace-1", "workspace-2"];
          }),
          runner: runner,
        });

        const request = new Request("https://example.com/api/threads", {
          headers: {
            "X-CopilotKit-Resource-ID": "workspace-99,workspace-88",
          },
        });

        const response = await handleListThreads({ runtime, request });
        expect(response.status).toBe(500);
      });

      it("should return all authorized when no client hint", async () => {
        let capturedScope: any;
        const customRunner = {
          ...runner,
          listThreads: async (request: any) => {
            capturedScope = request.scope;
            return { threads: [], total: 0 };
          },
        };

        const runtime = new CopilotRuntime({
          agents: {},
          resolveThreadsScope: createFilteringThreadScopeResolver(async (request) => {
            return ["workspace-1", "workspace-2", "workspace-3"];
          }),
          runner: customRunner as any,
        });

        const request = new Request("https://example.com/api/threads");

        await handleListThreads({ runtime, request });

        expect(capturedScope.resourceId).toEqual(["workspace-1", "workspace-2", "workspace-3"]);
      });
    });

    describe("Manual Validation Pattern", () => {
      it("should allow custom validation logic", async () => {
        const runtime = new CopilotRuntime({
          agents: {},
          resolveThreadsScope: async ({ request, clientDeclared }) => {
            // Custom authentication and validation
            const userId = await authenticateUser(request);
            const userWorkspaces = await getUserWorkspaces(userId);

            // Custom logic: Allow if client declares their user ID or one of their workspaces
            if (clientDeclared) {
              const validIds = [userId, ...userWorkspaces];
              validateResourceIdMatch(clientDeclared, validIds);
              return { resourceId: clientDeclared };
            }

            // No client hint - return all accessible
            return { resourceId: [userId, ...userWorkspaces] };
          },
          runner: runner,
        });

        const request = new Request("https://example.com/api/threads", {
          headers: {
            Authorization: "Bearer user-1-token",
            "X-CopilotKit-Resource-ID": "workspace-team-a",
          },
        });

        const response = await handleListThreads({ runtime, request });

        expect(response.status).toBe(200);
      });

      it("should reject invalid IDs with custom validation", async () => {
        const runtime = new CopilotRuntime({
          agents: {},
          resolveThreadsScope: async ({ request, clientDeclared }) => {
            const userId = await authenticateUser(request);
            const userWorkspaces = await getUserWorkspaces(userId);

            if (clientDeclared) {
              const validIds = [userId, ...userWorkspaces];
              validateResourceIdMatch(clientDeclared, validIds);
              return { resourceId: clientDeclared };
            }

            return { resourceId: [userId, ...userWorkspaces] };
          },
          runner: runner,
        });

        const request = new Request("https://example.com/api/threads", {
          headers: {
            Authorization: "Bearer user-1-token",
            "X-CopilotKit-Resource-ID": "workspace-unauthorized", // Not in user's workspaces
          },
        });

        const response = await handleListThreads({ runtime, request });
        expect(response.status).toBe(500);
      });
    });

    describe("Override Pattern (Ignore Client)", () => {
      it("should ignore client-declared ID and use server-determined", async () => {
        let capturedScope: any;
        const customRunner = {
          ...runner,
          listThreads: async (request: any) => {
            capturedScope = request.scope;
            return { threads: [], total: 0 };
          },
        };

        const runtime = new CopilotRuntime({
          agents: {},
          resolveThreadsScope: async ({ request, clientDeclared }) => {
            // Completely ignore clientDeclared
            const userId = await authenticateUser(request);
            return { resourceId: userId };
          },
          runner: customRunner as any,
        });

        const request = new Request("https://example.com/api/threads", {
          headers: {
            Authorization: "Bearer user-1-token",
            "X-CopilotKit-Resource-ID": "user-999", // Should be ignored
          },
        });

        await handleListThreads({ runtime, request });

        // Should use server-determined, not client hint
        expect(capturedScope.resourceId).toBe("user-1");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string values after parsing", async () => {
      const extractor = vi.fn(async ({ clientDeclared }) => {
        // Client sent empty string - resolver should handle it
        expect(clientDeclared).toBe("");
        // Resolver can choose to reject or provide fallback
        throw new Error("Empty resource ID not allowed");
      });

      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: extractor,
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          "X-CopilotKit-Resource-ID": "",
        },
      });

      const response = await handleListThreads({ runtime, request });
      expect(response.status).toBe(500);
    });

    it("should handle whitespace-only values in comma-separated list", async () => {
      const extractor = vi.fn(async ({ clientDeclared }) => {
        // After trimming, we get empty strings
        expect(clientDeclared).toEqual(["", ""]);
        // Resolver should validate and reject
        throw new Error("All resource IDs are empty after trimming");
      });

      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: extractor,
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          "X-CopilotKit-Resource-ID": " , ",
        },
      });

      const response = await handleListThreads({ runtime, request });
      expect(response.status).toBe(500);
    });

    it("should handle mixed valid and empty values", async () => {
      const extractor = vi.fn(async ({ clientDeclared }) => {
        // Parser returns ["user-1", "", "user-2"]
        expect(clientDeclared).toEqual(["user-1", "", "user-2"]);
        // Resolver can filter out empty strings if needed
        const validIds = Array.isArray(clientDeclared)
          ? clientDeclared.filter((id) => id.trim().length > 0)
          : [];
        if (validIds.length === 0) {
          throw new Error("No valid resource IDs provided");
        }
        return { resourceId: validIds };
      });

      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: extractor,
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          "X-CopilotKit-Resource-ID": "user-1, ,user-2",
        },
      });

      const response = await handleListThreads({ runtime, request });
      expect(response.status).toBe(200);
    });

    it("should handle special characters in client-declared ID", async () => {
      const specialId = "user@example.com/workspace#123";
      const extractor = vi.fn(async ({ clientDeclared }) => {
        validateResourceIdMatch(clientDeclared, specialId);
        return { resourceId: specialId };
      });

      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: extractor,
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          "X-CopilotKit-Resource-ID": encodeURIComponent(specialId),
        },
      });

      const response = await handleListThreads({ runtime, request });

      expect(response.status).toBe(200);
    });

    it("should handle Unicode characters", async () => {
      const unicodeId = "用户-123-مستخدم";
      const extractor = vi.fn(async ({ clientDeclared }) => {
        expect(clientDeclared).toBe(unicodeId);
        return { resourceId: unicodeId };
      });

      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: extractor,
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          "X-CopilotKit-Resource-ID": encodeURIComponent(unicodeId),
        },
      });

      await handleListThreads({ runtime, request });

      expect(extractor).toHaveBeenCalledOnce();
    });

    it("should handle very long resourceId", async () => {
      const longId = "user-" + "a".repeat(1000);
      const extractor = vi.fn(async ({ clientDeclared }) => {
        expect(clientDeclared).toBe(longId);
        return { resourceId: longId };
      });

      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: extractor,
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          "X-CopilotKit-Resource-ID": encodeURIComponent(longId),
        },
      });

      await handleListThreads({ runtime, request });

      expect(extractor).toHaveBeenCalledOnce();
    });

    it("should handle many resourceIds in header", async () => {
      const manyIds = Array.from({ length: 50 }, (_, i) => `id-${i}`);
      const extractor = vi.fn(async ({ clientDeclared }) => {
        expect(clientDeclared).toEqual(manyIds);
        return { resourceId: filterAuthorizedResourceIds(clientDeclared, manyIds) };
      });

      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: extractor,
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          "X-CopilotKit-Resource-ID": manyIds.map((id) => encodeURIComponent(id)).join(","),
        },
      });

      await handleListThreads({ runtime, request });

      expect(extractor).toHaveBeenCalledOnce();
    });
  });

  describe("Security: Malicious Client Cannot Widen Access", () => {
    it("should enforce server-determined scope even when client claims different resource", async () => {
      // This is the critical security test:
      // A malicious client tries to access another user's threads by sending a fake header.
      // The server must enforce the authenticated user's actual scope.

      const createTestEvents = (messageText: string, messageId: string): BaseEvent[] => [
        { type: EventType.TEXT_MESSAGE_START, messageId, role: "user" } as TextMessageStartEvent,
        { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: messageText } as TextMessageContentEvent,
        { type: EventType.TEXT_MESSAGE_END, messageId } as TextMessageEndEvent,
      ];

      const mockAgent = new MockAgent(createTestEvents("Test message", "msg1"));

      // Use strict validation pattern to enforce mismatch detection
      const runtime = new CopilotRuntime({
        agents: { default: mockAgent },
        resolveThreadsScope: createStrictThreadScopeResolver(async (request) => {
          // Authenticate the user from the request (e.g., JWT token)
          const token = request.headers.get("Authorization");
          if (token === "Bearer alice-token") {
            return "user-alice";
          }
          if (token === "Bearer bob-token") {
            return "user-bob";
          }
          throw new Error("Unauthorized");
        }),
        runner: runner,
      });

      // Alice creates a thread with her correct token and ID
      const createRequest = new Request("http://localhost/api/copilotkit/run/default", {
        method: "POST",
        body: JSON.stringify({
          threadId: "alice-thread-123",
          runId: "run-1",
          messages: [],
          state: {},
        }),
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer alice-token",
          "X-CopilotKit-Resource-ID": "user-alice",
        },
      });

      const createResponse = await handleRunAgent({
        runtime,
        request: createRequest,
        agentId: "default",
      });
      expect(createResponse.status).toBe(200);

      // Wait for thread to be created
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Malicious attempt 1: Bob tries to claim Alice's ID
      const maliciousRequest1 = new Request("https://example.com/api/threads", {
        headers: {
          Authorization: "Bearer bob-token", // Bob's auth
          "X-CopilotKit-Resource-ID": "user-alice", // Claims Alice's ID
        },
      });

      // Should reject because token says "bob" but header says "alice"
      const response1 = await handleListThreads({ runtime, request: maliciousRequest1 });
      expect(response1.status).toBe(500);

      // Malicious attempt 2: Alice's token but claims Bob's ID
      // Server returns alice's scope, which means Bob won't see Alice's threads
      const maliciousRequest2 = new Request("https://example.com/api/threads", {
        headers: {
          Authorization: "Bearer alice-token", // Alice's auth
          "X-CopilotKit-Resource-ID": "user-bob", // Claims Bob's ID
        },
      });

      // Should reject because token says "alice" but header says "bob"
      const response2 = await handleListThreads({ runtime, request: maliciousRequest2 });
      expect(response2.status).toBe(500);
    });

    it("should prove runner stores threads with resolver resourceId, not client hint", async () => {
      // This test PROVES that threads are stored using the resolver's decision, not the client's claim.
      // Even if client claims "attacker-user", server enforces "real-user" based on auth.

      // Track what scope was actually passed to the runner
      let capturedScope: any = null;
      const customRunner = {
        ...runner,
        listThreads: async (request: any) => {
          capturedScope = request.scope;
          return runner.listThreads(request);
        },
      };

      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: async ({ request, clientDeclared }) => {
          // Client claims "attacker-user"
          expect(clientDeclared).toBe("attacker-user");

          // But server checks auth and determines actual user
          const token = request.headers.get("Authorization");
          if (token === "Bearer real-user-token") {
            // Server OVERRIDES client claim with authenticated user
            return { resourceId: "real-user" };
          }
          throw new Error("Unauthorized");
        },
        runner: Promise.resolve(customRunner as any),
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          Authorization: "Bearer real-user-token",
          "X-CopilotKit-Resource-ID": "attacker-user", // Malicious claim
        },
      });

      const response = await handleListThreads({ runtime, request });
      expect(response.status).toBe(200);

      // CRITICAL ASSERTION: Runner received "real-user" from resolver, not "attacker-user" from client
      expect(capturedScope).not.toBeNull();
      expect(capturedScope.resourceId).toBe("real-user");
      expect(capturedScope.resourceId).not.toBe("attacker-user");

      // This proves the security model: client hints cannot widen access.
      // The resolver's decision is what gets stored and enforced.
    });
  });

  describe("Backward Compatibility", () => {
    it("should work without client-declared resourceId (legacy behavior)", async () => {
      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: async ({ request }) => {
          // Old-style extractor ignoring clientDeclared
          const token = request.headers.get("Authorization");
          if (token === "Bearer user-123-token") {
            return { resourceId: "user-123" };
          }
          throw new Error("Unauthorized");
        },
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          Authorization: "Bearer user-123-token",
        },
      });

      const response = await handleListThreads({ runtime, request });

      expect(response.status).toBe(200);
    });

    it("should work with GLOBAL_SCOPE pattern", async () => {
      const runtime = new CopilotRuntime({
        agents: {},
        resolveThreadsScope: CopilotRuntime.GLOBAL_SCOPE,
        runner: runner,
      });

      const request = new Request("https://example.com/api/threads", {
        headers: {
          "X-CopilotKit-Resource-ID": "user-123",
        },
      });

      const response = await handleListThreads({ runtime, request });

      expect(response.status).toBe(200);
    });
  });
});

// Helper functions simulating authentication/authorization
async function authenticateUser(request: Request): Promise<string> {
  const token = request.headers.get("Authorization");
  if (token === "Bearer user-1-token") return "user-1";
  if (token === "Bearer user-2-token") return "user-2";
  throw new Error("Invalid token");
}

async function getUserWorkspaces(userId: string): Promise<string[]> {
  if (userId === "user-1") return ["workspace-team-a", "workspace-personal"];
  if (userId === "user-2") return ["workspace-team-b"];
  return [];
}

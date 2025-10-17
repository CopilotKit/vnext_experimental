import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopilotKitCore } from "../core";
import { HttpAgent } from "@ag-ui/client";

describe("CopilotKitCore - resourceId", () => {
  const originalWindow = (global as any).window;

  beforeEach(() => {
    vi.restoreAllMocks();
    // Mock window to simulate browser environment
    (global as any).window = {};
  });

  afterEach(() => {
    // Restore window
    if (originalWindow === undefined) {
      delete (global as any).window;
    } else {
      (global as any).window = originalWindow;
    }
  });

  describe("resourceId getter and constructor", () => {
    it("should accept string resourceId in constructor", () => {
      const core = new CopilotKitCore({
        resourceId: "user-123",
      });

      expect(core.resourceId).toBe("user-123");
    });

    it("should accept array resourceId in constructor", () => {
      const core = new CopilotKitCore({
        resourceId: ["user-123", "workspace-456"],
      });

      expect(core.resourceId).toEqual(["user-123", "workspace-456"]);
    });

    it("should accept undefined resourceId in constructor", () => {
      const core = new CopilotKitCore({});

      expect(core.resourceId).toBeUndefined();
    });

    it("should handle empty array resourceId", () => {
      const core = new CopilotKitCore({
        resourceId: [],
      });

      expect(core.resourceId).toEqual([]);
    });

    it("should preserve resourceId with special characters", () => {
      const specialId = "user@example.com/workspace#123";
      const core = new CopilotKitCore({
        resourceId: specialId,
      });

      expect(core.resourceId).toBe(specialId);
    });

    it("should preserve resourceId with Unicode characters", () => {
      const unicodeId = "用户-123-مستخدم";
      const core = new CopilotKitCore({
        resourceId: unicodeId,
      });

      expect(core.resourceId).toBe(unicodeId);
    });

    it("should handle very long resourceId", () => {
      const longId = "user-" + "a".repeat(1000);
      const core = new CopilotKitCore({
        resourceId: longId,
      });

      expect(core.resourceId).toBe(longId);
    });

    it("should handle array with many resourceIds", () => {
      const manyIds = Array.from({ length: 100 }, (_, i) => `id-${i}`);
      const core = new CopilotKitCore({
        resourceId: manyIds,
      });

      expect(core.resourceId).toEqual(manyIds);
    });
  });

  describe("setResourceId method", () => {
    it("should update resourceId from string to string", () => {
      const core = new CopilotKitCore({
        resourceId: "user-1",
      });

      core.setResourceId("user-2");

      expect(core.resourceId).toBe("user-2");
    });

    it("should update resourceId from string to array", () => {
      const core = new CopilotKitCore({
        resourceId: "user-1",
      });

      core.setResourceId(["user-1", "workspace-1"]);

      expect(core.resourceId).toEqual(["user-1", "workspace-1"]);
    });

    it("should update resourceId from array to string", () => {
      const core = new CopilotKitCore({
        resourceId: ["user-1", "workspace-1"],
      });

      core.setResourceId("user-2");

      expect(core.resourceId).toBe("user-2");
    });

    it("should update resourceId to undefined", () => {
      const core = new CopilotKitCore({
        resourceId: "user-1",
      });

      core.setResourceId(undefined);

      expect(core.resourceId).toBeUndefined();
    });

    it("should update resourceId from undefined to string", () => {
      const core = new CopilotKitCore({});

      core.setResourceId("user-1");

      expect(core.resourceId).toBe("user-1");
    });

    it("should handle multiple rapid updates", () => {
      const core = new CopilotKitCore({
        resourceId: "user-1",
      });

      core.setResourceId("user-2");
      core.setResourceId("user-3");
      core.setResourceId("user-4");

      expect(core.resourceId).toBe("user-4");
    });

    it("should handle transition to empty array", () => {
      const core = new CopilotKitCore({
        resourceId: "user-1",
      });

      core.setResourceId([]);

      expect(core.resourceId).toEqual([]);
    });
  });

  describe("subscriber notifications", () => {
    it("should notify subscribers when resourceId changes", async () => {
      const core = new CopilotKitCore({
        resourceId: "user-1",
      });

      const subscriber = {
        onResourceIdChanged: vi.fn(),
      };

      core.subscribe(subscriber);
      core.setResourceId("user-2");

      // Wait for notification
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(subscriber.onResourceIdChanged).toHaveBeenCalledWith({
        copilotkit: core,
        resourceId: "user-2",
      });
    });

    it("should notify subscribers when resourceId set to array", async () => {
      const core = new CopilotKitCore({
        resourceId: "user-1",
      });

      const subscriber = {
        onResourceIdChanged: vi.fn(),
      };

      core.subscribe(subscriber);
      core.setResourceId(["user-1", "workspace-1"]);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(subscriber.onResourceIdChanged).toHaveBeenCalledWith({
        copilotkit: core,
        resourceId: ["user-1", "workspace-1"],
      });
    });

    it("should notify subscribers when resourceId set to undefined", async () => {
      const core = new CopilotKitCore({
        resourceId: "user-1",
      });

      const subscriber = {
        onResourceIdChanged: vi.fn(),
      };

      core.subscribe(subscriber);
      core.setResourceId(undefined);

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(subscriber.onResourceIdChanged).toHaveBeenCalledWith({
        copilotkit: core,
        resourceId: undefined,
      });
    });

    it("should notify multiple subscribers", async () => {
      const core = new CopilotKitCore({
        resourceId: "user-1",
      });

      const subscriber1 = { onResourceIdChanged: vi.fn() };
      const subscriber2 = { onResourceIdChanged: vi.fn() };
      const subscriber3 = { onResourceIdChanged: vi.fn() };

      core.subscribe(subscriber1);
      core.subscribe(subscriber2);
      core.subscribe(subscriber3);

      core.setResourceId("user-2");

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(subscriber1.onResourceIdChanged).toHaveBeenCalledOnce();
      expect(subscriber2.onResourceIdChanged).toHaveBeenCalledOnce();
      expect(subscriber3.onResourceIdChanged).toHaveBeenCalledOnce();
    });

    it("should not notify unsubscribed subscribers", async () => {
      const core = new CopilotKitCore({
        resourceId: "user-1",
      });

      const subscriber = {
        onResourceIdChanged: vi.fn(),
      };

      const unsubscribe = core.subscribe(subscriber);
      unsubscribe();

      core.setResourceId("user-2");

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(subscriber.onResourceIdChanged).not.toHaveBeenCalled();
    });

    it("should handle subscriber errors gracefully", async () => {
      const core = new CopilotKitCore({
        resourceId: "user-1",
      });

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const subscriber = {
        onResourceIdChanged: vi.fn(() => {
          throw new Error("Subscriber error");
        }),
      };

      core.subscribe(subscriber);
      core.setResourceId("user-2");

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(errorSpy).toHaveBeenCalledWith(
        "Subscriber onResourceIdChanged error:",
        expect.any(Error)
      );

      errorSpy.mockRestore();
    });
  });

  describe("getHeadersWithResourceId", () => {
    it("should include resourceId header with single string", () => {
      const core = new CopilotKitCore({
        resourceId: "user-123",
        headers: {
          Authorization: "Bearer token",
        },
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers).toEqual({
        Authorization: "Bearer token",
        "X-CopilotKit-Resource-ID": "user-123",
      });
    });

    it("should include resourceId header with array (comma-separated)", () => {
      const core = new CopilotKitCore({
        resourceId: ["user-123", "workspace-456"],
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers["X-CopilotKit-Resource-ID"]).toBe("user-123,workspace-456");
    });

    it("should not include resourceId header when undefined", () => {
      const core = new CopilotKitCore({
        headers: {
          Authorization: "Bearer token",
        },
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers).toEqual({
        Authorization: "Bearer token",
      });
      expect(headers["X-CopilotKit-Resource-ID"]).toBeUndefined();
    });

    it("should URI encode special characters", () => {
      const core = new CopilotKitCore({
        resourceId: "user@example.com/workspace#123",
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers["X-CopilotKit-Resource-ID"]).toBe(
        "user%40example.com%2Fworkspace%23123"
      );
    });

    it("should URI encode each value in array", () => {
      const core = new CopilotKitCore({
        resourceId: ["user@example.com", "workspace/123"],
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers["X-CopilotKit-Resource-ID"]).toBe(
        "user%40example.com,workspace%2F123"
      );
    });

    it("should handle Unicode characters", () => {
      const core = new CopilotKitCore({
        resourceId: "用户-123",
      });

      const headers = core.getHeadersWithResourceId();

      // encodeURIComponent encodes Unicode
      expect(headers["X-CopilotKit-Resource-ID"]).toBe(
        encodeURIComponent("用户-123")
      );
    });

    it("should handle empty array (no header)", () => {
      const core = new CopilotKitCore({
        resourceId: [],
      });

      const headers = core.getHeadersWithResourceId();

      // Empty array produces empty joined string, which is falsy
      expect(headers["X-CopilotKit-Resource-ID"]).toBeUndefined();
    });

    it("should update header when resourceId changes", () => {
      const core = new CopilotKitCore({
        resourceId: "user-1",
      });

      let headers = core.getHeadersWithResourceId();
      expect(headers["X-CopilotKit-Resource-ID"]).toBe("user-1");

      core.setResourceId("user-2");

      headers = core.getHeadersWithResourceId();
      expect(headers["X-CopilotKit-Resource-ID"]).toBe("user-2");
    });

    it("should merge with other headers", () => {
      const core = new CopilotKitCore({
        resourceId: "user-123",
        headers: {
          Authorization: "Bearer token",
          "X-Custom": "value",
        },
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers).toEqual({
        Authorization: "Bearer token",
        "X-Custom": "value",
        "X-CopilotKit-Resource-ID": "user-123",
      });
    });

    it("should handle very long resourceId", () => {
      const longId = "user-" + "a".repeat(1000);
      const core = new CopilotKitCore({
        resourceId: longId,
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers["X-CopilotKit-Resource-ID"]).toBe(encodeURIComponent(longId));
    });

    it("should handle many resourceIds in array", () => {
      const manyIds = Array.from({ length: 100 }, (_, i) => `id-${i}`);
      const core = new CopilotKitCore({
        resourceId: manyIds,
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers["X-CopilotKit-Resource-ID"]).toBe(manyIds.join(","));
    });

    it("should handle whitespace in resourceId", () => {
      const core = new CopilotKitCore({
        resourceId: "user with spaces",
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers["X-CopilotKit-Resource-ID"]).toBe("user%20with%20spaces");
    });

    it("should handle duplicate IDs in array", () => {
      const core = new CopilotKitCore({
        resourceId: ["user-1", "user-1", "user-2"],
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers["X-CopilotKit-Resource-ID"]).toBe("user-1,user-1,user-2");
    });
  });

  describe("HttpAgent integration", () => {
    it("should apply resourceId header to HttpAgent on runAgent", async () => {
      const recorded: Array<Record<string, string>> = [];

      class RecordingHttpAgent extends HttpAgent {
        constructor() {
          super({ url: "https://runtime.example" });
        }

        async runAgent(...args: Parameters<HttpAgent["runAgent"]>) {
          recorded.push({ ...this.headers });
          return Promise.resolve({ newMessages: [] }) as ReturnType<HttpAgent["runAgent"]>;
        }
      }

      const agent = new RecordingHttpAgent();

      const core = new CopilotKitCore({
        runtimeUrl: undefined,
        resourceId: "user-123",
        headers: { Authorization: "Bearer token" },
        agents__unsafe_dev_only: { default: agent },
      });

      await core.runAgent({ agent });

      expect(recorded).toHaveLength(1);
      expect(recorded[0]).toMatchObject({
        Authorization: "Bearer token",
        "X-CopilotKit-Resource-ID": "user-123",
      });
    });

    it("should update HttpAgent headers when resourceId changes", async () => {
      const recorded: Array<Record<string, string>> = [];

      class RecordingHttpAgent extends HttpAgent {
        constructor() {
          super({ url: "https://runtime.example" });
        }

        async runAgent(...args: Parameters<HttpAgent["runAgent"]>) {
          recorded.push({ ...this.headers });
          return Promise.resolve({ newMessages: [] }) as ReturnType<HttpAgent["runAgent"]>;
        }
      }

      const agent = new RecordingHttpAgent();

      const core = new CopilotKitCore({
        runtimeUrl: undefined,
        resourceId: "user-1",
        agents__unsafe_dev_only: { default: agent },
      });

      await core.runAgent({ agent });

      core.setResourceId("user-2");

      await core.runAgent({ agent });

      expect(recorded).toHaveLength(2);
      expect(recorded[0]!["X-CopilotKit-Resource-ID"]).toBe("user-1");
      expect(recorded[1]!["X-CopilotKit-Resource-ID"]).toBe("user-2");
    });

    it("should handle resourceId with array in HttpAgent", async () => {
      const recorded: Array<Record<string, string>> = [];

      class RecordingHttpAgent extends HttpAgent {
        constructor() {
          super({ url: "https://runtime.example" });
        }

        async connectAgent(...args: Parameters<HttpAgent["connectAgent"]>) {
          recorded.push({ ...this.headers });
          return Promise.resolve({ newMessages: [] }) as ReturnType<HttpAgent["connectAgent"]>;
        }
      }

      const agent = new RecordingHttpAgent();

      const core = new CopilotKitCore({
        runtimeUrl: undefined,
        resourceId: ["user-123", "workspace-456"],
        agents__unsafe_dev_only: { default: agent },
      });

      await core.connectAgent({ agent });

      expect(recorded).toHaveLength(1);
      expect(recorded[0]!["X-CopilotKit-Resource-ID"]).toBe("user-123,workspace-456");
    });

    it("should not include resourceId header when undefined", async () => {
      const recorded: Array<Record<string, string>> = [];

      class RecordingHttpAgent extends HttpAgent {
        constructor() {
          super({ url: "https://runtime.example" });
        }

        async runAgent(...args: Parameters<HttpAgent["runAgent"]>) {
          recorded.push({ ...this.headers });
          return Promise.resolve({ newMessages: [] }) as ReturnType<HttpAgent["runAgent"]>;
        }
      }

      const agent = new RecordingHttpAgent();

      const core = new CopilotKitCore({
        runtimeUrl: undefined,
        agents__unsafe_dev_only: { default: agent },
      });

      await core.runAgent({ agent });

      expect(recorded).toHaveLength(1);
      expect(recorded[0]!["X-CopilotKit-Resource-ID"]).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("should handle resourceId with control characters", () => {
      const core = new CopilotKitCore({
        resourceId: "user\n123\ttab",
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers["X-CopilotKit-Resource-ID"]).toBe(
        encodeURIComponent("user\n123\ttab")
      );
    });

    it("should handle resourceId with only whitespace", () => {
      const core = new CopilotKitCore({
        resourceId: "   ",
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers["X-CopilotKit-Resource-ID"]).toBe("%20%20%20");
    });

    it("should handle array with empty strings", () => {
      const core = new CopilotKitCore({
        resourceId: ["user-1", "", "workspace-1"],
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers["X-CopilotKit-Resource-ID"]).toBe("user-1,,workspace-1");
    });

    it("should handle resourceId with percent signs", () => {
      const core = new CopilotKitCore({
        resourceId: "user%20with%20encoded",
      });

      const headers = core.getHeadersWithResourceId();

      // Double encoding
      expect(headers["X-CopilotKit-Resource-ID"]).toBe(
        encodeURIComponent("user%20with%20encoded")
      );
    });

    it("should handle single-element array", () => {
      const core = new CopilotKitCore({
        resourceId: ["user-123"],
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers["X-CopilotKit-Resource-ID"]).toBe("user-123");
    });

    it("should handle resourceId with emoji", () => {
      const core = new CopilotKitCore({
        resourceId: "user-😀-123",
      });

      const headers = core.getHeadersWithResourceId();

      expect(headers["X-CopilotKit-Resource-ID"]).toBe(
        encodeURIComponent("user-😀-123")
      );
    });
  });
});

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { CopilotKitCore } from "../core";

describe("CopilotKitCore - deleteThread", () => {
  let copilotKitCore: CopilotKitCore;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful deletion", () => {
    beforeEach(() => {
      copilotKitCore = new CopilotKitCore({
        runtimeUrl: "https://example.com/api",
      });
    });

    it("should successfully delete a thread", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await copilotKitCore.deleteThread("thread-123");

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/api/threads/thread-123", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    it("should handle runtimeUrl with trailing slash", async () => {
      copilotKitCore = new CopilotKitCore({
        runtimeUrl: "https://example.com/api/",
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await copilotKitCore.deleteThread("thread-123");

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/api/threads/thread-123", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    it("should include custom headers", async () => {
      copilotKitCore = new CopilotKitCore({
        runtimeUrl: "https://example.com/api",
        headers: {
          Authorization: "Bearer test-token",
          "X-Custom-Header": "custom-value",
        },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await copilotKitCore.deleteThread("thread-123");

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/api/threads/thread-123", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
          "X-Custom-Header": "custom-value",
        },
      });
    });
  });

  describe("resource ID handling", () => {
    it("should include resource ID header when set (single)", async () => {
      copilotKitCore = new CopilotKitCore({
        runtimeUrl: "https://example.com/api",
        resourceId: "user-123",
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await copilotKitCore.deleteThread("thread-123");

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/api/threads/thread-123", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CopilotKit-Resource-ID": "user-123",
        },
      });
    });

    it("should include resource ID header when set (multiple)", async () => {
      copilotKitCore = new CopilotKitCore({
        runtimeUrl: "https://example.com/api",
        resourceId: ["user-123", "org-456"],
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await copilotKitCore.deleteThread("thread-123");

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/api/threads/thread-123", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CopilotKit-Resource-ID": "user-123,org-456",
        },
      });
    });

    it("should not include resource ID header when not set", async () => {
      copilotKitCore = new CopilotKitCore({
        runtimeUrl: "https://example.com/api",
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await copilotKitCore.deleteThread("thread-123");

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/api/threads/thread-123", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
    });
  });

  describe("error handling", () => {
    it("should throw error when runtimeUrl is not set", async () => {
      copilotKitCore = new CopilotKitCore({});

      await expect(copilotKitCore.deleteThread("thread-123")).rejects.toThrow(
        "Runtime URL is required to delete a thread",
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should throw error when API returns 404", async () => {
      copilotKitCore = new CopilotKitCore({
        runtimeUrl: "https://example.com/api",
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(copilotKitCore.deleteThread("thread-123")).rejects.toThrow(
        "Failed to delete thread: Not Found",
      );
    });

    it("should throw error when API returns 500", async () => {
      copilotKitCore = new CopilotKitCore({
        runtimeUrl: "https://example.com/api",
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      await expect(copilotKitCore.deleteThread("thread-123")).rejects.toThrow(
        "Failed to delete thread: Internal Server Error",
      );
    });

    it("should throw error when API returns 403", async () => {
      copilotKitCore = new CopilotKitCore({
        runtimeUrl: "https://example.com/api",
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
      });

      await expect(copilotKitCore.deleteThread("thread-123")).rejects.toThrow(
        "Failed to delete thread: Forbidden",
      );
    });

    it("should throw error when network fails", async () => {
      copilotKitCore = new CopilotKitCore({
        runtimeUrl: "https://example.com/api",
      });

      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(copilotKitCore.deleteThread("thread-123")).rejects.toThrow("Network error");
    });
  });

  describe("thread ID handling", () => {
    beforeEach(() => {
      copilotKitCore = new CopilotKitCore({
        runtimeUrl: "https://example.com/api",
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });
    });

    it("should handle UUID thread IDs", async () => {
      const threadId = "550e8400-e29b-41d4-a716-446655440000";
      await copilotKitCore.deleteThread(threadId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://example.com/api/threads/${threadId}`,
        expect.any(Object),
      );
    });

    it("should handle short thread IDs", async () => {
      const threadId = "abc123";
      await copilotKitCore.deleteThread(threadId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://example.com/api/threads/${threadId}`,
        expect.any(Object),
      );
    });

    it("should handle thread IDs with special characters", async () => {
      const threadId = "thread-123-abc";
      await copilotKitCore.deleteThread(threadId);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://example.com/api/threads/${threadId}`,
        expect.any(Object),
      );
    });
  });

  describe("integration with setHeaders", () => {
    it("should use updated headers after setHeaders call", async () => {
      copilotKitCore = new CopilotKitCore({
        runtimeUrl: "https://example.com/api",
        headers: {
          Authorization: "Bearer old-token",
        },
      });

      copilotKitCore.setHeaders({
        Authorization: "Bearer new-token",
        "X-New-Header": "new-value",
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await copilotKitCore.deleteThread("thread-123");

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/api/threads/thread-123", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer new-token",
          "X-New-Header": "new-value",
        },
      });
    });
  });

  describe("integration with setResourceId", () => {
    it("should use updated resource ID after setResourceId call", async () => {
      copilotKitCore = new CopilotKitCore({
        runtimeUrl: "https://example.com/api",
        resourceId: "user-123",
      });

      copilotKitCore.setResourceId("user-456");

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await copilotKitCore.deleteThread("thread-123");

      expect(mockFetch).toHaveBeenCalledWith("https://example.com/api/threads/thread-123", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CopilotKit-Resource-ID": "user-456",
        },
      });
    });
  });

  describe("integration with setRuntimeUrl", () => {
    it("should use updated runtime URL after setRuntimeUrl call", async () => {
      copilotKitCore = new CopilotKitCore({
        runtimeUrl: "https://example.com/api",
      });

      copilotKitCore.setRuntimeUrl("https://new-example.com/api");

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await copilotKitCore.deleteThread("thread-123");

      expect(mockFetch).toHaveBeenCalledWith("https://new-example.com/api/threads/thread-123", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });
    });
  });
});

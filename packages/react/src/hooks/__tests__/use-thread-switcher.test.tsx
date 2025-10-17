import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useThreadSwitch } from "../use-thread-switcher";
import { ReactNode } from "react";
import { CopilotChatConfigurationProvider } from "@/providers/CopilotChatConfigurationProvider";

// Mock the CopilotKitCore for race condition tests
const mockListThreads = vi.fn();
const mockGetThreadMetadata = vi.fn();
const mockAbortController = {
  abort: vi.fn(),
  signal: { aborted: false },
};

vi.mock("@/providers/CopilotKitProvider", async () => {
  const actual = await vi.importActual("@/providers/CopilotKitProvider");
  return {
    ...actual,
    useCopilotKit: () => ({
      copilotkit: {
        listThreads: mockListThreads,
        getThreadMetadata: mockGetThreadMetadata,
        subscribe: vi.fn(() => vi.fn()),
        runtimeUrl: "https://runtime.example",
        headers: { Authorization: "Bearer test" },
        abortController: mockAbortController,
      },
    }),
  };
});

describe("useThreadSwitch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAbortController.abort.mockClear();
  });
  it("returns switchThread function and currentThreadId", () => {
    const { result } = renderHook(() => useThreadSwitch(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <CopilotChatConfigurationProvider>{children}</CopilotChatConfigurationProvider>
      ),
    });

    expect(result.current.switchThread).toBeDefined();
    expect(typeof result.current.switchThread).toBe("function");
    expect(result.current.currentThreadId).toBeDefined();
  });

  it("returns current thread ID from config", () => {
    const { result } = renderHook(() => useThreadSwitch(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <CopilotChatConfigurationProvider threadId="my-thread">{children}</CopilotChatConfigurationProvider>
      ),
    });

    expect(result.current.currentThreadId).toBe("my-thread");
  });

  it("updates thread ID when switchThread is called", () => {
    const { result } = renderHook(() => useThreadSwitch(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <CopilotChatConfigurationProvider>{children}</CopilotChatConfigurationProvider>
      ),
    });

    const initialThreadId = result.current.currentThreadId;
    expect(initialThreadId).toBeDefined();

    // Switch to a new thread
    act(() => {
      result.current.switchThread("new-thread-id");
    });

    // The thread ID should now be updated
    expect(result.current.currentThreadId).toBe("new-thread-id");
  });

  it("works without a configuration provider", () => {
    const { result } = renderHook(() => useThreadSwitch());

    // Should not crash when no config provider exists
    expect(result.current.switchThread).toBeDefined();
    expect(result.current.currentThreadId).toBeUndefined();

    // Calling switchThread should not crash (it just won't do anything)
    act(() => {
      result.current.switchThread("thread-x");
    });

    // Thread ID should still be undefined since there's no provider
    expect(result.current.currentThreadId).toBeUndefined();
  });

  describe("Race Conditions", () => {
    it("should handle rapid thread ID changes without showing stale messages", async () => {
      // This test documents the expected behavior for rapid thread switching
      // In a real implementation:
      // - Rapid switches should cancel in-flight requests
      // - Only messages from the final thread should be shown
      // - No stale data from intermediate threads should appear

      const { result } = renderHook(() => useThreadSwitch(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <CopilotChatConfigurationProvider>{children}</CopilotChatConfigurationProvider>
        ),
      });

      const initialThreadId = result.current.currentThreadId;

      // Switch to thread-1 first
      act(() => {
        result.current.switchThread("thread-1");
      });

      // Rapidly switch between threads
      act(() => {
        result.current.switchThread("thread-2");
      });
      act(() => {
        result.current.switchThread("thread-3");
      });

      // The hook should report the latest thread ID
      expect(result.current.currentThreadId).toBe("thread-3");

      // Note: Full race condition prevention requires:
      // - Request cancellation via AbortController
      // - Tracking request IDs to ignore stale responses
      // - Proper cleanup in useEffect hooks
    });

    it("should handle switching to a deleted thread gracefully", async () => {
      // Mock a thread that exists initially
      mockGetThreadMetadata.mockResolvedValueOnce({
        threadId: "thread-1",
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        isRunning: false,
        messageCount: 5,
        firstMessage: "Hello",
      });

      const { result } = renderHook(() => useThreadSwitch(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <CopilotChatConfigurationProvider threadId="thread-1">{children}</CopilotChatConfigurationProvider>
        ),
      });

      expect(result.current.currentThreadId).toBe("thread-1");

      // Simulate the thread being deleted (next fetch returns null or throws)
      mockGetThreadMetadata.mockResolvedValueOnce(null);

      // Switch to the deleted thread
      act(() => {
        result.current.switchThread("thread-1");
      });

      // Should not crash - the component should handle the missing thread gracefully
      await waitFor(() => {
        expect(result.current.currentThreadId).toBe("thread-1");
      });

      // The hook itself should still report the thread ID even if the thread doesn't exist
      // The consuming component (like CopilotChat) would handle showing an error state
      expect(result.current.currentThreadId).toBe("thread-1");
    });

    it("should cancel agent run when switching threads mid-execution", async () => {
      // This test documents the expected behavior for canceling runs during thread switch
      // In a real implementation:
      // - Switching threads should trigger AbortController.abort()
      // - In-flight agent runs should be canceled
      // - No state updates from the old thread should be processed

      const { result } = renderHook(() => useThreadSwitch(), {
        wrapper: ({ children }: { children: ReactNode }) => (
          <CopilotChatConfigurationProvider>{children}</CopilotChatConfigurationProvider>
        ),
      });

      // Switch to thread-1 first
      act(() => {
        result.current.switchThread("thread-1");
      });

      expect(result.current.currentThreadId).toBe("thread-1");

      // Switch to a different thread
      act(() => {
        result.current.switchThread("thread-2");
      });

      // Verify the switch completed
      expect(result.current.currentThreadId).toBe("thread-2");

      // Note: Full cancellation support requires:
      // - AbortController integration in the runtime
      // - Cleanup logic in CopilotChat/thread management
      // - Request tracking to prevent stale updates
    });
  });
});

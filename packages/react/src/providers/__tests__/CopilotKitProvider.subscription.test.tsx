import React, { useState } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CopilotKitProvider, useCopilotKit } from "../CopilotKitProvider";

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe("CopilotKitProvider Subscription", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe("useCopilotKit subscription behavior", () => {
    it("should subscribe when copilotkit becomes available", async () => {
      const { result } = renderHook(() => useCopilotKit(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider>{children}</CopilotKitProvider>
        ),
      });

      // Verify subscription is set up
      expect(result.current.copilotkit).toBeDefined();

      // Get the initial subscription count
      const initialSubCount = (result.current.copilotkit as any).subscribers?.size;
      expect(initialSubCount).toBeGreaterThan(0);
    });

    it("should re-subscribe when copilotkit instance changes", async () => {
      let setShowProvider: (show: boolean) => void;

      const Wrapper = ({ children }: { children: React.ReactNode }) => {
        const [showProvider, setShow] = useState(true);
        setShowProvider = setShow;

        if (!showProvider) {
          return <div>{children}</div>;
        }

        return <CopilotKitProvider>{children}</CopilotKitProvider>;
      };

      const { result } = renderHook(() => {
        try {
          return useCopilotKit();
        } catch (e) {
          return null;
        }
      }, {
        wrapper: Wrapper,
      });

      // Initially should have copilotkit
      expect(result.current?.copilotkit).toBeDefined();
      const firstInstance = result.current?.copilotkit;

      // Remove and re-add provider
      await act(async () => {
        setShowProvider(false);
      });

      await waitFor(() => {
        expect(result.current).toBeNull();
      });

      await act(async () => {
        setShowProvider(true);
      });

      await waitFor(() => {
        expect(result.current?.copilotkit).toBeDefined();
      });

      // Should be a new instance
      const secondInstance = result.current?.copilotkit;
      expect(secondInstance).not.toBe(firstInstance);
    });

    it("should handle runtime connection status changes", async () => {
      const { result } = renderHook(() => useCopilotKit(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider runtimeUrl="http://test.com">
            {children}
          </CopilotKitProvider>
        ),
      });

      expect(result.current.copilotkit).toBeDefined();
      expect(result.current.copilotkit.runtimeConnectionStatus).toBeDefined();
    });

    it("should maintain subscription across re-renders", async () => {
      const { result, rerender } = renderHook(() => useCopilotKit(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider>{children}</CopilotKitProvider>
        ),
      });

      const firstCopilotkit = result.current.copilotkit;

      // Force a re-render
      rerender();

      // Should maintain the same instance
      expect(result.current.copilotkit).toBe(firstCopilotkit);
    });
  });

  describe("Activity message rendering with delayed initialization", () => {
    it("should handle components that use useCopilotKit mounting before provider is ready", async () => {
      // This tests the race condition where a component tries to use
      // useCopilotKit before the provider has fully initialized

      let providerReady = false;

      const DelayedProvider = ({ children }: { children: React.ReactNode }) => {
        const [isReady, setIsReady] = useState(false);

        React.useEffect(() => {
          const timer = setTimeout(() => {
            setIsReady(true);
            providerReady = true;
          }, 50);
          return () => clearTimeout(timer);
        }, []);

        if (!isReady) {
          return <div>{children}</div>;
        }

        return <CopilotKitProvider>{children}</CopilotKitProvider>;
      };

      const { result } = renderHook(() => {
        try {
          return useCopilotKit();
        } catch (e) {
          return { error: (e as Error).message };
        }
      }, {
        wrapper: DelayedProvider,
      });

      // Initially should throw error
      expect(result.current).toHaveProperty("error");
      expect((result.current as any).error).toContain("must be used within CopilotKitProvider");

      // Wait for provider to be ready
      await waitFor(() => {
        expect(providerReady).toBe(true);
      }, { timeout: 100 });

      // After provider is ready, should work
      await waitFor(() => {
        expect(result.current).toHaveProperty("copilotkit");
      }, { timeout: 100 });
    });
  });

  describe("Subscription cleanup", () => {
    it("should unsubscribe when component unmounts", async () => {
      const { result, unmount } = renderHook(() => useCopilotKit(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider>{children}</CopilotKitProvider>
        ),
      });

      const copilotkit = result.current.copilotkit;
      const initialSubCount = (copilotkit as any).subscribers?.size;

      // Unmount the hook
      unmount();

      // Subscription count should decrease
      await waitFor(() => {
        const finalSubCount = (copilotkit as any).subscribers?.size;
        expect(finalSubCount).toBeLessThan(initialSubCount);
      });
    });

    it("should handle multiple subscribers", async () => {
      const { result: result1 } = renderHook(() => useCopilotKit(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider>{children}</CopilotKitProvider>
        ),
      });

      const { result: result2, unmount: unmount2 } = renderHook(() => useCopilotKit(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider>{children}</CopilotKitProvider>
        ),
      });

      // Both should work independently
      expect(result1.current.copilotkit).toBeDefined();
      expect(result2.current.copilotkit).toBeDefined();

      // Unmounting one shouldn't affect the other
      unmount2();

      expect(result1.current.copilotkit).toBeDefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle rapid provider re-initialization", async () => {
      let toggleProvider: () => void;

      const TogglingWrapper = ({ children }: { children: React.ReactNode }) => {
        const [showProvider, setShowProvider] = useState(true);
        toggleProvider = () => setShowProvider(prev => !prev);

        if (!showProvider) {
          return <div>{children}</div>;
        }

        return <CopilotKitProvider>{children}</CopilotKitProvider>;
      };

      const { result } = renderHook(() => {
        try {
          return useCopilotKit();
        } catch (e) {
          return null;
        }
      }, {
        wrapper: TogglingWrapper,
      });

      // Rapidly toggle provider
      await act(async () => {
        toggleProvider();
        await new Promise(resolve => setTimeout(resolve, 10));
        toggleProvider();
        await new Promise(resolve => setTimeout(resolve, 10));
        toggleProvider();
        await new Promise(resolve => setTimeout(resolve, 10));
        toggleProvider();
      });

      // Should eventually stabilize with a working copilotkit
      await waitFor(() => {
        expect(result.current?.copilotkit).toBeDefined();
      });
    });
  });
});

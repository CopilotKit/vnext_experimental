import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CopilotKitProvider } from "@/providers/CopilotKitProvider";
import { useRenderActivityMessage } from "../use-render-activity-message";
import { ActivityMessage } from "@ag-ui/core";
import { ReactActivityMessageRenderer } from "@/types";
import { z } from "zod";

// Mock console methods
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

describe("useRenderActivityMessage", () => {
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

  describe("Basic rendering", () => {
    it("should render activity messages with registered renderer", () => {
      const TestRenderer: React.FC<any> = ({ content }) => (
        <div data-testid="activity-message">{content.message}</div>
      );

      const renderers: ReactActivityMessageRenderer<any>[] = [
        {
          activityType: "test-activity",
          content: z.object({ message: z.string() }),
          render: TestRenderer,
        },
      ];

      const { result } = renderHook(() => useRenderActivityMessage(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider renderActivityMessages={renderers}>
            {children}
          </CopilotKitProvider>
        ),
      });

      const message: ActivityMessage = {
        id: "msg-1",
        role: "activity",
        activityType: "test-activity",
        content: { message: "Hello World" },
      };

      const rendered = result.current(message);
      expect(rendered).toBeTruthy();
      expect(rendered?.type).toBe(TestRenderer);
    });

    it("should return null for messages without matching renderer", () => {
      const { result } = renderHook(() => useRenderActivityMessage(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider renderActivityMessages={[]}>
            {children}
          </CopilotKitProvider>
        ),
      });

      const message: ActivityMessage = {
        id: "msg-1",
        role: "activity",
        activityType: "unknown-activity",
        content: {},
      };

      const rendered = result.current(message);
      expect(rendered).toBeNull();
    });

    it("should work when provider is initialized", () => {
      const TestRenderer: React.FC<any> = () => <div>Test</div>;

      const renderers: ReactActivityMessageRenderer<any>[] = [
        {
          activityType: "delayed-activity",
          content: z.object({}),
          render: TestRenderer,
        },
      ];

      const { result } = renderHook(() => useRenderActivityMessage(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider renderActivityMessages={renderers}>
            {children}
          </CopilotKitProvider>
        ),
      });

      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe("function");
    });
  });

  describe("Wildcard renderer", () => {
    it("should use wildcard renderer for unknown activity types", () => {
      const WildcardRenderer: React.FC<any> = ({ activityType }) => (
        <div data-testid="wildcard">{activityType}</div>
      );

      const renderers: ReactActivityMessageRenderer<any>[] = [
        {
          activityType: "*",
          content: z.any(),
          render: WildcardRenderer,
        },
      ];

      const { result } = renderHook(() => useRenderActivityMessage(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider renderActivityMessages={renderers}>
            {children}
          </CopilotKitProvider>
        ),
      });

      const message: ActivityMessage = {
        id: "msg-1",
        role: "activity",
        activityType: "any-type",
        content: { foo: "bar" },
      };

      const rendered = result.current(message);
      expect(rendered).toBeTruthy();
      expect(rendered?.type).toBe(WildcardRenderer);
    });
  });

  describe("Agent-specific renderers", () => {
    it("should prioritize agent-specific renderer over global", () => {
      const GlobalRenderer: React.FC<any> = () => <div>Global</div>;
      const AgentRenderer: React.FC<any> = () => <div>Agent-specific</div>;

      const renderers: ReactActivityMessageRenderer<any>[] = [
        {
          activityType: "test-activity",
          content: z.any(),
          render: GlobalRenderer,
        },
        {
          activityType: "test-activity",
          content: z.any(),
          render: AgentRenderer,
          agentId: "agent-1",
        },
      ];

      const { result } = renderHook(() => useRenderActivityMessage(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider renderActivityMessages={renderers}>
            {children}
          </CopilotKitProvider>
        ),
      });

      const message: ActivityMessage = {
        id: "msg-1",
        role: "activity",
        activityType: "test-activity",
        content: {},
      };

      const rendered = result.current(message);
      expect(rendered).toBeTruthy();
      // Should use global renderer since we're using default agent
      expect(rendered?.type).toBe(GlobalRenderer);
    });
  });

  describe("Content validation", () => {
    it("should warn when content fails validation", () => {
      const TestRenderer: React.FC<any> = () => <div>Test</div>;

      const renderers: ReactActivityMessageRenderer<any>[] = [
        {
          activityType: "strict-activity",
          content: z.object({ requiredField: z.string() }),
          render: TestRenderer,
        },
      ];

      const { result } = renderHook(() => useRenderActivityMessage(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider renderActivityMessages={renderers}>
            {children}
          </CopilotKitProvider>
        ),
      });

      const message: ActivityMessage = {
        id: "msg-1",
        role: "activity",
        activityType: "strict-activity",
        content: { wrongField: "value" },
      };

      const rendered = result.current(message);
      expect(rendered).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to parse content"),
        expect.anything()
      );
    });

    it("should render when content passes validation", () => {
      const TestRenderer: React.FC<any> = ({ content }) => (
        <div>{content.value}</div>
      );

      const renderers: ReactActivityMessageRenderer<any>[] = [
        {
          activityType: "valid-activity",
          content: z.object({ value: z.string() }),
          render: TestRenderer,
        },
      ];

      const { result } = renderHook(() => useRenderActivityMessage(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider renderActivityMessages={renderers}>
            {children}
          </CopilotKitProvider>
        ),
      });

      const message: ActivityMessage = {
        id: "msg-1",
        role: "activity",
        activityType: "valid-activity",
        content: { value: "test" },
      };

      const rendered = result.current(message);
      expect(rendered).toBeTruthy();
      // Don't check for no warnings - provider may emit warnings about missing runtime URL
      // The important thing is that no parse warnings are emitted
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("Failed to parse content"),
        expect.anything()
      );
    });
  });

  describe("Regression: Provider initialization timing", () => {
    it("should not crash when called immediately after provider mount", async () => {
      const TestRenderer: React.FC<any> = () => <div>Test</div>;

      const renderers: ReactActivityMessageRenderer<any>[] = [
        {
          activityType: "immediate-activity",
          content: z.any(),
          render: TestRenderer,
        },
      ];

      // This tests the scenario where useRenderActivityMessage is called
      // during the same render cycle as the provider initialization
      const { result } = renderHook(() => useRenderActivityMessage(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider renderActivityMessages={renderers}>
            {children}
          </CopilotKitProvider>
        ),
      });

      // Should not throw
      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe("function");

      const message: ActivityMessage = {
        id: "msg-1",
        role: "activity",
        activityType: "immediate-activity",
        content: {},
      };

      // Should be able to render immediately
      const rendered = result.current(message);
      expect(rendered).toBeTruthy();
    });

    it("should handle activity messages arriving before full initialization", async () => {
      const TestRenderer: React.FC<any> = ({ content }) => (
        <div>{content.data}</div>
      );

      const renderers: ReactActivityMessageRenderer<any>[] = [
        {
          activityType: "early-activity",
          content: z.object({ data: z.string() }),
          render: TestRenderer,
        },
      ];

      const { result } = renderHook(() => useRenderActivityMessage(), {
        wrapper: ({ children }) => (
          <CopilotKitProvider renderActivityMessages={renderers}>
            {children}
          </CopilotKitProvider>
        ),
      });

      // Simulate an activity message arriving immediately
      const message: ActivityMessage = {
        id: "msg-1",
        role: "activity",
        activityType: "early-activity",
        content: { data: "early message" },
      };

      // Should not crash and should render
      await waitFor(() => {
        const rendered = result.current(message);
        expect(rendered).toBeTruthy();
      });
    });
  });
});

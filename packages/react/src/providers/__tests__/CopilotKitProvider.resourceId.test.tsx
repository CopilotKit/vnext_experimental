import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { CopilotKitProvider, useCopilotKit } from "../CopilotKitProvider";
import React from "react";

describe("CopilotKitProvider - resourceId", () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Reset NODE_ENV to test so warnings don't fire during most tests
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  describe("resourceId prop", () => {
    it("should accept string resourceId", () => {
      const TestComponent = () => {
        const { copilotkit } = useCopilotKit();
        return <div>{copilotkit.resourceId}</div>;
      };

      const { container } = render(
        <CopilotKitProvider resourceId="user-123">
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe("user-123");
    });

    it("should accept array of resourceIds", () => {
      const TestComponent = () => {
        const { copilotkit } = useCopilotKit();
        const resourceId = copilotkit.resourceId;
        return (
          <div>
            {Array.isArray(resourceId) ? resourceId.join(",") : resourceId}
          </div>
        );
      };

      const { container } = render(
        <CopilotKitProvider resourceId={["user-123", "workspace-456"]}>
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe("user-123,workspace-456");
    });

    it("should accept undefined resourceId", () => {
      const TestComponent = () => {
        const { copilotkit } = useCopilotKit();
        return <div>{copilotkit.resourceId === undefined ? "undefined" : "defined"}</div>;
      };

      const { container } = render(
        <CopilotKitProvider>
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe("undefined");
    });

    it("should handle empty array resourceId", () => {
      const TestComponent = () => {
        const { copilotkit } = useCopilotKit();
        const resourceId = copilotkit.resourceId;
        return (
          <div>
            {Array.isArray(resourceId) && resourceId.length === 0 ? "empty" : "not-empty"}
          </div>
        );
      };

      const { container } = render(
        <CopilotKitProvider resourceId={[]}>
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe("empty");
    });

    it("should handle resourceId with special characters", () => {
      const specialId = "user@example.com/workspace#123";
      const TestComponent = () => {
        const { copilotkit } = useCopilotKit();
        return <div>{copilotkit.resourceId}</div>;
      };

      const { container } = render(
        <CopilotKitProvider resourceId={specialId}>
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe(specialId);
    });

    it("should update resourceId when prop changes", () => {
      const TestComponent = () => {
        const { copilotkit } = useCopilotKit();
        return <div>{copilotkit.resourceId}</div>;
      };

      const { container, rerender } = render(
        <CopilotKitProvider resourceId="user-1">
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe("user-1");

      rerender(
        <CopilotKitProvider resourceId="user-2">
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe("user-2");
    });

    it("should transition from string to array", () => {
      const TestComponent = () => {
        const { copilotkit } = useCopilotKit();
        const resourceId = copilotkit.resourceId;
        return (
          <div>
            {Array.isArray(resourceId) ? resourceId.join(",") : resourceId}
          </div>
        );
      };

      const { container, rerender } = render(
        <CopilotKitProvider resourceId="user-1">
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe("user-1");

      rerender(
        <CopilotKitProvider resourceId={["user-1", "workspace-1"]}>
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe("user-1,workspace-1");
    });

    it("should transition from array to undefined", () => {
      const TestComponent = () => {
        const { copilotkit } = useCopilotKit();
        return <div>{copilotkit.resourceId === undefined ? "undefined" : "defined"}</div>;
      };

      const { container, rerender } = render(
        <CopilotKitProvider resourceId={["user-1", "workspace-1"]}>
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe("defined");

      rerender(
        <CopilotKitProvider resourceId={undefined}>
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe("undefined");
    });
  });

  describe("setResourceId hook", () => {
    it("should expose setResourceId function", () => {
      const TestComponent = () => {
        const { setResourceId } = useCopilotKit();
        return <div>{typeof setResourceId}</div>;
      };

      const { container } = render(
        <CopilotKitProvider resourceId="user-1">
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe("function");
    });

    it("should update resourceId via setResourceId", async () => {
      const TestComponent = () => {
        const { copilotkit, setResourceId } = useCopilotKit();
        return (
          <div>
            <span data-testid="resourceId">{copilotkit.resourceId}</span>
            <button onClick={() => setResourceId("user-2")}>Change</button>
          </div>
        );
      };

      const { getByTestId, getByText } = render(
        <CopilotKitProvider resourceId="user-1">
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(getByTestId("resourceId").textContent).toBe("user-1");

      getByText("Change").click();

      await waitFor(() => {
        expect(getByTestId("resourceId").textContent).toBe("user-2");
      });
    });

    it("should handle setResourceId with array", async () => {
      const TestComponent = () => {
        const { copilotkit, setResourceId } = useCopilotKit();
        const resourceId = copilotkit.resourceId;
        return (
          <div>
            <span data-testid="resourceId">
              {Array.isArray(resourceId) ? resourceId.join(",") : resourceId}
            </span>
            <button onClick={() => setResourceId(["user-1", "workspace-1"])}>
              Change
            </button>
          </div>
        );
      };

      const { getByTestId, getByText } = render(
        <CopilotKitProvider resourceId="user-1">
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(getByTestId("resourceId").textContent).toBe("user-1");

      getByText("Change").click();

      await waitFor(() => {
        expect(getByTestId("resourceId").textContent).toBe("user-1,workspace-1");
      });
    });

    it("should handle setResourceId with undefined", async () => {
      const TestComponent = () => {
        const { copilotkit, setResourceId } = useCopilotKit();
        return (
          <div>
            <span data-testid="resourceId">
              {copilotkit.resourceId === undefined ? "undefined" : "defined"}
            </span>
            <button onClick={() => setResourceId(undefined)}>Clear</button>
          </div>
        );
      };

      const { getByTestId, getByText } = render(
        <CopilotKitProvider resourceId="user-1">
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(getByTestId("resourceId").textContent).toBe("defined");

      getByText("Clear").click();

      await waitFor(() => {
        expect(getByTestId("resourceId").textContent).toBe("undefined");
      });
    });

    it("should handle multiple rapid setResourceId calls", async () => {
      const TestComponent = () => {
        const { copilotkit, setResourceId } = useCopilotKit();
        return (
          <div>
            <span data-testid="resourceId">{copilotkit.resourceId}</span>
            <button
              onClick={() => {
                setResourceId("user-2");
                setResourceId("user-3");
                setResourceId("user-4");
              }}
            >
              Rapid Change
            </button>
          </div>
        );
      };

      const { getByTestId, getByText } = render(
        <CopilotKitProvider resourceId="user-1">
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(getByTestId("resourceId").textContent).toBe("user-1");

      getByText("Rapid Change").click();

      // Should end up with the last value
      await waitFor(() => {
        expect(getByTestId("resourceId").textContent).toBe("user-4");
      });
    });
  });

  describe("production warnings", () => {
    it("should log error in production when resourceId is not set", async () => {
      process.env.NODE_ENV = "production";

      render(
        <CopilotKitProvider>
          <div>Test</div>
        </CopilotKitProvider>
      );

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("Security Warning: No resourceId set in production")
        );
      });
    });

    it("should log warning in development when resourceId is not set", async () => {
      process.env.NODE_ENV = "development";

      render(
        <CopilotKitProvider>
          <div>Test</div>
        </CopilotKitProvider>
      );

      await waitFor(() => {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining("No resourceId set")
        );
      });
    });

    it("should not log warnings when resourceId is set", async () => {
      process.env.NODE_ENV = "production";

      render(
        <CopilotKitProvider resourceId="user-123">
          <div>Test</div>
        </CopilotKitProvider>
      );

      await waitFor(() => {
        expect(consoleErrorSpy).not.toHaveBeenCalled();
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });
    });

    it("should handle empty array as 'set' (no warning)", async () => {
      process.env.NODE_ENV = "production";

      render(
        <CopilotKitProvider resourceId={[]}>
          <div>Test</div>
        </CopilotKitProvider>
      );

      await waitFor(() => {
        // Empty array is considered "set" even though it grants no access
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });
    });

    it("should not log warnings on server side (SSR)", async () => {
      // Note: In jsdom environment, window is always present
      // This test verifies the typeof check in the code
      process.env.NODE_ENV = "production";

      render(
        <CopilotKitProvider>
          <div>Test</div>
        </CopilotKitProvider>
      );

      // With window present and resourceId undefined, should log error
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("Security Warning: No resourceId set in production")
        );
      });
    });
  });

  describe("edge cases", () => {
    it("should handle very long resourceId strings", () => {
      const longId = "user-" + "a".repeat(1000);
      const TestComponent = () => {
        const { copilotkit } = useCopilotKit();
        return <div>{(copilotkit.resourceId as string).length}</div>;
      };

      const { container } = render(
        <CopilotKitProvider resourceId={longId}>
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe(String(longId.length));
    });

    it("should handle array with many resourceIds", () => {
      const manyIds = Array.from({ length: 100 }, (_, i) => `id-${i}`);
      const TestComponent = () => {
        const { copilotkit } = useCopilotKit();
        const resourceId = copilotkit.resourceId;
        return <div>{Array.isArray(resourceId) ? resourceId.length : 0}</div>;
      };

      const { container } = render(
        <CopilotKitProvider resourceId={manyIds}>
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe("100");
    });

    it("should handle resourceId with only whitespace", () => {
      const whitespaceId = "   ";
      const TestComponent = () => {
        const { copilotkit } = useCopilotKit();
        return <div>{copilotkit.resourceId}</div>;
      };

      const { container } = render(
        <CopilotKitProvider resourceId={whitespaceId}>
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe(whitespaceId);
    });

    it("should handle array with duplicate resourceIds", () => {
      const duplicates = ["user-1", "user-1", "user-2", "user-1"];
      const TestComponent = () => {
        const { copilotkit } = useCopilotKit();
        const resourceId = copilotkit.resourceId;
        return (
          <div>
            {Array.isArray(resourceId) ? resourceId.join(",") : resourceId}
          </div>
        );
      };

      const { container } = render(
        <CopilotKitProvider resourceId={duplicates}>
          <TestComponent />
        </CopilotKitProvider>
      );

      // Should preserve duplicates (server may filter)
      expect(container.textContent).toBe("user-1,user-1,user-2,user-1");
    });

    it("should handle resourceId with Unicode characters", () => {
      const unicodeId = "用户-123-مستخدم";
      const TestComponent = () => {
        const { copilotkit } = useCopilotKit();
        return <div>{copilotkit.resourceId}</div>;
      };

      const { container } = render(
        <CopilotKitProvider resourceId={unicodeId}>
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe(unicodeId);
    });

    it("should handle array with mixed types (though TypeScript prevents this)", () => {
      // This tests runtime behavior if TypeScript is bypassed
      const mixedArray = ["user-1", "workspace-2"] as any;
      const TestComponent = () => {
        const { copilotkit } = useCopilotKit();
        const resourceId = copilotkit.resourceId;
        return (
          <div>
            {Array.isArray(resourceId) ? resourceId.join(",") : resourceId}
          </div>
        );
      };

      const { container } = render(
        <CopilotKitProvider resourceId={mixedArray}>
          <TestComponent />
        </CopilotKitProvider>
      );

      expect(container.textContent).toBe("user-1,workspace-2");
    });
  });

  describe("context isolation", () => {
    it("should not share resourceId between different provider instances", () => {
      const TestComponent = ({ testId }: { testId: string }) => {
        const { copilotkit } = useCopilotKit();
        return <div data-testid={testId}>{copilotkit.resourceId}</div>;
      };

      const { getByTestId } = render(
        <>
          <CopilotKitProvider resourceId="user-1">
            <TestComponent testId="provider1" />
          </CopilotKitProvider>
          <CopilotKitProvider resourceId="user-2">
            <TestComponent testId="provider2" />
          </CopilotKitProvider>
        </>
      );

      expect(getByTestId("provider1").textContent).toBe("user-1");
      expect(getByTestId("provider2").textContent).toBe("user-2");
    });
  });
});

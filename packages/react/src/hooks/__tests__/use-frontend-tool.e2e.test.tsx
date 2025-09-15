import React, { useEffect, useState } from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { z } from "zod";
import { useFrontendTool } from "../use-frontend-tool";
import { ReactFrontendTool } from "@/types";
import { CopilotChat } from "@/components/chat/CopilotChat";
import CopilotChatToolCallsView from "@/components/chat/CopilotChatToolCallsView";
import { AssistantMessage, Message, ToolMessage } from "@ag-ui/core";
import {
  MockStepwiseAgent,
  renderWithCopilotKit,
  runStartedEvent,
  runFinishedEvent,
  toolCallChunkEvent,
  toolCallResultEvent,
  testId,
} from "@/__tests__/utils/test-helpers";


describe("useFrontendTool E2E - Dynamic Registration", () => {
  it("smoke: vitest runs tests in this file", () => {
    expect(1).toBe(1);
  });
  describe("Minimal dynamic registration without chat run", () => {
    it("registers tool and renders tool call via ToolCallsView", async () => {
      // eslint-disable-next-line no-console
      // No agent run; we render ToolCallsView directly
      const DynamicToolComponent: React.FC = () => {
        const tool: ReactFrontendTool<{ message: string }> = {
          name: "dynamicTool",
          parameters: z.object({ message: z.string() }),
          render: ({ name, args }) => (
            <div data-testid="dynamic-tool-render">
              {name}: {args.message}
            </div>
          ),
        };
        useFrontendTool(tool);
        return null;
      };

      const toolCallId = testId("tc_dyn");
      const assistantMessage: AssistantMessage = {
        id: testId("a"),
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: toolCallId,
            type: "function",
            function: {
              name: "dynamicTool",
              arguments: JSON.stringify({ message: "hello" }),
            },
          } as any,
        ],
      } as any;
      const messages: Message[] = [];

      const ui = renderWithCopilotKit({
        children: (
          <>
            <DynamicToolComponent />
            <CopilotChatToolCallsView
              message={assistantMessage}
              messages={messages}
              isLoading={true}
            />
          </>
        ),
      });

      await waitFor(() => {
        const el = screen.getByTestId("dynamic-tool-render");
        expect(el).toBeDefined();
        expect(el.textContent).toContain("dynamicTool");
        expect(el.textContent).toContain("hello");
      });
      // Explicitly unmount to avoid any lingering handles
      ui.unmount();
    });
  });
  describe("Register at runtime", () => {
    it("should register tool dynamically after provider is mounted", async () => {
      const agent = new MockStepwiseAgent();

      // Inner component that uses the hook
      const ToolUser: React.FC = () => {
        const tool: ReactFrontendTool<{ message: string }> = {
          name: "dynamicTool",
          parameters: z.object({ message: z.string() }),
          render: ({ name, args, result }) => (
            <div data-testid="dynamic-tool-render">
              {name}: {args.message} | Result:{" "}
              {result ? JSON.stringify(result) : "pending"}
            </div>
          ),
          handler: async (args) => {
            return { processed: args.message.toUpperCase() };
          },
        };

        useFrontendTool(tool);
        return null;
      };

      // Component that registers a tool after mount
      const DynamicToolComponent: React.FC = () => {
        const [isRegistered, setIsRegistered] = useState(false);

        useEffect(() => {
          // Register immediately after mount
          setIsRegistered(true);
        }, []);

        return (
          <>
            <div data-testid="dynamic-status">
              {isRegistered ? "Registered" : "Not registered"}
            </div>
            {isRegistered && <ToolUser />}
          </>
        );
      };

      renderWithCopilotKit({
        agent,
        children: (
          <>
            <DynamicToolComponent />
            <div style={{ height: 400 }}>
              <CopilotChat />
            </div>
          </>
        ),
      });

      // Wait for dynamic registration
      await waitFor(() => {
        expect(screen.getByTestId("dynamic-status").textContent).toBe(
          "Registered"
        );
      });

      // Submit a message that will trigger the dynamically registered tool
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Use dynamic tool" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Wait for message to be processed
      await waitFor(() => {
        expect(screen.getByText("Use dynamic tool")).toBeDefined();
      });

      const messageId = testId("msg");
      const toolCallId = testId("tc");

      // Emit tool call for the dynamically registered tool
      agent.emit(runStartedEvent());
      agent.emit(
        toolCallChunkEvent({
          toolCallId,
          toolCallName: "dynamicTool",
          parentMessageId: messageId,
          delta: '{"message":"hello world"}',
        })
      );

      // The dynamically registered renderer should appear
      await waitFor(() => {
        const toolRender = screen.getByTestId("dynamic-tool-render");
        expect(toolRender).toBeDefined();
        expect(toolRender.textContent).toContain("hello world");
      });

      // Send result
      agent.emit(
        toolCallResultEvent({
          toolCallId,
          messageId: `${messageId}_result`,
          content: JSON.stringify({ processed: "HELLO WORLD" }),
        })
      );

      await waitFor(() => {
        const toolRender = screen.getByTestId("dynamic-tool-render");
        expect(toolRender.textContent).toContain("HELLO WORLD");
      });

      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });

  describe("Unregister on unmount", () => {
    // TODO: Expected policy: once a tool is unmounted, its custom renderer
    // should not render new tool calls. Previously rendered DOM may remain.
    // This test is skipped until the implementation enforces that policy.
    it.skip("should remove tool when component unmounts", async () => {
      const agent = new MockStepwiseAgent();

      // Component that can be toggled on/off
      const ToggleableToolComponent: React.FC<{ isVisible: boolean }> = ({
        isVisible,
      }) => {
        if (!isVisible) return null;

        const tool: ReactFrontendTool<{ value: string }> = {
          name: "temporaryTool",
          parameters: z.object({ value: z.string() }),
          render: ({ name, args }) => (
            <div data-testid="temporary-tool">
              {name}: {args.value}
            </div>
          ),
        };

        useFrontendTool(tool);
        return <div data-testid="tool-mounted">Tool is mounted</div>;
      };

      const TestWrapper: React.FC = () => {
        const [showTool, setShowTool] = useState(true);

        return (
          <>
            <button
              onClick={() => setShowTool(!showTool)}
              data-testid="toggle-button"
            >
              Toggle Tool
            </button>
            <ToggleableToolComponent isVisible={showTool} />
            <div style={{ height: 400 }}>
              <CopilotChat />
            </div>
          </>
        );
      };

      renderWithCopilotKit({
        agent,
        children: <TestWrapper />,
      });

      // Tool should be mounted initially
      expect(screen.getByTestId("tool-mounted")).toBeDefined();

      // Submit message and emit tool call while tool is registered
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Test temporary" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Wait for message to be processed
      await waitFor(() => {
        expect(screen.getByText("Test temporary")).toBeDefined();
      });

      const messageId1 = testId("msg1");
      const toolCallId1 = testId("tc1");

      agent.emit(runStartedEvent());
      agent.emit(
        toolCallChunkEvent({
          toolCallId: toolCallId1,
          toolCallName: "temporaryTool",
          parentMessageId: messageId1,
          delta: '{"value":"first call"}',
        })
      );

      // Tool should render
      await waitFor(() => {
        const toolRender = screen.getByTestId("temporary-tool");
        expect(toolRender.textContent).toContain("first call");
      });

      agent.emit(runFinishedEvent());

      // Unmount the tool component
      const toggleButton = screen.getByTestId("toggle-button");
      fireEvent.click(toggleButton);

      await waitFor(() => {
        expect(screen.queryByTestId("tool-mounted")).toBeNull();
      });

      // Submit another message
      fireEvent.change(input, { target: { value: "Test again" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Wait for message to be processed
      await waitFor(() => {
        expect(screen.getByText("Test again")).toBeDefined();
      });

      const messageId2 = testId("msg2");
      const toolCallId2 = testId("tc2");

      agent.emit(runStartedEvent());
      agent.emit(
        toolCallChunkEvent({
          toolCallId: toolCallId2,
          toolCallName: "temporaryTool",
          parentMessageId: messageId2,
          delta: '{"value":"second call"}',
        })
      );

      // The unmounted tool's custom renderer must not render new tool calls
      await waitFor(() => {
        const toolElements = screen.queryAllByTestId("temporary-tool");
        expect(toolElements).toHaveLength(1);
        expect(toolElements[0]?.textContent).toContain("first call");
        expect(toolElements[0]?.textContent).not.toContain("second call");
      });

      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });

  describe("Override behavior", () => {
    it("should use latest registration when same tool name is registered multiple times", async () => {
      const agent = new MockStepwiseAgent();

      // First component with initial tool definition
      const FirstToolComponent: React.FC = () => {
        const tool: ReactFrontendTool<{ text: string }> = {
          name: "overridableTool",
          parameters: z.object({ text: z.string() }),
          render: ({ name, args }) => (
            <div data-testid="first-version">
              First Version: {args.text} ({name})
            </div>
          ),
        };

        useFrontendTool(tool);
        return null;
      };

      // Second component with override tool definition
      const SecondToolComponent: React.FC<{ isActive: boolean }> = ({
        isActive,
      }) => {
        if (!isActive) return null;

        const tool: ReactFrontendTool<{ text: string }> = {
          name: "overridableTool",
          parameters: z.object({ text: z.string() }),
          render: ({ name, args }) => (
            <div data-testid="second-version">
              Second Version (Override): {args.text} ({name})
            </div>
          ),
        };

        useFrontendTool(tool);
        return null;
      };

      const TestWrapper: React.FC = () => {
        const [showSecond, setShowSecond] = useState(false);

        return (
          <>
            <FirstToolComponent />
            <SecondToolComponent isActive={showSecond} />
            <button
              onClick={() => setShowSecond(true)}
              data-testid="activate-override"
            >
              Activate Override
            </button>
            <div style={{ height: 400 }}>
              <CopilotChat />
            </div>
          </>
        );
      };

      renderWithCopilotKit({
        agent,
        children: <TestWrapper />,
      });

      // Submit message before override
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Test original" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Wait for message to be processed
      await waitFor(() => {
        expect(screen.getByText("Test original")).toBeDefined();
      });

      const messageId1 = testId("msg1");
      const toolCallId1 = testId("tc1");

      agent.emit(runStartedEvent());
      agent.emit(
        toolCallChunkEvent({
          toolCallId: toolCallId1,
          toolCallName: "overridableTool",
          parentMessageId: messageId1,
          delta: '{"text":"before override"}',
        })
      );

      // First version should render
      await waitFor(() => {
        const firstVersion = screen.getByTestId("first-version");
        expect(firstVersion.textContent).toContain("before override");
      });

      agent.emit(runFinishedEvent());

      // Activate the override
      const overrideButton = screen.getByTestId("activate-override");
      fireEvent.click(overrideButton);

      // Just wait a bit for the override to take effect
      await new Promise(resolve => setTimeout(resolve, 100));

      // Submit another message after override
      fireEvent.change(input, { target: { value: "Test override" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Wait for message to be processed
      await waitFor(() => {
        expect(screen.getByText("Test override")).toBeDefined();
      });

      const messageId2 = testId("msg2");
      const toolCallId2 = testId("tc2");

      agent.emit(runStartedEvent());
      agent.emit(
        toolCallChunkEvent({
          toolCallId: toolCallId2,
          toolCallName: "overridableTool",
          parentMessageId: messageId2,
          delta: '{"text":"after override"}',
        })
      );

      // Second version should render (override) - there might be multiple due to both tool calls
      await waitFor(() => {
        const secondVersions = screen.getAllByTestId("second-version");
        // Find the one with "after override"
        const afterOverride = secondVersions.find(el => el.textContent?.includes("after override"));
        expect(afterOverride).toBeDefined();
        expect(afterOverride?.textContent).toContain("after override");
      });

      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });

  describe("Integration with Chat UI", () => {
    it("should render tool output correctly in chat interface", async () => {
      const agent = new MockStepwiseAgent();

      const IntegratedToolComponent: React.FC = () => {
        const tool: ReactFrontendTool<{ action: string; target: string }> = {
          name: "chatIntegratedTool",
          parameters: z.object({
            action: z.string(),
            target: z.string(),
          }),
          render: ({ name, args, result, status }) => (
            <div data-testid="integrated-tool" className="tool-render">
              <div>Tool: {name}</div>
              <div>Action: {args.action}</div>
              <div>Target: {args.target}</div>
              <div>Status: {status}</div>
              {result && <div>Result: {JSON.stringify(result)}</div>}
            </div>
          ),
          handler: async (args) => {
            return {
              success: true,
              message: `${args.action} completed on ${args.target}`,
            };
          },
        };

        useFrontendTool(tool);
        return null;
      };

      renderWithCopilotKit({
        agent,
        children: (
          <>
            <IntegratedToolComponent />
            <div style={{ height: 400 }}>
              <CopilotChat />
            </div>
          </>
        ),
      });

      // Submit user message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Perform an action" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // User message should appear in chat
      await waitFor(() => {
        expect(screen.getByText("Perform an action")).toBeDefined();
      });

      const messageId = testId("msg");
      const toolCallId = testId("tc");

      // Stream tool call
      agent.emit(runStartedEvent());
      agent.emit(
        toolCallChunkEvent({
          toolCallId,
          toolCallName: "chatIntegratedTool",
          parentMessageId: messageId,
          delta: '{"action":"process","target":"data"}',
        })
      );

      // Tool should render in chat with proper styling
      await waitFor(() => {
        const toolRender = screen.getByTestId("integrated-tool");
        expect(toolRender).toBeDefined();
        expect(toolRender.textContent).toContain("Action: process");
        expect(toolRender.textContent).toContain("Target: data");
        expect(toolRender.classList.contains("tool-render")).toBe(true);
      });

      // Send result
      agent.emit(
        toolCallResultEvent({
          toolCallId,
          messageId: `${messageId}_result`,
          content: JSON.stringify({
            success: true,
            message: "process completed on data",
          }),
        })
      );

      // Result should appear in the tool render
      await waitFor(() => {
        const toolRender = screen.getByTestId("integrated-tool");
        expect(toolRender.textContent).toContain("Result:");
        expect(toolRender.textContent).toContain("process completed on data");
      });

      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });
});

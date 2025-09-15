import React, { useEffect, useState, useReducer } from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { z } from "zod";
import { useFrontendTool } from "../use-frontend-tool";
import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { ReactFrontendTool } from "@/types";
import { CopilotChat } from "@/components/chat/CopilotChat";
import CopilotChatToolCallsView from "@/components/chat/CopilotChatToolCallsView";
import { AssistantMessage, Message, ToolMessage } from "@ag-ui/core";
import {
  AbstractAgent,
  EventType,
  type BaseEvent,
  type RunAgentInput,
} from "@ag-ui/client";
import { Observable } from "rxjs";
import {
  MockStepwiseAgent,
  renderWithCopilotKit,
  runStartedEvent,
  runFinishedEvent,
  toolCallChunkEvent,
  toolCallResultEvent,
  testId,
  waitForReactUpdate,
} from "@/__tests__/utils/test-helpers";

describe("useFrontendTool E2E - Dynamic Registration", () => {
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

  describe("Debug: Tool removal", () => {
    it("Debug logging test", async () => {
      const TestComponent: React.FC = () => {
        const tool: ReactFrontendTool<{ value: string }> = {
          name: "debugTool",
          parameters: z.object({ value: z.string() }),
          handler: async ({ value }) => `handled ${value}`,
        };
        
        useFrontendTool(tool);
        console.log(`[TestComponent] Component mounted with tool`);
        
        useEffect(() => {
          return () => {
            console.log(`[TestComponent] Component unmounting`);
          };
        }, []);
        
        return <div data-testid="debug-component">Component</div>;
      };
      
      const Wrapper: React.FC = () => {
        const [show, setShow] = useState(true);
        const [, forceUpdate] = useReducer(x => x + 1, 0);
        const { copilotkit } = useCopilotKit();
        
        // Force re-render every 50ms to see tool status changes
        useEffect(() => {
          const interval = setInterval(() => forceUpdate(), 50);
          return () => clearInterval(interval);
        }, []);
        
        const toolExists = "debugTool" in copilotkit.tools;
        console.log(`[Wrapper] Tool exists: ${toolExists}, All tools:`, Object.keys(copilotkit.tools));
        
        return (
          <>
            <button onClick={() => setShow(false)} data-testid="hide">Hide</button>
            {show && <TestComponent />}
            <div data-testid="tool-status">
              {toolExists ? "exists" : "not exists"}
            </div>
          </>
        );
      };
      
      renderWithCopilotKit({ children: <Wrapper /> });
      
      // Wait for initial render
      await waitFor(() => {
        expect(screen.getByTestId("debug-component")).toBeDefined();
      });
      
      // Check initial state
      await waitFor(() => {
        expect(screen.getByTestId("tool-status").textContent).toBe("exists");
      });
      
      // Hide the component
      fireEvent.click(screen.getByTestId("hide"));
      
      // Wait for component to unmount
      await waitFor(() => {
        expect(screen.queryByTestId("debug-component")).toBeNull();
      });
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if tool was removed
      const status = screen.getByTestId("tool-status").textContent;
      console.log("Final tool status:", status);
      expect(status).toBe("not exists");
    });
  });

  // Removed - this test was revealing implementation details that are covered by the more comprehensive test below

  describe("Unmount disables handler, render persists", () => {
    it("Tool is properly removed from copilotkit.tools after component unmounts", async () => {
      // A deterministic agent that emits a single tool call per run and finishes
      class OneShotToolCallAgent extends AbstractAgent {
        private runCount = 0;
        clone(): OneShotToolCallAgent {
          // Keep state across runs so the second run emits different args
          return this;
        }
        protected run(_input: RunAgentInput): Observable<BaseEvent> {
          return new Observable<BaseEvent>((observer) => {
            const messageId = testId("m");
            const toolCallId = testId("tc");
            this.runCount += 1;
            const valueArg = this.runCount === 1 ? "first call" : "second call";
            observer.next({ type: EventType.RUN_STARTED } as BaseEvent);
            observer.next({
              type: EventType.TOOL_CALL_CHUNK,
              toolCallId,
              toolCallName: "temporaryTool",
              parentMessageId: messageId,
              delta: JSON.stringify({ value: valueArg }),
            } as BaseEvent);
            observer.next({ type: EventType.RUN_FINISHED } as BaseEvent);
            observer.complete();
            return () => {};
          });
        }
      }

      const agent = new OneShotToolCallAgent();
      let handlerCalls = 0;

      // Component that can be toggled on/off
      const ToggleableToolComponent: React.FC = () => {
        const tool: ReactFrontendTool<{ value: string }> = {
          name: "temporaryTool",
          parameters: z.object({ value: z.string() }),
          followUp: false,
          handler: async ({ value }) => {
            handlerCalls += 1;
            return `HANDLED ${value.toUpperCase()}`;
          },
          render: ({ name, args, result, status }) => (
            <div data-testid="temporary-tool">
              {name}: {args.value} | Status: {status} | Result:{" "}
              {String(result ?? "")}
            </div>
          ),
        };
        useFrontendTool(tool);
        return <div data-testid="tool-mounted">Tool is mounted</div>;
      };


      // Component to check if tool exists in copilotkit
      const ToolChecker: React.FC = () => {
        const { copilotkit } = useCopilotKit();
        const hasTemporaryTool = "temporaryTool" in copilotkit.tools;
        const [renderCount, setRenderCount] = useState(0);
        
        useEffect(() => {
          setRenderCount(c => c + 1);
        });
        
        console.log(`[ToolChecker] Render #${renderCount + 1}, temporaryTool exists:`, hasTemporaryTool);
        console.log(`[ToolChecker] All tools:`, Object.keys(copilotkit.tools));
        
        return (
          <div data-testid="tool-in-copilotkit">
            {hasTemporaryTool ? "Tool exists in copilotkit" : "Tool NOT in copilotkit"}
            <span data-testid="render-count"> (render #{renderCount + 1})</span>
          </div>
        );
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
            {showTool && <ToggleableToolComponent />}
            <ToolChecker />
            <div style={{ height: 400 }}>
              <CopilotChat />
            </div>
          </>
        );
      };

      renderWithCopilotKit({ agent, children: <TestWrapper /> });

      // Tool should be mounted initially
      expect(screen.getByTestId("tool-mounted")).toBeDefined();
      await waitFor(() => {
        expect(screen.getByTestId("tool-in-copilotkit").textContent).toBe("Tool exists in copilotkit");
      });

      // Run 1: submit a message to trigger agent run with "first call"
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Trigger 1" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // The tool should render and handler should have produced a result
      await waitFor(() => {
        const toolRender = screen.getByTestId("temporary-tool");
        expect(toolRender.textContent).toContain("first call");
        expect(toolRender.textContent).toContain("HANDLED FIRST CALL");
        expect(handlerCalls).toBe(1);
      });

      // Unmount the tool component (removes handler but keeps renderer via hook policy)
      fireEvent.click(screen.getByTestId("toggle-button"));
      await waitFor(() => {
        expect(screen.queryByTestId("tool-mounted")).toBeNull();
      });

      // Wait a bit longer to ensure the unmount effect has fully completed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify the tool has been removed from copilotkit
      const toolStatus = screen.getByTestId("tool-in-copilotkit").textContent;
      console.log("Tool status after unmount:", toolStatus);
      
      // THIS IS THE BUG: The tool should be removed but it's still there
      expect(toolStatus).toBe("Tool NOT in copilotkit"); // This will fail, showing the bug

      // Run 2: trigger agent again with "second call"
      fireEvent.change(input, { target: { value: "Trigger 2" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // The renderer should still render with new args, but no handler result should be produced
      await waitFor(() => {
        const toolRender = screen.getAllByTestId("temporary-tool");
        // There will be two renders in the chat history; check the last one
        const last = toolRender[toolRender.length - 1];
        console.log("Second tool render content:", last?.textContent);
        console.log("Handler calls count:", handlerCalls);
        expect(last?.textContent).toContain("second call");
        // The handler should not have been called a second time
        expect(handlerCalls).toBe(1);
      });
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
      await new Promise((resolve) => setTimeout(resolve, 100));

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
        const afterOverride = secondVersions.find((el) =>
          el.textContent?.includes("after override")
        );
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

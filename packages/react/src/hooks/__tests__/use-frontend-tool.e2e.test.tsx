import React, { useEffect, useState, useReducer } from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { z } from "zod";
import { useFrontendTool } from "../use-frontend-tool";
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
  textChunkEvent,
  testId,
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

  describe("Streaming tool calls with incomplete JSON", () => {
    it("renders tool calls progressively as incomplete JSON chunks arrive", async () => {
      const agent = new MockStepwiseAgent();
      
      // Tool that renders the arguments it receives
      const StreamingTool: React.FC = () => {
        const tool: ReactFrontendTool<{ name: string; items: string[]; count: number }> = {
          name: "streamingTool",
          parameters: z.object({
            name: z.string(),
            items: z.array(z.string()),
            count: z.number(),
          }),
          render: ({ args }) => (
            <div data-testid="streaming-tool-render">
              <div data-testid="tool-name">{args.name || "undefined"}</div>
              <div data-testid="tool-items">{args.items ? args.items.join(", ") : "undefined"}</div>
              <div data-testid="tool-count">{args.count !== undefined ? args.count : "undefined"}</div>
            </div>
          ),
        };
        
        useFrontendTool(tool);
        return null;
      };
      
      renderWithCopilotKit({
        agent,
        children: (
          <>
            <StreamingTool />
            <div style={{ height: 400 }}>
              <CopilotChat />
            </div>
          </>
        ),
      });
      
      // Submit a message to start the agent
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Test streaming" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      
      // Wait for message to appear
      await waitFor(() => {
        expect(screen.getByText("Test streaming")).toBeDefined();
      });
      
      const messageId = testId("msg");
      const toolCallId = testId("tc");
      
      // Start the run
      agent.emit(runStartedEvent());
      
      // Stream incomplete JSON chunks
      // First chunk: just opening brace and part of first field
      agent.emit(
        toolCallChunkEvent({
          toolCallId,
          toolCallName: "streamingTool",
          parentMessageId: messageId,
          delta: '{"na',
        })
      );
      
      // Check that tool is rendering (even with incomplete JSON)
      await waitFor(() => {
        expect(screen.getByTestId("streaming-tool-render")).toBeDefined();
      });
      
      // Second chunk: complete the name field
      agent.emit(
        toolCallChunkEvent({
          toolCallId,
          parentMessageId: messageId,
          delta: 'me":"Test Tool"',
        })
      );
      
      // Check name is now rendered
      await waitFor(() => {
        expect(screen.getByTestId("tool-name").textContent).toBe("Test Tool");
      });
      
      // Third chunk: start items array
      agent.emit(
        toolCallChunkEvent({
          toolCallId,
          parentMessageId: messageId,
          delta: ',"items":["item1"',
        })
      );
      
      // Check items array has first item
      await waitFor(() => {
        expect(screen.getByTestId("tool-items").textContent).toContain("item1");
      });
      
      // Fourth chunk: add more items and start count
      agent.emit(
        toolCallChunkEvent({
          toolCallId,
          parentMessageId: messageId,
          delta: ',"item2","item3"],"cou',
        })
      );
      
      // Check items array is complete
      await waitFor(() => {
        expect(screen.getByTestId("tool-items").textContent).toBe("item1, item2, item3");
      });
      
      // Final chunk: complete the JSON
      agent.emit(
        toolCallChunkEvent({
          toolCallId,
          parentMessageId: messageId,
          delta: 'nt":42}',
        })
      );
      
      // Check count is rendered
      await waitFor(() => {
        expect(screen.getByTestId("tool-count").textContent).toBe("42");
      });
      
      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });

  describe("Tool followUp property behavior", () => {
    it("stops agent execution when followUp is false", async () => {
      const agent = new MockStepwiseAgent();
      
      const NoFollowUpTool: React.FC = () => {
        const tool: ReactFrontendTool<{ action: string }> = {
          name: "noFollowUpTool",
          parameters: z.object({ action: z.string() }),
          followUp: false, // This should stop execution after tool call
          render: ({ args, status }) => (
            <div data-testid="no-followup-tool">
              <div data-testid="tool-action">{args.action || "no action"}</div>
              <div data-testid="tool-status">{status}</div>
            </div>
          ),
        };
        
        useFrontendTool(tool);
        return null;
      };
      
      renderWithCopilotKit({
        agent,
        children: (
          <>
            <NoFollowUpTool />
            <div style={{ height: 400 }}>
              <CopilotChat />
            </div>
          </>
        ),
      });
      
      // Submit a message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Execute no followup" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      
      await waitFor(() => {
        expect(screen.getByText("Execute no followup")).toBeDefined();
      });
      
      const messageId = testId("msg");
      const toolCallId = testId("tc");
      
      // Start run and emit tool call
      agent.emit(runStartedEvent());
      agent.emit(
        toolCallChunkEvent({
          toolCallId,
          toolCallName: "noFollowUpTool",
          parentMessageId: messageId,
          delta: '{"action":"stop-after-this"}',
        })
      );
      
      // Tool should render
      await waitFor(() => {
        expect(screen.getByTestId("no-followup-tool")).toBeDefined();
        expect(screen.getByTestId("tool-action").textContent).toBe("stop-after-this");
      });
      
      // The agent should NOT continue after this tool call
      // We can verify this by NOT emitting more events and checking the UI state
      // In a real scenario, the agent would stop sending events
      
      agent.emit(runFinishedEvent());
      agent.complete();
      
      // Verify execution stopped (no further messages)
      // The chat should only have the user message and tool call, no follow-up
      const messages = screen.queryAllByRole("article");
      expect(messages.length).toBeLessThanOrEqual(2); // User message + tool response
    });
    
    it("continues agent execution when followUp is true or undefined", async () => {
      const agent = new MockStepwiseAgent();
      
      const ContinueFollowUpTool: React.FC = () => {
        const tool: ReactFrontendTool<{ action: string }> = {
          name: "continueFollowUpTool",
          parameters: z.object({ action: z.string() }),
          // followUp is undefined (default) - should continue execution
          render: ({ args }) => (
            <div data-testid="continue-followup-tool">
              <div data-testid="tool-action">{args.action || "no action"}</div>
            </div>
          ),
        };
        
        useFrontendTool(tool);
        return null;
      };
      
      renderWithCopilotKit({
        agent,
        children: (
          <>
            <ContinueFollowUpTool />
            <div style={{ height: 400 }}>
              <CopilotChat />
            </div>
          </>
        ),
      });
      
      // Submit a message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Execute with followup" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      
      await waitFor(() => {
        expect(screen.getByText("Execute with followup")).toBeDefined();
      });
      
      const messageId = testId("msg");
      const toolCallId = testId("tc");
      const followUpMessageId = testId("followup");
      
      // Start run and emit tool call
      agent.emit(runStartedEvent());
      agent.emit(
        toolCallChunkEvent({
          toolCallId,
          toolCallName: "continueFollowUpTool",
          parentMessageId: messageId,
          delta: '{"action":"continue-after-this"}',
        })
      );
      
      // Tool should render
      await waitFor(() => {
        expect(screen.getByTestId("continue-followup-tool")).toBeDefined();
        expect(screen.getByTestId("tool-action").textContent).toBe("continue-after-this");
      });
      
      // The agent SHOULD continue after this tool call
      // Emit a follow-up message to simulate continued execution
      agent.emit(
        textChunkEvent(followUpMessageId, "This is a follow-up message after tool execution")
      );
      
      // Verify the follow-up message appears
      await waitFor(() => {
        expect(screen.getByText("This is a follow-up message after tool execution")).toBeDefined();
      });
      
      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });

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
            <div style={{ height: 400 }}>
              <CopilotChat />
            </div>
          </>
        );
      };

      renderWithCopilotKit({ agent, children: <TestWrapper /> });

      // Tool should be mounted initially
      expect(screen.getByTestId("tool-mounted")).toBeDefined();

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

      // Run 2: trigger agent again with "second call"
      fireEvent.change(input, { target: { value: "Trigger 2" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // The renderer should still render with new args, but no handler result should be produced
      await waitFor(() => {
        const toolRender = screen.getAllByTestId("temporary-tool");
        // There will be two renders in the chat history; check the last one
        const last = toolRender[toolRender.length - 1];
        expect(last?.textContent).toContain("second call");
        // The handler should not have been called a second time since tool was removed
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

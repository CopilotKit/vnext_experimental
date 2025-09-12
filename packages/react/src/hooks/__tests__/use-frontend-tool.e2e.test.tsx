import React, { useEffect, useState } from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { z } from "zod";
import { useFrontendTool } from "../use-frontend-tool";
import { ReactFrontendTool } from "@/types";
import {
  MockStepwiseAgent,
  renderWithCopilotKit,
  runStartedEvent,
  runFinishedEvent,
  toolCallChunkEvent,
  toolCallResultEvent,
  testId,
  waitForReactUpdate,
} from "@/__tests__/utils/test-helpers.tsx";

describe("useFrontendTool E2E - Dynamic Registration", () => {
  describe("Register at runtime", () => {
    it("should register tool dynamically after provider is mounted", async () => {
      const agent = new MockStepwiseAgent();
      
      // Component that registers a tool after mount
      const DynamicToolComponent: React.FC = () => {
        const [isRegistered, setIsRegistered] = useState(false);
        
        useEffect(() => {
          // Register after a delay to simulate dynamic registration
          const timer = setTimeout(() => {
            setIsRegistered(true);
          }, 100);
          return () => clearTimeout(timer);
        }, []);
        
        // Only use the hook when isRegistered is true
        if (isRegistered) {
          const tool: ReactFrontendTool = {
            name: "dynamicTool",
            parameters: z.object({ message: z.string() }),
            render: ({ args, result }) => (
              <div data-testid="dynamic-tool-render">
                Dynamic Tool: {args.message} | Result: {result ? JSON.stringify(result) : "pending"}
              </div>
            ),
            handler: async (args) => {
              return { processed: args.message.toUpperCase() };
            },
          };
          
          useFrontendTool(tool);
        }
        
        return <div data-testid="dynamic-status">{isRegistered ? "Registered" : "Not registered"}</div>;
      };
      
      const { container } = renderWithCopilotKit({
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
      
      // Import CopilotChat after other imports to avoid circular dependency
      const { CopilotChat } = await import("@/components/chat/CopilotChat");
      
      // Initially not registered
      expect(screen.getByTestId("dynamic-status").textContent).toBe("Not registered");
      
      // Wait for dynamic registration
      await waitFor(() => {
        expect(screen.getByTestId("dynamic-status").textContent).toBe("Registered");
      });
      
      // Submit a message that will trigger the dynamically registered tool
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Use dynamic tool" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      
      await waitForReactUpdate(100);
      
      const messageId = testId("msg");
      const toolCallId = testId("tc");
      
      // Emit tool call for the dynamically registered tool
      agent.emit(runStartedEvent());
      agent.emit(toolCallChunkEvent({
        toolCallId,
        toolCallName: "dynamicTool",
        parentMessageId: messageId,
        delta: '{"message":"hello world"}',
      }));
      
      // The dynamically registered renderer should appear
      await waitFor(() => {
        const toolRender = screen.getByTestId("dynamic-tool-render");
        expect(toolRender).toBeDefined();
        expect(toolRender.textContent).toContain("hello world");
      });
      
      // Send result
      agent.emit(toolCallResultEvent({
        toolCallId,
        messageId: `${messageId}_result`,
        content: JSON.stringify({ processed: "HELLO WORLD" }),
      }));
      
      await waitFor(() => {
        const toolRender = screen.getByTestId("dynamic-tool-render");
        expect(toolRender.textContent).toContain("HELLO WORLD");
      });
      
      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });
  
  describe("Unregister on unmount", () => {
    it("should remove tool when component unmounts", async () => {
      const agent = new MockStepwiseAgent();
      
      // Component that can be toggled on/off
      const ToggleableToolComponent: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
        if (!isVisible) return null;
        
        const tool: ReactFrontendTool = {
          name: "temporaryTool",
          parameters: z.object({ value: z.string() }),
          render: ({ args }) => (
            <div data-testid="temporary-tool">
              Temporary: {args.value}
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
            <button onClick={() => setShowTool(!showTool)} data-testid="toggle-button">
              Toggle Tool
            </button>
            <ToggleableToolComponent isVisible={showTool} />
            <div style={{ height: 400 }}>
              <CopilotChat />
            </div>
          </>
        );
      };
      
      const { CopilotChat } = await import("@/components/chat/CopilotChat");
      
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
      
      await waitForReactUpdate(100);
      
      const messageId1 = testId("msg1");
      const toolCallId1 = testId("tc1");
      
      agent.emit(runStartedEvent());
      agent.emit(toolCallChunkEvent({
        toolCallId: toolCallId1,
        toolCallName: "temporaryTool",
        parentMessageId: messageId1,
        delta: '{"value":"first call"}',
      }));
      
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
      
      await waitForReactUpdate(100);
      
      const messageId2 = testId("msg2");
      const toolCallId2 = testId("tc2");
      
      agent.emit(runStartedEvent());
      agent.emit(toolCallChunkEvent({
        toolCallId: toolCallId2,
        toolCallName: "temporaryTool",
        parentMessageId: messageId2,
        delta: '{"value":"second call"}',
      }));
      
      // Tool should NOT render (or wildcard should take over if present)
      // Since no wildcard is registered, the tool won't render
      await waitForReactUpdate(100);
      expect(screen.queryByTestId("temporary-tool")).toBeNull();
      
      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });
  
  describe("Override behavior", () => {
    it("should use latest registration when same tool name is registered multiple times", async () => {
      const agent = new MockStepwiseAgent();
      
      // First component with initial tool definition
      const FirstToolComponent: React.FC = () => {
        const tool: ReactFrontendTool = {
          name: "overridableTool",
          parameters: z.object({ text: z.string() }),
          render: ({ args }) => (
            <div data-testid="first-version">
              First Version: {args.text}
            </div>
          ),
        };
        
        useFrontendTool(tool);
        return null;
      };
      
      // Second component with override tool definition
      const SecondToolComponent: React.FC<{ isActive: boolean }> = ({ isActive }) => {
        if (!isActive) return null;
        
        const tool: ReactFrontendTool = {
          name: "overridableTool",
          parameters: z.object({ text: z.string() }),
          render: ({ args }) => (
            <div data-testid="second-version">
              Second Version (Override): {args.text}
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
            <button onClick={() => setShowSecond(true)} data-testid="activate-override">
              Activate Override
            </button>
            <div style={{ height: 400 }}>
              <CopilotChat />
            </div>
          </>
        );
      };
      
      const { CopilotChat } = await import("@/components/chat/CopilotChat");
      
      renderWithCopilotKit({
        agent,
        children: <TestWrapper />,
      });
      
      // Submit message before override
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Test original" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      
      await waitForReactUpdate(100);
      
      const messageId1 = testId("msg1");
      const toolCallId1 = testId("tc1");
      
      agent.emit(runStartedEvent());
      agent.emit(toolCallChunkEvent({
        toolCallId: toolCallId1,
        toolCallName: "overridableTool",
        parentMessageId: messageId1,
        delta: '{"text":"before override"}',
      }));
      
      // First version should render
      await waitFor(() => {
        const firstVersion = screen.getByTestId("first-version");
        expect(firstVersion.textContent).toContain("before override");
      });
      
      agent.emit(runFinishedEvent());
      
      // Activate the override
      const overrideButton = screen.getByTestId("activate-override");
      fireEvent.click(overrideButton);
      
      await waitForReactUpdate(100);
      
      // Submit another message after override
      fireEvent.change(input, { target: { value: "Test override" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      
      await waitForReactUpdate(100);
      
      const messageId2 = testId("msg2");
      const toolCallId2 = testId("tc2");
      
      agent.emit(runStartedEvent());
      agent.emit(toolCallChunkEvent({
        toolCallId: toolCallId2,
        toolCallName: "overridableTool",
        parentMessageId: messageId2,
        delta: '{"text":"after override"}',
      }));
      
      // Second version should render (override)
      await waitFor(() => {
        const secondVersion = screen.getByTestId("second-version");
        expect(secondVersion.textContent).toContain("after override");
      });
      
      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });
  
  describe("Integration with Chat UI", () => {
    it("should render tool output correctly in chat interface", async () => {
      const agent = new MockStepwiseAgent();
      
      const IntegratedToolComponent: React.FC = () => {
        const tool: ReactFrontendTool = {
          name: "chatIntegratedTool",
          parameters: z.object({
            action: z.string(),
            target: z.string(),
          }),
          render: ({ args, result, status }) => (
            <div data-testid="integrated-tool" className="tool-render">
              <div>Action: {args.action}</div>
              <div>Target: {args.target}</div>
              <div>Status: {status}</div>
              {result && <div>Result: {JSON.stringify(result)}</div>}
            </div>
          ),
          handler: async (args) => {
            return { success: true, message: `${args.action} completed on ${args.target}` };
          },
        };
        
        useFrontendTool(tool);
        return null;
      };
      
      const { CopilotChat } = await import("@/components/chat/CopilotChat");
      
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
      
      await waitForReactUpdate(100);
      
      const messageId = testId("msg");
      const toolCallId = testId("tc");
      
      // Stream tool call
      agent.emit(runStartedEvent());
      agent.emit(toolCallChunkEvent({
        toolCallId,
        toolCallName: "chatIntegratedTool",
        parentMessageId: messageId,
        delta: '{"action":"process","target":"data"}',
      }));
      
      // Tool should render in chat with proper styling
      await waitFor(() => {
        const toolRender = screen.getByTestId("integrated-tool");
        expect(toolRender).toBeDefined();
        expect(toolRender.textContent).toContain("Action: process");
        expect(toolRender.textContent).toContain("Target: data");
        expect(toolRender.classList.contains("tool-render")).toBe(true);
      });
      
      // Send result
      agent.emit(toolCallResultEvent({
        toolCallId,
        messageId: `${messageId}_result`,
        content: JSON.stringify({ 
          success: true, 
          message: "process completed on data" 
        }),
      }));
      
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
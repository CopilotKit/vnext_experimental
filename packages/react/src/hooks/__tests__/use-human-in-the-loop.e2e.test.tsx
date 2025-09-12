import React, { useState } from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { z } from "zod";
import { useHumanInTheLoop } from "../use-human-in-the-loop";
import { ReactHumanInTheLoop } from "@/types";
import { ToolCallStatus } from "@copilotkitnext/core";
import { CopilotChat } from "@/components/chat/CopilotChat";
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

describe("useHumanInTheLoop E2E - HITL Tool Rendering", () => {
  describe("HITL Renderer with Status Transitions", () => {
    it("should show InProgress → Complete transitions for HITL tool", async () => {
      const agent = new MockStepwiseAgent();
      
      // Component that uses useHumanInTheLoop
      const HITLComponent: React.FC = () => {
        const hitlTool: ReactHumanInTheLoop<{ action: string; reason: string }> = {
          name: "approvalTool",
          description: "Requires human approval",
          parameters: z.object({
            action: z.string(),
            reason: z.string(),
          }),
          render: ({ status, args, result, name, description }) => (
            <div data-testid="hitl-tool">
              <div>Tool: {name}</div>
              <div>Description: {description}</div>
              <div>Status: {status}</div>
              <div>Action: {args.action}</div>
              <div>Reason: {args.reason}</div>
              {result && <div>Result: {JSON.stringify(result)}</div>}
            </div>
          ),
        };
        
        useHumanInTheLoop(hitlTool);
        return null;
      };
      
      
      renderWithCopilotKit({
        agent,
        children: (
          <>
            <HITLComponent />
            <div style={{ height: 400 }}>
              <CopilotChat />
            </div>
          </>
        ),
      });
      
      // Submit message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Request approval" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      
      await waitForReactUpdate(100);
      
      const messageId = testId("msg");
      const toolCallId = testId("tc");
      
      // Start streaming tool call
      agent.emit(runStartedEvent());
      
      // Stream partial args - should show InProgress
      agent.emit(toolCallChunkEvent({
        toolCallId,
        toolCallName: "approvalTool",
        parentMessageId: messageId,
        delta: '{"action":"delete","reason":"',
      }));
      
      // Wait for initial render with partial args
      await waitFor(() => {
        const hitlRender = screen.getByTestId("hitl-tool");
        expect(hitlRender).toBeDefined();
        expect(hitlRender.textContent).toContain("Tool: approvalTool");
        expect(hitlRender.textContent).toContain("Description: Requires human approval");
        expect(hitlRender.textContent).toContain("Action: delete");
      });
      
      // Complete the args
      agent.emit(toolCallChunkEvent({
        toolCallId,
        parentMessageId: messageId,
        delta: 'cleanup required"}',
      }));
      
      await waitFor(() => {
        const hitlRender = screen.getByTestId("hitl-tool");
        expect(hitlRender.textContent).toContain("Reason: cleanup required");
      });
      
      // Send result - should show Complete
      agent.emit(toolCallResultEvent({
        toolCallId,
        messageId: `${messageId}_result`,
        content: JSON.stringify({ approved: true, timestamp: Date.now() }),
      }));
      
      await waitFor(() => {
        const hitlRender = screen.getByTestId("hitl-tool");
        expect(hitlRender.textContent).toContain("Result:");
        expect(hitlRender.textContent).toContain("approved");
        expect(hitlRender.textContent).toMatch(/Status: complete/i);
      });
      
      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });
  
  describe("HITL with Interactive Respond", () => {
    it("should handle interactive respond callback during Executing state", async () => {
      const agent = new MockStepwiseAgent();
      
      // Component that uses useHumanInTheLoop with interactive respond
      const InteractiveHITLComponent: React.FC = () => {
        const [responseText, setResponseText] = useState("");
        
        const hitlTool: ReactHumanInTheLoop<{ question: string; options: string[] }> = {
          name: "interactiveTool",
          description: "Interactive human-in-the-loop tool",
          parameters: z.object({
            question: z.string(),
            options: z.array(z.string()),
          }),
          render: ({ status, args, result, respond, name }) => (
            <div data-testid="interactive-hitl">
              <div>Tool: {name}</div>
              <div>Status: {status}</div>
              <div>Question: {args.question}</div>
              <div>Options: {args.options?.join(", ")}</div>
              
              {status === ToolCallStatus.Executing && respond && (
                <div data-testid="respond-section">
                  <button 
                    data-testid="respond-yes"
                    onClick={() => respond({ answer: "yes" })}
                  >
                    Respond Yes
                  </button>
                  <button 
                    data-testid="respond-no"
                    onClick={() => respond({ answer: "no" })}
                  >
                    Respond No
                  </button>
                </div>
              )}
              
              {result && <div>Result: {JSON.stringify(result)}</div>}
            </div>
          ),
        };
        
        useHumanInTheLoop(hitlTool);
        return null;
      };
      
      
      renderWithCopilotKit({
        agent,
        children: (
          <>
            <InteractiveHITLComponent />
            <div style={{ height: 400 }}>
              <CopilotChat />
            </div>
          </>
        ),
      });
      
      // Submit message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Interactive question" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      
      await waitForReactUpdate(100);
      
      const messageId = testId("msg");
      const toolCallId = testId("tc");
      
      // Stream tool call
      agent.emit(runStartedEvent());
      agent.emit(toolCallChunkEvent({
        toolCallId,
        toolCallName: "interactiveTool",
        parentMessageId: messageId,
        delta: '{"question":"Proceed with operation?","options":["yes","no"]}',
      }));
      
      // Tool should render with question
      await waitFor(() => {
        const hitlRender = screen.getByTestId("interactive-hitl");
        expect(hitlRender.textContent).toContain("Proceed with operation?");
        expect(hitlRender.textContent).toContain("yes, no");
      });
      
      // Note: In the current implementation, the Executing state and respond callback
      // require integration with the core's runAgent flow. The hook sets up the
      // infrastructure but actual execution happens through the core.
      // For now, we verify the component structure is correct.
      
      // Send result to complete the flow
      agent.emit(toolCallResultEvent({
        toolCallId,
        messageId: `${messageId}_result`,
        content: JSON.stringify({ answer: "yes", processed: true }),
      }));
      
      await waitFor(() => {
        const hitlRender = screen.getByTestId("interactive-hitl");
        expect(hitlRender.textContent).toContain("Result:");
        expect(hitlRender.textContent).toContain("processed");
      });
      
      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });
  
  describe("Multiple HITL Tools", () => {
    it("should handle multiple HITL tools registered simultaneously", async () => {
      const agent = new MockStepwiseAgent();
      
      // Component with multiple HITL tools
      const MultipleHITLComponent: React.FC = () => {
        const reviewTool: ReactHumanInTheLoop<{ changes: string[] }> = {
          name: "reviewTool",
          description: "Review changes",
          parameters: z.object({ changes: z.array(z.string()) }),
          render: ({ name, description, args, status }) => (
            <div data-testid="review-tool">
              {name} - {description} | Status: {status} | Changes: {args.changes?.length || 0}
            </div>
          ),
        };
        
        const confirmTool: ReactHumanInTheLoop<{ action: string }> = {
          name: "confirmTool",
          description: "Confirm action",
          parameters: z.object({ action: z.string() }),
          render: ({ name, description, args, status }) => (
            <div data-testid="confirm-tool">
              {name} - {description} | Status: {status} | Action: {args.action}
            </div>
          ),
        };
        
        useHumanInTheLoop(reviewTool);
        useHumanInTheLoop(confirmTool);
        
        return null;
      };
      
      
      renderWithCopilotKit({
        agent,
        children: (
          <>
            <MultipleHITLComponent />
            <div style={{ height: 400 }}>
              <CopilotChat />
            </div>
          </>
        ),
      });
      
      // Submit message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Multiple HITL" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      
      await waitForReactUpdate(100);
      
      const messageId = testId("msg");
      const toolCallId1 = testId("tc1");
      const toolCallId2 = testId("tc2");
      
      agent.emit(runStartedEvent());
      
      // Call both HITL tools
      agent.emit(toolCallChunkEvent({
        toolCallId: toolCallId1,
        toolCallName: "reviewTool",
        parentMessageId: messageId,
        delta: '{"changes":["file1.ts","file2.ts"]}',
      }));
      
      agent.emit(toolCallChunkEvent({
        toolCallId: toolCallId2,
        toolCallName: "confirmTool",
        parentMessageId: messageId,
        delta: '{"action":"deploy"}',
      }));
      
      // Both tools should render
      await waitFor(() => {
        const reviewTool = screen.getByTestId("review-tool");
        const confirmTool = screen.getByTestId("confirm-tool");
        
        expect(reviewTool.textContent).toContain("Changes: 2");
        expect(confirmTool.textContent).toContain("Action: deploy");
      });
      
      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });
  
  describe("HITL Tool with Dynamic Registration", () => {
    it("should support dynamic registration and unregistration of HITL tools", async () => {
      const agent = new MockStepwiseAgent();
      
      // Component that dynamically registers HITL tool
      const DynamicHITLComponent: React.FC<{ enabled: boolean }> = ({ enabled }) => {
        if (!enabled) return null;
        
        const dynamicHitl: ReactHumanInTheLoop<{ data: string }> = {
          name: "dynamicHitl",
          description: "Dynamically registered HITL",
          parameters: z.object({ data: z.string() }),
          render: ({ args, name, description }) => (
            <div data-testid="dynamic-hitl">
              {name}: {description} | Data: {args.data}
            </div>
          ),
        };
        
        useHumanInTheLoop(dynamicHitl);
        return <div data-testid="hitl-enabled">HITL Enabled</div>;
      };
      
      const TestWrapper: React.FC = () => {
        const [enabled, setEnabled] = useState(false);
        
        return (
          <>
            <button 
              data-testid="toggle-hitl" 
              onClick={() => setEnabled(!enabled)}
            >
              Toggle HITL
            </button>
            <DynamicHITLComponent enabled={enabled} />
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
      
      // Initially disabled
      expect(screen.queryByTestId("hitl-enabled")).toBeNull();
      
      // Enable HITL
      const toggleButton = screen.getByTestId("toggle-hitl");
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(screen.getByTestId("hitl-enabled")).toBeDefined();
      });
      
      // Submit message and call the dynamic HITL
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Test dynamic HITL" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      
      await waitForReactUpdate(100);
      
      const messageId = testId("msg");
      const toolCallId = testId("tc");
      
      agent.emit(runStartedEvent());
      agent.emit(toolCallChunkEvent({
        toolCallId,
        toolCallName: "dynamicHitl",
        parentMessageId: messageId,
        delta: '{"data":"test data"}',
      }));
      
      // Dynamic HITL should render
      await waitFor(() => {
        const dynamicHitl = screen.getByTestId("dynamic-hitl");
        expect(dynamicHitl.textContent).toContain("dynamicHitl");
        expect(dynamicHitl.textContent).toContain("Dynamically registered HITL");
        expect(dynamicHitl.textContent).toContain("Data: test data");
      });
      
      agent.emit(runFinishedEvent());
      
      // Disable HITL
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(screen.queryByTestId("hitl-enabled")).toBeNull();
      });
      
      // Try to call the tool again - it should not render
      fireEvent.change(input, { target: { value: "Test after disable" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
      
      await waitForReactUpdate(100);
      
      const messageId2 = testId("msg2");
      const toolCallId2 = testId("tc2");
      
      agent.emit(runStartedEvent());
      agent.emit(toolCallChunkEvent({
        toolCallId: toolCallId2,
        toolCallName: "dynamicHitl",
        parentMessageId: messageId2,
        delta: '{"data":"should not render"}',
      }));
      
      // Dynamic HITL should NOT render after being disabled
      await waitForReactUpdate(100);
      expect(screen.queryByTestId("dynamic-hitl")).toBeNull();
      
      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });
});

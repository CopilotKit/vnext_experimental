import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { z } from "zod";
import { CopilotKitProvider, useCopilotKit } from "@/providers/CopilotKitProvider";
import { CopilotChat } from "../CopilotChat";
import {
  AbstractAgent,
  EventType,
  type BaseEvent,
  type RunAgentInput,
} from "@ag-ui/client";
import { Observable, Subject } from "rxjs";
import { defineToolCallRender, ReactToolCallRender, ReactFrontendTool } from "@/types";
import CopilotChatToolCallsView from "../CopilotChatToolCallsView";
import { AssistantMessage, Message, ToolMessage } from "@ag-ui/core";
import { ToolCallStatus } from "@copilotkitnext/core";
import { useFrontendTool } from "@/hooks/use-frontend-tool";

// A minimal mock agent that streams a tool call and a result
class MockStreamingAgent extends AbstractAgent {
  clone(): MockStreamingAgent {
    return new MockStreamingAgent();
  }

  protected run(_input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((observer) => {
      const messageId = `m_${Date.now()}`;
      const toolCallId = `tc_${Date.now()}`;

      // Start run
      observer.next({ type: EventType.RUN_STARTED } as BaseEvent);

      // Stream assistant text chunks
      observer.next({
        type: EventType.TEXT_MESSAGE_CHUNK,
        messageId,
        delta: "I will check the weather.",
      } as BaseEvent);

      // Start tool call (first chunk contains name + first args)
      observer.next({
        type: EventType.TOOL_CALL_CHUNK,
        toolCallId,
        toolCallName: "getWeather",
        parentMessageId: messageId,
        delta: '{"location":"Paris","unit":"c',
      } as BaseEvent);

      // Continue tool call args
      observer.next({
        type: EventType.TOOL_CALL_CHUNK,
        toolCallId,
        parentMessageId: messageId,
        delta: 'elsius"}',
      } as BaseEvent);

      // Tool result
      observer.next({
        type: EventType.TOOL_CALL_RESULT,
        toolCallId,
        messageId: `${messageId}_result`,
        content: JSON.stringify({ temperature: 21, unit: "celsius" }),
      } as BaseEvent);

      // Finish run
      observer.next({ type: EventType.RUN_FINISHED } as BaseEvent);
      observer.complete();

      return () => {};
    });
  }
}

describe("CopilotChat tool rendering with mock agent", () => {
  function renderWithProvider() {
    const agents = { default: new MockStreamingAgent() };
    const renderToolCalls = [
      defineToolCallRender({
        name: "getWeather",
        args: z.object({
          location: z.string(),
          unit: z.string(),
        }),
        render: ({ name, args, result }) => (
          <div data-testid="weather-result">
            Tool: {name} | args: {args.location}-{args.unit} | result:{" "}
            {String(result ?? "")}
          </div>
        ),
      }),
    ] as unknown as ReactToolCallRender<unknown>[];

    return render(
      <CopilotKitProvider agents={agents} renderToolCalls={renderToolCalls}>
        <div style={{ height: 400 }}>
          <CopilotChat />
        </div>
      </CopilotKitProvider>
    );
  }

  it("renders the tool component when the agent emits a tool call and result", async () => {
    renderWithProvider();

    // Type a message and submit
    const input = await screen.findByRole("textbox");
    fireEvent.change(input, { target: { value: "What is the weather?" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    // Assert that our tool render appears with the expected test id
    const tool = await screen.findByTestId("weather-result");
    expect(tool).toBeDefined();

    // Optionally, ensure result content shows up (from our mock agent)
    await waitFor(() => {
      expect(tool.textContent).toMatch(/temperature/);
      expect(tool.textContent).toMatch(/celsius/);
    });
  });
});

describe("Tool render status narrowing", () => {
  function renderStatusWithProvider({
    isLoading,
    withResult,
  }: { isLoading: boolean; withResult: boolean }) {
    const renderToolCalls = [
      defineToolCallRender({
        name: "getWeather",
        args: z.object({ city: z.string().optional() }),
        render: ({ status, args, result }) => {
          if (status === ToolCallStatus.InProgress) {
            return <div data-testid="status">INPROGRESS {String(args.city ?? "")}</div>;
          }
          if (status === ToolCallStatus.Executing) {
            return <div data-testid="status">EXECUTING {args.city}</div>;
          }
          // ToolCallStatus.Complete
          return (
            <div data-testid="status">
              COMPLETE {args.city} {String(result ?? "")}
            </div>
          );
        },
      }),
    ] as unknown as ReactToolCallRender<unknown>[];

    const toolCallId = "tc_status_1";

    const assistantMessage: AssistantMessage = {
      id: "a1",
      role: "assistant",
      content: "",
      toolCalls: [
        {
          id: toolCallId,
          type: "function",
          function: { name: "getWeather", arguments: '{"city":"Berlin"}' },
        } as any,
      ],
    } as AssistantMessage;

    const messages: Message[] = [];
    if (withResult) {
      messages.push({
        id: "t1",
        role: "tool",
        toolCallId,
        content: "Sunny",
      } as ToolMessage as any);
    }

    return render(
      <CopilotKitProvider renderToolCalls={renderToolCalls}>
        <CopilotChatToolCallsView
          message={assistantMessage}
          messages={messages}
          isLoading={isLoading}
        />
      </CopilotKitProvider>
    );
  }

  it("renders InProgress when loading and no result", async () => {
    renderStatusWithProvider({ isLoading: true, withResult: false });
    const el = await screen.findByTestId("status");
    expect(el.textContent).toMatch(/INPROGRESS/);
    expect(el.textContent).toMatch(/Berlin/);
  });

  it("renders Complete with result when tool message exists", async () => {
    renderStatusWithProvider({ isLoading: false, withResult: true });
    const el = await screen.findByTestId("status");
    expect(el.textContent).toMatch(/COMPLETE/);
    expect(el.textContent).toMatch(/Berlin/);
    expect(el.textContent).toMatch(/Sunny/);
  });

  it("renders Complete with empty result when not loading and no tool result", async () => {
    renderStatusWithProvider({ isLoading: false, withResult: false });
    const el = await screen.findByTestId("status");
    expect(el.textContent).toMatch(/COMPLETE/);
    expect(el.textContent).toMatch(/Berlin/);
  });
});

// A controllable streaming agent to step through events deterministically
class MockStepwiseAgent extends AbstractAgent {
  private subject = new Subject<BaseEvent>();

  emit(event: BaseEvent) {
    this.subject.next(event);
  }

  complete() {
    this.subject.complete();
  }

  clone(): MockStepwiseAgent {
    // For tests, return same instance so we can keep controlling it.
    return this;
  }

  protected run(_input: RunAgentInput): Observable<BaseEvent> {
    return this.subject.asObservable();
  }
}

describe("Streaming in-progress without timers", () => {
  it("shows InProgress for partial args and Complete after result", async () => {
    const agent = new MockStepwiseAgent();

    const renderToolCalls = [
      defineToolCallRender({
        name: "getWeather",
        args: z.object({
          location: z.string(),
          unit: z.string(),
        }),
        render: ({ name, status, args, result }) => (
          <div data-testid="tool-status">
            {name} {status === ToolCallStatus.InProgress ? "INPROGRESS" : "COMPLETE"}
            {" "}
            {String(args.location ?? "")} - {String(args.unit ?? "")} {" "}
            {String(result ?? "")}
          </div>
        ),
      }),
    ] as unknown as ReactToolCallRender<unknown>[];

    render(
      <CopilotKitProvider agents={{ default: agent }} renderToolCalls={renderToolCalls}>
        <div style={{ height: 400 }}>
          <CopilotChat />
        </div>
      </CopilotKitProvider>
    );

    // Submit a user message to trigger runAgent
    const input = await screen.findByRole("textbox");
    fireEvent.change(input, { target: { value: "Weather please" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    // Allow React to process the state update
    await waitFor(() => {
      expect(screen.getByText("Weather please")).toBeDefined();
    });

    const messageId = "m_step";
    const toolCallId = "tc_step";

    // Begin run and stream partial tool-call args
    agent.emit({ type: EventType.RUN_STARTED } as BaseEvent);
    agent.emit({
      type: EventType.TEXT_MESSAGE_CHUNK,
      messageId,
      delta: "Checking weather",
    } as BaseEvent);
    
    // First emit just the tool call start with partial args
    agent.emit({
      type: EventType.TOOL_CALL_CHUNK,
      toolCallId,
      toolCallName: "getWeather",
      parentMessageId: messageId,
      delta: '{"location":"Paris"',
    } as BaseEvent);
    
    // Wait for the tool status element to show partial args
    await waitFor(async () => {
      const el = await screen.findByTestId("tool-status");
      expect(el.textContent).toContain("getWeather INPROGRESS");
      expect(el.textContent).toContain("Paris");
    });
    
    // Continue streaming more partial data
    agent.emit({
      type: EventType.TOOL_CALL_CHUNK,
      toolCallId,
      parentMessageId: messageId,
      delta: ',"unit":"celsius"}',
    } as BaseEvent);

    // Wait for the tool status element and check it shows complete args but no result yet
    await waitFor(async () => {
      const el = await screen.findByTestId("tool-status");
      expect(el.textContent).toContain("getWeather");
      expect(el.textContent).toContain("Paris");
      expect(el.textContent).toContain("celsius");
      // Since we haven't sent a result yet, it should be INPROGRESS
      expect(el.textContent).toMatch(/INPROGRESS/);
    }, { timeout: 3000 });

    // Now send the tool result
    agent.emit({
      type: EventType.TOOL_CALL_RESULT,
      toolCallId,
      messageId: `${messageId}_result`,
      content: JSON.stringify({ temperature: 21, unit: "celsius" }),
    } as BaseEvent);

    // Check result appears and status changes to COMPLETE
    await waitFor(async () => {
      const el = await screen.findByTestId("tool-status");
      expect(el.textContent).toMatch(/COMPLETE/);
      expect(el.textContent).toContain("temperature");
      expect(el.textContent).toContain("21");
    });

    agent.emit({ type: EventType.RUN_FINISHED } as BaseEvent);
    agent.complete();
  });
});

describe("Executing State Transitions", () => {
  it.skip("should show Executing status while tool handler is running", async () => {
    const agent = new MockStepwiseAgent();
    
    // Component that uses useFrontendTool with a deferred promise
    const ToolWithDeferredHandler: React.FC = () => {
      const [resolvePromise, setResolvePromise] = React.useState<(() => void) | null>(null);
      
      const tool: ReactFrontendTool<{ value: string }> = {
        name: "slowTool",
        parameters: z.object({ value: z.string() }),
        handler: async () => {
          return new Promise((resolve) => {
            // Store resolve function to control when promise resolves
            setResolvePromise(() => () => resolve({ result: "done" }));
            // Auto-resolve after a short delay to prevent hanging
            setTimeout(() => resolve({ result: "done" }), 100);
          });
        },
        render: ({ name, status, args, result }) => (
          <div data-testid="slow-tool-status">
            Tool: {name} | Status: {status} | Value: {args.value} | Result: {String(result) ? "Complete" : "Pending"}
          </div>
        ),
      };
      
      useFrontendTool(tool);
      
      // Expose resolve function for test control
      React.useEffect(() => {
        if (resolvePromise) {
          (window as any).resolveSlowTool = () => {
            resolvePromise();
          };
        }
      }, [resolvePromise]);
      
      return null;
    };
    
    render(
      <CopilotKitProvider agents={{ default: agent }}>
        <ToolWithDeferredHandler />
        <div style={{ height: 400 }}>
          <CopilotChat />
        </div>
      </CopilotKitProvider>
    );

    // Submit message
    const input = await screen.findByRole("textbox");
    fireEvent.change(input, { target: { value: "Run slow tool" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    // Allow React to process the state update
    await waitFor(() => {
      expect(screen.getByText("Run slow tool")).toBeDefined();
    });

    const messageId = "m_exec";
    const toolCallId = "tc_exec";

    // Stream tool call
    agent.emit({ type: EventType.RUN_STARTED } as BaseEvent);
    agent.emit({
      type: EventType.TOOL_CALL_CHUNK,
      toolCallId,
      toolCallName: "slowTool",
      parentMessageId: messageId,
      delta: '{"value":"test"}',
    } as BaseEvent);

    // Complete the agent run to let core start the handler (Executing)
    agent.emit({ type: EventType.RUN_FINISHED } as BaseEvent);
    agent.complete();

    // Expect Executing status while handler promise is pending
    await waitFor(() => {
      const status = screen.getByTestId("slow-tool-status");
      expect(status.textContent).toMatch(/Tool: slowTool/);
      expect(status.textContent).toMatch(/Status: executing/i);
      expect(status.textContent).toMatch(/Value: test/);
      expect(status.textContent).toMatch(/Result: Pending/);
    });

    // Resolve the deferred promise to complete the tool
    (window as any).resolveSlowTool?.();

    // After resolution, status should become Complete
    await waitFor(() => {
      const status = screen.getByTestId("slow-tool-status");
      expect(status.textContent).toMatch(/Status: complete/i);
      expect(status.textContent).toMatch(/Result: Complete/);
    });
  });
});

describe("Multiple Tool Calls in Same Message", () => {
  it("should render multiple tools independently with their own status", async () => {
    const agent = new MockStepwiseAgent();
    
    const renderToolCalls = [
      defineToolCallRender({
        name: "tool1",
        args: z.object({ id: z.string() }),
        render: ({ status, args, result }) => (
          <div data-testid={`tool1-${args.id}`}>
            Tool1[{args.id}]: {status} - {result ? JSON.stringify(result) : "waiting"}
          </div>
        ),
      }),
      defineToolCallRender({
        name: "tool2",
        args: z.object({ id: z.string() }),
        render: ({ status, args, result }) => (
          <div data-testid={`tool2-${args.id}`}>
            Tool2[{args.id}]: {status} - {result ? JSON.stringify(result) : "waiting"}
          </div>
        ),
      }),
    ] as unknown as ReactToolCallRender<unknown>[];

    render(
      <CopilotKitProvider agents={{ default: agent }} renderToolCalls={renderToolCalls}>
        <div style={{ height: 400 }}>
          <CopilotChat />
        </div>
      </CopilotKitProvider>
    );

    // Submit message
    const input = await screen.findByRole("textbox");
    fireEvent.change(input, { target: { value: "Multiple tools" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    // Allow React to process the state update
    await waitFor(() => {
      expect(screen.getByText("Multiple tools")).toBeDefined();
    });

    const messageId = "m_multi";
    const toolCallId1 = "tc_1";
    const toolCallId2 = "tc_2";
    const toolCallId3 = "tc_3";

    agent.emit({ type: EventType.RUN_STARTED } as BaseEvent);
    
    // Stream three tool calls (2 of tool1, 1 of tool2)
    agent.emit({
      type: EventType.TOOL_CALL_CHUNK,
      toolCallId: toolCallId1,
      toolCallName: "tool1",
      parentMessageId: messageId,
      delta: '{"id":"first"}',
    } as BaseEvent);
    
    agent.emit({
      type: EventType.TOOL_CALL_CHUNK,
      toolCallId: toolCallId2,
      toolCallName: "tool2",
      parentMessageId: messageId,
      delta: '{"id":"second"}',
    } as BaseEvent);
    
    agent.emit({
      type: EventType.TOOL_CALL_CHUNK,
      toolCallId: toolCallId3,
      toolCallName: "tool1",
      parentMessageId: messageId,
      delta: '{"id":"third"}',
    } as BaseEvent);

    // All three should render
    await waitFor(() => {
      expect(screen.getByTestId("tool1-first")).toBeDefined();
      expect(screen.getByTestId("tool2-second")).toBeDefined();
      expect(screen.getByTestId("tool1-third")).toBeDefined();
    });

    // Send results in different order
    agent.emit({
      type: EventType.TOOL_CALL_RESULT,
      toolCallId: toolCallId2,
      messageId: `${messageId}_r2`,
      content: JSON.stringify({ result: "B" }),
    } as BaseEvent);

    await waitFor(() => {
      const tool2 = screen.getByTestId("tool2-second");
      expect(tool2.textContent).toContain("B");
    });

    agent.emit({
      type: EventType.TOOL_CALL_RESULT,
      toolCallId: toolCallId1,
      messageId: `${messageId}_r1`,
      content: JSON.stringify({ result: "A" }),
    } as BaseEvent);

    agent.emit({
      type: EventType.TOOL_CALL_RESULT,
      toolCallId: toolCallId3,
      messageId: `${messageId}_r3`,
      content: JSON.stringify({ result: "C" }),
    } as BaseEvent);

    // All results should be visible
    await waitFor(() => {
      expect(screen.getByTestId("tool1-first").textContent).toContain("A");
      expect(screen.getByTestId("tool2-second").textContent).toContain("B");
      expect(screen.getByTestId("tool1-third").textContent).toContain("C");
    });

    agent.emit({ type: EventType.RUN_FINISHED } as BaseEvent);
    agent.complete();
  });
});

describe("Partial Args Accumulation", () => {
  it("should properly show InProgress status with accumulating partial args", async () => {
    const agent = new MockStepwiseAgent();
    
    const renderToolCalls = [
      defineToolCallRender({
        name: "complexTool",
        args: z.object({
          name: z.string().optional(),
          age: z.number().optional(),
          city: z.string().optional(),
        }),
        render: ({ status, args }) => (
          <div data-testid="complex-tool">
            <div>Status: {status}</div>
            <div>Name: {args.name || "pending"}</div>
            <div>Age: {args.age !== undefined ? args.age : "pending"}</div>
            <div>City: {args.city || "pending"}</div>
          </div>
        ),
      }),
    ] as unknown as ReactToolCallRender<unknown>[];

    render(
      <CopilotKitProvider agents={{ default: agent }} renderToolCalls={renderToolCalls}>
        <div style={{ height: 400 }}>
          <CopilotChat />
        </div>
      </CopilotKitProvider>
    );

    // Submit message
    const input = await screen.findByRole("textbox");
    fireEvent.change(input, { target: { value: "Complex tool test" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    // Allow React to process the state update
    await waitFor(() => {
      expect(screen.getByText("Complex tool test")).toBeDefined();
    });

    const messageId = "m_partial";
    const toolCallId = "tc_partial";

    agent.emit({ type: EventType.RUN_STARTED } as BaseEvent);
    
    // Stream args piece by piece
    agent.emit({
      type: EventType.TOOL_CALL_CHUNK,
      toolCallId,
      toolCallName: "complexTool",
      parentMessageId: messageId,
      delta: '{"name":"',
    } as BaseEvent);

    // Let React update with the partial data
    await waitFor(() => {
      const tool = screen.queryByTestId("complex-tool");
      expect(tool).toBeDefined();
    });

    agent.emit({
      type: EventType.TOOL_CALL_CHUNK,
      toolCallId,
      parentMessageId: messageId,
      delta: 'Alice"',
    } as BaseEvent);

    await waitFor(() => {
      const tool = screen.getByTestId("complex-tool");
      expect(tool.textContent).toContain("Name: Alice");
      expect(tool.textContent).toContain("Age: pending");
    });

    agent.emit({
      type: EventType.TOOL_CALL_CHUNK,
      toolCallId,
      parentMessageId: messageId,
      delta: ',"age":30',
    } as BaseEvent);

    await waitFor(() => {
      const tool = screen.getByTestId("complex-tool");
      expect(tool.textContent).toContain("Age: 30");
      expect(tool.textContent).toContain("City: pending");
    });

    agent.emit({
      type: EventType.TOOL_CALL_CHUNK,
      toolCallId,
      parentMessageId: messageId,
      delta: ',"city":"Paris"}',
    } as BaseEvent);

    await waitFor(() => {
      const tool = screen.getByTestId("complex-tool");
      expect(tool.textContent).toContain("City: Paris");
      // All args complete but no result yet - status shows inProgress until result is received
      expect(tool.textContent).toMatch(/Status: (complete|inProgress)/i);
    });

    agent.emit({ type: EventType.RUN_FINISHED } as BaseEvent);
    agent.complete();
  });
});

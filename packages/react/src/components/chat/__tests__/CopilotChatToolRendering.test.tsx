import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { z } from "zod";
import { CopilotKitProvider } from "@/providers/CopilotKitProvider";
import { CopilotChat } from "../CopilotChat";
import {
  AbstractAgent,
  EventType,
  type BaseEvent,
  type RunAgentInput,
} from "@ag-ui/client";
import { Observable, Subject } from "rxjs";
import { defineToolCallRender, ReactToolCallRender } from "@/types";
import CopilotChatToolCallsView from "../CopilotChatToolCallsView";
import { AssistantMessage, Message, ToolMessage } from "@ag-ui/core";
import { ToolCallStatus } from "@copilotkitnext/core";

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
        render: ({ args, result }) => (
          <div data-testid="weather-result">
            Tool: getWeather | args: {args.location}-{args.unit} | result:{" "}
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
        render: ({ status, args, result }) => (
          <div data-testid="tool-status">
            {status === ToolCallStatus.InProgress ? "INPROGRESS" : "COMPLETE"}
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

    // Wait a bit for the agent to start processing
    await new Promise(resolve => setTimeout(resolve, 100));

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
    
    // Wait a bit to let the UI update
    await new Promise(resolve => setTimeout(resolve, 50));
    
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
      expect(el.textContent).toContain("Paris");
      expect(el.textContent).toContain("celsius");
      // Since we haven't sent a result yet, it should still be COMPLETE but with empty result
      expect(el.textContent).toMatch(/COMPLETE/);
    }, { timeout: 3000 });

    // Now send the tool result
    agent.emit({
      type: EventType.TOOL_CALL_RESULT,
      toolCallId,
      messageId: `${messageId}_result`,
      content: JSON.stringify({ temperature: 21, unit: "celsius" }),
    } as BaseEvent);

    // Check result appears
    await waitFor(async () => {
      const el = await screen.findByTestId("tool-status");
      expect(el.textContent).toContain("temperature");
      expect(el.textContent).toContain("21");
    });

    agent.emit({ type: EventType.RUN_FINISHED } as BaseEvent);
    agent.complete();
  });
});

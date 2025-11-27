import React, { useRef } from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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
import {
  defineToolCallRenderer,
  ReactToolCallRenderer,
} from "@/types";
import { ToolCallStatus } from "@copilotkitnext/core";
import { CopilotChatMessageView } from "../CopilotChatMessageView";
import { CopilotChatConfigurationProvider } from "@/providers/CopilotChatConfigurationProvider";
import { ActivityMessage, AssistantMessage, Message } from "@ag-ui/core";
import { ReactActivityMessageRenderer, ReactCustomMessageRenderer } from "@/types";

// A controllable streaming agent to step through events deterministically
class MockStepwiseAgent extends AbstractAgent {
  private subject = new Subject<BaseEvent>();

  emit(event: BaseEvent) {
    if (event.type === EventType.RUN_STARTED) {
      this.isRunning = true;
    } else if (
      event.type === EventType.RUN_FINISHED ||
      event.type === EventType.RUN_ERROR
    ) {
      this.isRunning = false;
    }
    this.subject.next(event);
  }

  complete() {
    this.isRunning = false;
    this.subject.complete();
  }

  clone(): MockStepwiseAgent {
    // For tests, return same instance so we can keep controlling it.
    return this;
  }

  run(_input: RunAgentInput): Observable<BaseEvent> {
    return this.subject.asObservable();
  }
}

describe("Tool Call Re-render Prevention", () => {
  it("should not re-render a completed tool call when subsequent text is streamed", async () => {
    const agent = new MockStepwiseAgent();

    // Track render counts for the tool renderer
    let toolRenderCount = 0;
    let lastRenderStatus: string | null = null;
    let lastRenderArgs: Record<string, unknown> | null = null;

    const renderToolCalls = [
      defineToolCallRenderer({
        name: "getWeather",
        args: z.object({
          location: z.string(),
        }),
        render: ({ status, args, result }) => {
          toolRenderCount++;
          lastRenderStatus = status;
          lastRenderArgs = args as Record<string, unknown>;

          return (
            <div data-testid="weather-tool">
              <span data-testid="render-count">{toolRenderCount}</span>
              <span data-testid="status">{status}</span>
              <span data-testid="location">{args.location}</span>
              <span data-testid="result">{result ? String(result) : "pending"}</span>
            </div>
          );
        },
      }),
    ] as unknown as ReactToolCallRenderer<unknown>[];

    render(
      <CopilotKitProvider
        agents__unsafe_dev_only={{ default: agent }}
        renderToolCalls={renderToolCalls}
      >
        <div style={{ height: 400 }}>
          <CopilotChat />
        </div>
      </CopilotKitProvider>
    );

    // Submit a user message to trigger runAgent
    const input = await screen.findByRole("textbox");
    fireEvent.change(input, { target: { value: "What's the weather?" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("What's the weather?")).toBeDefined();
    });

    const messageId = "m_rerender_test";
    const toolCallId = "tc_rerender_test";

    // Start the run
    agent.emit({ type: EventType.RUN_STARTED } as BaseEvent);

    // Stream the tool call with complete args
    agent.emit({
      type: EventType.TOOL_CALL_CHUNK,
      toolCallId,
      toolCallName: "getWeather",
      parentMessageId: messageId,
      delta: '{"location":"Paris"}',
    } as BaseEvent);

    // Wait for tool to render with InProgress status
    await waitFor(() => {
      const statusEl = screen.getByTestId("status");
      expect(statusEl.textContent).toBe("inProgress");
      expect(screen.getByTestId("location").textContent).toBe("Paris");
    });

    const renderCountAfterToolCall = toolRenderCount;

    // Send the tool result to complete the tool call
    agent.emit({
      type: EventType.TOOL_CALL_RESULT,
      toolCallId,
      messageId: `${messageId}_result`,
      content: JSON.stringify({ temperature: 22, condition: "sunny" }),
    } as BaseEvent);

    // Wait for tool to show Complete status
    await waitFor(() => {
      const statusEl = screen.getByTestId("status");
      expect(statusEl.textContent).toBe("complete");
    });

    const renderCountAfterComplete = toolRenderCount;

    // Sanity check: it should have re-rendered at least once to show complete status
    expect(renderCountAfterComplete).toBeGreaterThan(renderCountAfterToolCall);

    // Now stream additional text AFTER the tool call is complete
    // This should NOT cause the tool call renderer to re-render
    agent.emit({
      type: EventType.TEXT_MESSAGE_CHUNK,
      messageId: "m_followup",
      delta: "The weather in Paris is ",
    } as BaseEvent);

    // Wait a moment for React to process
    await waitFor(() => {
      expect(screen.getByText(/The weather in Paris is/)).toBeDefined();
    });

    const renderCountAfterFirstTextChunk = toolRenderCount;

    // Stream more text chunks
    agent.emit({
      type: EventType.TEXT_MESSAGE_CHUNK,
      messageId: "m_followup",
      delta: "currently sunny ",
    } as BaseEvent);

    await waitFor(() => {
      expect(screen.getByText(/currently sunny/)).toBeDefined();
    });

    agent.emit({
      type: EventType.TEXT_MESSAGE_CHUNK,
      messageId: "m_followup",
      delta: "with a temperature of 22°C.",
    } as BaseEvent);

    await waitFor(() => {
      expect(screen.getByText(/22°C/)).toBeDefined();
    });

    const renderCountAfterAllText = toolRenderCount;

    // THE KEY ASSERTION: The tool should NOT have re-rendered after it was complete
    // and we started streaming text
    expect(renderCountAfterAllText).toBe(renderCountAfterComplete);

    // Verify the tool still shows the correct completed state
    expect(screen.getByTestId("status").textContent).toBe("complete");
    expect(screen.getByTestId("location").textContent).toBe("Paris");
    expect(screen.getByTestId("result").textContent).toContain("temperature");

    agent.emit({ type: EventType.RUN_FINISHED } as BaseEvent);
    agent.complete();
  });

  it("should not re-render a tool call when its arguments have not changed during streaming", async () => {
    const agent = new MockStepwiseAgent();

    // Track render counts
    let toolRenderCount = 0;

    const renderToolCalls = [
      defineToolCallRenderer({
        name: "search",
        args: z.object({
          query: z.string(),
        }),
        render: ({ status, args }) => {
          toolRenderCount++;

          return (
            <div data-testid="search-tool">
              <span data-testid="search-render-count">{toolRenderCount}</span>
              <span data-testid="search-status">{status}</span>
              <span data-testid="search-query">{args.query}</span>
            </div>
          );
        },
      }),
    ] as unknown as ReactToolCallRenderer<unknown>[];

    render(
      <CopilotKitProvider
        agents__unsafe_dev_only={{ default: agent }}
        renderToolCalls={renderToolCalls}
      >
        <div style={{ height: 400 }}>
          <CopilotChat />
        </div>
      </CopilotKitProvider>
    );

    const input = await screen.findByRole("textbox");
    fireEvent.change(input, { target: { value: "Search for something" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Search for something")).toBeDefined();
    });

    const messageId = "m_search";
    const toolCallId = "tc_search";

    agent.emit({ type: EventType.RUN_STARTED } as BaseEvent);

    // Stream complete tool call args
    agent.emit({
      type: EventType.TOOL_CALL_CHUNK,
      toolCallId,
      toolCallName: "search",
      parentMessageId: messageId,
      delta: '{"query":"React hooks"}',
    } as BaseEvent);

    await waitFor(() => {
      expect(screen.getByTestId("search-query").textContent).toBe("React hooks");
    });

    const renderCountAfterToolCall = toolRenderCount;

    // Stream text in the same message (before tool result)
    // This simulates the agent adding explanation text while tool is in progress
    agent.emit({
      type: EventType.TEXT_MESSAGE_CHUNK,
      messageId,
      delta: "Let me search for that...",
    } as BaseEvent);

    await waitFor(() => {
      expect(screen.getByText(/Let me search for that/)).toBeDefined();
    });

    const renderCountAfterText = toolRenderCount;

    // The tool call should NOT re-render just because text was added to the message
    // since its arguments haven't changed
    expect(renderCountAfterText).toBe(renderCountAfterToolCall);

    agent.emit({ type: EventType.RUN_FINISHED } as BaseEvent);
    agent.complete();
  });
});

describe("Text Message Re-render Prevention", () => {
  it("should not re-render a previous assistant message when a new message streams in", async () => {
    // Track render counts per message ID
    const renderCounts: Record<string, number> = {};

    // Custom assistant message component that tracks renders
    const TrackedAssistantMessage: React.FC<{
      message: AssistantMessage;
      messages?: Message[];
      isRunning?: boolean;
    }> = ({ message }) => {
      // Increment render count for this message
      renderCounts[message.id] = (renderCounts[message.id] || 0) + 1;

      return (
        <div data-testid={`assistant-message-${message.id}`}>
          <span data-testid={`content-${message.id}`}>{message.content}</span>
          <span data-testid={`render-count-${message.id}`}>
            {renderCounts[message.id]}
          </span>
        </div>
      );
    };

    // Initial messages - one complete assistant message
    const initialMessages: Message[] = [
      {
        id: "msg-1",
        role: "assistant",
        content: "Hello! How can I help you today?",
      } as AssistantMessage,
    ];

    const { rerender } = render(
      <CopilotKitProvider>
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={initialMessages}
            isRunning={false}
            assistantMessage={TrackedAssistantMessage}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    // Verify first message rendered
    await waitFor(() => {
      expect(screen.getByTestId("assistant-message-msg-1")).toBeDefined();
    });

    const firstMessageRenderCountAfterInitial = renderCounts["msg-1"];
    expect(firstMessageRenderCountAfterInitial).toBe(1);

    // Simulate streaming a second message - first chunk
    const messagesWithSecondPartial: Message[] = [
      ...initialMessages,
      {
        id: "msg-2",
        role: "assistant",
        content: "Let me help",
      } as AssistantMessage,
    ];

    rerender(
      <CopilotKitProvider>
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={messagesWithSecondPartial}
            isRunning={true}
            assistantMessage={TrackedAssistantMessage}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("assistant-message-msg-2")).toBeDefined();
    });

    const firstMessageRenderCountAfterSecondMessage = renderCounts["msg-1"];

    // Continue streaming the second message
    const messagesWithMoreContent: Message[] = [
      ...initialMessages,
      {
        id: "msg-2",
        role: "assistant",
        content: "Let me help you with that task.",
      } as AssistantMessage,
    ];

    rerender(
      <CopilotKitProvider>
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={messagesWithMoreContent}
            isRunning={true}
            assistantMessage={TrackedAssistantMessage}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("content-msg-2").textContent).toBe(
        "Let me help you with that task."
      );
    });

    // Stream even more content
    const messagesWithEvenMoreContent: Message[] = [
      ...initialMessages,
      {
        id: "msg-2",
        role: "assistant",
        content: "Let me help you with that task. Here's what I found:",
      } as AssistantMessage,
    ];

    rerender(
      <CopilotKitProvider>
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={messagesWithEvenMoreContent}
            isRunning={true}
            assistantMessage={TrackedAssistantMessage}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("content-msg-2").textContent).toContain(
        "Here's what I found"
      );
    });

    const firstMessageRenderCountAfterAllStreaming = renderCounts["msg-1"];

    // THE KEY ASSERTION: The first message should NOT have re-rendered
    // when the second message was streaming
    expect(firstMessageRenderCountAfterAllStreaming).toBe(
      firstMessageRenderCountAfterInitial
    );

    // Verify the second message did update (it should have rendered multiple times)
    expect(renderCounts["msg-2"]).toBeGreaterThan(1);
  });

  it("should not re-render a user message when assistant message streams", async () => {
    const renderCounts: Record<string, number> = {};

    const TrackedAssistantMessage: React.FC<{
      message: AssistantMessage;
      messages?: Message[];
      isRunning?: boolean;
    }> = ({ message }) => {
      renderCounts[message.id] = (renderCounts[message.id] || 0) + 1;
      return (
        <div data-testid={`assistant-message-${message.id}`}>
          <span data-testid={`content-${message.id}`}>{message.content}</span>
        </div>
      );
    };

    const TrackedUserMessage: React.FC<{
      message: Message;
    }> = ({ message }) => {
      renderCounts[message.id] = (renderCounts[message.id] || 0) + 1;
      return (
        <div data-testid={`user-message-${message.id}`}>
          <span data-testid={`user-content-${message.id}`}>
            {typeof message.content === "string" ? message.content : ""}
          </span>
          <span data-testid={`user-render-count-${message.id}`}>
            {renderCounts[message.id]}
          </span>
        </div>
      );
    };

    const initialMessages: Message[] = [
      {
        id: "user-1",
        role: "user",
        content: "Hello!",
      },
    ];

    const { rerender } = render(
      <CopilotKitProvider>
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={initialMessages}
            isRunning={false}
            assistantMessage={TrackedAssistantMessage}
            userMessage={TrackedUserMessage}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("user-message-user-1")).toBeDefined();
    });

    const userMessageRenderCountInitial = renderCounts["user-1"];
    expect(userMessageRenderCountInitial).toBe(1);

    // Add assistant response and stream it
    const messagesWithAssistant: Message[] = [
      ...initialMessages,
      {
        id: "assistant-1",
        role: "assistant",
        content: "Hi there!",
      } as AssistantMessage,
    ];

    rerender(
      <CopilotKitProvider>
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={messagesWithAssistant}
            isRunning={true}
            assistantMessage={TrackedAssistantMessage}
            userMessage={TrackedUserMessage}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    // Stream more content
    const messagesWithMoreAssistant: Message[] = [
      ...initialMessages,
      {
        id: "assistant-1",
        role: "assistant",
        content: "Hi there! How can I assist you today?",
      } as AssistantMessage,
    ];

    rerender(
      <CopilotKitProvider>
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={messagesWithMoreAssistant}
            isRunning={true}
            assistantMessage={TrackedAssistantMessage}
            userMessage={TrackedUserMessage}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("content-assistant-1").textContent).toContain(
        "How can I assist"
      );
    });

    const userMessageRenderCountAfterStreaming = renderCounts["user-1"];

    // THE KEY ASSERTION: User message should not re-render when assistant streams
    expect(userMessageRenderCountAfterStreaming).toBe(
      userMessageRenderCountInitial
    );
  });
});

describe("Activity Message Re-render Prevention", () => {
  it("should not re-render a previous activity message when a new message streams in", async () => {
    // Track render counts per message ID
    const renderCounts: Record<string, number> = {};

    // Custom activity renderer that tracks renders
    const activityRenderer: ReactActivityMessageRenderer<{ status: string; percent: number }> = {
      activityType: "search-progress",
      content: z.object({ status: z.string(), percent: z.number() }),
      render: ({ content, message }) => {
        renderCounts[message.id] = (renderCounts[message.id] || 0) + 1;
        return (
          <div data-testid={`activity-${message.id}`}>
            <span data-testid={`activity-content-${message.id}`}>
              {content.status} - {content.percent}%
            </span>
            <span data-testid={`activity-render-count-${message.id}`}>
              {renderCounts[message.id]}
            </span>
          </div>
        );
      },
    };

    // Initial messages - one activity message
    const initialMessages: Message[] = [
      {
        id: "activity-1",
        role: "activity",
        activityType: "search-progress",
        content: { status: "Searching", percent: 50 },
      } as ActivityMessage,
    ];

    const { rerender } = render(
      <CopilotKitProvider renderActivityMessages={[activityRenderer]}>
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={initialMessages}
            isRunning={true}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    // Verify first activity rendered
    await waitFor(() => {
      expect(screen.getByTestId("activity-activity-1")).toBeDefined();
    });

    const firstActivityRenderCountAfterInitial = renderCounts["activity-1"];
    expect(firstActivityRenderCountAfterInitial).toBe(1);

    // Add a second activity message
    const messagesWithSecondActivity: Message[] = [
      ...initialMessages,
      {
        id: "activity-2",
        role: "activity",
        activityType: "search-progress",
        content: { status: "Processing", percent: 75 },
      } as ActivityMessage,
    ];

    rerender(
      <CopilotKitProvider renderActivityMessages={[activityRenderer]}>
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={messagesWithSecondActivity}
            isRunning={true}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("activity-activity-2")).toBeDefined();
    });

    // Update the second activity message
    const messagesWithUpdatedSecondActivity: Message[] = [
      initialMessages[0],
      {
        id: "activity-2",
        role: "activity",
        activityType: "search-progress",
        content: { status: "Almost done", percent: 90 },
      } as ActivityMessage,
    ];

    rerender(
      <CopilotKitProvider renderActivityMessages={[activityRenderer]}>
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={messagesWithUpdatedSecondActivity}
            isRunning={true}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("activity-content-activity-2").textContent).toContain(
        "Almost done"
      );
    });

    const firstActivityRenderCountAfterAllUpdates = renderCounts["activity-1"];

    // THE KEY ASSERTION: The first activity should NOT have re-rendered
    // when the second activity was added or updated
    expect(firstActivityRenderCountAfterAllUpdates).toBe(
      firstActivityRenderCountAfterInitial
    );

    // Verify the second activity did update (it should have rendered multiple times)
    expect(renderCounts["activity-2"]).toBeGreaterThan(1);
  });

  it("should not re-render an activity message when an assistant message streams", async () => {
    const renderCounts: Record<string, number> = {};

    const activityRenderer: ReactActivityMessageRenderer<{ status: string }> = {
      activityType: "progress",
      content: z.object({ status: z.string() }),
      render: ({ content, message }) => {
        renderCounts[message.id] = (renderCounts[message.id] || 0) + 1;
        return (
          <div data-testid={`activity-${message.id}`}>
            {content.status}
          </div>
        );
      },
    };

    const TrackedAssistantMessage: React.FC<{
      message: AssistantMessage;
      messages?: Message[];
      isRunning?: boolean;
    }> = ({ message }) => {
      renderCounts[message.id] = (renderCounts[message.id] || 0) + 1;
      return (
        <div data-testid={`assistant-${message.id}`}>
          {message.content}
        </div>
      );
    };

    const initialMessages: Message[] = [
      {
        id: "activity-1",
        role: "activity",
        activityType: "progress",
        content: { status: "Loading..." },
      } as ActivityMessage,
    ];

    const { rerender } = render(
      <CopilotKitProvider renderActivityMessages={[activityRenderer]}>
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={initialMessages}
            isRunning={true}
            assistantMessage={TrackedAssistantMessage}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("activity-activity-1")).toBeDefined();
    });

    const activityRenderCountInitial = renderCounts["activity-1"];
    expect(activityRenderCountInitial).toBe(1);

    // Add an assistant message and stream it
    const messagesWithAssistant: Message[] = [
      ...initialMessages,
      {
        id: "assistant-1",
        role: "assistant",
        content: "Here's what I found...",
      } as AssistantMessage,
    ];

    rerender(
      <CopilotKitProvider renderActivityMessages={[activityRenderer]}>
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={messagesWithAssistant}
            isRunning={true}
            assistantMessage={TrackedAssistantMessage}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    // Stream more content
    const messagesWithMoreAssistant: Message[] = [
      initialMessages[0],
      {
        id: "assistant-1",
        role: "assistant",
        content: "Here's what I found... The results show that...",
      } as AssistantMessage,
    ];

    rerender(
      <CopilotKitProvider renderActivityMessages={[activityRenderer]}>
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={messagesWithMoreAssistant}
            isRunning={true}
            assistantMessage={TrackedAssistantMessage}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("assistant-assistant-1").textContent).toContain(
        "The results show"
      );
    });

    const activityRenderCountAfterStreaming = renderCounts["activity-1"];

    // THE KEY ASSERTION: Activity message should not re-render when assistant streams
    expect(activityRenderCountAfterStreaming).toBe(activityRenderCountInitial);
  });
});

describe("Custom Message Re-render Prevention", () => {
  it("should not re-render a custom message for a previous message when a new message streams in", async () => {
    const agent = new MockStepwiseAgent();

    // Track render counts by message ID and position
    const renderCounts: Record<string, number> = {};

    // Custom message renderer that tracks renders
    const customRenderer: ReactCustomMessageRenderer = {
      render: ({ message, position }) => {
        // Only render for assistant messages in "after" position
        if (message.role !== "assistant" || position !== "after") {
          return null;
        }

        const key = `${message.id}-${position}`;
        renderCounts[key] = (renderCounts[key] || 0) + 1;

        return (
          <div data-testid={`custom-${message.id}`}>
            <span data-testid={`custom-content-${message.id}`}>
              Custom content for {message.id}
            </span>
            <span data-testid={`custom-render-count-${message.id}`}>
              {renderCounts[key]}
            </span>
          </div>
        );
      },
    };

    // Initial messages - one assistant message
    const initialMessages: Message[] = [
      {
        id: "assistant-1",
        role: "assistant",
        content: "Hello! How can I help you?",
      } as AssistantMessage,
    ];

    const { rerender } = render(
      <CopilotKitProvider
        agents__unsafe_dev_only={{ default: agent }}
        renderCustomMessages={[customRenderer]}
      >
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={initialMessages}
            isRunning={false}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    // Verify first custom message rendered
    await waitFor(() => {
      expect(screen.getByTestId("custom-assistant-1")).toBeDefined();
    });

    const firstCustomRenderCountAfterInitial = renderCounts["assistant-1-after"];
    expect(firstCustomRenderCountAfterInitial).toBe(1);

    // Add a second assistant message
    const messagesWithSecond: Message[] = [
      ...initialMessages,
      {
        id: "assistant-2",
        role: "assistant",
        content: "Here's some more info...",
      } as AssistantMessage,
    ];

    rerender(
      <CopilotKitProvider
        agents__unsafe_dev_only={{ default: agent }}
        renderCustomMessages={[customRenderer]}
      >
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={messagesWithSecond}
            isRunning={true}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("custom-assistant-2")).toBeDefined();
    });

    // Update the second message (streaming more content)
    const messagesWithUpdatedSecond: Message[] = [
      initialMessages[0],
      {
        id: "assistant-2",
        role: "assistant",
        content: "Here's some more info... Let me explain in detail.",
      } as AssistantMessage,
    ];

    rerender(
      <CopilotKitProvider
        agents__unsafe_dev_only={{ default: agent }}
        renderCustomMessages={[customRenderer]}
      >
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={messagesWithUpdatedSecond}
            isRunning={true}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    // Stream even more content
    const messagesWithMoreContent: Message[] = [
      initialMessages[0],
      {
        id: "assistant-2",
        role: "assistant",
        content: "Here's some more info... Let me explain in detail. This is comprehensive.",
      } as AssistantMessage,
    ];

    rerender(
      <CopilotKitProvider
        agents__unsafe_dev_only={{ default: agent }}
        renderCustomMessages={[customRenderer]}
      >
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={messagesWithMoreContent}
            isRunning={false}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    const firstCustomRenderCountAfterAllUpdates = renderCounts["assistant-1-after"];

    // THE KEY ASSERTION: The first custom message should NOT have re-rendered
    // when the second message was streaming
    expect(firstCustomRenderCountAfterAllUpdates).toBe(
      firstCustomRenderCountAfterInitial
    );

    // Verify the second custom message did update
    expect(renderCounts["assistant-2-after"]).toBeGreaterThan(1);
  });

  it("should not re-render custom messages when isRunning changes but message content is the same", async () => {
    const agent = new MockStepwiseAgent();
    const renderCounts: Record<string, number> = {};

    const customRenderer: ReactCustomMessageRenderer = {
      render: ({ message, position }) => {
        if (message.role !== "assistant" || position !== "after") {
          return null;
        }

        const key = `${message.id}-${position}`;
        renderCounts[key] = (renderCounts[key] || 0) + 1;

        return (
          <div data-testid={`custom-${message.id}`}>
            Render count: {renderCounts[key]}
          </div>
        );
      },
    };

    const messages: Message[] = [
      {
        id: "assistant-1",
        role: "assistant",
        content: "Complete message",
      } as AssistantMessage,
    ];

    const { rerender } = render(
      <CopilotKitProvider
        agents__unsafe_dev_only={{ default: agent }}
        renderCustomMessages={[customRenderer]}
      >
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={messages}
            isRunning={true}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("custom-assistant-1")).toBeDefined();
    });

    const renderCountWhileRunning = renderCounts["assistant-1-after"];
    expect(renderCountWhileRunning).toBe(1);

    // Change isRunning to false (but same messages)
    rerender(
      <CopilotKitProvider
        agents__unsafe_dev_only={{ default: agent }}
        renderCustomMessages={[customRenderer]}
      >
        <CopilotChatConfigurationProvider agentId="default" threadId="test">
          <CopilotChatMessageView
            messages={messages}
            isRunning={false}
          />
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>
    );

    const renderCountAfterRunningChanged = renderCounts["assistant-1-after"];

    // THE KEY ASSERTION: Custom message should not re-render just because isRunning changed
    expect(renderCountAfterRunningChanged).toBe(renderCountWhileRunning);
  });
});

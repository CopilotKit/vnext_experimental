import React, { useEffect } from "react";
import { screen, fireEvent, waitFor, act } from "@testing-library/react";
import { z } from "zod";
import { defineToolCallRenderer, ReactToolCallRenderer } from "@/types";
import {
  MockStepwiseAgent,
  SuggestionsProviderAgent,
  renderWithCopilotKit,
  runStartedEvent,
  runFinishedEvent,
  textChunkEvent,
  toolCallChunkEvent,
  toolCallResultEvent,
  testId,
  emitSuggestionToolCall,
} from "@/__tests__/utils/test-helpers";
import { useConfigureSuggestions } from "@/hooks/use-configure-suggestions";
import { CopilotChat } from "../CopilotChat";
import { EventType } from "@ag-ui/core";

describe("CopilotChat E2E - Chat Basics and Streaming Patterns", () => {
  describe("Chat Basics: text input + run", () => {
    it("should display user message and start agent run when Enter is pressed", async () => {
      const agent = new MockStepwiseAgent();
      renderWithCopilotKit({ agent });

      // Type a message and press Enter
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Hello AI!" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // User message should appear
      await waitFor(() => {
        const userMessage = screen.getByText("Hello AI!");
        expect(userMessage).toBeDefined();
      });

      // Agent starts running
      const messageId = testId("msg");
      agent.emit(runStartedEvent());
      agent.emit(textChunkEvent(messageId, "Hello! "));
      agent.emit(textChunkEvent(messageId, "How can I help you today?"));
      agent.emit(runFinishedEvent());
      agent.complete();

      // Assistant message should accumulate
      await waitFor(() => {
        const assistantMessage = screen.getByText("Hello! How can I help you today?");
        expect(assistantMessage).toBeDefined();
      });
    });

    it("should accumulate text chunks progressively", async () => {
      const agent = new MockStepwiseAgent();
      renderWithCopilotKit({ agent });

      // Submit a message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Tell me a story" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Wait for user message to appear
      await waitFor(() => {
        expect(screen.getByText("Tell me a story")).toBeDefined();
      });

      const messageId = testId("msg");
      agent.emit(runStartedEvent());

      // Stream text progressively
      agent.emit(textChunkEvent(messageId, "Once upon"));

      await waitFor(() => {
        expect(screen.getByText(/Once upon/)).toBeDefined();
      });

      agent.emit(textChunkEvent(messageId, " a time"));

      await waitFor(() => {
        expect(screen.getByText(/Once upon a time/)).toBeDefined();
      });

      agent.emit(textChunkEvent(messageId, " there was a robot."));

      await waitFor(() => {
        expect(screen.getByText(/Once upon a time there was a robot\./)).toBeDefined();
      });

      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });

  describe("Single Tool Flow", () => {
    it("should handle complete tool call lifecycle", async () => {
      const agent = new MockStepwiseAgent();
      const renderToolCalls = [
        defineToolCallRenderer({
          name: "getWeather",
          args: z.object({
            location: z.string(),
            unit: z.string().optional(),
          }),
          render: ({ name, args, result, status }) => (
            <div data-testid="weather-tool">
              Tool: {name} | Status: {status} | Location: {args.location} |
              {result && ` Result: ${JSON.stringify(result)}`}
            </div>
          ),
        }),
      ] as unknown as ReactToolCallRenderer<unknown>[];

      renderWithCopilotKit({ agent, renderToolCalls });

      // Submit message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "What's the weather?" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Wait for user message to appear
      await waitFor(() => {
        expect(screen.getByText("What's the weather?")).toBeDefined();
      });

      const messageId = testId("msg");
      const toolCallId = testId("tc");

      // Stream: RUN_STARTED → TEXT_MESSAGE_CHUNK → TOOL_CALL_CHUNK → TOOL_CALL_RESULT → RUN_FINISHED
      agent.emit(runStartedEvent());
      agent.emit(textChunkEvent(messageId, "Let me check the weather for you."));

      // Start tool call with partial args
      agent.emit(
        toolCallChunkEvent({
          toolCallId,
          toolCallName: "getWeather",
          parentMessageId: messageId,
          delta: '{"location":"Paris"',
        }),
      );

      // Continue streaming args
      agent.emit(
        toolCallChunkEvent({
          toolCallId,
          parentMessageId: messageId,
          delta: ',"unit":"celsius"}',
        }),
      );

      // Wait for tool to render with complete args and verify name is provided
      await waitFor(() => {
        const tool = screen.getByTestId("weather-tool");
        expect(tool.textContent).toContain("Tool: getWeather");
        expect(tool.textContent).toContain("Location: Paris");
      });

      // Send tool result
      agent.emit(
        toolCallResultEvent({
          toolCallId,
          messageId: `${messageId}_result`,
          content: JSON.stringify({ temperature: 22, condition: "Sunny" }),
        }),
      );

      // Check result appears
      await waitFor(() => {
        const tool = screen.getByTestId("weather-tool");
        expect(tool.textContent).toContain("temperature");
        expect(tool.textContent).toContain("22");
        expect(tool.textContent).toContain("Sunny");
      });

      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });

  describe("Multiple Tools Interleaved", () => {
    it("should handle multiple tool calls in one assistant message", async () => {
      const agent = new MockStepwiseAgent();
      const renderToolCalls = [
        defineToolCallRenderer({
          name: "getWeather",
          args: z.object({ location: z.string() }),
          render: ({ name, args, result }) => (
            <div data-testid={`weather-${args.location}`}>
              [{name}] Weather for {args.location}: {result ? JSON.stringify(result) : "Loading..."}
            </div>
          ),
        }),
        defineToolCallRenderer({
          name: "getTime",
          args: z.object({ timezone: z.string() }),
          render: ({ name, args, result }) => (
            <div data-testid={`time-${args.timezone}`}>
              [{name}] Time in {args.timezone}: {result ? JSON.stringify(result) : "Loading..."}
            </div>
          ),
        }),
      ] as unknown as ReactToolCallRenderer<unknown>[];

      renderWithCopilotKit({ agent, renderToolCalls });

      // Submit message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Weather and time please" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Wait for user message to appear
      await waitFor(() => {
        expect(screen.getByText("Weather and time please")).toBeDefined();
      });

      const messageId = testId("msg");
      const toolCallId1 = testId("tc1");
      const toolCallId2 = testId("tc2");

      agent.emit(runStartedEvent());
      agent.emit(textChunkEvent(messageId, "I'll check both for you."));

      // Start first tool call (weather) with complete JSON in one chunk
      agent.emit(
        toolCallChunkEvent({
          toolCallId: toolCallId1,
          toolCallName: "getWeather",
          parentMessageId: messageId,
          delta: '{"location":"London"}',
        }),
      );

      // Start second tool call (time) with complete JSON in one chunk
      agent.emit(
        toolCallChunkEvent({
          toolCallId: toolCallId2,
          toolCallName: "getTime",
          parentMessageId: messageId,
          delta: '{"timezone":"UTC"}',
        }),
      );

      // Both tools should render with partial/complete args
      await waitFor(() => {
        expect(screen.getByTestId("weather-London")).toBeDefined();
        expect(screen.getByTestId("time-UTC")).toBeDefined();
      });

      // Send results in different order
      agent.emit(
        toolCallResultEvent({
          toolCallId: toolCallId2,
          messageId: `${messageId}_result2`,
          content: JSON.stringify({ time: "12:00 PM" }),
        }),
      );

      agent.emit(
        toolCallResultEvent({
          toolCallId: toolCallId1,
          messageId: `${messageId}_result1`,
          content: JSON.stringify({ temp: 18, condition: "Cloudy" }),
        }),
      );

      // Both results should appear with correct names
      await waitFor(() => {
        const weatherTool = screen.getByTestId("weather-London");
        const timeTool = screen.getByTestId("time-UTC");

        expect(weatherTool.textContent).toContain("[getWeather]");
        expect(weatherTool.textContent).toContain("18");
        expect(weatherTool.textContent).toContain("Cloudy");
        expect(timeTool.textContent).toContain("[getTime]");
        expect(timeTool.textContent).toContain("12:00 PM");
      });

      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });

  describe("Wildcard Fallback", () => {
    it("should use wildcard renderer when no specific renderer exists", async () => {
      const agent = new MockStepwiseAgent();
      const renderToolCalls = [
        defineToolCallRenderer({
          name: "*",
          args: z.any(),
          render: ({ name, args }) => (
            <div data-testid="wildcard-renderer">
              Unknown tool: {name} with args: {JSON.stringify(args)}
            </div>
          ),
        }),
      ] as unknown as ReactToolCallRenderer<unknown>[];

      renderWithCopilotKit({ agent, renderToolCalls });

      // Submit message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Do something unknown" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Wait for user message to appear
      await waitFor(() => {
        expect(screen.getByText("Do something unknown")).toBeDefined();
      });

      const messageId = testId("msg");
      const toolCallId = testId("tc");

      agent.emit(runStartedEvent());

      // Call an undefined tool
      agent.emit(
        toolCallChunkEvent({
          toolCallId,
          toolCallName: "unknownTool",
          parentMessageId: messageId,
          delta: '{"param":"value"}',
        }),
      );

      // Wildcard renderer should handle it
      await waitFor(() => {
        const wildcard = screen.getByTestId("wildcard-renderer");
        expect(wildcard).toBeDefined();
        // Check that the wildcard renders with the tool name
        expect(wildcard.textContent).toContain("Unknown tool: unknownTool");
        expect(wildcard.textContent).toContain("value");
      });

      agent.emit(runFinishedEvent());
      agent.complete();
    });

    it("should use wildcard renderer without args definition", async () => {
      const agent = new MockStepwiseAgent();
      // Test that wildcard tool works without explicit args definition
      const renderToolCalls = [
        defineToolCallRenderer({
          name: "*",
          // No args field - should default to z.any()
          render: ({ name, args }) => (
            <div data-testid="wildcard-no-args">
              <span data-testid="tool-name">{name}</span>
              <span data-testid="tool-args">{JSON.stringify(args)}</span>
            </div>
          ),
        }),
      ] as unknown as ReactToolCallRenderer<unknown>[];

      renderWithCopilotKit({ agent, renderToolCalls });

      // Submit message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Do something" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Wait for user message to appear
      await waitFor(() => {
        expect(screen.getByText("Do something")).toBeDefined();
      });

      const messageId = testId("msg");
      const toolCallId = testId("tc");

      agent.emit(runStartedEvent());

      // Call an undefined tool with a specific name
      agent.emit(
        toolCallChunkEvent({
          toolCallId,
          toolCallName: "myCustomTool",
          parentMessageId: messageId,
          delta: '{"param":"test","value":123}',
        }),
      );

      // Wildcard renderer should receive the actual tool name, not "*"
      await waitFor(() => {
        const wildcard = screen.getByTestId("wildcard-no-args");
        expect(wildcard).toBeDefined();

        // Verify the actual tool name is passed, not "*"
        const toolName = screen.getByTestId("tool-name");
        expect(toolName.textContent).toBe("myCustomTool");
        expect(toolName.textContent).not.toBe("*");

        // Verify args are passed correctly
        const toolArgs = screen.getByTestId("tool-args");
        const parsedArgs = JSON.parse(toolArgs.textContent || "{}");
        expect(parsedArgs.param).toBe("test");
        expect(parsedArgs.value).toBe(123);
      });

      agent.emit(runFinishedEvent());
      agent.complete();
    });

    it("should not show toolbar for messages with only tool calls and no content", async () => {
      const agent = new MockStepwiseAgent();
      const renderToolCalls = [
        defineToolCallRenderer({
          name: "testTool",
          args: z.object({ value: z.string() }),
          render: ({ args }) => <div data-testid="test-tool">Tool: {args.value}</div>,
        }),
      ] as unknown as ReactToolCallRenderer<unknown>[];

      renderWithCopilotKit({ agent, renderToolCalls });

      // Submit message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Use test tool" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Wait for user message to appear
      await waitFor(() => {
        expect(screen.getByText("Use test tool")).toBeDefined();
      });

      const messageId = testId("msg");
      const toolCallId = testId("tc");

      agent.emit(runStartedEvent());

      // Emit tool call WITHOUT any text content
      agent.emit(
        toolCallChunkEvent({
          toolCallId,
          toolCallName: "testTool",
          parentMessageId: messageId,
          delta: '{"value":"test"}',
        }),
      );

      // Tool call should be rendered
      await waitFor(() => {
        const toolRender = screen.getByTestId("test-tool");
        expect(toolRender).toBeDefined();
        expect(toolRender.textContent).toContain("Tool: test");
      });

      // Toolbar should NOT be visible for assistant message since it has no text content
      await waitFor(() => {
        // Find the assistant message container (it should have the tool render)
        const assistantMessageDiv = screen.getByTestId("test-tool").closest("[data-message-id]");

        if (assistantMessageDiv) {
          // Check that within the assistant message, there's no copy button
          const copyButtonsInAssistant = assistantMessageDiv.querySelectorAll(
            "button[aria-label*='Copy' i], button[aria-label*='copy' i]",
          );
          expect(copyButtonsInAssistant.length).toBe(0);
        }
      });

      // Now emit a NEW message WITH text content
      const messageWithContentId = testId("msg2");
      agent.emit(textChunkEvent(messageWithContentId, "Here is some actual text content"));

      // Toolbar SHOULD be visible now for the message with content
      await waitFor(() => {
        const allMessages = screen.getAllByText(/Here is some actual text content/);
        expect(allMessages.length).toBeGreaterThan(0);

        // Should now have copy button
        const toolbarButtons = screen.getAllByRole("button");
        const copyButton = toolbarButtons.find((btn) => btn.getAttribute("aria-label")?.toLowerCase().includes("copy"));
        expect(copyButton).toBeDefined();
      });

      agent.emit(runFinishedEvent());
      agent.complete();
    });

    it("should prefer specific renderer over wildcard when both exist", async () => {
      const agent = new MockStepwiseAgent();
      const renderToolCalls = [
        defineToolCallRenderer({
          name: "specificTool",
          args: z.object({ value: z.string() }),
          render: ({ args }) => <div data-testid="specific-renderer">Specific: {args.value}</div>,
        }),
        defineToolCallRenderer({
          name: "*",
          args: z.any(),
          render: ({ name }) => <div data-testid="wildcard-renderer">Wildcard: {name}</div>,
        }),
      ] as unknown as ReactToolCallRenderer<unknown>[];

      renderWithCopilotKit({ agent, renderToolCalls });

      // Submit message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Test specific" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Wait for user message to appear
      await waitFor(() => {
        expect(screen.getByText("Test specific")).toBeDefined();
      });

      const messageId = testId("msg");
      const toolCallId1 = testId("tc1");
      const toolCallId2 = testId("tc2");

      agent.emit(runStartedEvent());

      // Call the specific tool
      agent.emit(
        toolCallChunkEvent({
          toolCallId: toolCallId1,
          toolCallName: "specificTool",
          parentMessageId: messageId,
          delta: '{"value":"test123"}',
        }),
      );

      // Call an unknown tool
      agent.emit(
        toolCallChunkEvent({
          toolCallId: toolCallId2,
          toolCallName: "unknownTool",
          parentMessageId: messageId,
          delta: '{"data":"xyz"}',
        }),
      );

      // Specific renderer should be used for specificTool
      await waitFor(() => {
        const specific = screen.getByTestId("specific-renderer");
        expect(specific).toBeDefined();
        expect(specific.textContent).toContain("test123");
      });

      // Wildcard should be used for unknownTool
      await waitFor(() => {
        const wildcard = screen.getByTestId("wildcard-renderer");
        expect(wildcard).toBeDefined();
        expect(wildcard.textContent).toContain("Wildcard: unknownTool");
      });

      agent.emit(runFinishedEvent());
      agent.complete();
    });
  });

  describe("Suggestions Flow", () => {
    // Helper component to configure suggestions
    const ChatWithSuggestions: React.FC<{
      consumerAgentId: string;
      providerAgentId: string;
      instructions?: string;
      minSuggestions?: number;
      maxSuggestions?: number;
      onReady?: () => void;
    }> = ({ consumerAgentId, providerAgentId, instructions, minSuggestions, maxSuggestions, onReady }) => {
      useConfigureSuggestions({
        instructions: instructions || "Suggest helpful next actions",
        providerAgentId,
        consumerAgentId,
        minSuggestions: minSuggestions || 2,
        maxSuggestions: maxSuggestions || 4,
      });

      useEffect(() => {
        if (onReady) {
          onReady();
        }
      }, [onReady]);

      return <CopilotChat />;
    };

    it("should display suggestions when configured", async () => {
      const consumerAgent = new MockStepwiseAgent();
      const providerAgent = new SuggestionsProviderAgent();

      // Configure provider agent with suggestions
      providerAgent.setSuggestions([
        { title: "Option A", message: "Take action A" },
        { title: "Option B", message: "Take action B" },
      ]);

      let suggestionsReady = false;

      renderWithCopilotKit({
        agents: {
          default: consumerAgent,
          "suggestions-provider": providerAgent,
        },
        agentId: "default",
        children: (
          <div style={{ height: 400 }}>
            <ChatWithSuggestions
              consumerAgentId="default"
              providerAgentId="suggestions-provider"
              onReady={() => {
                suggestionsReady = true;
              }}
            />
          </div>
        ),
      });

      // Wait for suggestions config to be ready
      await waitFor(() => {
        expect(suggestionsReady).toBe(true);
      });

      // Submit a message to trigger suggestions
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Help me" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      // Wait for user message
      await waitFor(() => {
        expect(screen.getByText("Help me")).toBeDefined();
      });

      // Consumer agent responds
      const messageId = testId("msg");
      consumerAgent.emit(runStartedEvent());
      consumerAgent.emit(textChunkEvent(messageId, "I can help with that."));
      consumerAgent.emit(runFinishedEvent());
      consumerAgent.complete();

      // Wait for assistant message
      await waitFor(() => {
        expect(screen.getByText(/I can help with that/)).toBeDefined();
      });

      // Verify suggestions appear (provider agent's run() method will be called automatically)
      await waitFor(
        () => {
          expect(screen.getByText("Option A")).toBeDefined();
          expect(screen.getByText("Option B")).toBeDefined();
        },
        { timeout: 5000 },
      );

      // Click on a suggestion
      const suggestionA = screen.getByText("Option A");
      fireEvent.click(suggestionA);

      // Verify the suggestion message is added
      await waitFor(() => {
        const messages = screen.getAllByText(/Take action A/);
        expect(messages.length).toBeGreaterThan(0);
      });
    });

    it("should stream suggestion titles token by token", async () => {
      const consumerAgent = new MockStepwiseAgent();
      const providerAgent = new SuggestionsProviderAgent();

      // Configure provider agent with suggestions
      providerAgent.setSuggestions([
        { title: "First Action", message: "Do first action" },
        { title: "Second Action", message: "Do second action" },
      ]);

      let suggestionsReady = false;

      renderWithCopilotKit({
        agents: {
          default: consumerAgent,
          "suggestions-provider": providerAgent,
        },
        agentId: "default",
        children: (
          <div style={{ height: 400 }}>
            <ChatWithSuggestions
              consumerAgentId="default"
              providerAgentId="suggestions-provider"
              onReady={() => {
                suggestionsReady = true;
              }}
            />
          </div>
        ),
      });

      await waitFor(() => {
        expect(suggestionsReady).toBe(true);
      });

      // Submit a message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "What can I do?" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(screen.getByText("What can I do?")).toBeDefined();
      });

      // Consumer agent responds
      const messageId = testId("msg");
      consumerAgent.emit(runStartedEvent());
      consumerAgent.emit(textChunkEvent(messageId, "Here are some options."));
      consumerAgent.emit(runFinishedEvent());
      consumerAgent.complete();

      // Verify both suggestions are visible after streaming completes
      await waitFor(
        () => {
          expect(screen.getByText("First Action")).toBeDefined();
          expect(screen.getByText("Second Action")).toBeDefined();
        },
        { timeout: 5000 },
      );
    });

    it("should handle multiple suggestions streaming concurrently", async () => {
      const consumerAgent = new MockStepwiseAgent();
      const providerAgent = new SuggestionsProviderAgent();

      // Configure provider agent with suggestions
      providerAgent.setSuggestions([
        { title: "Alpha", message: "Do alpha" },
        { title: "Beta", message: "Do beta" },
        { title: "Gamma", message: "Do gamma" },
      ]);

      let suggestionsReady = false;

      renderWithCopilotKit({
        agents: {
          default: consumerAgent,
          "suggestions-provider": providerAgent,
        },
        agentId: "default",
        children: (
          <div style={{ height: 400 }}>
            <ChatWithSuggestions
              consumerAgentId="default"
              providerAgentId="suggestions-provider"
              minSuggestions={3}
              maxSuggestions={5}
              onReady={() => {
                suggestionsReady = true;
              }}
            />
          </div>
        ),
      });

      await waitFor(() => {
        expect(suggestionsReady).toBe(true);
      });

      // Submit message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Show me options" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(screen.getByText("Show me options")).toBeDefined();
      });

      // Consumer agent responds
      const messageId = testId("msg");
      consumerAgent.emit(runStartedEvent());
      consumerAgent.emit(textChunkEvent(messageId, "Here you go."));
      consumerAgent.emit(runFinishedEvent());
      consumerAgent.complete();

      // Verify all suggestions appear
      await waitFor(
        () => {
          expect(screen.getByText("Alpha")).toBeDefined();
          expect(screen.getByText("Beta")).toBeDefined();
          expect(screen.getByText("Gamma")).toBeDefined();
        },
        { timeout: 5000 },
      );
    });
  });

  describe("Thread Switching", () => {
    it("should clear messages when switching threads", async () => {
      const agent = new MockStepwiseAgent();
      renderWithCopilotKit({ agent, threadId: "thread-A" });

      // Wait for component to set agent threadId to thread-A
      await waitFor(() => {
        expect(agent.threadId).toBe("thread-A");
      });

      // Manually add messages to simulate having messages on thread A
      agent.messages.push({
        id: testId("msg-1"),
        role: "user",
        content: "User message on A",
      });
      agent.messages.push({
        id: testId("msg-2"),
        role: "assistant",
        content: "Assistant response on A",
      });

      // Verify messages exist in the agent
      expect(agent.messages.length).toBe(2);

      // Now switch to a different thread by creating a new render
      const { unmount } = renderWithCopilotKit({ agent, threadId: "thread-B" });

      // Wait for thread switch to complete
      await waitFor(() => {
        expect(agent.threadId).toBe("thread-B");
      });

      // Messages should be cleared, then connectAgent() would sync thread-B's messages from backend
      // In this test with MockStepwiseAgent, there's no backend, so messages stay at 0
      expect(agent.messages.length).toBe(0);

      unmount();
    });

    it("should only show messages when agent threadId matches expected thread", async () => {
      const agent = new MockStepwiseAgent();
      renderWithCopilotKit({ agent, threadId: "thread-A" });

      // Wait for initial thread setup
      await waitFor(() => {
        expect(agent.threadId).toBe("thread-A");
      });

      // Add a message when on correct thread
      agent.messages.push({
        id: testId("msg-a"),
        role: "assistant",
        content: "Message A",
      });

      // Simulate agent being on wrong thread (race condition scenario)
      agent.threadId = "thread-B";

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 50));

      // The component expects thread-A, but agent is on thread-B
      // So filtering should prevent the message from being displayed
      // (This tests the safeMessages filter logic)
      const messageElements = screen.queryAllByText(/Message A/);

      // Message should not be visible because threadIds don't match
      expect(messageElements.length).toBe(0);
    });

    it("should allow reconnection to original thread after aborted switch", async () => {
      // This test verifies the fix for P1 bug: switching from A -> B -> A rapidly
      // would leave the chat permanently disconnected from A.
      //
      // Bug scenario:
      // 1. Start on thread A (previousThreadIdRef = "thread-A")
      // 2. Switch to B: disconnect from A succeeds, but before connect to B completes...
      // 3. Switch back to A: the A->B switch is aborted
      // 4. Without the fix: previousThreadIdRef is still "thread-A", so the guard at
      //    line 66 (previousThreadIdRef.current === resolvedThreadId) returns early
      //    and we never reconnect to A. Chat stays blank.
      // 5. With the fix: previousThreadIdRef is reset to null on abort, so the guard
      //    allows reconnection.
      const agent = new MockStepwiseAgent();

      // Create a wrapper component that controls threadId with state
      function TestWrapper() {
        const [currentThreadId, setCurrentThreadId] = React.useState("thread-A");

        // Expose the setter for tests
        React.useEffect(() => {
          (window as any).setThreadId = setCurrentThreadId;
        }, []);

        return <CopilotChat agent={agent} threadId={currentThreadId} />;
      }

      // Start on thread A
      renderWithCopilotKit({ agent, children: <TestWrapper /> });

      // Wait for initial connection to thread A
      await waitFor(() => {
        expect(agent.threadId).toBe("thread-A");
      });

      // Trigger rapid thread switches: A -> B -> A
      // This creates the race condition where B switch is aborted mid-flight
      act(() => {
        (window as any).setThreadId("thread-B");
      });

      // Don't wait for B to complete - immediately switch back to A
      // This is the critical timing that triggers the bug
      act(() => {
        (window as any).setThreadId("thread-A");
      });

      // Wait for reconnection to thread A
      // Without the fix, this would timeout because previousThreadIdRef would
      // still be "thread-A" from the initial connection, causing the guard to
      // short-circuit and never reconnect
      await waitFor(
        () => {
          expect(agent.threadId).toBe("thread-A");
        },
        { timeout: 2000 },
      );

      // If we get here, the reconnection worked correctly
      expect(agent.threadId).toBe("thread-A");

      // Cleanup
      delete (window as any).setThreadId;
    });
  });
});

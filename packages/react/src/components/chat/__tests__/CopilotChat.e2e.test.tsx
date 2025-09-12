import { screen, fireEvent, waitFor } from "@testing-library/react";
import { z } from "zod";
import { defineToolCallRender } from "@/types";
import {
  MockStepwiseAgent,
  renderWithCopilotKit,
  runStartedEvent,
  runFinishedEvent,
  textChunkEvent,
  toolCallChunkEvent,
  toolCallResultEvent,
  testId,
  waitForReactUpdate,
} from "@/__tests__/utils/test-helpers.tsx";

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

      // Wait for agent to start processing
      await waitForReactUpdate(100);

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

      await waitForReactUpdate(100);

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
        defineToolCallRender({
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
      ];

      renderWithCopilotKit({ agent, renderToolCalls });

      // Submit message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "What's the weather?" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      await waitForReactUpdate(100);

      const messageId = testId("msg");
      const toolCallId = testId("tc");

      // Stream: RUN_STARTED → TEXT_MESSAGE_CHUNK → TOOL_CALL_CHUNK → TOOL_CALL_RESULT → RUN_FINISHED
      agent.emit(runStartedEvent());
      agent.emit(textChunkEvent(messageId, "Let me check the weather for you."));
      
      // Start tool call with partial args
      agent.emit(toolCallChunkEvent({
        toolCallId,
        toolCallName: "getWeather",
        parentMessageId: messageId,
        delta: '{"location":"Paris"',
      }));

      // Continue streaming args
      agent.emit(toolCallChunkEvent({
        toolCallId,
        parentMessageId: messageId,
        delta: ',"unit":"celsius"}',
      }));

      // Wait for tool to render with complete args and verify name is provided
      await waitFor(() => {
        const tool = screen.getByTestId("weather-tool");
        expect(tool.textContent).toContain("Tool: getWeather");
        expect(tool.textContent).toContain("Location: Paris");
      });

      // Send tool result
      agent.emit(toolCallResultEvent({
        toolCallId,
        messageId: `${messageId}_result`,
        content: JSON.stringify({ temperature: 22, condition: "Sunny" }),
      }));

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
        defineToolCallRender({
          name: "getWeather",
          args: z.object({ location: z.string() }),
          render: ({ name, args, result }) => (
            <div data-testid={`weather-${args.location}`}>
              [{name}] Weather for {args.location}: {result ? JSON.stringify(result) : "Loading..."}
            </div>
          ),
        }),
        defineToolCallRender({
          name: "getTime",
          args: z.object({ timezone: z.string() }),
          render: ({ name, args, result }) => (
            <div data-testid={`time-${args.timezone}`}>
              [{name}] Time in {args.timezone}: {result ? JSON.stringify(result) : "Loading..."}
            </div>
          ),
        }),
      ];

      renderWithCopilotKit({ agent, renderToolCalls });

      // Submit message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Weather and time please" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      await waitForReactUpdate(100);

      const messageId = testId("msg");
      const toolCallId1 = testId("tc1");
      const toolCallId2 = testId("tc2");

      agent.emit(runStartedEvent());
      agent.emit(textChunkEvent(messageId, "I'll check both for you."));

      // Start first tool call (weather) with complete JSON in one chunk
      agent.emit(toolCallChunkEvent({
        toolCallId: toolCallId1,
        toolCallName: "getWeather",
        parentMessageId: messageId,
        delta: '{"location":"London"}',
      }));

      // Start second tool call (time) with complete JSON in one chunk  
      agent.emit(toolCallChunkEvent({
        toolCallId: toolCallId2,
        toolCallName: "getTime",
        parentMessageId: messageId,
        delta: '{"timezone":"UTC"}',
      }));

      // Both tools should render with partial/complete args
      await waitFor(() => {
        expect(screen.getByTestId("weather-London")).toBeDefined();
        expect(screen.getByTestId("time-UTC")).toBeDefined();
      });

      // Send results in different order
      agent.emit(toolCallResultEvent({
        toolCallId: toolCallId2,
        messageId: `${messageId}_result2`,
        content: JSON.stringify({ time: "12:00 PM" }),
      }));

      agent.emit(toolCallResultEvent({
        toolCallId: toolCallId1,
        messageId: `${messageId}_result1`,
        content: JSON.stringify({ temp: 18, condition: "Cloudy" }),
      }));

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
        defineToolCallRender({
          name: "*",
          args: z.any(),
          render: ({ name, args }) => (
            <div data-testid="wildcard-renderer">
              Unknown tool: {name} with args: {JSON.stringify(args)}
            </div>
          ),
        }),
      ];

      renderWithCopilotKit({ agent, renderToolCalls });

      // Submit message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Do something unknown" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      await waitForReactUpdate(100);

      const messageId = testId("msg");
      const toolCallId = testId("tc");

      agent.emit(runStartedEvent());
      
      // Call an undefined tool
      agent.emit(toolCallChunkEvent({
        toolCallId,
        toolCallName: "unknownTool",
        parentMessageId: messageId,
        delta: '{"param":"value"}',
      }));

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

    it("should prefer specific renderer over wildcard when both exist", async () => {
      const agent = new MockStepwiseAgent();
      const renderToolCalls = [
        defineToolCallRender({
          name: "specificTool",
          args: z.object({ value: z.string() }),
          render: ({ args }) => (
            <div data-testid="specific-renderer">
              Specific: {args.value}
            </div>
          ),
        }),
        defineToolCallRender({
          name: "*",
          args: z.any(),
          render: ({ name }) => (
            <div data-testid="wildcard-renderer">
              Wildcard: {name}
            </div>
          ),
        }),
      ];

      renderWithCopilotKit({ agent, renderToolCalls });

      // Submit message
      const input = await screen.findByRole("textbox");
      fireEvent.change(input, { target: { value: "Test specific" } });
      fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

      await waitForReactUpdate(100);

      const messageId = testId("msg");
      const toolCallId1 = testId("tc1");
      const toolCallId2 = testId("tc2");

      agent.emit(runStartedEvent());
      
      // Call the specific tool
      agent.emit(toolCallChunkEvent({
        toolCallId: toolCallId1,
        toolCallName: "specificTool",
        parentMessageId: messageId,
        delta: '{"value":"test123"}',
      }));

      // Call an unknown tool
      agent.emit(toolCallChunkEvent({
        toolCallId: toolCallId2,
        toolCallName: "unknownTool",
        parentMessageId: messageId,
        delta: '{"data":"xyz"}',
      }));

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
});
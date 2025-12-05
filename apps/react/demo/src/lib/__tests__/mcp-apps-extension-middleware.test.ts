import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { Observable } from "rxjs";
import { EventType, BaseEvent, RunAgentInput } from "@ag-ui/client";
import {
  MCPAppsExtensionMiddleware,
  MCPClientConfig,
  ProxiedMCPRequest,
} from "../mcp-apps-extension-middleware";
import {
  MockAgent,
  AsyncMockAgent,
  ErrorMockAgent,
  createRunAgentInput,
  createRunStartedEvent,
  createRunFinishedEvent,
  createTextMessageStartEvent,
  createTextMessageContentEvent,
  createTextMessageEndEvent,
  createMCPToolWithUI,
  createMCPToolWithoutUI,
  createMCPToolWithEmptyMeta,
  createAssistantMessageWithToolCalls,
  createToolResultMessage,
  createAGUITool,
  collectEvents,
  createMCPToolCallResult,
  createMCPResourceResult,
} from "./test-utils";

// Create mock functions that will be referenced in the mock factory
const mockConnect = vi.fn();
const mockClose = vi.fn();
const mockListTools = vi.fn();
const mockCallTool = vi.fn();
const mockReadResource = vi.fn();
const mockNotification = vi.fn();
const mockPing = vi.fn();

// Track Client constructor calls
const mockClientConstructorCalls: Array<{ clientInfo: unknown; options: unknown }> = [];

// Mock the MCP SDK modules - using factory that returns a function returning our mock
vi.mock("@modelcontextprotocol/sdk/client/index.js", () => {
  return {
    Client: class MockClient {
      connect = mockConnect;
      close = mockClose;
      listTools = mockListTools;
      callTool = mockCallTool;
      readResource = mockReadResource;
      notification = mockNotification;
      ping = mockPing;

      constructor(clientInfo: unknown, options: unknown) {
        mockClientConstructorCalls.push({ clientInfo, options });
      }
    },
  };
});

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn().mockImplementation(() => ({ type: "sse" })),
}));

vi.mock("@modelcontextprotocol/sdk/client/streamableHttp.js", () => ({
  StreamableHTTPClientTransport: vi.fn().mockImplementation(() => ({ type: "http" })),
}));

// Mock crypto.randomUUID
vi.mock("crypto", () => ({
  randomUUID: vi.fn(() => `mock-uuid-${Math.random().toString(36).substr(2, 9)}`),
}));

describe("MCPAppsExtensionMiddleware", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Clear constructor calls tracking
    mockClientConstructorCalls.length = 0;

    // Set default mock implementations
    mockConnect.mockResolvedValue(undefined);
    mockClose.mockResolvedValue(undefined);
    mockListTools.mockResolvedValue({ tools: [] });
    mockCallTool.mockResolvedValue({ content: [] });
    mockReadResource.mockResolvedValue({ contents: [] });
    mockNotification.mockResolvedValue(undefined);
    mockPing.mockResolvedValue({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // =============================================================================
  // 1. Constructor & Configuration Tests
  // =============================================================================
  describe("Constructor & Configuration", () => {
    it("creates instance with empty config", () => {
      const middleware = new MCPAppsExtensionMiddleware();
      expect(middleware).toBeInstanceOf(MCPAppsExtensionMiddleware);
    });

    it("creates instance with empty object config", () => {
      const middleware = new MCPAppsExtensionMiddleware({});
      expect(middleware).toBeInstanceOf(MCPAppsExtensionMiddleware);
    });

    it("creates instance with HTTP server config", () => {
      const config = {
        mcpServers: [{ type: "http" as const, url: "http://localhost:3000" }],
      };
      const middleware = new MCPAppsExtensionMiddleware(config);
      expect(middleware).toBeInstanceOf(MCPAppsExtensionMiddleware);
    });

    it("creates instance with SSE server config", () => {
      const config = {
        mcpServers: [{ type: "sse" as const, url: "http://localhost:3000/sse" }],
      };
      const middleware = new MCPAppsExtensionMiddleware(config);
      expect(middleware).toBeInstanceOf(MCPAppsExtensionMiddleware);
    });

    it("creates instance with SSE server config including headers", () => {
      const config = {
        mcpServers: [
          {
            type: "sse" as const,
            url: "http://localhost:3000/sse",
            headers: { Authorization: "Bearer token" },
          },
        ],
      };
      const middleware = new MCPAppsExtensionMiddleware(config);
      expect(middleware).toBeInstanceOf(MCPAppsExtensionMiddleware);
    });

    it("creates instance with multiple server configs", () => {
      const config = {
        mcpServers: [
          { type: "http" as const, url: "http://localhost:3001" },
          { type: "sse" as const, url: "http://localhost:3002/sse" },
        ],
      };
      const middleware = new MCPAppsExtensionMiddleware(config);
      expect(middleware).toBeInstanceOf(MCPAppsExtensionMiddleware);
    });
  });

  // =============================================================================
  // 2. Pass-Through Behavior (No MCP Servers)
  // =============================================================================
  describe("Pass-Through Behavior (No MCP Servers)", () => {
    it("passes through when mcpServers is empty array", async () => {
      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [] });
      const agent = new MockAgent([
        createRunStartedEvent(),
        createRunFinishedEvent(),
      ]);

      const events = await collectEvents(middleware.run(createRunAgentInput(), agent));

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe(EventType.RUN_STARTED);
      expect(events[1].type).toBe(EventType.RUN_FINISHED);
    });

    it("passes through when mcpServers is undefined", async () => {
      const middleware = new MCPAppsExtensionMiddleware({});
      const agent = new MockAgent([
        createRunStartedEvent(),
        createTextMessageStartEvent(),
        createTextMessageContentEvent(),
        createTextMessageEndEvent(),
        createRunFinishedEvent(),
      ]);

      const events = await collectEvents(middleware.run(createRunAgentInput(), agent));

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].type).toBe(EventType.RUN_STARTED);
      expect(events[events.length - 1].type).toBe(EventType.RUN_FINISHED);
    });

    it("events flow through unchanged when no servers configured", async () => {
      const middleware = new MCPAppsExtensionMiddleware();
      const inputEvents = [
        createRunStartedEvent("run-1", "thread-1"),
        createTextMessageStartEvent("msg-1"),
        createTextMessageContentEvent("msg-1", "Hello World"),
        createTextMessageEndEvent("msg-1"),
        createRunFinishedEvent("run-1", "thread-1", { success: true }),
      ];
      const agent = new MockAgent(inputEvents);

      const events = await collectEvents(middleware.run(createRunAgentInput(), agent));

      // The middleware uses runNextWithState which transforms chunks
      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(events[0].type).toBe(EventType.RUN_STARTED);
    });

    it("observable completes correctly with no servers", async () => {
      const middleware = new MCPAppsExtensionMiddleware();
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      let completed = false;
      await new Promise<void>((resolve) => {
        middleware.run(createRunAgentInput(), agent).subscribe({
          complete: () => {
            completed = true;
            resolve();
          },
        });
      });

      expect(completed).toBe(true);
    });

    it("error propagation works with no servers", async () => {
      const middleware = new MCPAppsExtensionMiddleware();
      const testError = new Error("Test error");
      const agent = new ErrorMockAgent(testError);

      let caughtError: Error | null = null;
      await new Promise<void>((resolve) => {
        middleware.run(createRunAgentInput(), agent).subscribe({
          error: (err) => {
            caughtError = err;
            resolve();
          },
          complete: () => resolve(),
        });
      });

      expect(caughtError).toBe(testError);
    });
  });

  // =============================================================================
  // 3. Tool Discovery Tests
  // =============================================================================
  describe("Tool Discovery", () => {
    const httpServerConfig: MCPClientConfig = { type: "http", url: "http://localhost:3000" };
    const sseServerConfig: MCPClientConfig = { type: "sse", url: "http://localhost:3001/sse" };

    it("connects to MCP server with correct capabilities", async () => {
      mockListTools.mockResolvedValue({ tools: [] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      expect(mockClientConstructorCalls).toHaveLength(1);
      expect(mockClientConstructorCalls[0].clientInfo).toEqual({
        name: "mcp-apps-middleware",
        version: "1.0.0",
      });
      expect(mockClientConstructorCalls[0].options).toMatchObject({
        capabilities: {
          extensions: {
            "io.modelcontextprotocol/ui": {
              mimeTypes: ["text/html+mcp"],
            },
          },
        },
      });
    });

    it("calls listTools on connected client", async () => {
      mockListTools.mockResolvedValue({ tools: [] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      expect(mockConnect).toHaveBeenCalled();
      expect(mockListTools).toHaveBeenCalled();
    });

    it("filters tools by ui/resourceUri presence", async () => {
      mockListTools.mockResolvedValue({
        tools: [
          createMCPToolWithUI("ui-tool", "ui://server/dashboard"),
          createMCPToolWithoutUI("non-ui-tool"),
          createMCPToolWithEmptyMeta("meta-but-no-ui"),
        ],
      });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      // Agent should receive enhanced input with only the UI tool
      expect(agent.runCalls).toHaveLength(1);
      const enhancedTools = agent.runCalls[0].tools;
      expect(enhancedTools).toHaveLength(1);
      expect(enhancedTools[0].name).toBe("ui-tool");
    });

    it("converts MCP tools to AG-UI Tool format correctly", async () => {
      mockListTools.mockResolvedValue({
        tools: [
          {
            name: "test-tool",
            description: "Test tool description",
            inputSchema: { type: "object", properties: { foo: { type: "string" } } },
            _meta: { "ui/resourceUri": "ui://server/test" },
          },
        ],
      });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      const enhancedTools = agent.runCalls[0].tools;
      expect(enhancedTools[0].name).toBe("test-tool");
      expect(enhancedTools[0].description).toContain("Test tool description");
      expect(enhancedTools[0].parameters).toEqual({
        type: "object",
        properties: { foo: { type: "string" } },
      });
    });

    it("stores ui/resourceUri in description", async () => {
      mockListTools.mockResolvedValue({
        tools: [createMCPToolWithUI("ui-tool", "ui://server/dashboard", "Original description")],
      });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      const enhancedTools = agent.runCalls[0].tools;
      expect(enhancedTools[0].description).toContain("Original description");
      expect(enhancedTools[0].description).toContain("[UI Resource: ui://server/dashboard]");
    });

    it("handles tools without _meta", async () => {
      mockListTools.mockResolvedValue({
        tools: [createMCPToolWithoutUI("no-meta-tool")],
      });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      // No UI tools should be added
      expect(agent.runCalls[0].tools).toHaveLength(0);
    });

    it("handles empty tools list from server", async () => {
      mockListTools.mockResolvedValue({ tools: [] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      expect(agent.runCalls[0].tools).toHaveLength(0);
    });

    it("handles server connection failures gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockConnect.mockRejectedValue(new Error("Connection failed"));

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      // Should not throw, should continue
      const events = await collectEvents(middleware.run(createRunAgentInput(), agent));

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to fetch tools from MCP server"),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("closes client connection after fetching tools", async () => {
      mockListTools.mockResolvedValue({ tools: [] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      expect(mockClose).toHaveBeenCalled();
    });

    it("works with HTTP transport", async () => {
      const { StreamableHTTPClientTransport } = await import(
        "@modelcontextprotocol/sdk/client/streamableHttp.js"
      );
      mockListTools.mockResolvedValue({ tools: [] });

      const middleware = new MCPAppsExtensionMiddleware({
        mcpServers: [{ type: "http", url: "http://localhost:3000" }],
      });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(new URL("http://localhost:3000"));
    });

    it("works with SSE transport", async () => {
      const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
      mockListTools.mockResolvedValue({ tools: [] });

      const middleware = new MCPAppsExtensionMiddleware({
        mcpServers: [{ type: "sse", url: "http://localhost:3001/sse" }],
      });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      expect(SSEClientTransport).toHaveBeenCalledWith(new URL("http://localhost:3001/sse"));
    });

    it("aggregates tools from multiple servers", async () => {
      // We need to track which server each call is for
      let callCount = 0;
      mockListTools.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            tools: [createMCPToolWithUI("tool-1", "ui://server1/tool1")],
          });
        }
        return Promise.resolve({
          tools: [createMCPToolWithUI("tool-2", "ui://server2/tool2")],
        });
      });

      const middleware = new MCPAppsExtensionMiddleware({
        mcpServers: [httpServerConfig, sseServerConfig],
      });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      expect(agent.runCalls[0].tools).toHaveLength(2);
      expect(agent.runCalls[0].tools.map((t) => t.name)).toContain("tool-1");
      expect(agent.runCalls[0].tools.map((t) => t.name)).toContain("tool-2");
    });
  });

  // =============================================================================
  // 4. Tool Injection Tests
  // =============================================================================
  describe("Tool Injection", () => {
    const httpServerConfig: MCPClientConfig = { type: "http", url: "http://localhost:3000" };

    it("merges UI tools with existing input tools", async () => {
      mockListTools.mockResolvedValue({
        tools: [createMCPToolWithUI("ui-tool", "ui://server/dashboard")],
      });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      const existingTool = createAGUITool("existing-tool");
      const input = createRunAgentInput({ tools: [existingTool] });

      await collectEvents(middleware.run(input, agent));

      expect(agent.runCalls[0].tools).toHaveLength(2);
      expect(agent.runCalls[0].tools[0].name).toBe("existing-tool");
      expect(agent.runCalls[0].tools[1].name).toBe("ui-tool");
    });

    it("preserves original input tools", async () => {
      mockListTools.mockResolvedValue({
        tools: [createMCPToolWithUI("ui-tool", "ui://server/dashboard")],
      });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      const originalTools = [
        createAGUITool("tool-a", "Description A"),
        createAGUITool("tool-b", "Description B"),
      ];
      const input = createRunAgentInput({ tools: originalTools });

      await collectEvents(middleware.run(input, agent));

      const resultTools = agent.runCalls[0].tools;
      expect(resultTools[0]).toEqual(originalTools[0]);
      expect(resultTools[1]).toEqual(originalTools[1]);
    });

    it("passes enhanced input to next agent", async () => {
      mockListTools.mockResolvedValue({
        tools: [createMCPToolWithUI("ui-tool", "ui://server/dashboard")],
      });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      const input = createRunAgentInput({
        threadId: "custom-thread",
        runId: "custom-run",
        state: { key: "value" },
      });

      await collectEvents(middleware.run(input, agent));

      expect(agent.runCalls[0].threadId).toBe("custom-thread");
      expect(agent.runCalls[0].runId).toBe("custom-run");
      expect(agent.runCalls[0].state).toEqual({ key: "value" });
      expect(agent.runCalls[0].tools.length).toBe(1);
    });
  });

  // =============================================================================
  // 5. Event Stream Processing Tests
  // =============================================================================
  describe("Event Stream Processing", () => {
    const httpServerConfig: MCPClientConfig = { type: "http", url: "http://localhost:3000" };

    it("emits non-RUN_FINISHED events immediately", async () => {
      mockListTools.mockResolvedValue({ tools: [] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([
        createRunStartedEvent(),
        createTextMessageStartEvent(),
        createTextMessageContentEvent(),
        createTextMessageEndEvent(),
        createRunFinishedEvent(),
      ]);

      const receivedEvents: BaseEvent[] = [];
      await new Promise<void>((resolve) => {
        middleware.run(createRunAgentInput(), agent).subscribe({
          next: (event) => receivedEvents.push(event),
          complete: () => resolve(),
        });
      });

      // First event should be RUN_STARTED
      expect(receivedEvents[0].type).toBe(EventType.RUN_STARTED);
      // Last event should be RUN_FINISHED
      expect(receivedEvents[receivedEvents.length - 1].type).toBe(EventType.RUN_FINISHED);
    });

    it("holds back RUN_FINISHED event until stream ends", async () => {
      mockListTools.mockResolvedValue({ tools: [] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new AsyncMockAgent(
        [createRunStartedEvent(), createRunFinishedEvent()],
        10
      );

      const receivedEvents: BaseEvent[] = [];
      let finishedReceived = false;

      await new Promise<void>((resolve) => {
        middleware.run(createRunAgentInput(), agent).subscribe({
          next: (event) => {
            receivedEvents.push(event);
            if (event.type === EventType.RUN_FINISHED) {
              finishedReceived = true;
            }
          },
          complete: () => resolve(),
        });
      });

      expect(finishedReceived).toBe(true);
      expect(receivedEvents[receivedEvents.length - 1].type).toBe(EventType.RUN_FINISHED);
    });

    it("handles error events correctly", async () => {
      mockListTools.mockResolvedValue({ tools: [] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const testError = new Error("Stream error");
      const agent = new ErrorMockAgent(testError);

      let caughtError: Error | null = null;
      await new Promise<void>((resolve) => {
        middleware.run(createRunAgentInput(), agent).subscribe({
          error: (err) => {
            caughtError = err;
            resolve();
          },
          complete: () => resolve(),
        });
      });

      expect(caughtError).toBe(testError);
    });

    it("subscription cleanup works", async () => {
      mockListTools.mockResolvedValue({ tools: [] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new AsyncMockAgent(
        [
          createRunStartedEvent(),
          createTextMessageStartEvent(),
          createTextMessageContentEvent(),
          createRunFinishedEvent(),
        ],
        50
      );

      let eventCount = 0;
      const subscription = middleware.run(createRunAgentInput(), agent).subscribe({
        next: () => {
          eventCount++;
          if (eventCount === 2) {
            subscription.unsubscribe();
          }
        },
      });

      // Wait a bit to ensure no more events are received after unsubscribe
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(eventCount).toBe(2);
    });
  });

  // =============================================================================
  // 6. Pending Tool Call Detection Tests
  // =============================================================================
  describe("Pending Tool Call Detection", () => {
    const httpServerConfig: MCPClientConfig = { type: "http", url: "http://localhost:3000" };

    it("processes pending UI tool calls on stream completion", async () => {
      const uiTool = createMCPToolWithUI("ui-weather", "ui://weather/dashboard");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Weather result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://weather/dashboard", "text/html+mcp", "<html>Dashboard</html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      // Create an assistant message with a tool call that won't have a result
      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-weather", args: { city: "London" }, id: "tc-1" },
      ]);

      // Agent emits events but doesn't emit a tool result
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      // Set up input with the assistant message containing the tool call
      const input = createRunAgentInput({
        messages: [assistantMsg],
      });

      const events = await collectEvents(middleware.run(input, agent));

      // Should have emitted TOOL_CALL_RESULT and ACTIVITY_SNAPSHOT events
      const toolResultEvents = events.filter((e) => e.type === EventType.TOOL_CALL_RESULT);
      const activityEvents = events.filter((e) => e.type === EventType.ACTIVITY_SNAPSHOT);

      expect(toolResultEvents.length).toBe(1);
      expect(activityEvents.length).toBe(1);
    });

    it("identifies resolved tool calls (role: tool messages)", async () => {
      const uiTool = createMCPToolWithUI("ui-weather", "ui://weather/dashboard");
      mockListTools.mockResolvedValue({ tools: [uiTool] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      // Create assistant message with tool call AND a tool result message
      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-weather", args: { city: "London" }, id: "tc-1" },
      ]);
      const toolResultMsg = createToolResultMessage("tc-1", "Already resolved");

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      const input = createRunAgentInput({
        messages: [assistantMsg, toolResultMsg],
      });

      const events = await collectEvents(middleware.run(input, agent));

      // Should NOT emit additional TOOL_CALL_RESULT since it's already resolved
      const toolResultEvents = events.filter((e) => e.type === EventType.TOOL_CALL_RESULT);
      expect(toolResultEvents.length).toBe(0);
    });

    it("handles empty message arrays", async () => {
      mockListTools.mockResolvedValue({
        tools: [createMCPToolWithUI("ui-tool", "ui://server/tool")],
      });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      const input = createRunAgentInput({ messages: [] });
      const events = await collectEvents(middleware.run(input, agent));

      // Should complete without errors
      expect(events[events.length - 1].type).toBe(EventType.RUN_FINISHED);
    });

    it("handles messages without tool calls", async () => {
      mockListTools.mockResolvedValue({
        tools: [createMCPToolWithUI("ui-tool", "ui://server/tool")],
      });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      const input = createRunAgentInput({
        messages: [
          { id: "msg-1", role: "user", content: "Hello" },
          { id: "msg-2", role: "assistant", content: "Hi there" },
        ],
      });

      const events = await collectEvents(middleware.run(input, agent));

      // Should complete without emitting tool results
      const toolResultEvents = events.filter((e) => e.type === EventType.TOOL_CALL_RESULT);
      expect(toolResultEvents.length).toBe(0);
    });

    it("handles multiple tool calls per message", async () => {
      const uiTool1 = createMCPToolWithUI("ui-weather", "ui://weather/dashboard");
      const uiTool2 = createMCPToolWithUI("ui-stocks", "ui://stocks/chart");
      mockListTools.mockResolvedValue({ tools: [uiTool1, uiTool2] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://test", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-weather", args: {}, id: "tc-1" },
        { name: "ui-stocks", args: {}, id: "tc-2" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const toolResultEvents = events.filter((e) => e.type === EventType.TOOL_CALL_RESULT);
      expect(toolResultEvents.length).toBe(2);
    });
  });

  // =============================================================================
  // 7. Tool Execution Tests
  // =============================================================================
  describe("Tool Execution", () => {
    const httpServerConfig: MCPClientConfig = { type: "http", url: "http://localhost:3000" };

    it("passes correct tool name and arguments", async () => {
      const uiTool = createMCPToolWithUI("ui-weather", "ui://weather/dashboard");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Sunny" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://weather/dashboard", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-weather", args: { city: "London", units: "metric" }, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      await collectEvents(middleware.run(input, agent));

      expect(mockCallTool).toHaveBeenCalledWith({
        name: "ui-weather",
        arguments: { city: "London", units: "metric" },
      });
    });

    it("returns raw MCP result", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });

      const mcpResult = createMCPToolCallResult([
        { type: "text", text: "First" },
        { type: "text", text: "Second" },
      ]);
      mockCallTool.mockResolvedValue(mcpResult);
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const activityEvent = events.find((e) => e.type === EventType.ACTIVITY_SNAPSHOT);
      expect(activityEvent).toBeDefined();
      expect((activityEvent as any).content.result).toEqual(mcpResult);
    });

    it("handles tool execution errors", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockRejectedValue(new Error("Execution failed"));

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      // Should emit error tool result
      const toolResultEvents = events.filter((e) => e.type === EventType.TOOL_CALL_RESULT);
      expect(toolResultEvents.length).toBe(1);
      expect((toolResultEvents[0] as any).content).toContain("error");

      consoleErrorSpy.mockRestore();
    });

    it("closes connection after execution", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      await collectEvents(middleware.run(input, agent));

      // close should be called multiple times (once for listTools, once for callTool, once for readResource)
      expect(mockClose).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // 8. Resource Reading Tests
  // =============================================================================
  describe("Resource Reading", () => {
    const httpServerConfig: MCPClientConfig = { type: "http", url: "http://localhost:3000" };

    it("reads resource by URI", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/dashboard");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/dashboard", "text/html+mcp", "<html>Dashboard</html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      await collectEvents(middleware.run(input, agent));

      expect(mockReadResource).toHaveBeenCalledWith({
        uri: "ui://server/dashboard",
      });
    });

    it("returns first content item", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );

      const resourceContent = {
        uri: "ui://server/tool",
        mimeType: "text/html+mcp",
        text: "<html><body>First</body></html>",
      };
      mockReadResource.mockResolvedValue({
        contents: [
          resourceContent,
          { uri: "ui://server/tool2", mimeType: "text/html+mcp", text: "Second" },
        ],
      });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const activityEvent = events.find((e) => e.type === EventType.ACTIVITY_SNAPSHOT);
      expect((activityEvent as any).content.resource).toEqual(resourceContent);
    });

    it("handles read errors", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockRejectedValue(new Error("Resource not found"));

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      // Should emit error result
      const toolResultEvents = events.filter((e) => e.type === EventType.TOOL_CALL_RESULT);
      expect(toolResultEvents.length).toBe(1);
      expect((toolResultEvents[0] as any).content).toContain("error");

      consoleErrorSpy.mockRestore();
    });
  });

  // =============================================================================
  // 9. Tool Result Events Tests
  // =============================================================================
  describe("Tool Result Events", () => {
    const httpServerConfig: MCPClientConfig = { type: "http", url: "http://localhost:3000" };

    it("emits TOOL_CALL_RESULT event with correct toolCallId", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "specific-tc-id" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const toolResultEvent = events.find((e) => e.type === EventType.TOOL_CALL_RESULT);
      expect((toolResultEvent as any).toolCallId).toBe("specific-tc-id");
    });

    it("extracts text content from MCP result", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([
          { type: "text", text: "Line 1" },
          { type: "text", text: "Line 2" },
        ])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const toolResultEvent = events.find((e) => e.type === EventType.TOOL_CALL_RESULT);
      expect((toolResultEvent as any).content).toBe("Line 1\nLine 2");
    });

    it("falls back to JSON.stringify for non-text content", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "image", data: "base64data" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const toolResultEvent = events.find((e) => e.type === EventType.TOOL_CALL_RESULT);
      expect((toolResultEvent as any).content).toContain("image");
      expect((toolResultEvent as any).content).toContain("base64data");
    });

    it("emits ACTIVITY_SNAPSHOT with MCP result and resource", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });

      const mcpResult = createMCPToolCallResult([{ type: "text", text: "Result" }]);
      const resourceContent = {
        uri: "ui://server/tool",
        mimeType: "text/html+mcp",
        text: "<html></html>",
      };

      mockCallTool.mockResolvedValue(mcpResult);
      mockReadResource.mockResolvedValue({ contents: [resourceContent] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const activityEvent = events.find((e) => e.type === EventType.ACTIVITY_SNAPSHOT);
      expect(activityEvent).toBeDefined();
      expect((activityEvent as any).content.result).toEqual(mcpResult);
      expect((activityEvent as any).content.resource).toEqual(resourceContent);
    });

    it("sets activityType to MCP-APPS-EXTENSION", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const activityEvent = events.find((e) => e.type === EventType.ACTIVITY_SNAPSHOT);
      expect((activityEvent as any).activityType).toBe("MCP-APPS-EXTENSION");
    });

    it("sets replace: true on activity snapshot", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const activityEvent = events.find((e) => e.type === EventType.ACTIVITY_SNAPSHOT);
      expect((activityEvent as any).replace).toBe(true);
    });
  });

  // =============================================================================
  // 10. Content Extraction Tests
  // =============================================================================
  describe("Content Extraction", () => {
    const httpServerConfig: MCPClientConfig = { type: "http", url: "http://localhost:3000" };

    it("joins multiple text items with newline", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([
          { type: "text", text: "First line" },
          { type: "text", text: "Second line" },
          { type: "text", text: "Third line" },
        ])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const toolResultEvent = events.find((e) => e.type === EventType.TOOL_CALL_RESULT);
      expect((toolResultEvent as any).content).toBe("First line\nSecond line\nThird line");
    });

    it("handles empty content array", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue({ content: [] });
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const toolResultEvent = events.find((e) => e.type === EventType.TOOL_CALL_RESULT);
      expect((toolResultEvent as any).content).toBe("[]");
    });

    it("handles mixed content types", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([
          { type: "text", text: "Text content" },
          { type: "image", data: "imagedata" },
          { type: "text", text: "More text" },
        ])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const toolResultEvent = events.find((e) => e.type === EventType.TOOL_CALL_RESULT);
      // Should only extract text items
      expect((toolResultEvent as any).content).toBe("Text content\nMore text");
    });
  });

  // =============================================================================
  // 11. Proxied MCP Request Mode Tests
  // =============================================================================
  describe("Proxied MCP Request Mode", () => {
    it("detects proxied request in forwardedProps", async () => {
      const middleware = new MCPAppsExtensionMiddleware();
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      const proxiedRequest: ProxiedMCPRequest = {
        serverUrl: "http://localhost:3000",
        serverType: "http",
        method: "ping",
      };

      const input = createRunAgentInput({
        forwardedProps: { __proxiedMCPRequest: proxiedRequest },
      });

      const events = await collectEvents(middleware.run(input, agent));

      // Should bypass normal agent flow (agent.run should not be called with our input)
      expect(events[0].type).toBe(EventType.RUN_STARTED);
      expect(events[events.length - 1].type).toBe(EventType.RUN_FINISHED);
    });

    it("emits RUN_STARTED event", async () => {
      mockPing.mockResolvedValue({});

      const middleware = new MCPAppsExtensionMiddleware();
      const agent = new MockAgent([]);

      const proxiedRequest: ProxiedMCPRequest = {
        serverUrl: "http://localhost:3000",
        serverType: "http",
        method: "ping",
      };

      const input = createRunAgentInput({
        runId: "proxy-run",
        forwardedProps: { __proxiedMCPRequest: proxiedRequest },
      });

      const events = await collectEvents(middleware.run(input, agent));

      expect(events[0].type).toBe(EventType.RUN_STARTED);
      expect((events[0] as any).runId).toBe("proxy-run");
    });

    it("emits RUN_FINISHED with result on success", async () => {
      const pingResult = { timestamp: Date.now() };
      mockPing.mockResolvedValue(pingResult);

      const middleware = new MCPAppsExtensionMiddleware();
      const agent = new MockAgent([]);

      const proxiedRequest: ProxiedMCPRequest = {
        serverUrl: "http://localhost:3000",
        serverType: "http",
        method: "ping",
      };

      const input = createRunAgentInput({
        forwardedProps: { __proxiedMCPRequest: proxiedRequest },
      });

      const events = await collectEvents(middleware.run(input, agent));

      const finishedEvent = events.find((e) => e.type === EventType.RUN_FINISHED);
      expect(finishedEvent).toBeDefined();
      expect((finishedEvent as any).result).toEqual(pingResult);
    });

    it("emits RUN_FINISHED with error on failure", async () => {
      mockConnect.mockRejectedValue(new Error("Connection refused"));

      const middleware = new MCPAppsExtensionMiddleware();
      const agent = new MockAgent([]);

      const proxiedRequest: ProxiedMCPRequest = {
        serverUrl: "http://localhost:3000",
        serverType: "http",
        method: "ping",
      };

      const input = createRunAgentInput({
        forwardedProps: { __proxiedMCPRequest: proxiedRequest },
      });

      const events = await collectEvents(middleware.run(input, agent));

      const finishedEvent = events.find((e) => e.type === EventType.RUN_FINISHED);
      expect((finishedEvent as any).result.error).toContain("Connection refused");
    });

    it("bypasses normal agent flow", async () => {
      mockPing.mockResolvedValue({});

      const middleware = new MCPAppsExtensionMiddleware({
        mcpServers: [{ type: "http", url: "http://localhost:3001" }],
      });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      const proxiedRequest: ProxiedMCPRequest = {
        serverUrl: "http://localhost:3000",
        serverType: "http",
        method: "ping",
      };

      const input = createRunAgentInput({
        forwardedProps: { __proxiedMCPRequest: proxiedRequest },
      });

      await collectEvents(middleware.run(input, agent));

      // Agent's run should not have been called
      expect(agent.runCalls).toHaveLength(0);
    });
  });

  // =============================================================================
  // 12. Proxied Request Execution Tests
  // =============================================================================
  describe("Proxied Request Execution", () => {
    it("handles tools/call method", async () => {
      const toolResult = createMCPToolCallResult([{ type: "text", text: "Tool executed" }]);
      mockCallTool.mockResolvedValue(toolResult);

      const middleware = new MCPAppsExtensionMiddleware();
      const agent = new MockAgent([]);

      const proxiedRequest: ProxiedMCPRequest = {
        serverUrl: "http://localhost:3000",
        serverType: "http",
        method: "tools/call",
        params: { name: "test-tool", arguments: { foo: "bar" } },
      };

      const input = createRunAgentInput({
        forwardedProps: { __proxiedMCPRequest: proxiedRequest },
      });

      const events = await collectEvents(middleware.run(input, agent));

      expect(mockCallTool).toHaveBeenCalledWith({
        name: "test-tool",
        arguments: { foo: "bar" },
      });

      const finishedEvent = events.find((e) => e.type === EventType.RUN_FINISHED);
      expect((finishedEvent as any).result).toEqual(toolResult);
    });

    it("handles resources/read method", async () => {
      const resourceResult = createMCPResourceResult(
        "ui://server/resource",
        "text/html+mcp",
        "<html></html>"
      );
      mockReadResource.mockResolvedValue(resourceResult);

      const middleware = new MCPAppsExtensionMiddleware();
      const agent = new MockAgent([]);

      const proxiedRequest: ProxiedMCPRequest = {
        serverUrl: "http://localhost:3000",
        serverType: "http",
        method: "resources/read",
        params: { uri: "ui://server/resource" },
      };

      const input = createRunAgentInput({
        forwardedProps: { __proxiedMCPRequest: proxiedRequest },
      });

      const events = await collectEvents(middleware.run(input, agent));

      expect(mockReadResource).toHaveBeenCalledWith({
        uri: "ui://server/resource",
      });

      const finishedEvent = events.find((e) => e.type === EventType.RUN_FINISHED);
      expect((finishedEvent as any).result).toEqual(resourceResult);
    });

    it("handles notifications/message method (one-way)", async () => {
      mockNotification.mockResolvedValue(undefined);

      const middleware = new MCPAppsExtensionMiddleware();
      const agent = new MockAgent([]);

      const proxiedRequest: ProxiedMCPRequest = {
        serverUrl: "http://localhost:3000",
        serverType: "http",
        method: "notifications/message",
        params: { level: "info", message: "Test notification" },
      };

      const input = createRunAgentInput({
        forwardedProps: { __proxiedMCPRequest: proxiedRequest },
      });

      const events = await collectEvents(middleware.run(input, agent));

      expect(mockNotification).toHaveBeenCalledWith({
        method: "notifications/message",
        params: { level: "info", message: "Test notification" },
      });

      const finishedEvent = events.find((e) => e.type === EventType.RUN_FINISHED);
      expect((finishedEvent as any).result).toEqual({ success: true });
    });

    it("handles ping method", async () => {
      const pingResult = { timestamp: 1234567890 };
      mockPing.mockResolvedValue(pingResult);

      const middleware = new MCPAppsExtensionMiddleware();
      const agent = new MockAgent([]);

      const proxiedRequest: ProxiedMCPRequest = {
        serverUrl: "http://localhost:3000",
        serverType: "http",
        method: "ping",
      };

      const input = createRunAgentInput({
        forwardedProps: { __proxiedMCPRequest: proxiedRequest },
      });

      const events = await collectEvents(middleware.run(input, agent));

      expect(mockPing).toHaveBeenCalled();

      const finishedEvent = events.find((e) => e.type === EventType.RUN_FINISHED);
      expect((finishedEvent as any).result).toEqual(pingResult);
    });

    it("rejects disallowed methods", async () => {
      const middleware = new MCPAppsExtensionMiddleware();
      const agent = new MockAgent([]);

      const proxiedRequest: ProxiedMCPRequest = {
        serverUrl: "http://localhost:3000",
        serverType: "http",
        method: "sampling/createMessage",
      };

      const input = createRunAgentInput({
        forwardedProps: { __proxiedMCPRequest: proxiedRequest },
      });

      const events = await collectEvents(middleware.run(input, agent));

      const finishedEvent = events.find((e) => e.type === EventType.RUN_FINISHED);
      expect((finishedEvent as any).result.error).toContain("not allowed");
    });

    it("uses HTTP transport when serverType is http", async () => {
      const { StreamableHTTPClientTransport } = await import(
        "@modelcontextprotocol/sdk/client/streamableHttp.js"
      );
      mockPing.mockResolvedValue({});

      const middleware = new MCPAppsExtensionMiddleware();
      const agent = new MockAgent([]);

      const proxiedRequest: ProxiedMCPRequest = {
        serverUrl: "http://localhost:3000",
        serverType: "http",
        method: "ping",
      };

      const input = createRunAgentInput({
        forwardedProps: { __proxiedMCPRequest: proxiedRequest },
      });

      await collectEvents(middleware.run(input, agent));

      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith(new URL("http://localhost:3000"));
    });

    it("uses SSE transport when serverType is sse", async () => {
      const { SSEClientTransport } = await import("@modelcontextprotocol/sdk/client/sse.js");
      mockPing.mockResolvedValue({});

      const middleware = new MCPAppsExtensionMiddleware();
      const agent = new MockAgent([]);

      const proxiedRequest: ProxiedMCPRequest = {
        serverUrl: "http://localhost:3000/sse",
        serverType: "sse",
        method: "ping",
      };

      const input = createRunAgentInput({
        forwardedProps: { __proxiedMCPRequest: proxiedRequest },
      });

      await collectEvents(middleware.run(input, agent));

      expect(SSEClientTransport).toHaveBeenCalledWith(new URL("http://localhost:3000/sse"));
    });
  });

  // =============================================================================
  // 13. SEP-1865 Spec Compliance Tests
  // =============================================================================
  describe("SEP-1865 Spec Compliance", () => {
    const httpServerConfig: MCPClientConfig = { type: "http", url: "http://localhost:3000" };

    it("tool metadata uses ui/resourceUri key", async () => {
      mockListTools.mockResolvedValue({
        tools: [
          {
            name: "tool",
            description: "desc",
            inputSchema: {},
            _meta: { "ui/resourceUri": "ui://server/tool" },
          },
        ],
      });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      // Tool should be detected as UI tool
      expect(agent.runCalls[0].tools).toHaveLength(1);
    });

    it("capability negotiation uses io.modelcontextprotocol/ui extension key", async () => {
      mockListTools.mockResolvedValue({ tools: [] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      expect(mockClientConstructorCalls.length).toBeGreaterThan(0);
      const options = mockClientConstructorCalls[0].options as {
        capabilities?: { extensions?: Record<string, unknown> };
      };
      expect(options.capabilities?.extensions).toHaveProperty("io.modelcontextprotocol/ui");
    });

    it("advertises text/html+mcp mimeType", async () => {
      mockListTools.mockResolvedValue({ tools: [] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      expect(mockClientConstructorCalls.length).toBeGreaterThan(0);
      const options = mockClientConstructorCalls[0].options as {
        capabilities?: { extensions?: { "io.modelcontextprotocol/ui"?: { mimeTypes?: string[] } } };
      };
      expect(options.capabilities?.extensions?.["io.modelcontextprotocol/ui"]?.mimeTypes).toContain(
        "text/html+mcp"
      );
    });

    it("fallback behavior: ignores tools without ui/resourceUri", async () => {
      mockListTools.mockResolvedValue({
        tools: [
          createMCPToolWithoutUI("regular-tool"),
          createMCPToolWithUI("ui-tool", "ui://server/tool"),
        ],
      });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      // Only UI tool should be injected
      expect(agent.runCalls[0].tools).toHaveLength(1);
      expect(agent.runCalls[0].tools[0].name).toBe("ui-tool");
    });
  });

  // =============================================================================
  // 14. Error Handling Tests
  // =============================================================================
  describe("Error Handling", () => {
    const httpServerConfig: MCPClientConfig = { type: "http", url: "http://localhost:3000" };

    it("handles MCP server connection timeout", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockConnect.mockImplementation(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10))
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      const events = await collectEvents(middleware.run(createRunAgentInput(), agent));

      expect(events.length).toBeGreaterThanOrEqual(2);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("handles JSON parse error on tool arguments", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      // Create malformed tool call
      const assistantMsg = {
        id: "msg-1",
        role: "assistant" as const,
        toolCalls: [
          {
            id: "tc-1",
            type: "function" as const,
            function: {
              name: "ui-tool",
              arguments: "{ invalid json",
            },
          },
        ],
      };

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      // Should emit error result
      const toolResultEvents = events.filter((e) => e.type === EventType.TOOL_CALL_RESULT);
      expect(toolResultEvents.length).toBe(1);
      expect((toolResultEvents[0] as any).content).toContain("error");

      consoleErrorSpy.mockRestore();
    });
  });

  // =============================================================================
  // 15. Edge Cases Tests
  // =============================================================================
  describe("Edge Cases", () => {
    const httpServerConfig: MCPClientConfig = { type: "http", url: "http://localhost:3000" };

    it("handles empty tool arguments", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      expect(mockCallTool).toHaveBeenCalledWith({
        name: "ui-tool",
        arguments: {},
      });
      expect(events.some((e) => e.type === EventType.TOOL_CALL_RESULT)).toBe(true);
    });

    it("handles large tool arguments", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const largeData = "x".repeat(100000);
      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: { data: largeData }, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      expect(mockCallTool).toHaveBeenCalledWith({
        name: "ui-tool",
        arguments: { data: largeData },
      });
      expect(events.some((e) => e.type === EventType.TOOL_CALL_RESULT)).toBe(true);
    });

    it("handles multiple UI tools from same server", async () => {
      mockListTools.mockResolvedValue({
        tools: [
          createMCPToolWithUI("ui-tool-1", "ui://server/tool1"),
          createMCPToolWithUI("ui-tool-2", "ui://server/tool2"),
          createMCPToolWithUI("ui-tool-3", "ui://server/tool3"),
        ],
      });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });
      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);

      await collectEvents(middleware.run(createRunAgentInput(), agent));

      expect(agent.runCalls[0].tools).toHaveLength(3);
    });

    it("handles rapid sequential requests", async () => {
      mockListTools.mockResolvedValue({ tools: [] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const results = await Promise.all([
        collectEvents(
          middleware.run(
            createRunAgentInput({ runId: "run-1" }),
            new MockAgent([
              createRunStartedEvent("run-1"),
              createRunFinishedEvent("run-1"),
            ])
          )
        ),
        collectEvents(
          middleware.run(
            createRunAgentInput({ runId: "run-2" }),
            new MockAgent([
              createRunStartedEvent("run-2"),
              createRunFinishedEvent("run-2"),
            ])
          )
        ),
        collectEvents(
          middleware.run(
            createRunAgentInput({ runId: "run-3" }),
            new MockAgent([
              createRunStartedEvent("run-3"),
              createRunFinishedEvent("run-3"),
            ])
          )
        ),
      ]);

      expect(results).toHaveLength(3);
      results.forEach((events) => {
        expect(events[0].type).toBe(EventType.RUN_STARTED);
        expect(events[events.length - 1].type).toBe(EventType.RUN_FINISHED);
      });
    });
  });

  // =============================================================================
  // 16. Activity Event Injection Tests
  // =============================================================================
  describe("Activity Event Injection", () => {
    const httpServerConfig: MCPClientConfig = { type: "http", url: "http://localhost:3000" };

    it("emits ACTIVITY_SNAPSHOT for each pending UI tool call", async () => {
      const uiTool1 = createMCPToolWithUI("ui-tool-1", "ui://server/tool1");
      const uiTool2 = createMCPToolWithUI("ui-tool-2", "ui://server/tool2");
      mockListTools.mockResolvedValue({ tools: [uiTool1, uiTool2] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool-1", args: { param: "a" }, id: "tc-1" },
        { name: "ui-tool-2", args: { param: "b" }, id: "tc-2" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const activityEvents = events.filter((e) => e.type === EventType.ACTIVITY_SNAPSHOT);
      expect(activityEvents).toHaveLength(2);
    });

    it("emits TOOL_CALL_RESULT before ACTIVITY_SNAPSHOT for each tool", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const toolResultIndex = events.findIndex((e) => e.type === EventType.TOOL_CALL_RESULT);
      const activityIndex = events.findIndex((e) => e.type === EventType.ACTIVITY_SNAPSHOT);

      expect(toolResultIndex).toBeLessThan(activityIndex);
    });

    it("emits TOOL_CALL_RESULT and ACTIVITY_SNAPSHOT before RUN_FINISHED", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const runFinishedIndex = events.findIndex((e) => e.type === EventType.RUN_FINISHED);
      const activityIndex = events.findIndex((e) => e.type === EventType.ACTIVITY_SNAPSHOT);
      const toolResultIndex = events.findIndex((e) => e.type === EventType.TOOL_CALL_RESULT);

      expect(toolResultIndex).toBeLessThan(runFinishedIndex);
      expect(activityIndex).toBeLessThan(runFinishedIndex);
    });

    it("ACTIVITY_SNAPSHOT has a unique messageId", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const activityEvent = events.find((e) => e.type === EventType.ACTIVITY_SNAPSHOT);
      expect((activityEvent as any).messageId).toBeDefined();
      expect(typeof (activityEvent as any).messageId).toBe("string");
      expect((activityEvent as any).messageId.length).toBeGreaterThan(0);
    });

    it("TOOL_CALL_RESULT has a unique messageId", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const toolResultEvent = events.find((e) => e.type === EventType.TOOL_CALL_RESULT);
      expect((toolResultEvent as any).messageId).toBeDefined();
      expect(typeof (toolResultEvent as any).messageId).toBe("string");
      expect((toolResultEvent as any).messageId.length).toBeGreaterThan(0);
    });

    it("passes tool arguments correctly to MCP server", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const toolArgs = { query: "test", limit: 10, nested: { value: "deep" } };
      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: toolArgs, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      await collectEvents(middleware.run(input, agent));

      expect(mockCallTool).toHaveBeenCalledWith({
        name: "ui-tool",
        arguments: toolArgs,
      });
    });

    it("resource in ACTIVITY_SNAPSHOT includes uri and mimeType", async () => {
      const resourceUri = "ui://server/dashboard";
      const uiTool = createMCPToolWithUI("ui-tool", resourceUri);
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );

      const resourceContent = {
        uri: resourceUri,
        mimeType: "text/html+mcp",
        text: "<!DOCTYPE html><html><body>UI Content</body></html>",
      };
      mockReadResource.mockResolvedValue({ contents: [resourceContent] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const activityEvent = events.find((e) => e.type === EventType.ACTIVITY_SNAPSHOT);
      expect((activityEvent as any).content.resource.uri).toBe(resourceUri);
      expect((activityEvent as any).content.resource.mimeType).toBe("text/html+mcp");
      expect((activityEvent as any).content.resource.text).toContain("UI Content");
    });

    it("handles blob (base64) content in resource", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );

      // Resource with blob instead of text
      const resourceContent = {
        uri: "ui://server/tool",
        mimeType: "text/html+mcp",
        blob: "PCFET0NUWVBFIGh0bWw+", // base64 encoded "<!DOCTYPE html>"
      };
      mockReadResource.mockResolvedValue({ contents: [resourceContent] });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: {}, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      const activityEvent = events.find((e) => e.type === EventType.ACTIVITY_SNAPSHOT);
      expect((activityEvent as any).content.resource.blob).toBe("PCFET0NUWVBFIGh0bWw+");
    });

    it("full end-to-end flow: RUN_STARTED → tool call → TOOL_CALL_RESULT → ACTIVITY_SNAPSHOT → RUN_FINISHED", async () => {
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      mockListTools.mockResolvedValue({ tools: [uiTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Tool executed successfully" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html><body>UI</body></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool", args: { action: "render" }, id: "tc-1" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      // Verify event sequence
      const eventTypes = events.map((e) => e.type);
      expect(eventTypes).toEqual([
        EventType.RUN_STARTED,
        EventType.TOOL_CALL_RESULT,
        EventType.ACTIVITY_SNAPSHOT,
        EventType.RUN_FINISHED,
      ]);

      // Verify content
      const toolResultEvent = events.find((e) => e.type === EventType.TOOL_CALL_RESULT) as any;
      expect(toolResultEvent.content).toBe("Tool executed successfully");
      expect(toolResultEvent.toolCallId).toBe("tc-1");

      const activityEvent = events.find((e) => e.type === EventType.ACTIVITY_SNAPSHOT) as any;
      expect(activityEvent.activityType).toBe("MCP-APPS-EXTENSION");
      expect(activityEvent.replace).toBe(true);
      expect(activityEvent.content.resource.text).toContain("UI");
    });

    it("does not emit activity events for non-UI tools", async () => {
      // Mix of UI and non-UI tools
      const uiTool = createMCPToolWithUI("ui-tool", "ui://server/tool");
      const regularTool = createMCPToolWithoutUI("regular-tool");
      mockListTools.mockResolvedValue({ tools: [uiTool, regularTool] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockResolvedValue(
        createMCPResourceResult("ui://server/tool", "text/html+mcp", "<html></html>")
      );

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      // Call both UI and non-UI tools
      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "regular-tool", args: {}, id: "tc-regular" },
        { name: "ui-tool", args: {}, id: "tc-ui" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      const events = await collectEvents(middleware.run(input, agent));

      // Only one ACTIVITY_SNAPSHOT (for the UI tool)
      const activityEvents = events.filter((e) => e.type === EventType.ACTIVITY_SNAPSHOT);
      expect(activityEvents).toHaveLength(1);

      // Only one TOOL_CALL_RESULT (for the UI tool)
      const toolResultEvents = events.filter((e) => e.type === EventType.TOOL_CALL_RESULT);
      expect(toolResultEvents).toHaveLength(1);
      expect((toolResultEvents[0] as any).toolCallId).toBe("tc-ui");
    });

    it("reads the correct resource URI for each UI tool", async () => {
      const uiTool1 = createMCPToolWithUI("ui-tool-1", "ui://server/dashboard");
      const uiTool2 = createMCPToolWithUI("ui-tool-2", "ui://server/settings");
      mockListTools.mockResolvedValue({ tools: [uiTool1, uiTool2] });
      mockCallTool.mockResolvedValue(
        createMCPToolCallResult([{ type: "text", text: "Result" }])
      );
      mockReadResource.mockImplementation((params: { uri: string }) => {
        if (params.uri === "ui://server/dashboard") {
          return Promise.resolve({
            contents: [{ uri: params.uri, mimeType: "text/html+mcp", text: "<html>Dashboard</html>" }],
          });
        }
        return Promise.resolve({
          contents: [{ uri: params.uri, mimeType: "text/html+mcp", text: "<html>Settings</html>" }],
        });
      });

      const middleware = new MCPAppsExtensionMiddleware({ mcpServers: [httpServerConfig] });

      const assistantMsg = createAssistantMessageWithToolCalls([
        { name: "ui-tool-1", args: {}, id: "tc-1" },
        { name: "ui-tool-2", args: {}, id: "tc-2" },
      ]);

      const agent = new MockAgent([createRunStartedEvent(), createRunFinishedEvent()]);
      const input = createRunAgentInput({ messages: [assistantMsg] });

      await collectEvents(middleware.run(input, agent));

      // Verify readResource was called with correct URIs
      expect(mockReadResource).toHaveBeenCalledWith({ uri: "ui://server/dashboard" });
      expect(mockReadResource).toHaveBeenCalledWith({ uri: "ui://server/settings" });
    });
  });
});

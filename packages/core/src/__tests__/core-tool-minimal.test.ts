import { describe, it, expect, beforeEach, vi } from "vitest";
import { CopilotKitCore } from "../core";
import {
  MockAgent,
  createToolCallMessage,
  createTool,
} from "./test-utils";

describe("CopilotKitCore Tool Minimal", () => {
  let copilotKitCore: CopilotKitCore;

  beforeEach(() => {
    copilotKitCore = new CopilotKitCore({});
  });

  it("should execute tool with string result", async () => {
    const toolName = "stringTool";
    const tool = createTool({
      name: toolName,
      handler: vi.fn(async () => "String result"),
    });
    copilotKitCore.addTool(tool);

    const message = createToolCallMessage(toolName, { input: "test" });
    const agent = new MockAgent({ newMessages: [message] });

    await copilotKitCore.runAgent({ agent: agent as any });

    expect(tool.handler).toHaveBeenCalledTimes(1);
    const [firstCallArgs] = tool.handler.mock.calls;
    expect(firstCallArgs?.[0]).toEqual({ input: "test" });
    expect(firstCallArgs?.[1]).toMatchObject({
      function: { name: toolName },
      type: "function",
    });
    expect(agent.messages.some(m => m.role === "tool")).toBe(true);
  });

  it("should skip tool call when tool not found", async () => {
    const message = createToolCallMessage("nonExistentTool");
    const agent = new MockAgent({ newMessages: [message] });

    await copilotKitCore.runAgent({ agent: agent as any });

    expect(agent.messages.filter(m => m.role === "tool")).toHaveLength(0);
  });
});
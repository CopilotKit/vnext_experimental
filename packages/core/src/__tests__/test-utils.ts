import { Message } from "@ag-ui/client";
import { vi } from "vitest";
import { FrontendTool } from "../types";

export interface MockAgentOptions {
  messages?: Message[];
  newMessages?: Message[];
  error?: Error | string;
  runAgentDelay?: number;
  runAgentCallback?: (input: any) => void;
}

export class MockAgent {
  public messages: Message[] = [];
  public addMessages = vi.fn((messages: Message[]) => {
    this.messages.push(...messages);
  });
  
  private newMessages: Message[];
  private error?: Error | string;
  private runAgentDelay: number;
  public runAgentCallback?: (input: any) => void;
  public runAgentCalls: any[] = [];

  constructor(options: MockAgentOptions = {}) {
    this.messages = options.messages || [];
    this.newMessages = options.newMessages || [];
    this.error = options.error;
    this.runAgentDelay = options.runAgentDelay || 0;
    this.runAgentCallback = options.runAgentCallback;
  }

  async runAgent(input: any): Promise<{ newMessages: Message[] }> {
    this.runAgentCalls.push(input);
    
    if (this.runAgentCallback) {
      this.runAgentCallback(input);
    }

    if (this.runAgentDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.runAgentDelay));
    }

    if (this.error) {
      throw this.error;
    }

    return { newMessages: this.newMessages };
  }

  clone(): MockAgent {
    return new MockAgent({
      messages: [...this.messages],
      newMessages: [...this.newMessages],
      error: this.error,
      runAgentDelay: this.runAgentDelay,
      runAgentCallback: this.runAgentCallback,
    });
  }

  setNewMessages(messages: Message[]): void {
    this.newMessages = messages;
  }
}

export function createMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: `msg-${Math.random().toString(36).substr(2, 9)}`,
    role: "user",
    content: "Test message",
    ...overrides,
  } as Message;
}

export function createAssistantMessage(
  overrides: Partial<Message> = {}
): Message {
  return createMessage({
    role: "assistant",
    content: "Assistant message",
    ...overrides,
  });
}

export function createToolCallMessage(
  toolCallName: string,
  args: any = {},
  overrides: Partial<Message> = {}
): Message {
  const toolCallId = `tool-call-${Math.random().toString(36).substr(2, 9)}`;
  return createAssistantMessage({
    content: "",
    toolCalls: [
      {
        id: toolCallId,
        type: "function",
        function: {
          name: toolCallName,
          arguments: JSON.stringify(args),
        },
      },
    ],
    ...overrides,
  });
}

export function createToolResultMessage(
  toolCallId: string,
  content: string,
  overrides: Partial<Message> = {}
): Message {
  return createMessage({
    role: "tool",
    content,
    toolCallId,
    ...overrides,
  });
}

export function createTool<T extends Record<string, unknown>>(
  overrides: Partial<FrontendTool<T>> = {}
): FrontendTool<T> {
  return {
    name: `tool-${Math.random().toString(36).substr(2, 9)}`,
    description: "Test tool",
    handler: vi.fn(async () => "Tool result"),
    followUp: false, // Default to false to avoid unexpected recursion in tests
    ...overrides,
  };
}

export function createMultipleToolCallsMessage(
  toolCalls: Array<{ name: string; args?: any }>,
  overrides: Partial<Message> = {}
): Message {
  return createAssistantMessage({
    content: "",
    toolCalls: toolCalls.map((tc) => ({
      id: `tool-call-${Math.random().toString(36).substr(2, 9)}`,
      type: "function",
      function: {
        name: tc.name,
        arguments: JSON.stringify(tc.args || {}),
      },
    })),
    ...overrides,
  });
}

export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 1000,
  interval: number = 10
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error("Timeout waiting for condition");
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
}
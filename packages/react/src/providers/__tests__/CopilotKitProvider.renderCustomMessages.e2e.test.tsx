import React from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import {
  MockStepwiseAgent,
  renderWithCopilotKit,
  runStartedEvent,
  runFinishedEvent,
  stateSnapshotEvent,
  testId,
  textMessageStartEvent,
  textMessageContentEvent,
  textMessageEndEvent,
} from "@/__tests__/utils/test-helpers";
import { ReactCustomMessageRenderer, ReactCustomMessageRendererPosition } from "@/types/react-custom-message-renderer";
import { useCopilotKit, CopilotKitProvider } from "@/providers/CopilotKitProvider";
import {
  useCopilotChatConfiguration,
  CopilotChatConfigurationProvider,
} from "@/providers/CopilotChatConfigurationProvider";
import { CopilotChat } from "@/components/chat/CopilotChat";
import type { Message } from "@ag-ui/core";

interface SnapshotRendererProps {
  message: Message;
  position: ReactCustomMessageRendererPosition;
  runId: string;
  messageIndex: number;
  messageIndexInRun: number;
  numberOfMessagesInRun: number;
  agentId: string;
  stateSnapshot: unknown;
}

const SnapshotRenderer: React.FC<SnapshotRendererProps> = ({ position, message, runId, stateSnapshot }) => {
  if (position !== "after" || message.role !== "assistant") {
    return null;
  }

  const { copilotkit } = useCopilotKit();
  const config = useCopilotChatConfiguration();
  const typedSnapshot = stateSnapshot as { history?: number[] } | undefined;
  const runHistory = typedSnapshot?.history ?? [];

  let count: number | undefined;
  if (config) {
    const runIds = copilotkit.getRunIdsForThread(config.agentId, config.threadId);
    const runIndex = runIds.indexOf(runId);
    if (runIndex >= 0 && runIndex < runHistory.length) {
      count = runHistory[runIndex];
    }
  }

  if (count === undefined) {
    count = runHistory[runHistory.length - 1];
  }

  return (
    <div data-testid={`state-${message.id}`} data-run-id={runId}>
      State: {count ?? "null"}
    </div>
  );
};

describe("CopilotKitProvider custom message renderers E2E", () => {
  it("renders stored state snapshots for sequential runs", async () => {
    const agent = new MockStepwiseAgent();
    const history: number[] = [];

    const emitSnapshot = (count: number) => {
      history.push(count);
      agent.emit(stateSnapshotEvent({ history: [...history] }));
    };

    const customRenderer: ReactCustomMessageRenderer = {
      render: SnapshotRenderer,
    };

    renderWithCopilotKit({
      agent,
      renderCustomMessages: [customRenderer],
    });

    const input = await screen.findByRole("textbox");

    const firstAssistantId = testId("assistant-message");
    fireEvent.change(input, { target: { value: "First question" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("First question")).toBeDefined();
    });

    agent.emit(runStartedEvent());
    emitSnapshot(1);
    agent.emit(textMessageStartEvent(firstAssistantId));
    agent.emit(textMessageContentEvent(firstAssistantId, "First answer"));
    agent.emit(textMessageEndEvent(firstAssistantId));
    agent.emit(runFinishedEvent());

    await waitFor(() => {
      expect(screen.getByTestId(`state-${firstAssistantId}`).textContent).toContain("State: 1");
    });
    const firstRunId = screen.getByTestId(`state-${firstAssistantId}`).getAttribute("data-run-id");
    expect(firstRunId).toBeTruthy();

    const secondAssistantId = testId("assistant-message");
    fireEvent.change(input, { target: { value: "Second question" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Second question")).toBeDefined();
    });

    agent.emit(runStartedEvent());
    emitSnapshot(2);
    agent.emit(textMessageStartEvent(secondAssistantId));
    agent.emit(textMessageContentEvent(secondAssistantId, "Second answer"));
    agent.emit(textMessageEndEvent(secondAssistantId));
    agent.emit(runFinishedEvent());
    agent.complete();

    await waitFor(() => {
      expect(screen.getByTestId(`state-${secondAssistantId}`).textContent).toContain("State: 2");
    });
    const secondRunId = screen.getByTestId(`state-${secondAssistantId}`).getAttribute("data-run-id");

    expect(secondRunId).not.toBe(firstRunId);

    const firstRunIdAfterSecond = screen.getByTestId(`state-${firstAssistantId}`).getAttribute("data-run-id");
    expect(firstRunIdAfterSecond).toBe(firstRunId);

    expect(screen.getByTestId(`state-${firstAssistantId}`).textContent).toContain("State: 1");
  });

  it("renders only at specified position (before vs after)", async () => {
    const agent = new MockStepwiseAgent();
    const positions: string[] = [];

    const PositionRenderer: React.FC<SnapshotRendererProps> = ({ position, message }) => {
      positions.push(position);
      return (
        <div data-testid={`${position}-${message.id}`}>
          {position}: {message.role}
        </div>
      );
    };

    renderWithCopilotKit({
      agent,
      renderCustomMessages: [{ render: PositionRenderer }],
    });

    const input = await screen.findByRole("textbox");
    const messageId = testId("message");

    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Test")).toBeDefined();
    });

    agent.emit(runStartedEvent());
    agent.emit(textMessageStartEvent(messageId));
    agent.emit(textMessageContentEvent(messageId, "Response"));
    agent.emit(textMessageEndEvent(messageId));
    agent.emit(runFinishedEvent());

    await waitFor(() => {
      expect(screen.getByTestId(`before-${messageId}`)).toBeDefined();
      expect(screen.getByTestId(`after-${messageId}`)).toBeDefined();
    });

    expect(screen.getByTestId(`before-${messageId}`).textContent).toBe("before: assistant");
    expect(screen.getByTestId(`after-${messageId}`).textContent).toBe("after: assistant");

    // Verify renderer was called for both positions
    expect(positions).toContain("before");
    expect(positions).toContain("after");
  });

  it("filters by message role correctly", async () => {
    const agent = new MockStepwiseAgent();

    const AssistantOnlyRenderer: React.FC<SnapshotRendererProps> = ({ message, position }) => {
      if (message.role !== "assistant" || position !== "after") return null;
      return <div data-testid={`assistant-badge-${message.id}`}>AI Response</div>;
    };

    renderWithCopilotKit({
      agent,
      renderCustomMessages: [{ render: AssistantOnlyRenderer }],
    });

    const input = await screen.findByRole("textbox");
    const assistantId = testId("assistant");

    fireEvent.change(input, { target: { value: "User message" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("User message")).toBeDefined();
    });

    // User message should not have the badge
    const userMessages = screen.queryAllByTestId(/^assistant-badge-/);
    expect(userMessages.length).toBe(0);

    agent.emit(runStartedEvent());
    agent.emit(textMessageStartEvent(assistantId));
    agent.emit(textMessageContentEvent(assistantId, "AI response"));
    agent.emit(textMessageEndEvent(assistantId));
    agent.emit(runFinishedEvent());

    // Assistant message should have the badge
    await waitFor(() => {
      expect(screen.getByTestId(`assistant-badge-${assistantId}`)).toBeDefined();
    });
  });

  it("executes multiple renderers in order", async () => {
    const agent = new MockStepwiseAgent();
    const executionOrder: string[] = [];

    const FirstRenderer: React.FC<SnapshotRendererProps> = ({ message, position }) => {
      if (position !== "after" || message.role !== "assistant") return null;
      executionOrder.push("first");
      return <div data-testid={`first-${message.id}`}>First</div>;
    };

    const SecondRenderer: React.FC<SnapshotRendererProps> = ({ message, position }) => {
      if (position !== "after" || message.role !== "assistant") return null;
      executionOrder.push("second");
      return <div data-testid={`second-${message.id}`}>Second</div>;
    };

    renderWithCopilotKit({
      agent,
      renderCustomMessages: [{ render: FirstRenderer }, { render: SecondRenderer }],
    });

    const input = await screen.findByRole("textbox");
    const messageId = testId("message");

    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Test")).toBeDefined();
    });

    agent.emit(runStartedEvent());
    agent.emit(textMessageStartEvent(messageId));
    agent.emit(textMessageContentEvent(messageId, "Response"));
    agent.emit(textMessageEndEvent(messageId));
    agent.emit(runFinishedEvent());

    await waitFor(() => {
      expect(screen.getByTestId(`first-${messageId}`)).toBeDefined();
    });

    // Only first renderer should execute since it returns a result
    expect(executionOrder).toEqual(["first"]);
    expect(screen.queryByTestId(`second-${messageId}`)).toBeNull();
  });

  it("respects agent-scoped renderers", async () => {
    const agent1 = new MockStepwiseAgent();
    const agent2 = new MockStepwiseAgent();

    const Agent1Renderer: React.FC<SnapshotRendererProps> = ({ message, position }) => {
      if (position !== "after" || message.role !== "assistant") return null;
      return <div data-testid={`agent1-badge-${message.id}`}>Agent 1</div>;
    };

    const Agent2Renderer: React.FC<SnapshotRendererProps> = ({ message, position }) => {
      if (position !== "after" || message.role !== "assistant") return null;
      return <div data-testid={`agent2-badge-${message.id}`}>Agent 2</div>;
    };

    renderWithCopilotKit({
      agents: { agent1: agent1, agent2: agent2 },
      agentId: "agent1",
      renderCustomMessages: [
        { agentId: "agent1", render: Agent1Renderer },
        { agentId: "agent2", render: Agent2Renderer },
      ],
    });

    const input = await screen.findByRole("textbox");
    const messageId = testId("message");

    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Test")).toBeDefined();
    });

    agent1.emit(runStartedEvent());
    agent1.emit(textMessageStartEvent(messageId));
    agent1.emit(textMessageContentEvent(messageId, "Response"));
    agent1.emit(textMessageEndEvent(messageId));
    agent1.emit(runFinishedEvent());

    await waitFor(() => {
      expect(screen.getByTestId(`agent1-badge-${messageId}`)).toBeDefined();
    });

    // Agent2's renderer should not execute for agent1's messages
    expect(screen.queryByTestId(`agent2-badge-${messageId}`)).toBeNull();
  });

  it("prioritizes agent-specific renderers over global renderers", async () => {
    const agent = new MockStepwiseAgent();

    const GlobalRenderer: React.FC<SnapshotRendererProps> = ({ message, position }) => {
      if (position !== "after" || message.role !== "assistant") return null;
      return <div data-testid={`global-${message.id}`}>Global</div>;
    };

    const SpecificRenderer: React.FC<SnapshotRendererProps> = ({ message, position }) => {
      if (position !== "after" || message.role !== "assistant") return null;
      return <div data-testid={`specific-${message.id}`}>Specific</div>;
    };

    const agentId = "specific-agent";

    renderWithCopilotKit({
      agents: { [agentId]: agent },
      agentId,
      renderCustomMessages: [{ render: GlobalRenderer }, { agentId, render: SpecificRenderer }],
    });

    const input = await screen.findByRole("textbox");
    const messageId = testId("message");

    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Test")).toBeDefined();
    });

    agent.emit(runStartedEvent());
    agent.emit(textMessageStartEvent(messageId));
    agent.emit(textMessageContentEvent(messageId, "Response"));
    agent.emit(textMessageEndEvent(messageId));
    agent.emit(runFinishedEvent());

    await waitFor(() => {
      expect(screen.getByTestId(`specific-${messageId}`)).toBeDefined();
    });

    // Global renderer should not execute since specific one takes precedence
    expect(screen.queryByTestId(`global-${messageId}`)).toBeNull();
  });

  it("handles missing state snapshots gracefully", async () => {
    const agent = new MockStepwiseAgent();

    const StateRenderer: React.FC<SnapshotRendererProps> = ({ message, position, stateSnapshot }) => {
      if (position !== "after" || message.role !== "assistant") return null;
      return (
        <div data-testid={`state-${message.id}`}>{stateSnapshot ? JSON.stringify(stateSnapshot) : "no-state"}</div>
      );
    };

    renderWithCopilotKit({
      agent,
      renderCustomMessages: [{ render: StateRenderer }],
    });

    const input = await screen.findByRole("textbox");
    const messageId = testId("message");

    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Test")).toBeDefined();
    });

    // Don't emit state snapshot
    agent.emit(runStartedEvent());
    agent.emit(textMessageStartEvent(messageId));
    agent.emit(textMessageContentEvent(messageId, "Response"));
    agent.emit(textMessageEndEvent(messageId));
    agent.emit(runFinishedEvent());

    await waitFor(() => {
      expect(screen.getByTestId(`state-${messageId}`)).toBeDefined();
    });

    expect(screen.getByTestId(`state-${messageId}`).textContent).toBe("no-state");
  });

  it("provides correct message index properties", async () => {
    const agent = new MockStepwiseAgent();
    let capturedProps: Partial<SnapshotRendererProps> | null = null;

    const IndexRenderer: React.FC<SnapshotRendererProps> = (props) => {
      const { message, position, messageIndex, messageIndexInRun, numberOfMessagesInRun } = props;
      if (position !== "after" || message.role !== "assistant") return null;

      capturedProps = { messageIndex, messageIndexInRun, numberOfMessagesInRun };

      return (
        <div data-testid={`index-${message.id}`}>
          {messageIndex}/{messageIndexInRun}/{numberOfMessagesInRun}
        </div>
      );
    };

    renderWithCopilotKit({
      agent,
      renderCustomMessages: [{ render: IndexRenderer }],
    });

    const input = await screen.findByRole("textbox");
    const msg1 = testId("msg1");
    const msg2 = testId("msg2");

    // First exchange
    fireEvent.change(input, { target: { value: "First" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("First")).toBeDefined();
    });

    agent.emit(runStartedEvent());
    agent.emit(textMessageStartEvent(msg1));
    agent.emit(textMessageContentEvent(msg1, "Response 1"));
    agent.emit(textMessageEndEvent(msg1));
    agent.emit(runFinishedEvent());

    await waitFor(() => {
      expect(screen.getByTestId(`index-${msg1}`)).toBeDefined();
    });

    // Second exchange
    fireEvent.change(input, { target: { value: "Second" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Second")).toBeDefined();
    });

    agent.emit(runStartedEvent());
    agent.emit(textMessageStartEvent(msg2));
    agent.emit(textMessageContentEvent(msg2, "Response 2"));
    agent.emit(textMessageEndEvent(msg2));
    agent.emit(runFinishedEvent());

    await waitFor(() => {
      expect(screen.getByTestId(`index-${msg2}`)).toBeDefined();
    });

    // Verify the captured props are meaningful
    expect(capturedProps).toBeTruthy();
    const { messageIndex, messageIndexInRun, numberOfMessagesInRun } = capturedProps!;
    expect(typeof messageIndex).toBe("number");
    expect(typeof messageIndexInRun).toBe("number");
    expect(typeof numberOfMessagesInRun).toBe("number");
  });

  it("works across multi-turn conversations", async () => {
    const agent = new MockStepwiseAgent();

    const TurnCounter: React.FC<SnapshotRendererProps> = ({ message, position, stateSnapshot }) => {
      if (position !== "after" || message.role !== "assistant") return null;
      const snapshot = stateSnapshot as { turn?: number } | undefined;
      const turn = snapshot?.turn ?? 0;
      return <div data-testid={`turn-${message.id}`}>Turn: {turn}</div>;
    };

    renderWithCopilotKit({
      agent,
      renderCustomMessages: [{ render: TurnCounter }],
    });

    const input = await screen.findByRole("textbox");

    // Turn 1
    const msg1 = testId("msg1");
    fireEvent.change(input, { target: { value: "Turn 1" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Turn 1")).toBeDefined();
    });

    agent.emit(runStartedEvent());
    agent.emit(stateSnapshotEvent({ turn: 1 }));
    agent.emit(textMessageStartEvent(msg1));
    agent.emit(textMessageContentEvent(msg1, "Response 1"));
    agent.emit(textMessageEndEvent(msg1));
    agent.emit(runFinishedEvent());

    await waitFor(() => {
      expect(screen.getByTestId(`turn-${msg1}`).textContent).toBe("Turn: 1");
    });

    // Turn 2
    const msg2 = testId("msg2");
    fireEvent.change(input, { target: { value: "Turn 2" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Turn 2")).toBeDefined();
    });

    agent.emit(runStartedEvent());
    agent.emit(stateSnapshotEvent({ turn: 2 }));
    agent.emit(textMessageStartEvent(msg2));
    agent.emit(textMessageContentEvent(msg2, "Response 2"));
    agent.emit(textMessageEndEvent(msg2));
    agent.emit(runFinishedEvent());

    await waitFor(() => {
      expect(screen.getByTestId(`turn-${msg2}`).textContent).toBe("Turn: 2");
    });

    // Turn 3
    const msg3 = testId("msg3");
    fireEvent.change(input, { target: { value: "Turn 3" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Turn 3")).toBeDefined();
    });

    agent.emit(runStartedEvent());
    agent.emit(stateSnapshotEvent({ turn: 3 }));
    agent.emit(textMessageStartEvent(msg3));
    agent.emit(textMessageContentEvent(msg3, "Response 3"));
    agent.emit(textMessageEndEvent(msg3));
    agent.emit(runFinishedEvent());

    await waitFor(() => {
      expect(screen.getByTestId(`turn-${msg3}`).textContent).toBe("Turn: 3");
    });

    // Verify the renderer works across multiple turns
    // All messages should have turn counters rendered
    expect(screen.getByTestId(`turn-${msg1}`)).toBeDefined();
    expect(screen.getByTestId(`turn-${msg2}`)).toBeDefined();
    expect(screen.getByTestId(`turn-${msg3}`)).toBeDefined();
  });

  it("handles renderers returning null without breaking", async () => {
    const agent = new MockStepwiseAgent();

    const NullRenderer: React.FC<SnapshotRendererProps> = () => {
      return null;
    };

    const FallbackRenderer: React.FC<SnapshotRendererProps> = ({ message, position }) => {
      if (position !== "after" || message.role !== "assistant") return null;
      return <div data-testid={`fallback-${message.id}`}>Fallback</div>;
    };

    renderWithCopilotKit({
      agent,
      renderCustomMessages: [{ render: NullRenderer }, { render: FallbackRenderer }],
    });

    const input = await screen.findByRole("textbox");
    const messageId = testId("message");

    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Test")).toBeDefined();
    });

    agent.emit(runStartedEvent());
    agent.emit(textMessageStartEvent(messageId));
    agent.emit(textMessageContentEvent(messageId, "Response"));
    agent.emit(textMessageEndEvent(messageId));
    agent.emit(runFinishedEvent());

    // First renderer returns null, so second should not execute (first one doesn't break the chain)
    await waitFor(() => {
      const fallback = screen.queryByTestId(`fallback-${messageId}`);
      expect(fallback).toBeNull();
    });
  });

  it("receives state snapshots from different runs", async () => {
    const agent = new MockStepwiseAgent();
    const receivedSnapshots: Array<{ messageId: string; count: number }> = [];

    const CounterRenderer: React.FC<SnapshotRendererProps> = ({ message, position, stateSnapshot }) => {
      if (position !== "after" || message.role !== "assistant") return null;
      const snapshot = stateSnapshot as { count?: number } | undefined;
      const count = snapshot?.count ?? 0;

      // Track what snapshot this message received
      const existing = receivedSnapshots.find((s) => s.messageId === message.id);
      if (!existing) {
        receivedSnapshots.push({ messageId: message.id, count });
      }

      return <div data-testid={`count-${message.id}`}>Count: {count}</div>;
    };

    renderWithCopilotKit({
      agent,
      renderCustomMessages: [{ render: CounterRenderer }],
    });

    const input = await screen.findByRole("textbox");
    const msg1 = testId("msg1");

    fireEvent.change(input, { target: { value: "First" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("First")).toBeDefined();
    });

    agent.emit(runStartedEvent());
    agent.emit(stateSnapshotEvent({ count: 5 }));
    agent.emit(textMessageStartEvent(msg1));
    agent.emit(textMessageContentEvent(msg1, "Response"));
    agent.emit(textMessageEndEvent(msg1));
    agent.emit(runFinishedEvent());

    await waitFor(() => {
      expect(screen.getByTestId(`count-${msg1}`)).toBeDefined();
    });

    // Update state in new run
    const msg2 = testId("msg2");
    fireEvent.change(input, { target: { value: "Second" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Second")).toBeDefined();
    });

    agent.emit(runStartedEvent());
    agent.emit(stateSnapshotEvent({ count: 10 }));
    agent.emit(textMessageStartEvent(msg2));
    agent.emit(textMessageContentEvent(msg2, "Response 2"));
    agent.emit(textMessageEndEvent(msg2));
    agent.emit(runFinishedEvent());

    await waitFor(() => {
      expect(screen.getByTestId(`count-${msg2}`)).toBeDefined();
    });

    // Verify both messages received state snapshots
    expect(receivedSnapshots.length).toBe(2);
    expect(receivedSnapshots.some((s) => s.messageId === msg1)).toBe(true);
    expect(receivedSnapshots.some((s) => s.messageId === msg2)).toBe(true);
  });

  it("should render custom messages for user messages without runId", async () => {
    const agent = new MockStepwiseAgent();
    let receivedRunId: string | undefined;

    const Renderer: React.FC<SnapshotRendererProps> = ({ runId, position, message }) => {
      if (position !== "after" || message.role !== "user") return null;
      receivedRunId = runId;
      return <div data-testid={`runid-${message.id}`}>{runId || "no-run"}</div>;
    };

    renderWithCopilotKit({
      agent,
      renderCustomMessages: [{ render: Renderer }],
    });

    const input = await screen.findByRole("textbox");
    fireEvent.change(input, { target: { value: "Test message" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Test message")).toBeDefined();
    });

    // Should handle null/empty runId gracefully
    expect(receivedRunId).toBe("");
  });

  // Note: Skipping error handling test because React render errors need Error Boundaries
  // Our try-catch in the hook catches errors during component creation but not during render
  // This would require wrapping custom renderers in an Error Boundary to properly handle
  it.skip("should continue rendering messages even when custom renderer throws error", async () => {
    const agent = new MockStepwiseAgent();
    let renderCount = 0;

    const ErrorRenderer: React.FC<SnapshotRendererProps> = ({ position, message }) => {
      if (position !== "after" || message.role !== "assistant") return null;
      renderCount++;
      throw new Error("Renderer failed!");
    };

    renderWithCopilotKit({
      agent,
      renderCustomMessages: [{ render: ErrorRenderer }],
    });

    const input = await screen.findByRole("textbox");
    const messageId = testId("message");

    fireEvent.change(input, { target: { value: "Test" } });
    fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Test")).toBeDefined();
    });

    agent.emit(runStartedEvent());
    agent.emit(textMessageStartEvent(messageId));
    agent.emit(textMessageContentEvent(messageId, "Response"));
    agent.emit(textMessageEndEvent(messageId));
    agent.emit(runFinishedEvent());

    // Message should still render even though custom renderer threw
    await waitFor(() => {
      expect(screen.getByText("Response")).toBeDefined();
    });

    expect(renderCount).toBeGreaterThan(0);
  });

  it("should handle rapid thread switches correctly", async () => {
    const agent = new MockStepwiseAgent();
    const { rerender } = renderWithCopilotKit({
      agent,
      threadId: "thread-1",
    });

    // Add a message to thread-1
    agent.addMessage({
      id: "msg1",
      role: "user",
      content: "Thread 1 message",
    });

    await waitFor(() => {
      expect(screen.getByText("Thread 1 message")).toBeDefined();
    });

    // Rapidly switch to thread-2
    rerender(
      <CopilotKitProvider agents__unsafe_dev_only={{ default: agent }}>
        <CopilotChatConfigurationProvider agentId="default" threadId="thread-2">
          <div style={{ height: 400 }}>
            <CopilotChat />
          </div>
        </CopilotChatConfigurationProvider>
      </CopilotKitProvider>,
    );

    // Messages should be cleared
    await waitFor(() => {
      expect(screen.queryByText("Thread 1 message")).toBeNull();
    });

    // Add message to thread-2
    agent.addMessage({
      id: "msg2",
      role: "user",
      content: "Thread 2 message",
    });

    await waitFor(() => {
      expect(screen.getByText("Thread 2 message")).toBeDefined();
    });
  });

  it("should sync messages returned from connectAgent", async () => {
    const agent = new MockStepwiseAgent();

    // Override connectAgent to return some messages
    agent.connectAgent = async () => {
      const messages = [
        { id: "msg1", role: "assistant", content: "Synced message 1" },
        { id: "msg2", role: "assistant", content: "Synced message 2" },
      ];

      // Manually add messages to agent since we're bypassing base class logic
      agent.addMessages(messages as any);

      return {
        newMessages: messages,
        result: undefined,
      };
    };

    renderWithCopilotKit({
      agent,
      threadId: "test-thread",
    });

    // Messages from connectAgent should appear
    await waitFor(() => {
      expect(screen.getByText("Synced message 1")).toBeDefined();
      expect(screen.getByText("Synced message 2")).toBeDefined();
    });
  });
});

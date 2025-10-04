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
import { ReactCustomMessageRenderer } from "@/types/react-custom-message-renderer";
import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { useCopilotChatConfiguration } from "@/providers/CopilotChatConfigurationProvider";

type SnapshotRendererProps = Parameters<Exclude<ReactCustomMessageRenderer["render"], null>>[0];

const SnapshotRenderer: React.FC<SnapshotRendererProps> = ({
  position,
  message,
  runId,
  stateSnapshot,
}) => {
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
    const firstRunId = screen
      .getByTestId(`state-${firstAssistantId}`)
      .getAttribute("data-run-id");
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
    const secondRunId = screen
      .getByTestId(`state-${secondAssistantId}`)
      .getAttribute("data-run-id");

    expect(secondRunId).not.toBe(firstRunId);

    const firstRunIdAfterSecond = screen
      .getByTestId(`state-${firstAssistantId}`)
      .getAttribute("data-run-id");
    expect(firstRunIdAfterSecond).toBe(firstRunId);

    expect(screen.getByTestId(`state-${firstAssistantId}`).textContent).toContain("State: 1");
  });
});

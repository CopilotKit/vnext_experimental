import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { type BaseEvent, type RunAgentInput } from "@ag-ui/client";
import { Observable } from "rxjs";
import {
  MockStepwiseAgent,
  renderWithCopilotKit,
  runStartedEvent,
  runFinishedEvent,
} from "@/__tests__/utils/test-helpers";
import { useAgent } from "../use-agent";
import { useCopilotKit } from "@/providers/CopilotKitProvider";

/**
 * Mock agent that captures RunAgentInput to verify state is passed correctly
 */
class StateCapturingMockAgent extends MockStepwiseAgent {
  public lastRunInput?: RunAgentInput;

  run(input: RunAgentInput): Observable<BaseEvent> {
    this.lastRunInput = input;
    return super.run(input);
  }
}

describe("useAgent e2e", () => {
  describe("setState passes state to agent run", () => {
    it("agent receives state set via setState when runAgent is called", async () => {
      const agent = new StateCapturingMockAgent();

      /**
       * Test component that:
       * 1. Gets agent via useAgent()
       * 2. Gets copilotkit via useCopilotKit()
       * 3. Sets state on agent and calls runAgent
       */
      function StateTestComponent() {
        const { agent: hookAgent } = useAgent();
        const { copilotkit } = useCopilotKit();

        const handleSetStateAndRun = async () => {
          hookAgent.setState({ testKey: "testValue", counter: 42 });
          await copilotkit.runAgent({ agent: hookAgent });
        };

        return (
          <button data-testid="trigger-btn" onClick={handleSetStateAndRun}>
            Set State and Run
          </button>
        );
      }

      renderWithCopilotKit({
        agent,
        children: <StateTestComponent />,
      });

      // Click the button to set state and trigger runAgent
      const triggerBtn = await screen.findByTestId("trigger-btn");
      fireEvent.click(triggerBtn);

      // Wait for the agent's run method to be called
      await waitFor(() => {
        expect(agent.lastRunInput).toBeDefined();
      });

      // Complete the agent run
      agent.emit(runStartedEvent());
      agent.emit(runFinishedEvent());
      agent.complete();

      // Verify the state was passed to the agent
      expect(agent.lastRunInput?.state).toEqual({
        testKey: "testValue",
        counter: 42,
      });
    });
  });
});

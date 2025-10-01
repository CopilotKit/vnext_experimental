import React, { useCallback } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithCopilotKit, MockStepwiseAgent, runStartedEvent, runFinishedEvent } from "@/__tests__/utils/test-helpers";
import { useConfigureSuggestions } from "../use-configure-suggestions";
import { useSuggestions } from "../use-suggestions";
import { DEFAULT_AGENT_ID, randomUUID } from "@copilotkitnext/shared";
import { Suggestion } from "@copilotkitnext/core";
import { AbstractAgent, AgentSubscriber, Message, RunAgentParameters, RunAgentResult } from "@ag-ui/client";
import { useCopilotKit } from "@/providers/CopilotKitProvider";

class SuggestionsProviderAgent extends AbstractAgent {
  constructor(private readonly responses: Suggestion[]) {
    super({ agentId: DEFAULT_AGENT_ID });
  }

  protected run(): never {
    throw new Error("SuggestionsProviderAgent should not use stream run");
  }

  override clone(): SuggestionsProviderAgent {
    const cloned = new SuggestionsProviderAgent(this.responses);
    cloned.threadId = this.threadId;
    cloned.description = this.description;
    cloned.messages = JSON.parse(JSON.stringify(this.messages));
    cloned.state = JSON.parse(JSON.stringify(this.state));
    return cloned;
  }

  override async runAgent(
    parameters: RunAgentParameters = {},
    subscriber?: AgentSubscriber,
  ): Promise<RunAgentResult> {
    const input = this.prepareRunAgentInput(parameters);
    this.isRunning = true;

    if (subscriber?.onRunInitialized) {
      await subscriber.onRunInitialized({
        agent: this,
        messages: this.messages,
        state: this.state,
        input,
      });
    }

    const suggestionMessage: Message = {
      id: randomUUID(),
      role: "assistant",
      content: "",
      toolCalls: [
        {
          id: randomUUID(),
          type: "function",
          function: {
            name: "copilotkitSuggest",
            arguments: JSON.stringify({ suggestions: this.responses }),
          },
        },
      ],
    } as Message;

    this.addMessage(suggestionMessage);

    if (subscriber?.onMessagesChanged) {
      await subscriber.onMessagesChanged({
        agent: this,
        messages: this.messages,
        state: this.state,
        input,
      });
    }

    if (subscriber?.onRunFinalized) {
      await subscriber.onRunFinalized({
        agent: this,
        messages: this.messages,
        state: this.state,
        input,
      });
    }

    this.isRunning = false;

    return {
      newMessages: [suggestionMessage],
      result: undefined,
    };
  }
}

const TestHarness: React.FC = () => {
  useConfigureSuggestions({
    instructions: "Return deterministic suggestions",
    providerAgentId: DEFAULT_AGENT_ID,
    available: "always",
  });

  const { suggestions, isLoading, reloadSuggestions } = useSuggestions();
  const handleReload = useCallback(() => {
    reloadSuggestions();
  }, [reloadSuggestions]);

  return (
    <div>
      <div data-testid="suggestions-count">{suggestions.length}</div>
      <div data-testid="suggestions-json">{JSON.stringify(suggestions)}</div>
      <div data-testid="suggestions-loading">{isLoading ? "loading" : "idle"}</div>
      <button data-testid="reload-suggestions" onClick={handleReload}>
        Reload
      </button>
    </div>
  );
};

const StaticSuggestionsHarness: React.FC = () => {
  useConfigureSuggestions({
    suggestions: [{ title: "Static A", message: "First static" }],
  });

  const { suggestions, reloadSuggestions } = useSuggestions();
  const { copilotkit } = useCopilotKit();

  const handleReload = useCallback(() => {
    reloadSuggestions();
  }, [reloadSuggestions]);

  const handleAddMessage = useCallback(() => {
    const agent = copilotkit.getAgent(DEFAULT_AGENT_ID);
    agent?.addMessage({
      id: randomUUID(),
      role: "user",
      content: "User message",
    });
    reloadSuggestions();
  }, [copilotkit, reloadSuggestions]);

  return (
    <div>
      <div data-testid="suggestions-count">{suggestions.length}</div>
      <div data-testid="suggestions-json">{JSON.stringify(suggestions)}</div>
      <button data-testid="reload-suggestions" onClick={handleReload}>
        Reload
      </button>
      <button data-testid="add-message" onClick={handleAddMessage}>
        Add message
      </button>
    </div>
  );
};

const RunClearsSuggestionsHarness: React.FC = () => {
  useConfigureSuggestions({
    suggestions: [{ title: "Static A", message: "First static" }],
  });

  const { suggestions, reloadSuggestions } = useSuggestions();
  const { copilotkit } = useCopilotKit();

  const handleReload = useCallback(() => {
    reloadSuggestions();
  }, [reloadSuggestions]);

  const handleRun = useCallback(() => {
    const agent = copilotkit.getAgent(DEFAULT_AGENT_ID);
    if (!agent) {
      return;
    }

    agent.addMessage({
      id: randomUUID(),
      role: "user",
      content: "Initiating run",
    });

    void copilotkit.runAgent({ agent }).catch(() => {});
  }, [copilotkit]);

  const handleComplete = useCallback(() => {
    const agent = copilotkit.getAgent(DEFAULT_AGENT_ID);
    if (agent instanceof MockStepwiseAgent) {
      agent.complete();
    }
  }, [copilotkit]);

  return (
    <div>
      <div data-testid="suggestions-count">{suggestions.length}</div>
      <div data-testid="suggestions-json">{JSON.stringify(suggestions)}</div>
      <button data-testid="reload-suggestions" onClick={handleReload}>
        Reload
      </button>
      <button data-testid="run-agent" onClick={handleRun}>
        Run
      </button>
      <button data-testid="complete-agent" onClick={handleComplete}>
        Complete
      </button>
    </div>
  );
};

describe("useConfigureSuggestions", () => {
  it("registers suggestions config and surfaces generated suggestions", async () => {
    const agent = new SuggestionsProviderAgent([
      { title: "Option A", message: "Take path A", isLoading: false },
      { title: "Option B", message: "Take path B", isLoading: false },
    ]);

    renderWithCopilotKit({
      agent,
      children: <TestHarness />,
    });

    expect(screen.getByTestId("suggestions-count").textContent).toBe("0");
    expect(screen.getByTestId("suggestions-loading").textContent).toBe("idle");

    fireEvent.click(screen.getByTestId("reload-suggestions"));

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-loading").textContent).toBe("loading");
    });

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-count").textContent).toBe("2");
      expect(screen.getByTestId("suggestions-loading").textContent).toBe("idle");
    });

    const json = screen.getByTestId("suggestions-json").textContent;
    expect(json).toContain("Option A");
    expect(json).toContain("Option B");
  });
});

describe("static suggestions defaults", () => {
  it("shows static suggestions only before the first message", async () => {
    const agent = new MockStepwiseAgent();

    renderWithCopilotKit({
      agent,
      children: <StaticSuggestionsHarness />,
    });

    expect(screen.getByTestId("suggestions-count").textContent).toBe("0");

    fireEvent.click(screen.getByTestId("reload-suggestions"));

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-count").textContent).toBe("1");
      expect(screen.getByTestId("suggestions-json").textContent).toContain('"isLoading":false');
    });

    fireEvent.click(screen.getByTestId("add-message"));

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-count").textContent).toBe("0");
    });
  });
});

describe("suggestions lifecycle during runs", () => {
  it("clears suggestions immediately when the agent run starts", async () => {
    const agent = new MockStepwiseAgent();

    renderWithCopilotKit({
      agent,
      children: <RunClearsSuggestionsHarness />,
    });

    expect(screen.getByTestId("suggestions-count").textContent).toBe("0");

    fireEvent.click(screen.getByTestId("reload-suggestions"));

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-count").textContent).toBe("1");
      expect(screen.getByTestId("suggestions-json").textContent).toContain('"isLoading":false');
    });

    fireEvent.click(screen.getByTestId("run-agent"));

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-count").textContent).toBe("0");
    });

    agent.emit(runStartedEvent());
    agent.emit(runFinishedEvent());

    fireEvent.click(screen.getByTestId("complete-agent"));

    await waitFor(() => {
      expect(agent.isRunning).toBe(false);
    });

    expect(screen.getByTestId("suggestions-count").textContent).toBe("0");
  });
});

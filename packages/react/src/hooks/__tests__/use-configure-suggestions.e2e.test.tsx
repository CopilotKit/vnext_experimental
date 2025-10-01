import React, { useCallback, useMemo, useRef, useState } from "react";
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
  const [label, setLabel] = useState("First static");

  useConfigureSuggestions({
    suggestions: [{ title: label, message: label }],
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

  const handleUpdateSuggestions = useCallback(() => {
    setLabel("Updated static");
  }, []);

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
      <button data-testid="update-suggestions" onClick={handleUpdateSuggestions}>
        Update Suggestions
      </button>
    </div>
  );
};

const DynamicSuggestionsHarness: React.FC = () => {
  const [label, setLabel] = useState("First dynamic");
  const config = useMemo(
    () => ({
      suggestions: [{ title: label, message: label }],
    }),
    [label],
  );

  useConfigureSuggestions(config);

  const { suggestions } = useSuggestions();

  const handleUpdate = useCallback(() => {
    setLabel("Second dynamic");
  }, []);

  return (
    <div>
      <div data-testid="suggestions-json">{JSON.stringify(suggestions)}</div>
      <button data-testid="update" onClick={handleUpdate}>
        Update
      </button>
    </div>
  );
};

const DependencyDrivenHarness: React.FC = () => {
  const configRef = useRef({
    suggestions: [{ title: "Version 0", message: "Version 0" }],
  });
  const [version, setVersion] = useState(0);

  useConfigureSuggestions(configRef.current, { deps: [version] });

  const { suggestions } = useSuggestions();

  const handleBump = useCallback(() => {
    setVersion((prev) => {
      const next = prev + 1;
      configRef.current.suggestions = [
        { title: `Version ${next}`, message: `Version ${next}` },
      ];
      return next;
    });
  }, []);

  return (
    <div>
      <div data-testid="suggestions-json">{JSON.stringify(suggestions)}</div>
      <button data-testid="bump" onClick={handleBump}>
        Bump
      </button>
    </div>
  );
};

const DeferredReloadHarness: React.FC = () => {
  const [label, setLabel] = useState("Initial");
  const config = useMemo(
    () => ({
      suggestions: [{ title: label, message: label }],
    }),
    [label],
  );
  useConfigureSuggestions(config);

  const { copilotkit } = useCopilotKit();
  const { suggestions } = useSuggestions();

  const handleStartRun = useCallback(() => {
    const agent = copilotkit.getAgent(DEFAULT_AGENT_ID);
    if (agent) {
      void copilotkit.runAgent({ agent });
    }
  }, [copilotkit]);

  const handleEmitStart = useCallback(() => {
    const agent = copilotkit.getAgent(DEFAULT_AGENT_ID);
    if (agent instanceof MockStepwiseAgent) {
      agent.emit(runStartedEvent());
    }
  }, [copilotkit]);

  const handleEmitFinish = useCallback(() => {
    const agent = copilotkit.getAgent(DEFAULT_AGENT_ID);
    if (agent instanceof MockStepwiseAgent) {
      agent.emit(runFinishedEvent());
      agent.complete();
    }
  }, [copilotkit]);

  const handleUpdate = useCallback(() => {
    setLabel("Deferred");
  }, []);

  return (
    <div>
      <div data-testid="suggestions-json">{JSON.stringify(suggestions)}</div>
      <button data-testid="start-run" onClick={handleStartRun}>
        Start Run
      </button>
      <button data-testid="emit-start" onClick={handleEmitStart}>
        Emit Start
      </button>
      <button data-testid="emit-finish" onClick={handleEmitFinish}>
        Emit Finish
      </button>
      <button data-testid="update-label" onClick={handleUpdate}>
        Update Label
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

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-count").textContent).toBe("1");
      expect(screen.getByTestId("suggestions-json").textContent).toContain('"isLoading":false');
    });

    fireEvent.click(screen.getByTestId("update-suggestions"));

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-json").textContent).toContain("Updated static");
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

describe("useConfigureSuggestions dependencies", () => {
  it("reloads suggestions when the provided config changes", async () => {
    const agent = new MockStepwiseAgent();

    renderWithCopilotKit({
      agent,
      children: <DynamicSuggestionsHarness />,
    });

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-json").textContent).toContain("First dynamic");
    });

    fireEvent.click(screen.getByTestId("update"));

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-json").textContent).toContain("Second dynamic");
    });
  });

  it("reloads suggestions when optional dependencies change", async () => {
    const agent = new MockStepwiseAgent();

    renderWithCopilotKit({
      agent,
      children: <DependencyDrivenHarness />,
    });

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-json").textContent).toContain("Version 0");
    });

    fireEvent.click(screen.getByTestId("bump"));

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-json").textContent).toContain("Version 1");
    });
  });

  it("defers reloads while a run is in progress and applies them afterward", async () => {
    const agent = new MockStepwiseAgent();

    renderWithCopilotKit({
      agent,
      children: <DeferredReloadHarness />,
    });

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-json").textContent).toContain("Initial");
    });

    fireEvent.click(screen.getByTestId("start-run"));
    fireEvent.click(screen.getByTestId("emit-start"));

    fireEvent.click(screen.getByTestId("update-label"));

    expect(screen.getByTestId("suggestions-json").textContent).toContain("[]");

    fireEvent.click(screen.getByTestId("emit-finish"));

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-json").textContent).toContain("Deferred");
    });
  });
});

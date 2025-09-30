import React, { useCallback, useEffect } from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithCopilotKit } from "@/__tests__/utils/test-helpers";
import { useSuggestions } from "../use-suggestions";
import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { DEFAULT_AGENT_ID, randomUUID } from "@copilotkitnext/shared";
import { AbstractAgent, AgentSubscriber, Message, RunAgentParameters, RunAgentResult } from "@ag-ui/client";
import { Suggestion } from "@copilotkitnext/core";

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

    // Create the suggestion response message
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

    // Notify subscriber with the updated messages (including the new suggestion)
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
  const { suggestions, isLoading, reloadSuggestions, clearSuggestions } = useSuggestions();
  const { copilotkit } = useCopilotKit();

  useEffect(() => {
    const configId = copilotkit.addSuggestionsConfig({
      instructions: "Return deterministic suggestions",
      suggestionsProviderAgentId: DEFAULT_AGENT_ID,
      suggestionsConsumerAgentId: DEFAULT_AGENT_ID,
    });

    return () => {
      copilotkit.removeSuggestionsConfig(configId);
    };
  }, [copilotkit]);

  const handleReload = useCallback(() => {
    reloadSuggestions();
  }, [reloadSuggestions]);

  const handleClear = useCallback(() => {
    clearSuggestions();
  }, [clearSuggestions]);

  return (
    <div>
      <div data-testid="suggestions-count">{suggestions.length}</div>
      <div data-testid="suggestions-json">{JSON.stringify(suggestions)}</div>
      <div data-testid="suggestions-loading">{isLoading ? "loading" : "idle"}</div>
      <button data-testid="reload-suggestions" onClick={handleReload}>
        Reload
      </button>
      <button data-testid="clear-suggestions" onClick={handleClear}>
        Clear
      </button>
    </div>
  );
};

describe("useSuggestions E2E", () => {
  it("tracks suggestions stream and loading state", async () => {
    const agent = new SuggestionsProviderAgent([
      { title: "Option A", message: "Take path A" },
      { title: "Option B", message: "Take path B" },
    ]);

    const ui = renderWithCopilotKit({
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

    expect(screen.getByTestId("suggestions-json").textContent).toContain("Option A");
    expect(screen.getByTestId("suggestions-json").textContent).toContain("Option B");

    fireEvent.click(screen.getByTestId("clear-suggestions"));

    await waitFor(() => {
      expect(screen.getByTestId("suggestions-count").textContent).toBe("0");
    });

    expect(screen.getByTestId("suggestions-loading").textContent).toBe("idle");

    ui.unmount();
  });
});

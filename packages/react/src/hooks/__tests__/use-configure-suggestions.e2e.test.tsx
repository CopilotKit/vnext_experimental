import React, { useCallback } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithCopilotKit } from "@/__tests__/utils/test-helpers";
import { useConfigureSuggestions } from "../use-configure-suggestions";
import { useSuggestions } from "../use-suggestions";
import { DEFAULT_AGENT_ID, randomUUID } from "@copilotkitnext/shared";
import { Suggestion } from "@copilotkitnext/core";
import { AbstractAgent, AgentSubscriber, Message, RunAgentParameters, RunAgentResult } from "@ag-ui/client";

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

describe("useConfigureSuggestions", () => {
  it("registers suggestions config and surfaces generated suggestions", async () => {
    const agent = new SuggestionsProviderAgent([
      { title: "Option A", message: "Take path A" },
      { title: "Option B", message: "Take path B" },
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

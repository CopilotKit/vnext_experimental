import { useCallback, useEffect, useMemo, useState } from "react";
import { Suggestion } from "@copilotkitnext/core";
import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { useCopilotChatConfiguration } from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID } from "@copilotkitnext/shared";

export interface UseSuggestionsOptions {
  agentId?: string;
}

export interface UseSuggestionsResult {
  suggestions: Suggestion[];
  reloadSuggestions: () => void;
  clearSuggestions: () => void;
  isLoading: boolean;
}

export function useSuggestions({ agentId }: UseSuggestionsOptions = {}): UseSuggestionsResult {
  const { copilotkit } = useCopilotKit();
  const config = useCopilotChatConfiguration();
  const resolvedAgentId = useMemo(
    () => agentId ?? config?.agentId ?? DEFAULT_AGENT_ID,
    [agentId, config?.agentId],
  );

  const [suggestions, setSuggestions] = useState<Suggestion[]>(() =>
    copilotkit.getSuggestions(resolvedAgentId),
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSuggestions(copilotkit.getSuggestions(resolvedAgentId));
    setIsLoading(false);
  }, [copilotkit, resolvedAgentId]);

  useEffect(() => {
    const unsubscribe = copilotkit.subscribe({
      onSuggestionsChanged: ({ agentId: changedAgentId, suggestions }) => {
        if (changedAgentId !== resolvedAgentId) {
          return;
        }
        setSuggestions(suggestions);
        setIsLoading(false);
      },
      onSuggestionsConfigChanged: () => {
        setSuggestions(copilotkit.getSuggestions(resolvedAgentId));
      },
    });

    return () => {
      unsubscribe();
    };
  }, [copilotkit, resolvedAgentId]);

  const reloadSuggestions = useCallback(() => {
    copilotkit.reloadSuggestions(resolvedAgentId);
    setIsLoading(true);
  }, [copilotkit, resolvedAgentId]);

  const clearSuggestions = useCallback(() => {
    copilotkit.clearSuggestions(resolvedAgentId);
    setSuggestions([]);
    setIsLoading(false);
  }, [copilotkit, resolvedAgentId]);

  return {
    suggestions,
    reloadSuggestions,
    clearSuggestions,
    isLoading,
  };
}

import { useEffect, useMemo, useRef } from "react";
import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { useCopilotChatConfiguration } from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID } from "@copilotkitnext/shared";
import { DynamicSuggestionsConfig, StaticSuggestionsConfig, SuggestionsConfig } from "@copilotkitnext/core";

export function useConfigureSuggestions(config: SuggestionsConfig | null | undefined): void {
  const { copilotkit } = useCopilotKit();
  const chatConfig = useCopilotChatConfiguration();

  const resolvedConsumerAgentId = useMemo(
    () => chatConfig?.agentId ?? DEFAULT_AGENT_ID,
    [chatConfig?.agentId],
  );

  const normalizedConfig = useMemo<SuggestionsConfig | null>(() => {
    if (!config) {
      return null;
    }

    if (isDynamicConfig(config)) {
      if (config.consumerAgentId) {
        return config;
      }
      return {
        ...config,
        consumerAgentId: resolvedConsumerAgentId,
      } satisfies DynamicSuggestionsConfig;
    }

    if (config.consumerAgentId) {
      return config;
    }

    return {
      ...config,
      consumerAgentId: resolvedConsumerAgentId,
    } satisfies StaticSuggestionsConfig;
  }, [config, resolvedConsumerAgentId]);

  const serializedConfig = useMemo(() => (normalizedConfig ? JSON.stringify(normalizedConfig) : null), [normalizedConfig]);
  const latestConfigRef = useRef<SuggestionsConfig | null>(null);
  latestConfigRef.current = normalizedConfig;

  useEffect(() => {
    if (!serializedConfig || !latestConfigRef.current) {
      return;
    }

    const id = copilotkit.addSuggestionsConfig(latestConfigRef.current);

    return () => {
      copilotkit.removeSuggestionsConfig(id);
    };
  }, [copilotkit, serializedConfig]);
}

function isDynamicConfig(config: SuggestionsConfig): config is DynamicSuggestionsConfig {
  return "instructions" in config;
}

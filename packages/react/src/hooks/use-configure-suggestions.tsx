import { useCallback, useEffect, useMemo, useRef } from "react";
import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { useCopilotChatConfiguration } from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID } from "@copilotkitnext/shared";
import { useAgent, UseAgentUpdate } from "@/hooks/use-agent";
import {
  DynamicSuggestionsConfig,
  StaticSuggestionsConfig,
  SuggestionsConfig,
  Suggestion,
} from "@copilotkitnext/core";

type StaticSuggestionInput = Omit<Suggestion, "isLoading"> & Partial<Pick<Suggestion, "isLoading">>;

type StaticSuggestionsConfigInput = Omit<StaticSuggestionsConfig, "suggestions"> & {
  suggestions: StaticSuggestionInput[];
};

type SuggestionsConfigInput = DynamicSuggestionsConfig | StaticSuggestionsConfigInput;

const EMPTY_DEPS: ReadonlyArray<unknown> = [];

export interface UseConfigureSuggestionsOptions {
  deps?: ReadonlyArray<unknown>;
}

export function useConfigureSuggestions(
  config: SuggestionsConfigInput | null | undefined,
  options?: UseConfigureSuggestionsOptions,
): void {
  const { copilotkit } = useCopilotKit();
  const chatConfig = useCopilotChatConfiguration();
  const extraDeps = options?.deps ?? EMPTY_DEPS;

  const resolvedConsumerAgentId = useMemo(() => chatConfig?.agentId ?? DEFAULT_AGENT_ID, [chatConfig?.agentId]);

  const normalizationCacheRef = useRef<{ serialized: string | null; config: SuggestionsConfig | null }>({
    serialized: null,
    config: null,
  });

  const { normalizedConfig, serializedConfig } = useMemo(() => {
    if (!config) {
      normalizationCacheRef.current = { serialized: null, config: null };
      return { normalizedConfig: null, serializedConfig: null };
    }

    if (config.available === "disabled") {
      normalizationCacheRef.current = { serialized: null, config: null };
      return { normalizedConfig: null, serializedConfig: null };
    }

    let built: SuggestionsConfig;
    if (isDynamicConfig(config)) {
      built = {
        ...config,
        consumerAgentId: config.consumerAgentId ?? resolvedConsumerAgentId,
      } satisfies DynamicSuggestionsConfig;
    } else {
      const normalizedSuggestions = normalizeStaticSuggestions(config.suggestions);
      const baseConfig: StaticSuggestionsConfig = {
        ...config,
        suggestions: normalizedSuggestions,
      };
      built = baseConfig.consumerAgentId
        ? baseConfig
        : ({
            ...baseConfig,
            consumerAgentId: resolvedConsumerAgentId,
          } satisfies StaticSuggestionsConfig);
    }

    const serialized = JSON.stringify(built);
    const cache = normalizationCacheRef.current;
    if (cache.serialized === serialized && cache.config) {
      return { normalizedConfig: cache.config, serializedConfig: serialized };
    }

    normalizationCacheRef.current = { serialized, config: built };
    return { normalizedConfig: built, serializedConfig: serialized };
  }, [config, resolvedConsumerAgentId, ...extraDeps]);
  const latestConfigRef = useRef<SuggestionsConfig | null>(null);
  latestConfigRef.current = normalizedConfig;
  const previousSerializedConfigRef = useRef<string | null>(null);

  const targetAgentId = useMemo(() => {
    if (!normalizedConfig) {
      return resolvedConsumerAgentId;
    }
    const consumer = (normalizedConfig as StaticSuggestionsConfig | DynamicSuggestionsConfig).consumerAgentId;
    if (!consumer || consumer === "*") {
      return resolvedConsumerAgentId;
    }
    return consumer;
  }, [normalizedConfig, resolvedConsumerAgentId]);

  const { agent } = useAgent({
    agentId: targetAgentId,
    updates: [UseAgentUpdate.OnRunStatusChanged],
  });

  const isRunning = agent?.isRunning ?? false;
  const pendingReloadRef = useRef(false);

  const requestReload = useCallback(() => {
    if (!normalizedConfig || !targetAgentId) {
      return;
    }
    if (isRunning) {
      pendingReloadRef.current = true;
      return;
    }
    pendingReloadRef.current = false;
    copilotkit.reloadSuggestions(targetAgentId);
  }, [copilotkit, isRunning, normalizedConfig, targetAgentId]);

  useEffect(() => {
    if (!serializedConfig || !latestConfigRef.current) {
      return;
    }

    const id = copilotkit.addSuggestionsConfig(latestConfigRef.current);

    requestReload();

    return () => {
      copilotkit.removeSuggestionsConfig(id);
    };
  }, [copilotkit, serializedConfig, requestReload]);

  useEffect(() => {
    if (!normalizedConfig) {
      pendingReloadRef.current = false;
      previousSerializedConfigRef.current = null;
      return;
    }
    if (serializedConfig && previousSerializedConfigRef.current === serializedConfig) {
      return;
    }
    if (serializedConfig) {
      previousSerializedConfigRef.current = serializedConfig;
    }
    requestReload();
  }, [normalizedConfig, requestReload, serializedConfig]);

  useEffect(() => {
    if (!normalizedConfig || extraDeps.length === 0) {
      return;
    }
    requestReload();
  }, [extraDeps.length, normalizedConfig, requestReload, ...extraDeps]);

  useEffect(() => {
    if (isRunning) {
      return;
    }
    if (!normalizedConfig || !targetAgentId) {
      return;
    }
    if (!pendingReloadRef.current) {
      return;
    }
    pendingReloadRef.current = false;
    copilotkit.reloadSuggestions(targetAgentId);
  }, [copilotkit, isRunning, normalizedConfig, targetAgentId]);
}

function isDynamicConfig(config: SuggestionsConfigInput): config is DynamicSuggestionsConfig {
  return "instructions" in config;
}

function normalizeStaticSuggestions(suggestions: StaticSuggestionInput[]): Suggestion[] {
  return suggestions.map((suggestion) => ({
    ...suggestion,
    isLoading: suggestion.isLoading ?? false,
  }));
}

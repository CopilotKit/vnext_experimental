import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { useMemo, useEffect, useReducer, useState } from "react";
import { DEFAULT_AGENT_ID } from "@copilotkitnext/shared";
import { AbstractAgent } from "@ag-ui/client";

const DEFAULT_UPDATE_FLAGS = Object.freeze({
  onMessagesChanged: true,
  onStateChanged: true,
  onRunStatusChanged: true,
});

export interface UseAgentProps {
  agentId?: string;
  updates?: {
    onMessagesChanged: boolean;
    onStateChanged: boolean;
    onRunStatusChanged: boolean;
  };
}

export function useAgent({ agentId, updates }: UseAgentProps = {}) {
  agentId ??= DEFAULT_AGENT_ID;

  const { copilotkit } = useCopilotKit();
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [isRunning, setIsRunning] = useState(false);

  const updateFlags = useMemo(
    () => updates ?? DEFAULT_UPDATE_FLAGS,
    [updates]
  );

  const agent: AbstractAgent | undefined = useMemo(() => {
    return copilotkit.getAgent(agentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    agentId,
    copilotkit.agents,
    copilotkit.runtimeConnectionStatus,
    copilotkit,
  ]);

  useEffect(() => {
    setIsRunning(agent?.isRunning ?? false);
  }, [agent]);

  useEffect(() => {
    if (!agent) {
      return;
    }

    if (
      !updateFlags.onMessagesChanged &&
      !updateFlags.onStateChanged &&
      !updateFlags.onRunStatusChanged
    ) {
      return;
    }

    const handlers: Parameters<AbstractAgent["subscribe"]>[0] = {};

    if (updateFlags.onMessagesChanged) {
      handlers.onMessagesChanged = () => {
        forceUpdate();
      };
    }

    if (updateFlags.onStateChanged) {
      handlers.onStateChanged = () => {
        forceUpdate();
      };
    }

    if (updateFlags.onRunStatusChanged) {
      handlers.onRunInitialized = () => {
        setIsRunning(true);
        forceUpdate();
      };
      handlers.onRunFinalized = () => {
        setIsRunning(false);
        forceUpdate();
      };
      handlers.onRunFailed = () => {
        setIsRunning(false);
        forceUpdate();
      };
    }

    const subscription = agent.subscribe(handlers);
    return () => subscription.unsubscribe();
  }, [
    agent,
    forceUpdate,
    updateFlags.onMessagesChanged,
    updateFlags.onStateChanged,
    updateFlags.onRunStatusChanged,
  ]);

  return {
    agent,
    isRunning,
  };
}

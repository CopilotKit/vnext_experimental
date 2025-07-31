import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { useMemo, useEffect, useReducer, useState } from "react";
import { DEFAULT_AGENT_ID } from "@copilotkit/shared";
import { AbstractAgent } from "@ag-ui/client";

export interface UseAgentProps {
  agentId?: string;
}

export function useAgent({ agentId }: UseAgentProps = {}) {
  agentId ??= DEFAULT_AGENT_ID;

  const { copilotkit } = useCopilotKit();
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [isRunning, setIsRunning] = useState(false);

  const agent: AbstractAgent | undefined = useMemo(() => {
    return copilotkit.getAgent(agentId);
  }, [agentId, copilotkit.agents, copilotkit.didLoadRuntime]);

  useEffect(() => {
    const subscription = agent?.subscribe({
      onMessagesChanged(params) {
        forceUpdate();
      },
      onStateChanged(params) {
        forceUpdate();
      },
      onRunInitialized(params) {
        setIsRunning(true);
      },
      onRunFinalized(params) {
        setIsRunning(false);
      },
      onRunFailed(params) {
        setIsRunning(false);
      },
    });

    return () => subscription?.unsubscribe();
  }, [agent]);

  return {
    agent,
    isRunning,
  };
}

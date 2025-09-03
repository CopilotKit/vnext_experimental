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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, copilotkit.agents, copilotkit.didLoadRuntime, copilotkit]);

  useEffect(() => {
    const subscription = agent?.subscribe({
      onMessagesChanged() {
        forceUpdate();
      },
      onStateChanged() {
        forceUpdate();
      },
      onRunInitialized() {
        setIsRunning(true);
      },
      onRunFinalized() {
        setIsRunning(false);
      },
      onRunFailed() {
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

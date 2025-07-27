import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { useMemo, useEffect, useReducer, useState } from "react";
import { DEFAULT_AGENT_ID } from "@copilotkit/shared";

export interface UseAgentProps {
  agentId?: string;
}

export function useAgent({ agentId }: UseAgentProps = {}) {
  agentId ??= DEFAULT_AGENT_ID;

  const { copilotkit } = useCopilotKit();
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [running, setRunning] = useState(false);

  const agent = useMemo(() => {
    return copilotkit.getAgent(agentId);
  }, [agentId, copilotkit.agents]);

  useEffect(() => {
    const subscription = agent.subscribe({
      onMessagesChanged(params) {
        forceUpdate();
      },
      onStateChanged(params) {
        forceUpdate();
      },
      onRunInitialized(params) {
        setRunning(true);
      },
      onRunFinalized(params) {
        setRunning(false);
      },
      onRunFailed(params) {
        setRunning(false);
      },
    });

    return () => subscription.unsubscribe();
  }, [agent]);

  return {
    agent,
    running,
  };
}

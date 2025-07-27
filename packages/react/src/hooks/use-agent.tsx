import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { useMemo, useEffect, useReducer, useState } from "react";
import { DEFAULT_AGENT_NAME } from "@copilotkit/shared";

export interface UseAgentProps {
  agentName?: string;
}

export function useAgent({ agentName }: UseAgentProps = {}) {
  agentName ??= DEFAULT_AGENT_NAME;

  const { copilotkit } = useCopilotKit();
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const [running, setRunning] = useState(false);

  const agent = useMemo(() => {
    return copilotkit.getAgent(agentName);
  }, [agentName, copilotkit.agents]);

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

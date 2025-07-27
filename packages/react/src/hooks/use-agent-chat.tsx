import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { useMemo } from "react";
import { DEFAULT_AGENT_NAME } from "@copilotkit/shared";

export interface UseAgentChatProps {
  agentName?: string;
}

export function useAgentChat({ agentName }: UseAgentChatProps = {}) {
  agentName ??= DEFAULT_AGENT_NAME;

  const { copilotkit } = useCopilotKit();

  const agent = useMemo(() => {
    const agent = copilotkit.getAgent(agentName);
    const unsubscribe = agent.subscribe({
      onMessagesChanged(params) {
        console.log("onMessagesChanged", params);
      },
    });
    return agent;
  }, [agentName, copilotkit.agents]);

  return {};
}

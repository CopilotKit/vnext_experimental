import { useAgent } from "@/hooks/use-agent";
import { CopilotChatView, CopilotChatViewProps } from "./CopilotChatView";
import { CopilotChatConfigurationProvider } from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID } from "@copilotkit/shared";

export type CopilotChatProps = Omit<CopilotChatViewProps, "messages"> & {
  agentId?: string;
};

export function CopilotChat({
  agentId = DEFAULT_AGENT_ID,
  ...props
}: CopilotChatProps) {
  const { agent } = useAgent({ agentId });

  return (
    <CopilotChatConfigurationProvider>
      <CopilotChatView {...props} messages={agent?.messages ?? []} />
    </CopilotChatConfigurationProvider>
  );
}

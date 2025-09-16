import { useAgent } from "@/hooks/use-agent";
import { CopilotAgentIdProvider } from "@/hooks/use-copilot-agent-id";
import { CopilotChatView, CopilotChatViewProps } from "./CopilotChatView";
import { CopilotChatConfigurationProvider } from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID, randomUUID } from "@copilotkitnext/shared";
import { useCallback, useState, useEffect, useMemo } from "react";
import { merge } from "ts-deepmerge";
import { useCopilotKit } from "@/providers/CopilotKitProvider";

export type CopilotChatProps = Omit<CopilotChatViewProps, "messages"> & {
  agentId?: string;
  threadId?: string;
};

export function CopilotChat({
  agentId = DEFAULT_AGENT_ID,
  threadId,
  ...props
}: CopilotChatProps) {
  const { agent } = useAgent({ agentId });
  const { copilotkit } = useCopilotKit();
  const [isLoading, setIsLoading] = useState(false);
  threadId = threadId ?? useMemo(() => randomUUID(), []);

  const subscriber = {
    onTextMessageStartEvent: () => setIsLoading(false),
    onToolCallStartEvent: () => setIsLoading(false),
  };

  useEffect(() => {
    const connect = async () => {
      setIsLoading(true);
      if (agent) {
        await copilotkit.runAgent({ agent, agentId });
      }
      setIsLoading(false);
    };
    if (agent) {
      agent.threadId = threadId;
      if ("isCopilotKitAgent" in agent) {
        connect();
      } else {
        setIsLoading(false);
      }
    }
    return () => {};
  }, [threadId, agent, copilotkit, agentId]);

  const [inputValue, setInputValue] = useState("");
  const onSubmitInput = useCallback(
    async (value: string) => {
      setInputValue("");
      agent?.addMessage({
        id: randomUUID(),
        role: "user",
        content: value,
      });
      setIsLoading(true);
      if (agent) {
        await copilotkit.runAgent({ agent, agentId });
      }
      setIsLoading(false);
    },
    [agent, copilotkit, agentId]
  );

  const mergedProps = merge(
    {
      messageView: { isLoading },
    },
    {
      ...props,
      ...(typeof props.messageView === "string"
        ? { messageView: { className: props.messageView } }
        : props.messageView !== undefined
          ? { messageView: props.messageView }
          : {}),
    }
  );

  return (
    <CopilotAgentIdProvider agentId={agentId}>
      <CopilotChatConfigurationProvider
        inputValue={inputValue}
        onSubmitInput={onSubmitInput}
        onChangeInput={setInputValue}
      >
        <CopilotChatView
          {...{ messages: agent?.messages ?? [], ...mergedProps }}
        />
      </CopilotChatConfigurationProvider>
    </CopilotAgentIdProvider>
  );
}

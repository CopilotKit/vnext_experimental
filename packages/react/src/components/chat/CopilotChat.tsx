import { useAgent } from "@/hooks/use-agent";
import { CopilotChatView, CopilotChatViewProps } from "./CopilotChatView";
import { CopilotChatConfigurationProvider } from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID, randomUUID } from "@copilotkitnext/shared";
import { useCallback, useState, useEffect, useMemo } from "react";
import { merge } from "ts-deepmerge";
import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { ProxiedCopilotRuntimeAgent } from "@copilotkitnext/core";

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
  const resolvedThreadId = useMemo(() => threadId ?? randomUUID(), [threadId]);

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
      agent.threadId = resolvedThreadId;
      if (agent instanceof ProxiedCopilotRuntimeAgent) {
        connect();
      } else {
        setIsLoading(false);
      }
    }
    return () => {};
  }, [resolvedThreadId, agent, copilotkit, agentId]);

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
    <CopilotChatConfigurationProvider
      inputValue={inputValue}
      onSubmitInput={onSubmitInput}
      onChangeInput={setInputValue}
      agentId={agentId}
      threadId={resolvedThreadId}
    >
      <CopilotChatView
        {...{ messages: agent?.messages ?? [], ...mergedProps }}
      />
    </CopilotChatConfigurationProvider>
  );
}

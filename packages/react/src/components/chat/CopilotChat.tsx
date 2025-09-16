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

  const onSubmitInput = useCallback(
    async (value: string) => {
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

  const {
    inputProps: providedInputProps,
    messageView: providedMessageView,
    ...restProps
  } = props;

  const mergedProps = merge(
    {
      messageView: { isLoading },
    },
    {
      ...restProps,
      ...(typeof providedMessageView === "string"
        ? { messageView: { className: providedMessageView } }
        : providedMessageView !== undefined
          ? { messageView: providedMessageView }
          : {}),
    }
  );

  return (
    <CopilotChatConfigurationProvider
      agentId={agentId}
      threadId={resolvedThreadId}
    >
      <CopilotChatView
        {...{
          messages: agent?.messages ?? [],
          inputProps: {
            onSubmitMessage: onSubmitInput,
            ...providedInputProps,
          },
          ...mergedProps,
        }}
      />
    </CopilotChatConfigurationProvider>
  );
}

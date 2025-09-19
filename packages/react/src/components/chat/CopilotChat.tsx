import { useAgent } from "@/hooks/use-agent";
import { CopilotChatView, CopilotChatViewProps } from "./CopilotChatView";
import { CopilotChatConfigurationProvider } from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID, randomUUID } from "@copilotkitnext/shared";
import { useCallback, useEffect, useMemo } from "react";
import { merge } from "ts-deepmerge";
import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { AbstractAgent, AGUIConnectNotImplementedError } from "@ag-ui/client";

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
  const resolvedThreadId = useMemo(() => threadId ?? randomUUID(), [threadId]);

  useEffect(() => {
    const connect = async (agent: AbstractAgent) => {
      try {
        await copilotkit.connectAgent({ agent, agentId });
      } catch (error) {
        if (error instanceof AGUIConnectNotImplementedError) {
          // connect not implemented, ignore
        } else {
          throw error;
        }
      }
    };
    if (agent) {
      agent.threadId = resolvedThreadId;
      connect(agent);
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
      if (agent) {
        try {
          await copilotkit.runAgent({ agent, agentId });
        } catch (error) {
          console.error("CopilotChat: runAgent failed", error);
        }
      }
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
      isRunning: agent?.isRunning ?? false,
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

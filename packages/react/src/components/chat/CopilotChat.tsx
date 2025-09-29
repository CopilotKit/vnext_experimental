import { useAgent } from "@/hooks/use-agent";
import { CopilotChatView, CopilotChatViewProps } from "./CopilotChatView";
import {
  CopilotChatConfigurationProvider,
  CopilotChatLabels,
  CopilotChatDefaultLabels,
  useCopilotChatConfiguration,
} from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID, randomUUID } from "@copilotkitnext/shared";
import { useCallback, useEffect, useMemo } from "react";
import { merge } from "ts-deepmerge";
import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { AbstractAgent, AGUIConnectNotImplementedError } from "@ag-ui/client";

export type CopilotChatProps = Omit<CopilotChatViewProps, "messages" | "isRunning"> & {
  agentId?: string;
  threadId?: string;
  labels?: Partial<CopilotChatLabels>;
};

export function CopilotChat({ agentId, threadId, labels, ...props }: CopilotChatProps) {
  // Check for existing configuration provider
  const existingConfig = useCopilotChatConfiguration();

  // Apply priority: props > existing config > defaults
  const resolvedAgentId = agentId ?? existingConfig?.agentId ?? DEFAULT_AGENT_ID;
  const resolvedThreadId = useMemo(
    () => threadId ?? existingConfig?.threadId ?? randomUUID(),
    [threadId, existingConfig?.threadId],
  );
  const resolvedLabels: CopilotChatLabels = useMemo(
    () => ({
      ...CopilotChatDefaultLabels,
      ...(existingConfig?.labels || {}),
      ...(labels || {}),
    }),
    [existingConfig?.labels, labels],
  );

  const { agent } = useAgent({ agentId: resolvedAgentId });
  const { copilotkit } = useCopilotKit();

  useEffect(() => {
    const connect = async (agent: AbstractAgent) => {
      try {
        await copilotkit.connectAgent({ agent });
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
  }, [resolvedThreadId, agent, copilotkit, resolvedAgentId]);

  const onSubmitInput = useCallback(
    async (value: string) => {
      agent?.addMessage({
        id: randomUUID(),
        role: "user",
        content: value,
      });
      if (agent) {
        try {
          await copilotkit.runAgent({ agent });
        } catch (error) {
          console.error("CopilotChat: runAgent failed", error);
        }
      }
    },
    [agent, copilotkit],
  );

  const { inputProps: providedInputProps, messageView: providedMessageView, ...restProps } = props;

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
    },
  );

  // Always create a provider with merged values
  // This ensures priority: props > existing config > defaults
  return (
    <CopilotChatConfigurationProvider agentId={resolvedAgentId} threadId={resolvedThreadId} labels={resolvedLabels}>
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

import { useAgent } from "@/hooks/use-agent";
import { CopilotChatView, CopilotChatViewProps } from "./CopilotChatView";
import { CopilotChatConfigurationProvider } from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID, randomUUID } from "@copilotkit/shared";
import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import { merge } from "ts-deepmerge";

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
  const [showCursor, setShowCursor] = useState(true);
  threadId = threadId ?? useMemo(() => randomUUID(), []);

  const subscriber = {
    onTextMessageStartEvent: () => setShowCursor(false),
    onToolCallStartEvent: () => setShowCursor(false),
  };

  useEffect(() => {
    const connect = async () => {
      setShowCursor(true);
      await agent?.runAgent(
        {
          forwardedProps: { __copilotkitConnect: true },
        },
        subscriber
      );
      setShowCursor(false);
    };
    if (agent) {
      agent.threadId = threadId;
      connect();
    }
    return () => {};
  }, [threadId, agent]);

  const [inputValue, setInputValue] = useState("");
  const onSubmitInput = useCallback(
    async (value: string) => {
      setInputValue("");
      agent?.addMessage({
        id: randomUUID(),
        role: "user",
        content: value,
      });
      setShowCursor(true);
      await agent?.runAgent({}, subscriber);
      setShowCursor(false);
    },
    [agent]
  );

  return (
    <CopilotChatConfigurationProvider
      inputValue={inputValue}
      onSubmitInput={onSubmitInput}
      onChangeInput={setInputValue}
    >
      <CopilotChatView
        messageView={{
          showCursor,
          ...(typeof props.messageView === "string"
            ? { className: props.messageView }
            : props.messageView),
        }}
        {...props}
      />
    </CopilotChatConfigurationProvider>
  );
}

import { useAgent } from "@/hooks/use-agent";
import { CopilotChatView, CopilotChatViewProps } from "./CopilotChatView";
import { CopilotChatConfigurationProvider } from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID, randomUUID } from "@copilotkit/shared";
import { useCallback, useState, useEffect, useRef, useMemo } from "react";

export type CopilotChatProps = Omit<CopilotChatViewProps, "messages"> & {
  agentId?: string;
  threadId?: string;
};

export function CopilotChat({
  agentId = DEFAULT_AGENT_ID,
  threadId,
  ...props
}: CopilotChatProps) {
  // console.log("Using agent", agentId);
  const { agent } = useAgent({ agentId });
  // console.log(agent);
  threadId = threadId ?? useMemo(() => randomUUID(), []);
  // console.log("ThreadId", threadId);

  useEffect(() => {
    const connect = async () => {
      console.log("Connecting to agent");
      await agent?.runAgent({
        forwardedProps: { __copilotkitConnect: true },
      });
      console.log("Connected to agent");
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
      console.log("Running agent");
      const result = await agent?.runAgent();
      console.log("Result", result);
    },
    [agent]
  );

  return (
    <CopilotChatConfigurationProvider
      inputValue={inputValue}
      onSubmitInput={onSubmitInput}
      onChangeInput={setInputValue}
    >
      <CopilotChatView {...props} messages={agent?.messages ?? []} />
    </CopilotChatConfigurationProvider>
  );
}

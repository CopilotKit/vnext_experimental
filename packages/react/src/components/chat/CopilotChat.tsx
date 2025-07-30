import { useAgent } from "@/hooks/use-agent";
import { CopilotChatView, CopilotChatViewProps } from "./CopilotChatView";
import { CopilotChatConfigurationProvider } from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID, randomUUID } from "@copilotkit/shared";
import { useCallback, useState, useEffect, useRef } from "react";

export type CopilotChatProps = Omit<CopilotChatViewProps, "messages"> & {
  agentId?: string;
  threadId?: string;
};

export function CopilotChat({
  agentId = DEFAULT_AGENT_ID,
  threadId: propThreadId,
  ...props
}: CopilotChatProps) {
  const { agent } = useAgent({ agentId });

  // Set threadId to randomUUID if empty
  const initialThreadId = useRef(propThreadId || randomUUID());
  const [threadId, setThreadId] = useState(initialThreadId.current);

  // React to threadId changes
  useEffect(() => {
    if (propThreadId && propThreadId !== threadId) {
      setThreadId(propThreadId);
      
      // Skeleton: React to threadId change
      // TODO: Handle threadId change
      console.log("ThreadId changed from", threadId, "to", propThreadId);
      
      // Example actions to implement:
      // - Clear current messages
      // - Load messages for new thread
      // - Reset agent state
      // - Update any thread-specific configurations
    }
  }, [propThreadId, threadId]);

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

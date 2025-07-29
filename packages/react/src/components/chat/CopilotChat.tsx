import { useAgent } from "@/hooks/use-agent";
import { CopilotChatView, CopilotChatViewProps } from "./CopilotChatView";
import { CopilotChatConfigurationProvider } from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID, randomUUID } from "@copilotkit/shared";
import { useCallback, useState } from "react";

export type CopilotChatProps = Omit<CopilotChatViewProps, "messages"> & {
  agentId?: string;
};

export function CopilotChat({
  agentId = DEFAULT_AGENT_ID,
  ...props
}: CopilotChatProps) {
  const { agent } = useAgent({ agentId });

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

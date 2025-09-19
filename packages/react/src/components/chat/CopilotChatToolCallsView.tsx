import { useRenderToolCall } from "@/hooks";
import { AssistantMessage, Message, ToolMessage } from "@ag-ui/core";
import React from "react";

export type CopilotChatToolCallsViewProps = {
  message: AssistantMessage;
  messages?: Message[];
  isRunning?: boolean;
};

export function CopilotChatToolCallsView({
  message,
  messages = [],
  isRunning = false,
}: CopilotChatToolCallsViewProps) {
  const renderToolCall = useRenderToolCall();

  if (!message.toolCalls || message.toolCalls.length === 0) {
    return null;
  }

  return (
    <>
      {message.toolCalls.map((toolCall) => {
        const toolMessage = messages.find(
          (m) => m.role === "tool" && m.toolCallId === toolCall.id
        ) as ToolMessage | undefined;

        return (
          <React.Fragment key={toolCall.id}>
            {renderToolCall({
              toolCall,
              toolMessage,
              isRunning,
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}

export default CopilotChatToolCallsView;

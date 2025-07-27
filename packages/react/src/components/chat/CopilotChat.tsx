import React from "react";
import { WithSlots, renderSlot } from "@/lib/slots";
import CopilotChatMessages from "./CopilotChatMessages";
import CopilotChatInput from "./CopilotChatInput";
import { Message } from "@ag-ui/core";
import { twMerge } from "tailwind-merge";

export type CopilotChatProps = WithSlots<
  {
    messages: typeof CopilotChatMessages;
    input: typeof CopilotChatInput;
  },
  {
    messagesList?: Message[];
    autoScroll?: boolean;
  } & React.HTMLAttributes<HTMLDivElement>
>;

export function CopilotChat({
  messages: messagesSlot,
  input: inputSlot,
  messagesList = [],
  autoScroll,
  children,
  className,
  ...props
}: CopilotChatProps) {
  const BoundMessages = renderSlot(messagesSlot, CopilotChatMessages, {
    messages: messagesList,
    autoScroll,
  });

  const BoundInput = renderSlot(inputSlot, CopilotChatInput, {});

  if (children) {
    return children({
      messages: BoundMessages,
      input: BoundInput,
    });
  }

  return (
    <div
      className={twMerge("flex flex-col h-full w-full", className)}
      {...props}
    >
      <div className="flex-1 min-h-0">{BoundMessages}</div>
      <div className="flex-shrink-0 p-4">{BoundInput}</div>
    </div>
  );
}

export default CopilotChat;

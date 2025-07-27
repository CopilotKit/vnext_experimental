import React from "react";
import { WithSlots, renderSlot } from "@/lib/slots";
import CopilotChatMessageFeed from "./CopilotChatMessageFeed";
import CopilotChatInput from "./CopilotChatInput";
import { Message } from "@ag-ui/core";
import { twMerge } from "tailwind-merge";

export type CopilotChatProps = WithSlots<
  {
    messageFeed: typeof CopilotChatMessageFeed;
    input: typeof CopilotChatInput;
  },
  {
    messagesList?: Message[];
    autoScroll?: boolean;
  } & React.HTMLAttributes<HTMLDivElement>
>;

export function CopilotChat({
  messageFeed,
  input,
  messagesList = [],
  autoScroll,
  children,
  className,
  ...props
}: CopilotChatProps) {
  const BoundMessageFeed = renderSlot(messageFeed, CopilotChatMessageFeed, {
    messages: messagesList,
    autoScroll,
  });

  const BoundInput = renderSlot(input, CopilotChatInput, {});

  if (children) {
    return children({
      messageFeed: BoundMessageFeed,
      input: BoundInput,
    });
  }

  return (
    <div
      className={twMerge("flex flex-col h-full w-full", className)}
      {...props}
    >
      <div className="flex-1 min-h-0">{BoundMessageFeed}</div>
      <div className="flex-shrink-0 p-4">{BoundInput}</div>
    </div>
  );
}

export default CopilotChat;

import { WithSlots, renderSlot } from "@/lib/slots";
import CopilotChatAssistantMessage from "./CopilotChatAssistantMessage";
import CopilotChatUserMessage from "./CopilotChatUserMessage";
import { Message } from "@ag-ui/core";
import { twMerge } from "tailwind-merge";

export type CopilotChatMessageViewProps = Omit<
  WithSlots<
    {
      assistantMessage: typeof CopilotChatAssistantMessage;
      userMessage: typeof CopilotChatUserMessage;
    },
    {
      messages?: Message[];
    } & React.HTMLAttributes<HTMLDivElement>
  >,
  "children"
> & {
  children?: (props: {
    messages: Message[];
    messageElements: React.ReactElement[];
  }) => React.ReactElement;
};

export function CopilotChatMessageView({
  messages = [],
  assistantMessage,
  userMessage,
  children,
  className,
  ...props
}: CopilotChatMessageViewProps) {
  const messageElements: React.ReactElement[] = messages
    .map((message) => {
      if (message.role === "assistant") {
        return renderSlot(assistantMessage, CopilotChatAssistantMessage, {
          key: message.id,
          message,
        });
      } else if (message.role === "user") {
        return renderSlot(userMessage, CopilotChatUserMessage, {
          key: message.id,
          message,
        });
      }

      return;
    })
    .filter(Boolean) as React.ReactElement[];

  if (children) {
    return children({ messageElements, messages });
  }

  return (
    <div className={twMerge("flex flex-col", className)} {...props}>
      {messageElements}
    </div>
  );
}

export default CopilotChatMessageView;

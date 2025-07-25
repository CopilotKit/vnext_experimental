import { WithSlots, renderSlot } from "@/lib/slots";
import CopilotChatAssistantMessage from "./CopilotChatAssistantMessage";
import CopilotChatUserMessage from "./CopilotChatUserMessage";
import { Message } from "@ag-ui/core";
import { twMerge } from "tailwind-merge";

export type CopilotChatMessagesProps = Omit<
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

export function CopilotChatMessages({
  messages = [],
  assistantMessage: assistantMessageComponent,
  userMessage: userMessageComponent,
  children,
  className,
  ...props
}: CopilotChatMessagesProps) {
  const messageElements: React.ReactElement[] = messages
    .map((message) => {
      if (message.role === "assistant") {
        return renderSlot(
          assistantMessageComponent,
          CopilotChatAssistantMessage,
          {
            message,
          }
        );
      } else if (message.role === "user") {
        return renderSlot(userMessageComponent, CopilotChatUserMessage, {
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
    <div
      className={twMerge("flex flex-col max-w-3xl mx-auto px-2", className)}
      {...props}
    >
      {messageElements}
    </div>
  );
}

export namespace CopilotChatMessages {}

export default CopilotChatMessages;

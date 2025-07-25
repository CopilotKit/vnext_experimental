import { WithSlots, renderSlot } from "@/lib/slots";
import CopilotChatAssistantMessage from "./CopilotChatAssistantMessage";
import CopilotChatUserMessage from "./CopilotChatUserMessage";
import { Message } from "@ag-ui/core";
import { twMerge } from "tailwind-merge";

export type CopilotChatMessagesProps = Omit<
  WithSlots<
    {
      assistantMessageComponent: typeof CopilotChatAssistantMessage;
      userMessageComponent: typeof CopilotChatUserMessage;
    },
    {
      messages?: Message[];
    } & React.HTMLAttributes<HTMLDivElement>
  >,
  "children"
> & {
  children: (props: {
    messages: Message[];
    messageElements: React.ReactElement[];
  }) => React.ReactElement;
};

export function CopilotChatMessages({
  messages = [],
  assistantMessageComponent,
  userMessageComponent,
  children,
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

  return <div>{messageElements}</div>;
}

export namespace CopilotChatMessages {
  export const AssistantMessageContainer: React.FC<
    React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>
  > = ({ children, className, ...props }) => (
    <div
      className={twMerge("flex flex-col items-end group", className)}
      {...props}
    >
      {children}
    </div>
  );

  export const UserMessageContainer: React.FC<
    React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>
  > = ({ children, className, ...props }) => (
    <div
      className={twMerge("flex flex-col items-start group", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export default CopilotChatMessages;

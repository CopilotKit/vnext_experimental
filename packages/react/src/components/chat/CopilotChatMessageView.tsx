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
      cursor: typeof CopilotChatMessageView.Cursor;
    },
    {
      isLoading?: boolean;
      messages?: Message[];
    } & React.HTMLAttributes<HTMLDivElement>
  >,
  "children"
> & {
  children?: (props: {
    isLoading: boolean;
    messages: Message[];
    messageElements: React.ReactElement[];
  }) => React.ReactElement;
};

export function CopilotChatMessageView({
  messages = [],
  assistantMessage,
  userMessage,
  cursor,
  isLoading = false,
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
          messages,
          isLoading,
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
    return children({ messageElements, messages, isLoading });
  }

  return (
    <div className={twMerge("flex flex-col", className)} {...props}>
      {messageElements}
      {isLoading && renderSlot(cursor, CopilotChatMessageView.Cursor, {})}
    </div>
  );
}

CopilotChatMessageView.Cursor = function Cursor({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        "w-[11px] h-[11px] rounded-full bg-foreground animate-pulse-cursor ml-1",
        className
      )}
      {...props}
    />
  );
};

export default CopilotChatMessageView;

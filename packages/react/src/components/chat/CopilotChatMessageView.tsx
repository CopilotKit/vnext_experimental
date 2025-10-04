import { WithSlots, renderSlot } from "@/lib/slots";
import CopilotChatAssistantMessage from "./CopilotChatAssistantMessage";
import CopilotChatUserMessage from "./CopilotChatUserMessage";
import { Message } from "@ag-ui/core";
import { twMerge } from "tailwind-merge";
import { useRenderCustomMessages } from "@/hooks";

export type CopilotChatMessageViewProps = Omit<
  WithSlots<
    {
      assistantMessage: typeof CopilotChatAssistantMessage;
      userMessage: typeof CopilotChatUserMessage;
      cursor: typeof CopilotChatMessageView.Cursor;
    },
    {
      isRunning?: boolean;
      messages?: Message[];
    } & React.HTMLAttributes<HTMLDivElement>
  >,
  "children"
> & {
  children?: (props: {
    isRunning: boolean;
    messages: Message[];
    messageElements: React.ReactElement[];
  }) => React.ReactElement;
};

export function CopilotChatMessageView({
  messages = [],
  assistantMessage,
  userMessage,
  cursor,
  isRunning = false,
  children,
  className,
  ...props
}: CopilotChatMessageViewProps) {
  const renderCustomMessage = useRenderCustomMessages();

  const messageElements: React.ReactElement[] = messages
    .flatMap((message) => {
      const elements: (React.ReactElement | null | undefined)[] = [];

      // Render custom message before
      if (renderCustomMessage) {
        elements.push(
          renderCustomMessage({
            message,
            position: "before",
          }),
        );
      }

      // Render the main message
      if (message.role === "assistant") {
        elements.push(
          renderSlot(assistantMessage, CopilotChatAssistantMessage, {
            key: message.id,
            message,
            messages,
            isRunning,
          }),
        );
      } else if (message.role === "user") {
        elements.push(
          renderSlot(userMessage, CopilotChatUserMessage, {
            key: message.id,
            message,
          }),
        );
      }

      // Render custom message after
      if (renderCustomMessage) {
        elements.push(
          renderCustomMessage({
            message,
            position: "after",
          }),
        );
      }

      return elements;
    })
    .filter(Boolean) as React.ReactElement[];

  if (children) {
    return children({ messageElements, messages, isRunning });
  }

  return (
    <div className={twMerge("flex flex-col", className)} {...props}>
      {messageElements}
      {isRunning && renderSlot(cursor, CopilotChatMessageView.Cursor, {})}
    </div>
  );
}

CopilotChatMessageView.Cursor = function Cursor({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge("w-[11px] h-[11px] rounded-full bg-foreground animate-pulse-cursor ml-1", className)}
      {...props}
    />
  );
};

export default CopilotChatMessageView;

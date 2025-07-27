import { WithSlots, renderSlot } from "@/lib/slots";
import CopilotChatAssistantMessage from "./CopilotChatAssistantMessage";
import CopilotChatUserMessage from "./CopilotChatUserMessage";
import { Message } from "@ag-ui/core";
import { twMerge } from "tailwind-merge";
import ScrollToBottom, {
  FunctionContext,
  StateContext,
} from "react-scroll-to-bottom";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CopilotChatMessageFeedProps = Omit<
  WithSlots<
    {
      assistantMessage: typeof CopilotChatAssistantMessage;
      userMessage: typeof CopilotChatUserMessage;
      scrollToBottomButton: React.FC<
        React.ButtonHTMLAttributes<HTMLButtonElement>
      >;
    },
    {
      messages?: Message[];
      autoScroll?: boolean;
    } & React.HTMLAttributes<HTMLDivElement>
  >,
  "children"
> & {
  children?: (props: {
    messages: Message[];
    messageElements: React.ReactElement[];
  }) => React.ReactElement;
};

export function CopilotChatMessageFeed({
  messages = [],
  autoScroll = true,
  assistantMessage,
  userMessage,
  scrollToBottomButton,
  children,
  className,
  ...props
}: CopilotChatMessageFeedProps) {
  const messageElements: React.ReactElement[] = messages
    .map((message) => {
      if (message.role === "assistant") {
        return renderSlot(assistantMessage, CopilotChatAssistantMessage, {
          message,
        });
      } else if (message.role === "user") {
        return renderSlot(userMessage, CopilotChatUserMessage, {
          message,
        });
      }
      return;
    })
    .filter(Boolean) as React.ReactElement[];

  // Scroller function to control auto-scroll behavior
  const scroller = () => {
    return autoScroll ? Infinity : 0;
  };

  if (children) {
    return children({ messageElements, messages });
  }

  return (
    <ScrollToBottom
      scroller={scroller}
      className={cn(
        "h-full max-h-full",
        "flex flex-col flex-1 min-h-0",
        "overflow-hidden relative",
        "px-2"
      )}
      followButtonClassName="hidden"
    >
      <FunctionContext.Consumer>
        {({ scrollToBottom }) => (
          <StateContext.Consumer>
            {({ atBottom }) => (
              <>
                <div
                  className={twMerge(
                    "flex flex-col max-w-3xl mx-auto px-2 w-full",
                    className
                  )}
                  {...props}
                >
                  {messageElements}
                </div>

                {/* Scroll to bottom button */}
                {!atBottom && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                    {renderSlot(
                      scrollToBottomButton,
                      CopilotChatMessageFeed.ScrollToBottomButton,
                      {
                        onClick: () => scrollToBottom(),
                      }
                    )}
                  </div>
                )}
              </>
            )}
          </StateContext.Consumer>
        )}
      </FunctionContext.Consumer>
    </ScrollToBottom>
  );
}

export namespace CopilotChatMessageFeed {
  export const ScrollToBottomButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ className, ...props }) => (
    <Button
      variant="outline"
      size="sm"
      className={twMerge(
        "rounded-full w-10 h-10 p-0",
        "bg-white dark:bg-gray-900",
        "shadow-lg border border-gray-200 dark:border-gray-700",
        "hover:bg-gray-50 dark:hover:bg-gray-800",
        "flex items-center justify-center cursor-pointer",
        className
      )}
      {...props}
    >
      <ChevronDown className="w-4 h-4 text-gray-600 dark:text-white" />
    </Button>
  );
}

export default CopilotChatMessageFeed;

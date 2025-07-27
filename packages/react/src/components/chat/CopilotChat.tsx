import React from "react";
import { WithSlots, renderSlot } from "@/lib/slots";
import CopilotChatMessageFeed from "./CopilotChatMessageFeed";
import CopilotChatInput from "./CopilotChatInput";
import { Message } from "@ag-ui/core";
import { twMerge } from "tailwind-merge";
import ScrollToBottom, {
  FunctionContext,
  StateContext,
} from "react-scroll-to-bottom";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CopilotChatProps = WithSlots<
  {
    messageFeed: typeof CopilotChatMessageFeed;
    input: typeof CopilotChatInput;
    scrollView: React.FC<React.HTMLAttributes<HTMLDivElement>>;
    scrollToBottomButton: React.FC<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
  },
  {
    messages?: Message[];
    autoScroll?: boolean;
  } & React.HTMLAttributes<HTMLDivElement>
>;

export function CopilotChat({
  messageFeed,
  input,
  scrollView,
  scrollToBottomButton,
  messages = [],
  autoScroll = true,
  children,
  className,
  ...props
}: CopilotChatProps) {
  const BoundMessageFeed = renderSlot(messageFeed, CopilotChatMessageFeed, {
    messages,
  });

  const BoundInput = renderSlot(input, CopilotChatInput, {});

  if (children) {
    return children({
      messageFeed: BoundMessageFeed,
      input: BoundInput,
      scrollView: renderSlot(scrollView, CopilotChat.ScrollView, {
        autoScroll,
        scrollToBottomButton,
        children: BoundMessageFeed,
      }),
      scrollToBottomButton: renderSlot(
        scrollToBottomButton,
        CopilotChat.ScrollToBottomButton,
        {}
      ),
    });
  }

  return (
    <div className={twMerge("relative h-full", className)} {...props}>
      {renderSlot(scrollView, CopilotChat.ScrollView, {
        autoScroll,
        scrollToBottomButton,
        children: (
          <div className="pb-48">
            <div className="max-w-3xl mx-auto">{BoundMessageFeed}</div>
          </div>
        ),
      })}

      <div
        className={cn(
          "absolute bottom-0 left-0 right-4 h-24 bg-gradient-to-t from-white via-white/80 to-transparent",
          "dark:from-gray-900 dark:via-gray-900/80 pointer-events-none z-10",
          className
        )}
      />

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="max-w-3xl mx-auto py-4">{BoundInput}</div>
      </div>
    </div>
  );
}

export namespace CopilotChat {
  export const ScrollView: React.FC<
    React.HTMLAttributes<HTMLDivElement> & {
      autoScroll?: boolean;
      scrollToBottomButton?: React.FC<
        React.ButtonHTMLAttributes<HTMLButtonElement>
      >;
    }
  > = ({
    children,
    autoScroll = true,
    scrollToBottomButton,
    className,
    ...props
  }) => {
    // Scroller function to control auto-scroll behavior
    const scroller = () => {
      return autoScroll ? Infinity : 0;
    };

    return (
      <ScrollToBottom
        scroller={scroller}
        className="h-full max-h-full flex flex-col min-h-0"
        scrollViewClassName="overflow-y-scroll overflow-x-hidden"
        followButtonClassName="hidden"
        {...props}
      >
        <FunctionContext.Consumer>
          {({ scrollToBottom }) => (
            <StateContext.Consumer>
              {({ atBottom }) => (
                <>
                  {children}

                  {/* Scroll to bottom button */}
                  {!atBottom && (
                    <div className="absolute bottom-36 inset-x-0 flex justify-center z-10">
                      {renderSlot(
                        scrollToBottomButton,
                        CopilotChat.ScrollToBottomButton,
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
  };

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

export default CopilotChat;

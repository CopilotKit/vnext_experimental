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
    scrollView: React.FC<React.HTMLAttributes<HTMLDivElement>>;
    scrollToBottomButton: React.FC<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
    input: typeof CopilotChatInput;
    inputContainer: React.FC<
      React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }
    >;
    feather: React.FC<React.HTMLAttributes<HTMLDivElement>>;
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
  feather,
  inputContainer,
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
  const BoundFeather = renderSlot(feather, CopilotChat.Feather, {});
  const BoundScrollView = renderSlot(scrollView, CopilotChat.ScrollView, {
    autoScroll,
    scrollToBottomButton,
    children: (
      <div className="pb-48">
        <div className="max-w-3xl mx-auto">{BoundMessageFeed}</div>
      </div>
    ),
  });

  const BoundScrollToBottomButton = renderSlot(
    scrollToBottomButton,
    CopilotChat.ScrollToBottomButton,
    {}
  );

  const BoundInputContainer = renderSlot(
    inputContainer,
    CopilotChat.InputContainer,
    {
      children: (
        <div className="max-w-3xl mx-auto py-4 px-4 sm:px-0">{BoundInput}</div>
      ),
    }
  );

  if (children) {
    return children({
      messageFeed: BoundMessageFeed,
      input: BoundInput,
      scrollView: BoundScrollView,
      scrollToBottomButton: BoundScrollToBottomButton,
      feather: BoundFeather,
      inputContainer: BoundInputContainer,
    });
  }

  return (
    <div className={twMerge("relative h-full", className)} {...props}>
      {BoundScrollView}

      {BoundFeather}

      {BoundInputContainer}
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
                  <div className="px-4 sm:px-0">{children}</div>

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

  export const Feather: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    style,
    ...props
  }) => (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-4 h-24 pointer-events-none z-10",
        className
      )}
      style={{
        background:
          "linear-gradient(to top, hsl(var(--background, 0 0% 100%) / 1) 0%, hsl(var(--background, 0 0% 100%) / 0.8) 40%, transparent 100%)",
        ...style,
      }}
      {...props}
    />
  );

  export const InputContainer: React.FC<
    React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }
  > = ({ children, className, ...props }) => (
    <div
      className={cn("absolute bottom-0 left-0 right-0 z-20", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export default CopilotChat;

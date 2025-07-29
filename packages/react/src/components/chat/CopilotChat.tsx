import React, { useRef, useState, useEffect } from "react";
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
import { useCopilotChatConfiguration } from "@/providers/CopilotChatConfigurationProvider";

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
    disclaimer: React.FC<React.HTMLAttributes<HTMLDivElement>>;
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
  disclaimer,
  messages = [],
  autoScroll = true,
  children,
  className,
  ...props
}: CopilotChatProps) {
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [inputContainerHeight, setInputContainerHeight] = useState(0);
  const [isResizing, setIsResizing] = useState(false);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track input container height changes
  useEffect(() => {
    const element = inputContainerRef.current;
    if (!element) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;

        // Update height and set resizing state
        setInputContainerHeight((prevHeight) => {
          if (newHeight !== prevHeight) {
            setIsResizing(true);

            // Clear existing timeout
            if (resizeTimeoutRef.current) {
              clearTimeout(resizeTimeoutRef.current);
            }

            // Set isResizing to false after a short delay
            resizeTimeoutRef.current = setTimeout(() => {
              setIsResizing(false);
            }, 250);

            return newHeight;
          }
          return prevHeight;
        });
      }
    });

    resizeObserver.observe(element);

    // Set initial height
    setInputContainerHeight(element.offsetHeight);

    return () => {
      resizeObserver.disconnect();
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  const BoundMessageFeed = renderSlot(messageFeed, CopilotChatMessageFeed, {
    messages,
  });

  const BoundInput = renderSlot(input, CopilotChatInput, {});
  const BoundFeather = renderSlot(feather, CopilotChat.Feather, {});
  const BoundScrollView = renderSlot(scrollView, CopilotChat.ScrollView, {
    autoScroll,
    scrollToBottomButton,
    inputContainerHeight,
    isResizing,
    children: (
      <div style={{ paddingBottom: `${inputContainerHeight + 32}px` }}>
        <div className="max-w-3xl mx-auto">{BoundMessageFeed}</div>
      </div>
    ),
  });

  const BoundScrollToBottomButton = renderSlot(
    scrollToBottomButton,
    CopilotChat.ScrollToBottomButton,
    {}
  );

  const BoundDisclaimer = renderSlot(disclaimer, CopilotChat.Disclaimer, {});

  const BoundInputContainer = renderSlot(
    inputContainer,
    CopilotChat.InputContainer,
    {
      ref: inputContainerRef,
      children: (
        <>
          <div className="max-w-3xl mx-auto py-0 px-4 sm:px-0">
            {BoundInput}
          </div>
          {BoundDisclaimer}
        </>
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
      disclaimer: BoundDisclaimer,
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
      inputContainerHeight?: number;
      isResizing?: boolean;
    }
  > = ({
    children,
    autoScroll = true,
    scrollToBottomButton,
    inputContainerHeight = 0,
    isResizing = false,
    className,
    ...props
  }) => {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
      setHasMounted(true);
    }, []);

    // Scroller function to control auto-scroll behavior
    const scroller = () => {
      return autoScroll ? Infinity : 0;
    };

    if (!hasMounted) {
      return (
        <div className="h-full max-h-full flex flex-col min-h-0 overflow-y-scroll overflow-x-hidden">
          <div className="px-4 sm:px-0">{children}</div>
        </div>
      );
    }

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

                  {/* Scroll to bottom button - hidden during resize */}
                  {!atBottom && !isResizing && (
                    <div
                      className="absolute inset-x-0 flex justify-center z-10"
                      style={{
                        bottom: `${inputContainerHeight + 16}px`,
                      }}
                    >
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
        "absolute bottom-0 left-0 right-4 h-24 pointer-events-none z-10 bg-gradient-to-t",
        "from-white via-white to-transparent",
        "dark:from-[rgb(33,33,33)] dark:via-[rgb(33,33,33)]",
        className
      )}
      style={style}
      {...props}
    />
  );

  export const InputContainer = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }
  >(({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("absolute bottom-0 left-0 right-0 z-20", className)}
      {...props}
    >
      {children}
    </div>
  ));

  InputContainer.displayName = "CopilotChat.InputContainer";

  export const Disclaimer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    ...props
  }) => {
    const { labels } = useCopilotChatConfiguration();

    return (
      <div
        className={cn(
          "text-center text-xs text-muted-foreground py-3 px-4 max-w-3xl mx-auto",
          className
        )}
        {...props}
      >
        {labels.chatDisclaimerText}
      </div>
    );
  };
}

export default CopilotChat;

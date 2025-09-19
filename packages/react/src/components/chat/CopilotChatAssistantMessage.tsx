import { AssistantMessage, Message } from "@ag-ui/core";
import { MarkdownHooks } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeKatex from "rehype-katex";
import { useState } from "react";
import {
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopilotChatConfiguration } from "@/providers/CopilotChatConfigurationProvider";
import { twMerge } from "tailwind-merge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import "katex/dist/katex.min.css";
import { WithSlots, renderSlot } from "@/lib/slots";
import { completePartialMarkdown } from "@copilotkitnext/core";
import CopilotChatToolCallsView from "./CopilotChatToolCallsView";

export type CopilotChatAssistantMessageProps = WithSlots<
  {
    markdownRenderer: typeof CopilotChatAssistantMessage.MarkdownRenderer;
    toolbar: typeof CopilotChatAssistantMessage.Toolbar;
    copyButton: typeof CopilotChatAssistantMessage.CopyButton;
    thumbsUpButton: typeof CopilotChatAssistantMessage.ThumbsUpButton;
    thumbsDownButton: typeof CopilotChatAssistantMessage.ThumbsDownButton;
    readAloudButton: typeof CopilotChatAssistantMessage.ReadAloudButton;
    regenerateButton: typeof CopilotChatAssistantMessage.RegenerateButton;
    toolCallsView: typeof CopilotChatToolCallsView;
  },
  {
    onThumbsUp?: (message: AssistantMessage) => void;
    onThumbsDown?: (message: AssistantMessage) => void;
    onReadAloud?: (message: AssistantMessage) => void;
    onRegenerate?: (message: AssistantMessage) => void;
    message: AssistantMessage;
    messages?: Message[];
    isRunning?: boolean;
    additionalToolbarItems?: React.ReactNode;
    toolbarVisible?: boolean;
  } & React.HTMLAttributes<HTMLDivElement>
>;

export function CopilotChatAssistantMessage({
  message,
  messages,
  isRunning,
  onThumbsUp,
  onThumbsDown,
  onReadAloud,
  onRegenerate,
  additionalToolbarItems,
  toolbarVisible = true,
  markdownRenderer,
  toolbar,
  copyButton,
  thumbsUpButton,
  thumbsDownButton,
  readAloudButton,
  regenerateButton,
  toolCallsView,
  children,
  className,
  ...props
}: CopilotChatAssistantMessageProps) {
  const boundMarkdownRenderer = renderSlot(
    markdownRenderer,
    CopilotChatAssistantMessage.MarkdownRenderer,
    {
      content: message.content || "",
    }
  );

  const boundCopyButton = renderSlot(
    copyButton,
    CopilotChatAssistantMessage.CopyButton,
    {
      onClick: async () => {
        if (message.content) {
          try {
            await navigator.clipboard.writeText(message.content);
          } catch (err) {
            console.error("Failed to copy message:", err);
          }
        }
      },
    }
  );

  const boundThumbsUpButton = renderSlot(
    thumbsUpButton,
    CopilotChatAssistantMessage.ThumbsUpButton,
    {
      onClick: onThumbsUp,
    }
  );

  const boundThumbsDownButton = renderSlot(
    thumbsDownButton,
    CopilotChatAssistantMessage.ThumbsDownButton,
    {
      onClick: onThumbsDown,
    }
  );

  const boundReadAloudButton = renderSlot(
    readAloudButton,
    CopilotChatAssistantMessage.ReadAloudButton,
    {
      onClick: onReadAloud,
    }
  );

  const boundRegenerateButton = renderSlot(
    regenerateButton,
    CopilotChatAssistantMessage.RegenerateButton,
    {
      onClick: onRegenerate,
    }
  );

  const boundToolbar = renderSlot(
    toolbar,
    CopilotChatAssistantMessage.Toolbar,
    {
      children: (
        <div className="flex items-center gap-1">
          {boundCopyButton}
          {(onThumbsUp || thumbsUpButton) && boundThumbsUpButton}
          {(onThumbsDown || thumbsDownButton) && boundThumbsDownButton}
          {(onReadAloud || readAloudButton) && boundReadAloudButton}
          {(onRegenerate || regenerateButton) && boundRegenerateButton}
          {additionalToolbarItems}
        </div>
      ),
    }
  );

  const boundToolCallsView = renderSlot(
    toolCallsView,
    CopilotChatToolCallsView,
    {
      message,
      messages,
      isRunning,
    }
  );

  // Don't show toolbar if message has no content (only tool calls)
  const hasContent = !!(message.content && message.content.trim().length > 0);
  const shouldShowToolbar = toolbarVisible && hasContent;

  if (children) {
    return (
      <>
        {children({
          markdownRenderer: boundMarkdownRenderer,
          toolbar: boundToolbar,
          toolCallsView: boundToolCallsView,
          copyButton: boundCopyButton,
          thumbsUpButton: boundThumbsUpButton,
          thumbsDownButton: boundThumbsDownButton,
          readAloudButton: boundReadAloudButton,
          regenerateButton: boundRegenerateButton,
          message,
          messages,
          isRunning,
          onThumbsUp,
          onThumbsDown,
          onReadAloud,
          onRegenerate,
          additionalToolbarItems,
          toolbarVisible: shouldShowToolbar,
        })}
      </>
    );
  }

  return (
    <div
      className={twMerge(
        "prose max-w-full break-words dark:prose-invert",
        className
      )}
      {...props}
      data-message-id={message.id}
    >
      {boundMarkdownRenderer}
      {boundToolCallsView}
      {shouldShowToolbar && boundToolbar}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CopilotChatAssistantMessage {
  const InlineCode = ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLElement>) => {
    return (
      <code
        className="px-[4.8px] py-[2.5px] bg-[rgb(236,236,236)] dark:bg-gray-800 rounded text-sm font-mono font-medium! text-foreground!"
        {...props}
      >
        {children}
      </code>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CodeBlock = ({ children, className, onClick, ...props }: any) => {
    const { labels } = useCopilotChatConfiguration();
    const [copied, setCopied] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const getCodeContent = (node: any): string => {
      if (typeof node === "string") return node;
      if (Array.isArray(node)) return node.map(getCodeContent).join("");
      if (node?.props?.children) return getCodeContent(node.props.children);
      return "";
    };

    const codeContent = getCodeContent(children);
    const language = props["data-language"] as string | undefined;

    const copyToClipboard = async () => {
      if (!codeContent.trim()) return;

      try {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        if (onClick) {
          onClick();
        }
      } catch (err) {
        console.error("Failed to copy code:", err);
      }
    };

    return (
      <div className="relative">
        <div className="flex items-center justify-between px-4 pr-3 py-3 text-xs">
          {language && (
            <span className="font-regular text-muted-foreground dark:text-white">
              {language}
            </span>
          )}

          <button
            className={cn(
              "px-2 gap-0.5 text-xs flex items-center cursor-pointer text-muted-foreground dark:text-white"
            )}
            onClick={copyToClipboard}
            title={
              copied
                ? labels.assistantMessageToolbarCopyCodeCopiedLabel
                : `${labels.assistantMessageToolbarCopyCodeLabel} code`
            }
          >
            {copied ? (
              <Check className="h-[10px]! w-[10px]!" />
            ) : (
              <Copy className="h-[10px]! w-[10px]!" />
            )}
            <span className="text-[11px]">
              {copied
                ? labels.assistantMessageToolbarCopyCodeCopiedLabel
                : labels.assistantMessageToolbarCopyCodeLabel}
            </span>
          </button>
        </div>

        <pre
          className={cn(
            className,
            "rounded-2xl bg-transparent border-t-0 my-1!"
          )}
          {...props}
        >
          {children}
        </pre>
      </div>
    );
  };

  export const MarkdownRenderer: React.FC<
    React.HTMLAttributes<HTMLDivElement> & { content: string }
  > = ({ content, className }) => (
    <div className={className}>
      <MarkdownHooks
        /* async plugins are now fine ✨ */
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [
            rehypePrettyCode,
            {
              keepBackground: false,
              theme: {
                dark: "one-dark-pro",
                light: "one-light",
              },
              bypassInlineCode: true,
            },
          ],
          rehypeKatex,
        ]}
        components={{
          pre: CodeBlock,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          code: ({ className, children, ...props }: any) => {
            // For inline code, use custom styling
            if (typeof children === "string") {
              return <InlineCode {...props}>{children}</InlineCode>;
            }

            // For code blocks, just return the code element as-is
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {completePartialMarkdown(content || "")}
      </MarkdownHooks>
    </div>
  );

  export const Toolbar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    ...props
  }) => (
    <div
      className={twMerge(
        "w-full bg-transparent flex items-center -ml-[5px] -mt-[0px]",
        className
      )}
      {...props}
    />
  );

  export const ToolbarButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      title: string;
      children: React.ReactNode;
    }
  > = ({ title, children, ...props }) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="assistantMessageToolbarButton"
            aria-label={title}
            {...props}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{title}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  export const CopyButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ className, title, onClick, ...props }) => {
    const { labels } = useCopilotChatConfiguration();
    const [copied, setCopied] = useState(false);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      if (onClick) {
        onClick(event);
      }
    };

    return (
      <ToolbarButton
        title={title || labels.assistantMessageToolbarCopyMessageLabel}
        onClick={handleClick}
        className={className}
        {...props}
      >
        {copied ? (
          <Check className="size-[18px]" />
        ) : (
          <Copy className="size-[18px]" />
        )}
      </ToolbarButton>
    );
  };

  export const ThumbsUpButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ title, ...props }) => {
    const { labels } = useCopilotChatConfiguration();
    return (
      <ToolbarButton
        title={title || labels.assistantMessageToolbarThumbsUpLabel}
        {...props}
      >
        <ThumbsUp className="size-[18px]" />
      </ToolbarButton>
    );
  };

  export const ThumbsDownButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ title, ...props }) => {
    const { labels } = useCopilotChatConfiguration();
    return (
      <ToolbarButton
        title={title || labels.assistantMessageToolbarThumbsDownLabel}
        {...props}
      >
        <ThumbsDown className="size-[18px]" />
      </ToolbarButton>
    );
  };

  export const ReadAloudButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ title, ...props }) => {
    const { labels } = useCopilotChatConfiguration();
    return (
      <ToolbarButton
        title={title || labels.assistantMessageToolbarReadAloudLabel}
        {...props}
      >
        <Volume2 className="size-[20px]" />
      </ToolbarButton>
    );
  };

  export const RegenerateButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ title, ...props }) => {
    const { labels } = useCopilotChatConfiguration();
    return (
      <ToolbarButton
        title={title || labels.assistantMessageToolbarRegenerateLabel}
        {...props}
      >
        <RefreshCw className="size-[18px]" />
      </ToolbarButton>
    );
  };
}

CopilotChatAssistantMessage.MarkdownRenderer.displayName =
  "CopilotChatAssistantMessage.MarkdownRenderer";
CopilotChatAssistantMessage.Toolbar.displayName =
  "CopilotChatAssistantMessage.Toolbar";
CopilotChatAssistantMessage.CopyButton.displayName =
  "CopilotChatAssistantMessage.CopyButton";
CopilotChatAssistantMessage.ThumbsUpButton.displayName =
  "CopilotChatAssistantMessage.ThumbsUpButton";
CopilotChatAssistantMessage.ThumbsDownButton.displayName =
  "CopilotChatAssistantMessage.ThumbsDownButton";
CopilotChatAssistantMessage.ReadAloudButton.displayName =
  "CopilotChatAssistantMessage.ReadAloudButton";
CopilotChatAssistantMessage.RegenerateButton.displayName =
  "CopilotChatAssistantMessage.RegenerateButton";

export default CopilotChatAssistantMessage;

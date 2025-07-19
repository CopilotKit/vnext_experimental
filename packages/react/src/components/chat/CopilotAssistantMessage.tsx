import { AssistantMessage } from "@ag-ui/core";
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
import { useCopilotChatContext } from "@/providers/CopilotChatContextProvider";
import { twMerge } from "tailwind-merge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import "katex/dist/katex.min.css";

export interface CopilotAssistantMessageProps {
  message: AssistantMessage;

  /** Called when user clicks thumbs up button. If provided, button is shown. */
  onThumbsUp?: () => void;

  /** Called when user clicks thumbs down button. If provided, button is shown. */
  onThumbsDown?: () => void;

  /** Called when user clicks read aloud button. If provided, button is shown. */
  onReadAloud?: () => void;

  /** Called when user clicks regenerate button. If provided, button is shown. */
  onRegenerate?: () => void;

  /** Additional custom toolbar items to render alongside the default buttons. */
  additionalToolbarItems?: React.ReactNode;

  /**
   * Component slots — override one or many:
   * - Container: wrapper around everything (default is <div>)
   * - MarkdownRenderer: the markdown rendering component
   * - Toolbar: bottom toolbar area (default is <div>)
   * - CopyButton: copy message button
   * - ThumbsUpButton: thumbs up button
   * - ThumbsDownButton: thumbs down button
   * - ReadAloudButton: read aloud button
   * - RegenerateButton: regenerate message button
   */
  components?: {
    Container?: React.ComponentType<
      React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>
    >;
    MarkdownRenderer?: React.ComponentType<{
      content: string;
      className?: string;
    }>;
    Toolbar?: React.ComponentType<React.HTMLAttributes<HTMLDivElement>>;
    CopyButton?: React.ComponentType<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
    ThumbsUpButton?: React.ComponentType<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
    ThumbsDownButton?: React.ComponentType<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
    ReadAloudButton?: React.ComponentType<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
    RegenerateButton?: React.ComponentType<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
  };

  /**
   * Style-only overrides (merged onto defaults).
   * Ignore if user also swaps that component.
   */
  appearance?: {
    container?: string;
    markdownRenderer?: string;
    toolbar?: string;
    copyButton?: string;
    thumbsUpButton?: string;
    thumbsDownButton?: string;
    readAloudButton?: string;
    regenerateButton?: string;
  };

  /**
   * Full-layout override (highest priority).
   * Receives the *pre-wired* sub-components so users never touch handlers.
   */
  children?: (parts: {
    MarkdownRenderer: JSX.Element;
    Toolbar: JSX.Element;
    CopyButton: JSX.Element;
    ThumbsUpButton: JSX.Element;
    ThumbsDownButton: JSX.Element;
    ReadAloudButton: JSX.Element;
    RegenerateButton: JSX.Element;
  }) => React.ReactNode;
}

export function CopilotAssistantMessage({
  message,
  onThumbsUp,
  onThumbsDown,
  onReadAloud,
  onRegenerate,
  additionalToolbarItems,
  components = {},
  appearance = {},
  children,
}: CopilotAssistantMessageProps) {
  const [copied, setCopied] = useState(false);
  const {
    Container = CopilotAssistantMessage.Container,
    MarkdownRenderer = CopilotAssistantMessage.MarkdownRenderer,
    Toolbar = CopilotAssistantMessage.Toolbar,
    CopyButton = CopilotAssistantMessage.CopyButton,
    ThumbsUpButton = CopilotAssistantMessage.ThumbsUpButton,
    ThumbsDownButton = CopilotAssistantMessage.ThumbsDownButton,
    ReadAloudButton = CopilotAssistantMessage.ReadAloudButton,
    RegenerateButton = CopilotAssistantMessage.RegenerateButton,
  } = components;

  const BoundMarkdownRenderer = (
    <MarkdownRenderer
      content={message.content || ""}
      className={
        MarkdownRenderer === CopilotAssistantMessage.MarkdownRenderer
          ? appearance.markdownRenderer
          : undefined
      }
    />
  );

  const BoundCopyButton = (
    <CopyButton
      onClick={async () => {
        if (message.content) {
          try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch (err) {
            console.error("Failed to copy message:", err);
          }
        }
      }}
      copied={copied}
      className={
        CopyButton === CopilotAssistantMessage.CopyButton
          ? appearance.copyButton
          : undefined
      }
    />
  );

  const BoundThumbsUpButton = (
    <ThumbsUpButton
      onClick={onThumbsUp}
      className={
        ThumbsUpButton === CopilotAssistantMessage.ThumbsUpButton
          ? appearance.thumbsUpButton
          : undefined
      }
    />
  );

  const BoundThumbsDownButton = (
    <ThumbsDownButton
      onClick={onThumbsDown}
      className={
        ThumbsDownButton === CopilotAssistantMessage.ThumbsDownButton
          ? appearance.thumbsDownButton
          : undefined
      }
    />
  );

  const BoundReadAloudButton = (
    <ReadAloudButton
      onClick={onReadAloud}
      className={
        ReadAloudButton === CopilotAssistantMessage.ReadAloudButton
          ? appearance.readAloudButton
          : undefined
      }
    />
  );

  const BoundRegenerateButton = (
    <RegenerateButton
      onClick={onRegenerate}
      className={
        RegenerateButton === CopilotAssistantMessage.RegenerateButton
          ? appearance.regenerateButton
          : undefined
      }
    />
  );

  const BoundToolbar = (
    <Toolbar
      className={
        Toolbar === CopilotAssistantMessage.Toolbar
          ? appearance.toolbar
          : undefined
      }
    >
      <div className="flex items-center gap-1">
        {BoundCopyButton}
        {onThumbsUp && BoundThumbsUpButton}
        {onThumbsDown && BoundThumbsDownButton}
        {onReadAloud && BoundReadAloudButton}
        {onRegenerate && BoundRegenerateButton}
        {additionalToolbarItems}
      </div>
    </Toolbar>
  );

  if (children) {
    return (
      <>
        {children({
          MarkdownRenderer: BoundMarkdownRenderer,
          Toolbar: BoundToolbar,
          CopyButton: BoundCopyButton,
          ThumbsUpButton: BoundThumbsUpButton,
          ThumbsDownButton: BoundThumbsDownButton,
          ReadAloudButton: BoundReadAloudButton,
          RegenerateButton: BoundRegenerateButton,
        })}
      </>
    );
  }

  return (
    <Container
      className={
        Container === CopilotAssistantMessage.Container
          ? appearance.container
          : undefined
      }
    >
      {BoundMarkdownRenderer}
      {BoundToolbar}
    </Container>
  );
}

export namespace CopilotAssistantMessage {
  const InlineCode = ({ children, ...props }: any) => {
    return (
      <code
        className="px-[4.8px] py-[2.5px] bg-[rgb(236,236,236)] dark:bg-gray-800 rounded text-sm font-mono font-medium! text-foreground!"
        {...props}
      >
        {children}
      </code>
    );
  };

  const CodeBlock = ({ children, className, ...props }: any) => {
    const [copied, setCopied] = useState(false);
    const { labels } = useCopilotChatContext();

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
        await navigator.clipboard.writeText(codeContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy code:", err);
      }
    };

    // For code blocks, add header with language label and copy button
    return (
      <div className="relative">
        {/* Header bar */}
        <div className="flex items-center justify-between px-4 pr-3 py-3 text-xs">
          {/* Language label */}
          {language && (
            <span className="font-regular text-muted-foreground dark:text-white">
              {language}
            </span>
          )}

          {/* Copy button */}
          <button
            className={cn(
              "px-2 gap-0.5 text-xs flex items-center cursor-pointer text-muted-foreground dark:text-white"
            )}
            onClick={copyToClipboard}
            title={
              copied
                ? labels.assistantCopyCodeCopiedLabel
                : `${labels.assistantCopyCodeLabel} code`
            }
          >
            {copied ? (
              <Check className="h-[10px]! w-[10px]!" />
            ) : (
              <Copy className="h-[10px]! w-[10px]!" />
            )}
            <span className="text-[11px]">
              {copied
                ? labels.assistantCopyCodeCopiedLabel
                : labels.assistantCopyCodeLabel}
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

  export const Container: React.FC<
    React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>
  > = ({ children, className, ...props }) => (
    <div
      className={twMerge(
        "prose max-w-full w-full break-words dark:prose-invert",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );

  export const MarkdownRenderer: React.FC<{
    content: string;
    className?: string;
  }> = ({ content, className }) => (
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
      {content}
    </MarkdownHooks>
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

  export const CopyButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & { copied?: boolean }
  > = ({ className, copied = false, ...props }) => {
    const { labels } = useCopilotChatContext();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="assistantMessageButton"
            className={twMerge(className)}
            {...props}
          >
            {copied ? (
              <Check className="size-[18px]" />
            ) : (
              <Copy className="size-[18px]" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels.assistantCopyMessageLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  export const ThumbsUpButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ className, ...props }) => {
    const { labels } = useCopilotChatContext();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="assistantMessageButton"
            className={twMerge(className)}
            {...props}
          >
            <ThumbsUp className="size-[18px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels.assistantThumbsUpLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  export const ThumbsDownButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ className, ...props }) => {
    const { labels } = useCopilotChatContext();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="assistantMessageButton"
            className={twMerge(className)}
            {...props}
          >
            <ThumbsDown className="size-[18px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels.assistantThumbsDownLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  export const ReadAloudButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ className, ...props }) => {
    const { labels } = useCopilotChatContext();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="assistantMessageButton"
            className={twMerge(className)}
            {...props}
          >
            <Volume2 className="size-[20px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels.assistantReadAloudLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  export const RegenerateButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ className, ...props }) => {
    const { labels } = useCopilotChatContext();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="assistantMessageButton"
            className={twMerge(className)}
            {...props}
          >
            <RefreshCw className="size-[18px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels.assistantRegenerateLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  };
}

CopilotAssistantMessage.Container.displayName =
  "CopilotAssistantMessage.Container";
CopilotAssistantMessage.MarkdownRenderer.displayName =
  "CopilotAssistantMessage.MarkdownRenderer";
CopilotAssistantMessage.Toolbar.displayName = "CopilotAssistantMessage.Toolbar";
CopilotAssistantMessage.CopyButton.displayName =
  "CopilotAssistantMessage.CopyButton";
CopilotAssistantMessage.ThumbsUpButton.displayName =
  "CopilotAssistantMessage.ThumbsUpButton";
CopilotAssistantMessage.ThumbsDownButton.displayName =
  "CopilotAssistantMessage.ThumbsDownButton";
CopilotAssistantMessage.ReadAloudButton.displayName =
  "CopilotAssistantMessage.ReadAloudButton";
CopilotAssistantMessage.RegenerateButton.displayName =
  "CopilotAssistantMessage.RegenerateButton";

export default CopilotAssistantMessage;

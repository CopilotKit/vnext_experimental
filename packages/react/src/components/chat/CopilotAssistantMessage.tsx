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
import { Slots } from "@/types/slots";
import { renderSlot } from "@/lib/slots";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";

export type CopilotAssistantMessageSlots = {
  Container: React.ComponentType<
    React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>
  >;
  MarkdownRenderer: React.ComponentType<{
    content: string;
    className?: string;
  }>;
  Toolbar: React.ComponentType<React.HTMLAttributes<HTMLDivElement>>;
  CopyButton: React.ComponentType<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >;
  ThumbsUpButton: React.ComponentType<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >;
  ThumbsDownButton: React.ComponentType<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >;
  ReadAloudButton: React.ComponentType<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >;
  RegenerateButton: React.ComponentType<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >;
};

export type CopilotAssistantMessageCallbacks = {
  onThumbsUp?: () => void;
  onThumbsDown?: () => void;
  onReadAloud?: () => void;
  onRegenerate?: () => void;
};

export type CopilotAssistantMessageOptions = {
  message: AssistantMessage;
  additionalToolbarItems?: React.ReactNode;
};

export type CopilotAssistantMessageProps = Slots<
  CopilotAssistantMessageSlots,
  CopilotAssistantMessageOptions & CopilotAssistantMessageCallbacks
>;

export function CopilotAssistantMessage({
  message,
  onThumbsUp,
  onThumbsDown,
  onReadAloud,
  onRegenerate,
  additionalToolbarItems,
  Container,
  MarkdownRenderer,
  Toolbar,
  CopyButton,
  ThumbsUpButton,
  ThumbsDownButton,
  ReadAloudButton,
  RegenerateButton,
  children,
}: CopilotAssistantMessageProps) {
  const BoundMarkdownRenderer = renderSlot(
    MarkdownRenderer,
    CopilotAssistantMessage.MarkdownRenderer,
    {
      content: message.content || "",
    }
  );

  const BoundCopyButton = renderSlot(
    CopyButton,
    CopilotAssistantMessage.CopyButton,
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

  const BoundThumbsUpButton = renderSlot(
    ThumbsUpButton,
    CopilotAssistantMessage.ThumbsUpButton,
    {
      onClick: onThumbsUp,
    }
  );

  const BoundThumbsDownButton = renderSlot(
    ThumbsDownButton,
    CopilotAssistantMessage.ThumbsDownButton,
    {
      onClick: onThumbsDown,
    }
  );

  const BoundReadAloudButton = renderSlot(
    ReadAloudButton,
    CopilotAssistantMessage.ReadAloudButton,
    {
      onClick: onReadAloud,
    }
  );

  const BoundRegenerateButton = renderSlot(
    RegenerateButton,
    CopilotAssistantMessage.RegenerateButton,
    {
      onClick: onRegenerate,
    }
  );

  const BoundToolbar = renderSlot(Toolbar, CopilotAssistantMessage.Toolbar, {
    children: (
      <div className="flex items-center gap-1">
        {BoundCopyButton}
        {onThumbsUp && BoundThumbsUpButton}
        {onThumbsDown && BoundThumbsDownButton}
        {onReadAloud && BoundReadAloudButton}
        {onRegenerate && BoundRegenerateButton}
        {additionalToolbarItems}
      </div>
    ),
  });

  const BoundContainer = renderSlot(
    Container,
    CopilotAssistantMessage.Container,
    {
      children: (
        <>
          {BoundMarkdownRenderer}
          {BoundToolbar}
        </>
      ),
    }
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
          Container: BoundContainer,
          message,
          onThumbsUp,
          onThumbsDown,
          onReadAloud,
          onRegenerate,
          additionalToolbarItems,
        })}
      </>
    );
  }

  return BoundContainer;
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

  const CodeBlock = ({ children, className, onClick, ...props }: any) => {
    const { labels } = useCopilotChatContext();
    const [copied, setCopied] = useState(false);

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

  export function completePartialMarkdown(input: string): string {
    const file = unified()
      .use(remarkParse)
      .use(remarkStringify)
      .processSync(input); // ← sync version
    return String(file);
  }

  export const MarkdownRenderer: React.FC<{
    content: string;
    className?: string;
  }> = ({ content, className }) => (
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
        {completePartialMarkdown(content)}
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

  export const AssistantMessageToolbarButton: React.FC<
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
  > = ({ className, onClick, ...props }) => {
    const { labels } = useCopilotChatContext();
    const [copied, setCopied] = useState(false);

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      if (onClick) {
        onClick(event);
      }
    };

    return (
      <AssistantMessageToolbarButton
        title={labels.assistantMessageToolbarCopyMessageLabel}
        onClick={handleClick}
        className={className}
        {...props}
      >
        {copied ? (
          <Check className="size-[18px]" />
        ) : (
          <Copy className="size-[18px]" />
        )}
      </AssistantMessageToolbarButton>
    );
  };

  export const ThumbsUpButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = (props) => {
    const { labels } = useCopilotChatContext();
    return (
      <AssistantMessageToolbarButton
        title={labels.assistantMessageToolbarThumbsUpLabel}
        {...props}
      >
        <ThumbsUp className="size-[18px]" />
      </AssistantMessageToolbarButton>
    );
  };

  export const ThumbsDownButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = (props) => {
    const { labels } = useCopilotChatContext();
    return (
      <AssistantMessageToolbarButton
        title={labels.assistantMessageToolbarThumbsDownLabel}
        {...props}
      >
        <ThumbsDown className="size-[18px]" />
      </AssistantMessageToolbarButton>
    );
  };

  export const ReadAloudButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = (props) => {
    const { labels } = useCopilotChatContext();
    return (
      <AssistantMessageToolbarButton
        title={labels.assistantMessageToolbarReadAloudLabel}
        {...props}
      >
        <Volume2 className="size-[20px]" />
      </AssistantMessageToolbarButton>
    );
  };

  export const RegenerateButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = (props) => {
    const { labels } = useCopilotChatContext();
    return (
      <AssistantMessageToolbarButton
        title={labels.assistantMessageToolbarRegenerateLabel}
        {...props}
      >
        <RefreshCw className="size-[18px]" />
      </AssistantMessageToolbarButton>
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

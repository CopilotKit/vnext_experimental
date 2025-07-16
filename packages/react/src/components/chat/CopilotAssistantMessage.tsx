import { AssistantMessage } from "@ag-ui/core";
import { MarkdownHooks } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeKatex from "rehype-katex";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopilotChatContext } from "@/providers/CopilotChatContextProvider";
import { twMerge } from "tailwind-merge";
import "katex/dist/katex.min.css";

export interface CopilotAssistantMessageProps {
  message: AssistantMessage;

  /**
   * Component slots — override one or many:
   * - Container: wrapper around everything (default is <div>)
   * - MarkdownRenderer: the markdown rendering component
   */
  components?: {
    Container?: React.ComponentType<
      React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>
    >;
    MarkdownRenderer?: React.ComponentType<{
      content: string;
      className?: string;
    }>;
  };

  /**
   * Style-only overrides (merged onto defaults).
   * Ignore if user also swaps that component.
   */
  appearance?: {
    container?: string;
    markdownRenderer?: string;
  };

  /**
   * Full-layout override (highest priority).
   * Receives the *pre-wired* sub-components so users never touch handlers.
   */
  children?: (parts: {
    Container: JSX.Element;
    MarkdownRenderer: JSX.Element;
  }) => React.ReactNode;
}

export function CopilotAssistantMessage({
  message,
  components = {},
  appearance = {},
  children,
}: CopilotAssistantMessageProps) {
  const {
    Container = CopilotAssistantMessage.Container,
    MarkdownRenderer = CopilotAssistantMessage.MarkdownRenderer,
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

  const BoundContainer = (
    <Container
      className={
        Container === CopilotAssistantMessage.Container
          ? appearance.container
          : undefined
      }
    >
      {BoundMarkdownRenderer}
    </Container>
  );

  if (children) {
    return (
      <>
        {children({
          Container: BoundContainer,
          MarkdownRenderer: BoundMarkdownRenderer,
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
        className="px-1.5 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono font-regular!"
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
            <span className="font-regular text-muted-foreground">
              {language}
            </span>
          )}

          {/* Copy button */}
          <button
            className={cn(
              "px-2 gap-1.5 text-xs flex items-center cursor-pointer text-gray-500"
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
          className={cn(className, "rounded-t-none border-t-0 my-1!")}
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
            theme: "github-light",
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
}

CopilotAssistantMessage.Container.displayName =
  "CopilotAssistantMessage.Container";
CopilotAssistantMessage.MarkdownRenderer.displayName =
  "CopilotAssistantMessage.MarkdownRenderer";

export default CopilotAssistantMessage;

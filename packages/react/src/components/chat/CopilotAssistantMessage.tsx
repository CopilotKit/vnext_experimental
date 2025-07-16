import { AssistantMessage } from "@ag-ui/core";
import { MarkdownHooks } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypePrettyCode from "rehype-pretty-code";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCopilotChatContext } from "@/providers/CopilotChatContextProvider";

export interface CopilotAssistantMessageProps {
  message: AssistantMessage;
}

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
  const isCodeBlock =
    className?.includes("language-") || props["data-language"];
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

  // For inline code, render normally without copy button
  if (!isCodeBlock) {
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  }

  // For code blocks, add header with language label and copy button
  return (
    <div className="relative">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 pr-3 py-3 text-xs">
        {/* Language label */}
        {language && (
          <span className="font-regular text-muted-foreground">{language}</span>
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

const CopilotAssistantMessage = ({ message }: CopilotAssistantMessageProps) => {
  return (
    <div className="prose max-w-full w-full break-words dark:prose-invert">
      <MarkdownHooks
        /* async plugins are now fine ✨ */
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [
            rehypePrettyCode,
            {
              keepBackground: false,
              theme: "github-light",
            },
          ],
        ]}
        components={{
          pre: CodeBlock,
          code: ({ className, children, ...props }: any) => {
            // For inline code (no className with language), render as simple code
            if (!className?.includes("language-")) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            // For code blocks, this will be wrapped by pre, so just return the code
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {message.content}
      </MarkdownHooks>
    </div>
  );
};

export default CopilotAssistantMessage;

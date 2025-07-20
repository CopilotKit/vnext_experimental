import { useState } from "react";
import { Copy, Check, Edit } from "lucide-react";
import { useCopilotChatContext } from "@/providers/CopilotChatContextProvider";
import { twMerge } from "tailwind-merge";
import { Button } from "@/components/ui/button";
import { UserMessage } from "@ag-ui/core";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface CopilotUserMessageProps {
  message: UserMessage;

  /** Called when user clicks edit button. If provided, button is shown. */
  onEdit?: () => void;

  /** Additional custom toolbar items to render alongside the default buttons. */
  additionalToolbarItems?: React.ReactNode;

  /**
   * Component slots — override one or many:
   * - Container: wrapper around everything (default is <div>)
   * - MessageRenderer: the message rendering component
   * - Toolbar: bottom toolbar area (default is <div>)
   * - CopyButton: copy message button
   * - EditButton: edit message button
   */
  components?: {
    Container?: React.ComponentType<
      React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>
    >;
    MessageRenderer?: React.ComponentType<{
      content: string;
      className?: string;
    }>;
    Toolbar?: React.ComponentType<React.HTMLAttributes<HTMLDivElement>>;
    CopyButton?: React.ComponentType<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
    EditButton?: React.ComponentType<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
  };

  /**
   * Style-only overrides (merged onto defaults).
   * Ignore if user also swaps that component.
   */
  appearance?: {
    container?: string;
    messageRenderer?: string;
    toolbar?: string;
    copyButton?: string;
    editButton?: string;
  };

  /**
   * Full-layout override (highest priority).
   * Receives the *pre-wired* sub-components so users never touch handlers.
   */
  children?: (parts: {
    MessageRenderer: JSX.Element;
    Toolbar: JSX.Element;
    CopyButton: JSX.Element;
    EditButton: JSX.Element;
  }) => React.ReactNode;
}

export function CopilotUserMessage({
  message,
  onEdit,
  additionalToolbarItems,
  components = {},
  appearance = {},
  children,
}: CopilotUserMessageProps) {
  const [copied, setCopied] = useState(false);
  const {
    Container = CopilotUserMessage.Container,
    MessageRenderer = CopilotUserMessage.MessageRenderer,
    Toolbar = CopilotUserMessage.Toolbar,
    CopyButton = CopilotUserMessage.CopyButton,
    EditButton = CopilotUserMessage.EditButton,
  } = components;

  const BoundMessageRenderer = (
    <MessageRenderer
      content={message.content || ""}
      className={
        MessageRenderer === CopilotUserMessage.MessageRenderer
          ? appearance.messageRenderer
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
        CopyButton === CopilotUserMessage.CopyButton
          ? appearance.copyButton
          : undefined
      }
    />
  );

  const BoundEditButton = (
    <EditButton
      onClick={onEdit}
      className={
        EditButton === CopilotUserMessage.EditButton
          ? appearance.editButton
          : undefined
      }
    />
  );

  const BoundToolbar = (
    <Toolbar
      className={
        Toolbar === CopilotUserMessage.Toolbar ? appearance.toolbar : undefined
      }
    >
      <div className="flex items-center gap-1 justify-end">
        {additionalToolbarItems}
        {BoundCopyButton}
        {onEdit && BoundEditButton}
      </div>
    </Toolbar>
  );

  if (children) {
    return (
      <>
        {children({
          MessageRenderer: BoundMessageRenderer,
          Toolbar: BoundToolbar,
          CopyButton: BoundCopyButton,
          EditButton: BoundEditButton,
        })}
      </>
    );
  }

  return (
    <Container
      className={
        Container === CopilotUserMessage.Container
          ? appearance.container
          : undefined
      }
    >
      {BoundMessageRenderer}
      {BoundToolbar}
    </Container>
  );
}

export namespace CopilotUserMessage {
  export const Container: React.FC<
    React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>
  > = ({ children, className, ...props }) => (
    <div
      className={twMerge("flex flex-col items-end group", className)}
      {...props}
    >
      {children}
    </div>
  );

  export const MessageRenderer: React.FC<{
    content: string;
    className?: string;
  }> = ({ content, className }) => (
    <div
      className={twMerge(
        "prose dark:prose-invert bg-muted relative max-w-[80%] rounded-[18px] px-4 py-1.5 data-[multiline]:py-3 inline-block whitespace-pre-wrap",
        className
      )}
    >
      {content}
    </div>
  );

  export const Toolbar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    ...props
  }) => (
    <div
      className={twMerge(
        "w-full bg-transparent flex items-center justify-end -mr-[5px] mt-[4px] invisible group-hover:visible",
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

  export const EditButton: React.FC<
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
            <Edit className="size-[18px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Edit message</p>
        </TooltipContent>
      </Tooltip>
    );
  };
}

CopilotUserMessage.Container.displayName = "CopilotUserMessage.Container";
CopilotUserMessage.MessageRenderer.displayName =
  "CopilotUserMessage.MessageRenderer";
CopilotUserMessage.Toolbar.displayName = "CopilotUserMessage.Toolbar";
CopilotUserMessage.CopyButton.displayName = "CopilotUserMessage.CopyButton";
CopilotUserMessage.EditButton.displayName = "CopilotUserMessage.EditButton";

export default CopilotUserMessage;

import { useState } from "react";
import { Copy, Check, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCopilotChatConfiguration,
  CopilotChatDefaultLabels,
} from "@/providers/CopilotChatConfigurationProvider";
import { twMerge } from "tailwind-merge";
import { Button } from "@/components/ui/button";
import { BinaryInputContent, InputContent, UserMessage } from "@ag-ui/core";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { renderSlot, WithSlots } from "@/lib/slots";
import {
  getUserMessageBinaryContents,
  getUserMessageTextContent,
  normalizeUserMessageContents,
} from "@copilotkitnext/shared";

export interface CopilotChatUserMessageOnEditMessageProps {
  message: UserMessage;
}

export interface CopilotChatUserMessageOnSwitchToBranchProps {
  message: UserMessage;
  branchIndex: number;
  numberOfBranches: number;
}

export type CopilotChatUserMessageProps = WithSlots<
  {
    messageRenderer: typeof CopilotChatUserMessage.MessageRenderer;
    toolbar: typeof CopilotChatUserMessage.Toolbar;
    copyButton: typeof CopilotChatUserMessage.CopyButton;
    editButton: typeof CopilotChatUserMessage.EditButton;
    branchNavigation: typeof CopilotChatUserMessage.BranchNavigation;
  },
  {
    onEditMessage?: (props: CopilotChatUserMessageOnEditMessageProps) => void;
    onSwitchToBranch?: (
      props: CopilotChatUserMessageOnSwitchToBranchProps
    ) => void;
    message: UserMessage;
    branchIndex?: number;
    numberOfBranches?: number;
    additionalToolbarItems?: React.ReactNode;
  } & React.HTMLAttributes<HTMLDivElement>
>;

export function CopilotChatUserMessage({
  message,
  onEditMessage,
  branchIndex,
  numberOfBranches,
  onSwitchToBranch,
  additionalToolbarItems,
  messageRenderer,
  toolbar,
  copyButton,
  editButton,
  branchNavigation,
  children,
  className,
  ...props
}: CopilotChatUserMessageProps) {
  const BoundMessageRenderer = renderSlot(
    messageRenderer,
    CopilotChatUserMessage.MessageRenderer,
    {
      content: getUserMessageTextContent(message.content),
      contents: normalizeUserMessageContents(message.content),
    }
  );

  const BoundCopyButton = renderSlot(
    copyButton,
    CopilotChatUserMessage.CopyButton,
    {
      onClick: async () => {
        const textContent = getUserMessageTextContent(message.content);
        if (textContent.trim().length > 0) {
          try {
            await navigator.clipboard.writeText(textContent);
          } catch (err) {
            console.error("Failed to copy message:", err);
          }
        }
      },
    }
  );

  const BoundEditButton = renderSlot(
    editButton,
    CopilotChatUserMessage.EditButton,
    {
      onClick: () => onEditMessage?.({ message }),
    }
  );

  const BoundBranchNavigation = renderSlot(
    branchNavigation,
    CopilotChatUserMessage.BranchNavigation,
    {
      currentBranch: branchIndex,
      numberOfBranches,
      onSwitchToBranch,
      message,
    }
  );

  const showBranchNavigation =
    numberOfBranches && numberOfBranches > 1 && onSwitchToBranch;

  const BoundToolbar = renderSlot(toolbar, CopilotChatUserMessage.Toolbar, {
    children: (
      <div className="flex items-center gap-1 justify-end">
        {additionalToolbarItems}
        {BoundCopyButton}
        {onEditMessage && BoundEditButton}
        {showBranchNavigation && BoundBranchNavigation}
      </div>
    ),
  });

  if (children) {
    return (
      <>
        {children({
          messageRenderer: BoundMessageRenderer,
          toolbar: BoundToolbar,
          copyButton: BoundCopyButton,
          editButton: BoundEditButton,
          branchNavigation: BoundBranchNavigation,
          message,
          branchIndex,
          numberOfBranches,
          additionalToolbarItems,
        })}
      </>
    );
  }

  return (
    <div
      className={twMerge("flex flex-col items-end group pt-10", className)}
      data-message-id={message.id}
      {...props}
    >
      {BoundMessageRenderer}
      {BoundToolbar}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CopilotChatUserMessage {
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

  type MessageRendererProps = {
    content: string;
    contents?: InputContent[];
    className?: string;
  };

  export const MessageRenderer: React.FC<MessageRendererProps> = ({
    content,
    contents = [],
    className,
  }) => {
    const attachments = getUserMessageBinaryContents(contents);

    const hasText = content.trim().length > 0;

    return (
      <div
        className={twMerge(
          "prose dark:prose-invert bg-muted relative max-w-[80%] rounded-[18px] px-4 py-1.5 data-[multiline]:py-3 inline-block whitespace-pre-wrap",
          className,
        )}
      >
        {hasText && <span>{content}</span>}
        {attachments.length > 0 && (
          <div className={twMerge(hasText ? "mt-3 flex flex-col gap-2" : "flex flex-col gap-2")}>
            {attachments.map((attachment, index) => (
              <AttachmentPreview
                key={attachment.id ?? attachment.url ?? attachment.filename ?? index}
                attachment={attachment}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

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

  export const ToolbarButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      title: string;
      children: React.ReactNode;
    }
  > = ({ title, children, className, ...props }) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="assistantMessageToolbarButton"
            aria-label={title}
            className={twMerge(className)}
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
    React.ButtonHTMLAttributes<HTMLButtonElement> & { copied?: boolean }
  > = ({ className, title, onClick, ...props }) => {
    const config = useCopilotChatConfiguration();
    const labels = config?.labels ?? CopilotChatDefaultLabels;
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
        title={title || labels.userMessageToolbarCopyMessageLabel}
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

  export const EditButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ className, title, ...props }) => {
    const config = useCopilotChatConfiguration();
    const labels = config?.labels ?? CopilotChatDefaultLabels;
    return (
      <ToolbarButton
        title={title || labels.userMessageToolbarEditMessageLabel}
        className={className}
        {...props}
      >
        <Edit className="size-[18px]" />
      </ToolbarButton>
    );
  };

  export const BranchNavigation: React.FC<
    React.HTMLAttributes<HTMLDivElement> & {
      currentBranch?: number;
      numberOfBranches?: number;
      onSwitchToBranch?: (
        props: CopilotChatUserMessageOnSwitchToBranchProps
      ) => void;
      message: UserMessage;
    }
  > = ({
    className,
    currentBranch = 0,
    numberOfBranches = 1,
    onSwitchToBranch,
    message,
    ...props
  }) => {
    if (!numberOfBranches || numberOfBranches <= 1 || !onSwitchToBranch) {
      return null;
    }

    const canGoPrev = currentBranch > 0;
    const canGoNext = currentBranch < numberOfBranches - 1;

    return (
      <div className={twMerge("flex items-center gap-1", className)} {...props}>
        <Button
          type="button"
          variant="assistantMessageToolbarButton"
          onClick={() =>
            onSwitchToBranch?.({
              branchIndex: currentBranch - 1,
              numberOfBranches,
              message,
            })
          }
          disabled={!canGoPrev}
          className="h-6 w-6 p-0"
        >
          <ChevronLeft className="size-[20px]" />
        </Button>
        <span className="text-sm text-muted-foreground px-0 font-medium">
          {currentBranch + 1}/{numberOfBranches}
        </span>
        <Button
          type="button"
          variant="assistantMessageToolbarButton"
          onClick={() =>
            onSwitchToBranch?.({
              branchIndex: currentBranch + 1,
              numberOfBranches,
              message,
            })
          }
          disabled={!canGoNext}
          className="h-6 w-6 p-0"
        >
          <ChevronRight className="size-[20px]" />
        </Button>
      </div>
    );
  };
}

const AttachmentPreview: React.FC<{ attachment: BinaryInputContent }> = ({ attachment }) => {
  const source = resolveAttachmentSource(attachment);
  const isImage = attachment.mimeType.startsWith("image/");
  const label = attachment.filename ?? attachment.id ?? attachment.mimeType;

  if (isImage && source) {
    return (
      <figure className="flex flex-col gap-1">
        <img
          src={source}
          alt={label ?? "User provided image"}
          className="max-h-64 rounded-lg border border-border object-contain"
        />
        <figcaption className="text-xs text-muted-foreground">
          {label ?? "Image attachment"}
        </figcaption>
      </figure>
    );
  }

  return (
    <div className="rounded-md border border-dashed border-border bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
      {label ?? "Attachment"}
      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground/70">
        {attachment.mimeType}
      </span>
      {source && !isImage ? (
        <a
          href={source}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block text-xs text-primary underline"
        >
          Open
        </a>
      ) : null}
    </div>
  );
};

function resolveAttachmentSource(attachment: BinaryInputContent): string | null {
  if (attachment.url) {
    return attachment.url;
  }

  if (attachment.data) {
    return `data:${attachment.mimeType};base64,${attachment.data}`;
  }

  return null;
}

CopilotChatUserMessage.Container.displayName =
  "CopilotChatUserMessage.Container";
CopilotChatUserMessage.MessageRenderer.displayName =
  "CopilotChatUserMessage.MessageRenderer";
CopilotChatUserMessage.Toolbar.displayName = "CopilotChatUserMessage.Toolbar";
CopilotChatUserMessage.ToolbarButton.displayName =
  "CopilotChatUserMessage.ToolbarButton";
CopilotChatUserMessage.CopyButton.displayName =
  "CopilotChatUserMessage.CopyButton";
CopilotChatUserMessage.EditButton.displayName =
  "CopilotChatUserMessage.EditButton";
CopilotChatUserMessage.BranchNavigation.displayName =
  "CopilotChatUserMessage.BranchNavigation";

export default CopilotChatUserMessage;

import React, { useCallback } from "react";

import { cn } from "@/lib/utils";
import { useCopilotChatConfiguration, CopilotChatDefaultLabels } from "@/providers/CopilotChatConfigurationProvider";
import { renderSlot, WithSlots } from "@/lib/slots";
import { X, List, SquarePen } from "lucide-react";

type HeaderSlots = {
  titleContent: typeof CopilotModalHeader.Title;
  closeButton: typeof CopilotModalHeader.CloseButton;
  leftContent: typeof CopilotModalHeader.LeftContent;
};

type HeaderRestProps = {
  title?: string;
  onThreadListClick?: () => void;
  showThreadListButton?: boolean;
  onNewThreadClick?: () => void;
  showNewThreadButton?: boolean;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">;

export type CopilotModalHeaderProps = WithSlots<HeaderSlots, HeaderRestProps>;

export function CopilotModalHeader({
  title,
  titleContent,
  closeButton,
  leftContent,
  onThreadListClick,
  showThreadListButton = false,
  onNewThreadClick,
  showNewThreadButton = false,
  children,
  className,
  ...rest
}: CopilotModalHeaderProps) {
  const configuration = useCopilotChatConfiguration();

  const fallbackTitle = configuration?.labels.modalHeaderTitle ?? CopilotChatDefaultLabels.modalHeaderTitle;
  const resolvedTitle = title ?? fallbackTitle;

  const handleClose = useCallback(() => {
    configuration?.setModalOpen(false);
  }, [configuration]);

  const BoundTitle = renderSlot(titleContent, CopilotModalHeader.Title, {
    children: resolvedTitle,
  });

  const BoundCloseButton = renderSlot(closeButton, CopilotModalHeader.CloseButton, {
    onClick: handleClose,
  });

  const BoundLeftContent = renderSlot(leftContent, CopilotModalHeader.LeftContent, {
    onThreadListClick,
    showThreadListButton,
    onNewThreadClick,
    showNewThreadButton,
  });

  if (children) {
    return children({
      titleContent: BoundTitle,
      closeButton: BoundCloseButton,
      leftContent: BoundLeftContent,
      title: resolvedTitle,
      ...rest,
    });
  }

  return (
    <header
      data-slot="copilot-modal-header"
      className={cn(
        "flex items-center justify-between border-b border-border px-4 py-4",
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className,
      )}
      {...rest}
    >
      <div className="flex w-full items-center gap-2">
        <div className="flex flex-1 justify-start">{BoundLeftContent}</div>
        <div className="flex flex-1 justify-center text-center">{BoundTitle}</div>
        <div className="flex flex-1 justify-end">{BoundCloseButton}</div>
      </div>
    </header>
  );
}

CopilotModalHeader.displayName = "CopilotModalHeader";

export namespace CopilotModalHeader {
  export const Title: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...props }) => (
    <div
      className={cn(
        "w-full text-base font-medium leading-none tracking-tight text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );

  export const CloseButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({
    className,
    ...props
  }) => (
    <button
      type="button"
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition cursor-pointer",
        "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label="Close"
      {...props}
    >
      <X className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  export interface LeftContentProps {
    onThreadListClick?: () => void;
    showThreadListButton?: boolean;
    onNewThreadClick?: () => void;
    showNewThreadButton?: boolean;
    className?: string;
    children?: React.ReactNode;
  }

  export const LeftContent: React.FC<LeftContentProps> = ({
    onThreadListClick,
    showThreadListButton,
    onNewThreadClick,
    showNewThreadButton,
    className,
    children,
  }) => {
    if (children) {
      return <div className={className}>{children}</div>;
    }

    const hasAnyButton = (showNewThreadButton && onNewThreadClick) || (showThreadListButton && onThreadListClick);

    if (!hasAnyButton) {
      return null;
    }

    return (
      <div className={cn("flex items-center gap-1", className)}>
        {showNewThreadButton && onNewThreadClick && (
          <button
            type="button"
            onClick={onNewThreadClick}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition cursor-pointer",
              "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="New thread"
            title="New thread"
          >
            <SquarePen className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        {showThreadListButton && onThreadListClick && (
          <button
            type="button"
            onClick={onThreadListClick}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition cursor-pointer",
              "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-label="Show threads"
            title="Show threads"
          >
            <List className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    );
  };
}

CopilotModalHeader.Title.displayName = "CopilotModalHeader.Title";
CopilotModalHeader.CloseButton.displayName = "CopilotModalHeader.CloseButton";
CopilotModalHeader.LeftContent.displayName = "CopilotModalHeader.LeftContent";

export default CopilotModalHeader;

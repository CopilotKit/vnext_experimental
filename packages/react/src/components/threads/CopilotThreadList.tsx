import React, { useCallback, useEffect, useRef, useState } from "react";
import { useThreads } from "@/hooks/use-threads";
import {
  useCopilotChatConfiguration,
  CopilotChatConfigurationProvider,
} from "@/providers/CopilotChatConfigurationProvider";
import { renderSlot, SlotValue } from "@/lib/slots";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { randomUUID, ThreadMetadata } from "@copilotkitnext/shared";

export interface CopilotThreadListProps {
  /**
   * Number of threads to load initially
   */
  limit?: number;

  /**
   * Callback when a thread is selected
   */
  onThreadSelect?: (threadId: string) => void;

  /**
   * Custom className for the container
   */
  className?: string;

  /**
   * Slot for customizing thread items
   */
  threadItem?: SlotValue<typeof ThreadListItem>;

  /**
   * Slot for customizing the new thread button
   */
  newThreadButton?: SlotValue<typeof NewThreadButton>;

  /**
   * Slot for customizing the container
   */
  container?: SlotValue<typeof Container>;

  /**
   * Interval in milliseconds for auto-refreshing threads when a thread is running or unnamed.
   * @default 2000
   */
  refreshInterval?: number;

  /**
   * Disable automatic polling/refresh of threads.
   * Use this when you have external invalidation mechanisms (e.g., React Query, SWR).
   * @default false
   */
  disableAutoRefresh?: boolean;
}

function CopilotThreadListInner({
  limit = 50,
  onThreadSelect,
  className,
  threadItem,
  newThreadButton,
  container,
  refreshInterval = 2000,
  disableAutoRefresh = false,
}: CopilotThreadListProps) {
  const config = useCopilotChatConfiguration();
  const { threads, isLoading, error, fetchThreads, addOptimisticThread, refresh, currentThreadId, deleteThread } =
    useThreads({
      limit,
    });

  // Track which threads we've already attempted to fetch to prevent infinite loops
  const attemptedFetchRef = useRef<Set<string>>(new Set());

  const handleNewThread = useCallback(() => {
    const newThreadId = randomUUID();
    addOptimisticThread(newThreadId);
    config?.setThreadId?.(newThreadId);
    onThreadSelect?.(newThreadId);
  }, [addOptimisticThread, config, onThreadSelect]);

  const handleThreadSelect = useCallback(
    (threadId: string) => {
      config?.setThreadId?.(threadId);
      onThreadSelect?.(threadId);
    },
    [config, onThreadSelect],
  );

  const handleDeleteThread = useCallback(
    async (threadId: string) => {
      try {
        await deleteThread(threadId);
        // If the deleted thread was active, create a new thread
        if (threadId === (currentThreadId ?? config?.threadId)) {
          const newThreadId = randomUUID();
          addOptimisticThread(newThreadId);
          config?.setThreadId?.(newThreadId);
        }
      } catch (err) {
        console.error("Failed to delete thread:", err);
      }
    },
    [deleteThread, currentThreadId, config, addOptimisticThread],
  );

  // Refresh when current thread is not in the list (e.g., after creating via header button)
  useEffect(() => {
    const activeId = currentThreadId ?? config?.threadId;
    if (!activeId) return;

    const isCurrentThreadInList = threads.some((t) => t.threadId === activeId);

    if (isCurrentThreadInList) {
      // Thread found - clear from attempted set so we can retry if it's removed later
      attemptedFetchRef.current.delete(activeId);
      return;
    }

    // Thread not in list - check if we should refresh
    if (!isLoading && !attemptedFetchRef.current.has(activeId)) {
      // Mark as attempted before calling refresh to prevent immediate re-trigger
      attemptedFetchRef.current.add(activeId);
      refresh();
    }
  }, [currentThreadId, config?.threadId, threads, refresh, isLoading]);

  // Refresh threads periodically if a thread is running or has no firstMessage yet
  useEffect(() => {
    // Skip auto-refresh if disabled
    if (disableAutoRefresh) return;

    const hasRunningThread = threads.some((t) => t.isRunning);
    const hasUnnamedThread = threads.some((t) => !t.firstMessage);

    if (!hasRunningThread && !hasUnnamedThread) return;

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [threads, refresh, refreshInterval, disableAutoRefresh]);

  const BoundNewThreadButton = renderSlot(newThreadButton, NewThreadButton, {
    onClick: handleNewThread,
  });

  const activeThreadId = currentThreadId ?? config?.threadId;

  const threadItems = threads.map((thread) => {
    const isActive = thread.threadId === activeThreadId;
    return renderSlot(threadItem, ThreadListItem, {
      key: thread.threadId,
      thread,
      isActive,
      onClick: () => handleThreadSelect(thread.threadId),
      onDelete: () => handleDeleteThread(thread.threadId),
    });
  });

  const content = (
    <>
      {BoundNewThreadButton}
      <div className="space-y-1">
        {error ? (
          <div className="copilotkit-thread-list-error mx-4 my-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <p className="mb-3 font-medium">Failed to load threads: {error.message}</p>
            <button
              type="button"
              className="rounded bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition hover:bg-destructive/90"
              onClick={() => fetchThreads()}
            >
              Retry
            </button>
          </div>
        ) : isLoading && threads.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading threads...</div>
        ) : threads.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No threads yet</div>
        ) : (
          threadItems
        )}
      </div>
    </>
  );

  return renderSlot(container, Container, {
    className,
    children: content,
  });
}

const Container: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn("flex flex-col h-full", className)} {...props}>
    {children}
  </div>
);

const NewThreadButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...props }) => (
  <button
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium",
      "border-b border-border",
      "hover:bg-accent/50 transition-colors",
      "text-foreground",
      className,
    )}
    {...props}
  >
    <Plus className="w-4 h-4" />
    <span>New Conversation</span>
  </button>
);

export interface ThreadListItemProps {
  thread: ThreadMetadata;
  isActive?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
}

const ThreadListItem: React.FC<ThreadListItemProps> = ({ thread, isActive, onClick, onDelete }) => {
  const displayText = thread.firstMessage?.substring(0, 60) || "New conversation";
  const hasEllipsis = thread.firstMessage && thread.firstMessage.length > 60;
  const messageCount = thread.messageCount || 0;
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent thread selection when clicking delete
      if (!onDelete) return;

      setIsDeleting(true);
      try {
        await onDelete();
      } catch (err) {
        console.error("Delete failed:", err);
        setIsDeleting(false);
      }
    },
    [onDelete],
  );

  return (
    <div
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 group relative",
        "hover:bg-accent/50 transition-colors",
        "border-b border-border",
        isActive && "bg-accent border-l-2 border-l-primary",
        isDeleting && "opacity-50 pointer-events-none",
      )}
    >
      <button onClick={onClick} className="flex items-start gap-3 flex-1 min-w-0 text-left">
        <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground truncate">
            {displayText}
            {hasEllipsis && "..."}
          </p>
          {messageCount > 0 && <p className="text-xs text-muted-foreground mt-1">{messageCount} messages</p>}
        </div>
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className={cn(
            "p-1.5 rounded transition-all",
            "text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            "opacity-0 group-hover:opacity-100",
            "focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-destructive/20",
            isDeleting && "animate-pulse",
          )}
          aria-label="Delete thread"
          title="Delete thread"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export function CopilotThreadList(props: CopilotThreadListProps) {
  const existingConfig = useCopilotChatConfiguration();

  // If no configuration provider exists, create one
  if (!existingConfig) {
    return (
      <CopilotChatConfigurationProvider>
        <CopilotThreadListInner {...props} />
      </CopilotChatConfigurationProvider>
    );
  }

  // Otherwise, use the existing provider
  return <CopilotThreadListInner {...props} />;
}

CopilotThreadList.displayName = "CopilotThreadList";

// Export sub-components for use with slots
CopilotThreadList.ThreadItem = ThreadListItem;
CopilotThreadList.NewThreadButton = NewThreadButton;
CopilotThreadList.Container = Container;

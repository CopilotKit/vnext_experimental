import { useCallback, useEffect, useState } from "react";
import { useCopilotKit } from "../providers/CopilotKitProvider";
import { useCopilotChatConfiguration } from "../providers/CopilotChatConfigurationProvider";
import { ThreadMetadata } from "@copilotkitnext/shared";

export interface UseThreadsOptions {
  limit?: number;
  autoFetch?: boolean;
}

export interface UseThreadsResult {
  threads: ThreadMetadata[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  fetchThreads: (offset?: number) => Promise<void>;
  getThreadMetadata: (threadId: string) => Promise<ThreadMetadata | null>;
  refresh: () => Promise<void>;
  addOptimisticThread: (threadId: string) => void;
  deleteThread: (threadId: string) => Promise<void>;
  currentThreadId?: string;
}

/**
 * Hook for managing and retrieving threads from the CopilotKit runtime.
 *
 * @example
 * ```tsx
 * const { threads, isLoading, fetchThreads } = useThreads({ limit: 20 });
 *
 * // Manually fetch threads
 * await fetchThreads();
 *
 * // Paginate
 * await fetchThreads(20); // offset = 20
 * ```
 */
export function useThreads(options: UseThreadsOptions = {}): UseThreadsResult {
  const { limit = 50, autoFetch = true } = options;
  const { copilotkit: core } = useCopilotKit();
  const chatConfig = useCopilotChatConfiguration();

  const [threads, setThreads] = useState<ThreadMetadata[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchThreads = useCallback(
    async (offset = 0) => {
      if (!core) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await core.listThreads({ limit, offset });
        setThreads(result.threads);
        setTotal(result.total);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to fetch threads");
        setError(error);
        console.error("Error fetching threads:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [core, limit],
  );

  const getThreadMetadata = useCallback(
    async (threadId: string): Promise<ThreadMetadata | null> => {
      if (!core) {
        throw new Error("CopilotKit core not initialized");
      }

      try {
        return await core.getThreadMetadata(threadId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to get thread metadata");
        console.error("Error getting thread metadata:", error);
        throw error;
      }
    },
    [core],
  );

  const refresh = useCallback(() => fetchThreads(0), [fetchThreads]);

  const addOptimisticThread = useCallback((threadId: string) => {
    const newThread: ThreadMetadata = {
      threadId,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      isRunning: false,
      messageCount: 0,
      firstMessage: undefined,
    };
    setThreads((prev) => [newThread, ...prev]);
    setTotal((prev) => prev + 1);
  }, []);

  const deleteThread = useCallback(
    async (threadId: string) => {
      if (!core) {
        throw new Error("CopilotKit core not initialized");
      }

      // Optimistic update: save original state for rollback
      const originalThreads = threads;
      const originalTotal = total;
      const threadIndex = threads.findIndex((t) => t.threadId === threadId);
      const deletedThread = threadIndex >= 0 ? threads[threadIndex] : null;

      // Immediately remove from UI
      if (threadIndex >= 0) {
        setThreads((prev) => prev.filter((t) => t.threadId !== threadId));
        setTotal((prev) => prev - 1);
      }

      try {
        // Use core helper method for deletion
        await core.deleteThread(threadId);

        // Success - refetch to ensure consistency
        await fetchThreads();
      } catch (err) {
        // Rollback: restore thread to its original position
        if (deletedThread && threadIndex >= 0) {
          setThreads((prev) => {
            const newThreads = [...prev];
            newThreads.splice(threadIndex, 0, deletedThread);
            return newThreads;
          });
          setTotal(originalTotal);
        } else {
          // Fallback: restore complete original state if we don't have the thread
          setThreads(originalThreads);
          setTotal(originalTotal);
        }

        const error = err instanceof Error ? err : new Error("Failed to delete thread");
        console.error("Error deleting thread:", error);
        throw error;
      }
    },
    [core, fetchThreads, threads, total],
  );

  useEffect(() => {
    if (autoFetch && core) {
      void fetchThreads();
    }
  }, [autoFetch, core, fetchThreads]);

  return {
    threads,
    total,
    isLoading,
    error,
    fetchThreads,
    getThreadMetadata,
    refresh,
    addOptimisticThread,
    deleteThread,
    currentThreadId: chatConfig?.threadId,
  };
}

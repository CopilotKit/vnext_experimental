import { useAgent } from "@/hooks/use-agent";
import { useSuggestions } from "@/hooks/use-suggestions";
import { CopilotChatView, CopilotChatViewProps } from "./CopilotChatView";
import CopilotChatInput, { CopilotChatInputProps } from "./CopilotChatInput";
import {
  CopilotChatConfigurationProvider,
  CopilotChatLabels,
  useCopilotChatConfiguration,
} from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID, randomUUID } from "@copilotkitnext/shared";
import { Suggestion } from "@copilotkitnext/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { merge } from "ts-deepmerge";
import { useCopilotKit } from "@/providers/CopilotKitProvider";
import { renderSlot, SlotValue } from "@/lib/slots";

export type CopilotChatProps = Omit<
  CopilotChatViewProps,
  "messages" | "isRunning" | "suggestions" | "suggestionLoadingIndexes" | "onSelectSuggestion"
> & {
  agentId?: string;
  threadId?: string;
  labels?: Partial<CopilotChatLabels>;
  chatView?: SlotValue<typeof CopilotChatView>;
  isModalDefaultOpen?: boolean;
};
export function CopilotChat({ agentId, threadId, labels, chatView, isModalDefaultOpen, ...props }: CopilotChatProps) {
  // Check for existing configuration provider
  const existingConfig = useCopilotChatConfiguration();

  // Wrap in provider if no config exists OR if we have override props
  const hasOverrideProps =
    agentId !== undefined || threadId !== undefined || labels !== undefined || isModalDefaultOpen !== undefined;

  if (!existingConfig || hasOverrideProps) {
    return (
      <CopilotChatConfigurationProvider
        agentId={agentId}
        threadId={threadId}
        labels={labels}
        isModalDefaultOpen={isModalDefaultOpen}
      >
        <CopilotChat chatView={chatView} {...props} />
      </CopilotChatConfigurationProvider>
    );
  }

  // Apply priority: props > existing config > defaults
  const resolvedAgentId = agentId ?? existingConfig?.agentId ?? DEFAULT_AGENT_ID;
  const resolvedThreadId = threadId ?? existingConfig?.threadId;

  const { agent } = useAgent({ agentId: resolvedAgentId });
  const { copilotkit } = useCopilotKit();

  // Track thread switching state
  const [isSwitchingThread, setIsSwitchingThread] = useState(false);
  const [threadSwitchError, setThreadSwitchError] = useState<Error | null>(null);
  const previousThreadIdRef = useRef<string | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle thread switching when threadId changes
  useEffect(() => {
    if (!agent || !resolvedThreadId) return;

    // Skip if thread hasn't changed
    if (previousThreadIdRef.current === resolvedThreadId) return;

    // Cancel any in-flight thread switch to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this switch operation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Switch threads immediately (no debounce)
    const switchThread = async () => {
      setIsSwitchingThread(true);
      setThreadSwitchError(null);

      try {
        // Check if aborted before starting
        if (abortController.signal.aborted) return;

        // Disconnect from previous thread if exists
        if (previousThreadIdRef.current) {
          try {
            await copilotkit.disconnectAgent({ agent });
          } catch (disconnectErr) {
            // Log disconnect error but continue with the switch
            // The disconnect already clears the thread guard, so stale events will be dropped
            console.warn("Error during disconnect, continuing with thread switch:", disconnectErr);
          }
        }

        // Check if aborted after disconnect
        if (abortController.signal.aborted) {
          // Reset previousThreadIdRef to allow reconnection when returning to the old thread
          // Without this, the guard on line 66 would short-circuit and prevent reconnection
          previousThreadIdRef.current = undefined;
          return;
        }

        // Clear messages to prepare for the new thread's messages
        // connectAgent() will sync messages from the backend for the new thread
        agent.messages = [];

        // Manually trigger subscribers since direct assignment doesn't notify them
        // This ensures React components re-render with the empty messages
        const subscribers = (agent as any).subscribers || [];
        subscribers.forEach((subscriber: any) => {
          if (subscriber.onMessagesChanged) {
            subscriber.onMessagesChanged({
              messages: agent.messages,
              state: agent.state,
              agent: agent,
            });
          }
        });

        // Check if aborted before connecting
        if (abortController.signal.aborted) {
          // Reset previousThreadIdRef to allow reconnection when returning to the old thread
          previousThreadIdRef.current = undefined;
          return;
        }

        // Connect to new thread - this syncs messages from backend for this thread
        // (including any that were generated while we were on other threads)
        await copilotkit.connectAgent({ agent, threadId: resolvedThreadId });

        // Only update previousThreadIdRef if not aborted (successful switch)
        if (!abortController.signal.aborted) {
          previousThreadIdRef.current = resolvedThreadId;
        }
      } catch (err) {
        // Ignore aborted errors
        if (abortController.signal.aborted) {
          // Reset previousThreadIdRef to allow reconnection when returning to the old thread
          previousThreadIdRef.current = undefined;
          return;
        }

        const error = err instanceof Error ? err : new Error(String(err));
        setThreadSwitchError(error);
        console.error("Failed to switch thread:", error);
      } finally {
        // Only clear loading state if this operation wasn't aborted
        if (!abortController.signal.aborted) {
          setIsSwitchingThread(false);
        }
      }
    };

    void switchThread();

    // Cleanup: abort on unmount or when deps change
    return () => {
      abortController.abort();
    };
  }, [agent, resolvedThreadId, copilotkit]);

  const { suggestions: autoSuggestions } = useSuggestions({ agentId: resolvedAgentId });

  const {
    inputProps: providedInputProps,
    messageView: providedMessageView,
    suggestionView: providedSuggestionView,
    ...restProps
  } = props;

  const onSubmitInput = useCallback(
    async (value: string) => {
      agent?.addMessage({
        id: randomUUID(),
        role: "user",
        content: value,
      });
      if (agent) {
        try {
          await copilotkit.runAgent({ agent });
        } catch (error) {
          console.error("CopilotChat: runAgent failed", error);
        }
      }
    },
    [agent, copilotkit],
  );

  const handleSelectSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      if (!agent) {
        return;
      }

      agent.addMessage({
        id: randomUUID(),
        role: "user",
        content: suggestion.message,
      });

      try {
        await copilotkit.runAgent({ agent });
      } catch (error) {
        console.error("CopilotChat: runAgent failed after selecting suggestion", error);
      }
    },
    [agent, copilotkit],
  );

  const stopCurrentRun = useCallback(() => {
    if (!agent) {
      return;
    }

    try {
      copilotkit.stopAgent({ agent });
    } catch (error) {
      console.error("CopilotChat: stopAgent failed", error);
      try {
        agent.abortRun();
      } catch (abortError) {
        console.error("CopilotChat: abortRun fallback failed", abortError);
      }
    }
  }, [agent, copilotkit]);

  const mergedProps = merge(
    {
      isRunning: agent?.isRunning ?? false,
      suggestions: autoSuggestions,
      onSelectSuggestion: handleSelectSuggestion,
      suggestionView: providedSuggestionView,
    },
    {
      ...restProps,
      ...(typeof providedMessageView === "string"
        ? { messageView: { className: providedMessageView } }
        : providedMessageView !== undefined
          ? { messageView: providedMessageView }
          : {}),
    },
  );

  const providedStopHandler = providedInputProps?.onStop;
  const hasMessages = (agent?.messages?.length ?? 0) > 0;
  const shouldAllowStop = (agent?.isRunning ?? false) && hasMessages;
  const effectiveStopHandler = shouldAllowStop ? (providedStopHandler ?? stopCurrentRun) : providedStopHandler;

  const finalInputProps = {
    ...providedInputProps,
    onSubmitMessage: onSubmitInput,
    onStop: effectiveStopHandler,
    isRunning: agent?.isRunning ?? false,
  } as Partial<CopilotChatInputProps> & { onSubmitMessage: (value: string) => void };

  finalInputProps.mode = agent?.isRunning ? "processing" : (finalInputProps.mode ?? "input");

  const finalProps = merge(mergedProps, {
    messages: agent?.messages ?? [],
    inputProps: finalInputProps,
  }) as CopilotChatViewProps;

  const inputPropsWithThreadState = {
    ...(finalProps.inputProps ?? {}),
    mode: isSwitchingThread ? "processing" : finalProps.inputProps?.mode,
  };

  const finalPropsWithThreadState: CopilotChatViewProps & {
    "data-thread-switching"?: string;
    "data-thread-switch-error"?: string;
  } = {
    ...finalProps,
    isRunning: (finalProps.isRunning ?? false) || isSwitchingThread,
    inputProps: inputPropsWithThreadState,
    // Pass thread switching state to control scroll behavior
    isSwitchingThread,
    "data-thread-switching": isSwitchingThread ? "true" : undefined,
    "data-thread-switch-error": threadSwitchError ? threadSwitchError.message : undefined,
  };

  return renderSlot(chatView, CopilotChatView, finalPropsWithThreadState);
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CopilotChat {
  export const View = CopilotChatView;
}

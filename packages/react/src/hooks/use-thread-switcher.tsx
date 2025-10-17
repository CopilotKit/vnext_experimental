import { useCopilotChatConfiguration } from "@/providers/CopilotChatConfigurationProvider";
import { useCallback } from "react";

/**
 * Hook to programmatically switch threads.
 *
 * This is a simple wrapper around the configuration context's setThreadId.
 * The actual disconnect/connect logic is handled by CopilotChat.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { switchThread, currentThreadId } = useThreadSwitch();
 *
 *   return (
 *     <button onClick={() => switchThread('new-thread-id')}>
 *       Switch Thread
 *     </button>
 *   );
 * }
 * ```
 */
export function useThreadSwitch() {
  const config = useCopilotChatConfiguration();

  const switchThread = useCallback(
    (threadId: string) => {
      config?.setThreadId?.(threadId);
    },
    [config]
  );

  return {
    switchThread,
    currentThreadId: config?.threadId,
  };
}

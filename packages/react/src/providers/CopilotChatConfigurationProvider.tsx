import React, { createContext, useContext, ReactNode, useMemo, useState, useCallback } from "react";
import { DEFAULT_AGENT_ID, randomUUID } from "@copilotkitnext/shared";

// Default labels
export const CopilotChatDefaultLabels = {
  chatInputPlaceholder: "Type a message...",
  chatInputToolbarStartTranscribeButtonLabel: "Transcribe",
  chatInputToolbarCancelTranscribeButtonLabel: "Cancel",
  chatInputToolbarFinishTranscribeButtonLabel: "Finish",
  chatInputToolbarAddButtonLabel: "Add photos or files",
  chatInputToolbarToolsButtonLabel: "Tools",
  assistantMessageToolbarCopyCodeLabel: "Copy",
  assistantMessageToolbarCopyCodeCopiedLabel: "Copied",
  assistantMessageToolbarCopyMessageLabel: "Copy",
  assistantMessageToolbarThumbsUpLabel: "Good response",
  assistantMessageToolbarThumbsDownLabel: "Bad response",
  assistantMessageToolbarReadAloudLabel: "Read aloud",
  assistantMessageToolbarRegenerateLabel: "Regenerate",
  userMessageToolbarCopyMessageLabel: "Copy",
  userMessageToolbarEditMessageLabel: "Edit",
  chatDisclaimerText: "AI can make mistakes. Please verify important information.",
  chatToggleOpenLabel: "Open chat",
  chatToggleCloseLabel: "Close chat",
  modalHeaderTitle: "CopilotKit Chat",
};

export type CopilotChatLabels = typeof CopilotChatDefaultLabels;

// Define the full configuration interface
export interface CopilotChatConfigurationValue {
  labels: CopilotChatLabels;
  agentId: string;
  threadId: string;
  setThreadId?: (threadId: string) => void;
  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  isModalDefaultOpen: boolean;
}

// Create the configuration context
const CopilotChatConfiguration =
  createContext<CopilotChatConfigurationValue | null>(null);

// Provider props interface
export interface CopilotChatConfigurationProviderProps {
  children: ReactNode;
  labels?: Partial<CopilotChatLabels>;
  agentId?: string;
  threadId?: string;
  isModalDefaultOpen?: boolean;
}

// Provider component
export const CopilotChatConfigurationProvider: React.FC<
  CopilotChatConfigurationProviderProps
> = ({ children, labels, agentId, threadId, isModalDefaultOpen }) => {
  const parentConfig = useContext(CopilotChatConfiguration);

  const mergedLabels: CopilotChatLabels = useMemo(
    () => ({
      ...CopilotChatDefaultLabels,
      ...(parentConfig?.labels ?? {}),
      ...(labels ?? {}),
    }),
    [labels, parentConfig?.labels],
  );

  const resolvedAgentId = agentId ?? parentConfig?.agentId ?? DEFAULT_AGENT_ID;

  // Add internal state for threadId management
  const [internalThreadId, setInternalThreadId] = useState<string>(() => {
    if (threadId) return threadId;
    if (parentConfig?.threadId) return parentConfig.threadId;
    return randomUUID();
  });

  // Use prop if provided (controlled), otherwise use internal state (uncontrolled)
  const resolvedThreadId = threadId ?? internalThreadId;

  // Provide setThreadId that respects controlled/uncontrolled pattern
  const handleSetThreadId = useCallback(
    (newThreadId: string) => {
      // If threadId prop is provided, this is controlled - only update internal state if uncontrolled
      if (threadId === undefined) {
        setInternalThreadId(newThreadId);
      }
      // If controlled, parent should handle the change
    },
    [threadId],
  );

  // Use parent's setThreadId if available, otherwise use our own
  const resolvedSetThreadId = parentConfig?.setThreadId ?? handleSetThreadId;

  const resolvedDefaultOpen = isModalDefaultOpen ?? parentConfig?.isModalDefaultOpen ?? true;

  const [internalModalOpen, setInternalModalOpen] = useState<boolean>(
    parentConfig?.isModalOpen ?? resolvedDefaultOpen,
  );

  const resolvedIsModalOpen = parentConfig?.isModalOpen ?? internalModalOpen;
  const resolvedSetModalOpen = parentConfig?.setModalOpen ?? setInternalModalOpen;

  const configurationValue: CopilotChatConfigurationValue = useMemo(
    () => ({
      labels: mergedLabels,
      agentId: resolvedAgentId,
      threadId: resolvedThreadId,
      setThreadId: resolvedSetThreadId,
      isModalOpen: resolvedIsModalOpen,
      setModalOpen: resolvedSetModalOpen,
      isModalDefaultOpen: resolvedDefaultOpen,
    }),
    [
      mergedLabels,
      resolvedAgentId,
      resolvedThreadId,
      resolvedSetThreadId,
      resolvedIsModalOpen,
      resolvedSetModalOpen,
      resolvedDefaultOpen,
    ],
  );

  return (
    <CopilotChatConfiguration.Provider value={configurationValue}>
      {children}
    </CopilotChatConfiguration.Provider>
  );
};

// Hook to use the full configuration
export const useCopilotChatConfiguration =
  (): CopilotChatConfigurationValue | null => {
    const configuration = useContext(CopilotChatConfiguration);
    return configuration;
  };

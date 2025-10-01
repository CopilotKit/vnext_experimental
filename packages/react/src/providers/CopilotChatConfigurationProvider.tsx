import React, { createContext, useContext, ReactNode, useState } from "react";
import { DEFAULT_AGENT_ID } from "@copilotkitnext/shared";

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
  chatDisclaimerText:
    "AI can make mistakes. Please verify important information.",
};

export type CopilotChatLabels = typeof CopilotChatDefaultLabels;

// Define the full configuration interface
export interface CopilotChatConfigurationValue {
  labels: CopilotChatLabels;
  agentId: string;
  threadId: string;
  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
}

// Create the configuration context
const CopilotChatConfiguration =
  createContext<CopilotChatConfigurationValue | null>(null);

// Provider props interface
export interface CopilotChatConfigurationProviderProps {
  children: ReactNode;
  labels?: Partial<CopilotChatLabels>;
  agentId?: string;
  threadId: string;
}

// Provider component
export const CopilotChatConfigurationProvider: React.FC<
  CopilotChatConfigurationProviderProps
> = ({
  children,
  labels = {},
  agentId,
  threadId,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Merge default labels with provided labels
  const mergedLabels: CopilotChatLabels = {
    ...CopilotChatDefaultLabels,
    ...labels,
  };

  const configurationValue: CopilotChatConfigurationValue = {
    labels: mergedLabels,
    agentId: agentId ?? DEFAULT_AGENT_ID,
    threadId,
    isModalOpen,
    setModalOpen: (open: boolean) => setIsModalOpen(open),
  };

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

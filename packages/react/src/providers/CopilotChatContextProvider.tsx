import React, { createContext, useContext, ReactNode, useState } from "react";

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
};

export type CopilotChatLabels = typeof CopilotChatDefaultLabels;

// Define the full context interface
export interface CopilotChatContextValue {
  labels: CopilotChatLabels;
  text: string;
  setText: (text: string) => void;
  // Room for other context properties in the future
}

// Create the context
const CopilotChatContext = createContext<CopilotChatContextValue | null>(null);

// Provider props interface
export interface CopilotChatContextProviderProps {
  children: ReactNode;
  labels?: Partial<CopilotChatLabels>;
}

// Provider component
export const CopilotChatContextProvider: React.FC<
  CopilotChatContextProviderProps
> = ({ children, labels = {} }) => {
  const [text, setText] = useState<string>("");

  // Merge default labels with provided labels
  const mergedLabels: CopilotChatLabels = {
    ...CopilotChatDefaultLabels,
    ...labels,
  };

  const contextValue: CopilotChatContextValue = {
    labels: mergedLabels,
    text,
    setText,
  };

  return (
    <CopilotChatContext.Provider value={contextValue}>
      {children}
    </CopilotChatContext.Provider>
  );
};

// Hook to use the full context
export const useCopilotChatContext = (): CopilotChatContextValue => {
  const context = useContext(CopilotChatContext);
  if (!context) {
    throw new Error(
      "useCopilotChatContext must be used within CopilotChatContextProvider"
    );
  }
  return context;
};

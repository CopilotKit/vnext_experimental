import React, { createContext, useContext, ReactNode, useState } from "react";

// Default labels
const defaultLabels = {
  inputPlaceholder: "Type a message...",
  inputStartTranscribeButtonLabel: "Transcribe",
  inputCancelTranscribeButtonLabel: "Cancel",
  inputFinishTranscribeButtonLabel: "Finish",
  inputAddButtonLabel: "Add photos or files",
  inputToolsButtonLabel: "Tools",
  assistantCopyCodeLabel: "Copy",
  assistantCopyCodeCopiedLabel: "Copied",
};

export type CopilotChatLabels = typeof defaultLabels;

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
    ...defaultLabels,
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

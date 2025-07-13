import React, { createContext, useContext, ReactNode } from "react";

// Default labels
const defaultLabels = {
  inputPlaceholder: "Type a message...",
  inputRecordingLabel: "Recording...",
  inputStartTranscribeButtonLabel: "Transcribe",
  inputCancelTranscribeButtonLabel: "Cancel",
  inputFinishTranscribeButtonLabel: "Finish",
  inputAddButtonLabel: "Add photos or files",
  inputToolsButtonLabel: "Tools",
};

export type CopilotChatLabels = typeof defaultLabels;

// Define the full context interface
export interface CopilotChatContextValue {
  labels: CopilotChatLabels;
  // Room for other context properties in the future
}

// Default context value
const defaultContextValue: CopilotChatContextValue = {
  labels: defaultLabels,
};

// Create the context
const CopilotChatContext =
  createContext<CopilotChatContextValue>(defaultContextValue);

// Provider props interface
export interface CopilotChatContextProviderProps {
  children: ReactNode;
  labels?: Partial<CopilotChatLabels>;
}

// Provider component
export const CopilotChatContextProvider: React.FC<
  CopilotChatContextProviderProps
> = ({ children, labels = {} }) => {
  // Merge default labels with provided labels
  const mergedLabels: CopilotChatLabels = {
    ...defaultLabels,
    ...labels,
  };

  const contextValue: CopilotChatContextValue = {
    labels: mergedLabels,
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
    // Return default context if no provider is found
    return defaultContextValue;
  }
  return context;
};

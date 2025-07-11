import React, { createContext, useContext, ReactNode } from "react";

// Define the labels interface
export interface CopilotChatLabels {
  inputPlaceholder: string;
}

// Define the full context interface
export interface CopilotChatContextValue {
  labels: CopilotChatLabels;
  // Room for other context properties in the future
}

// Default labels
const defaultLabels: CopilotChatLabels = {
  inputPlaceholder: "Type a message...",
};

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

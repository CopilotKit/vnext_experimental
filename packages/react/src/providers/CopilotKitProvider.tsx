import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { CopilotKitCore, CopilotKitCoreConfig } from "@copilotkit/core";

// Create the CopilotKit context
const CopilotKitContext = createContext<CopilotKitCore | null>(null);

// Provider props interface
export interface CopilotKitProviderProps {
  children: ReactNode;
  runtimeUrl?: string;
  headers?: Record<string, string>;
  properties?: Record<string, unknown>;
}

// Provider component
export const CopilotKitProvider: React.FC<CopilotKitProviderProps> = ({
  children,
  runtimeUrl,
  headers = {},
  properties = {},
}) => {
  // Create the CopilotKitCore instance with memoization to prevent recreation on re-renders
  const copilotKit = useMemo(() => {
    const config: CopilotKitCoreConfig = {
      runtimeUrl,
      headers,
      properties,
    };
    return new CopilotKitCore(config);
  }, [runtimeUrl, headers, properties]);

  return (
    <CopilotKitContext.Provider value={copilotKit}>
      {children}
    </CopilotKitContext.Provider>
  );
};

// Hook to use the CopilotKit instance
export const useCopilotKit = (): CopilotKitCore => {
  const copilotKit = useContext(CopilotKitContext);
  if (!copilotKit) {
    throw new Error("useCopilotKit must be used within CopilotKitProvider");
  }
  return copilotKit;
};

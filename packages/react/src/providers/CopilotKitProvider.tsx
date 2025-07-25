import React, { createContext, useContext, ReactNode, useMemo } from "react";
import { CopilotKitCore, CopilotKitCoreConfig } from "@copilotkit/core";
import { AbstractAgent } from "@ag-ui/client";

// Create the CopilotKit context
const CopilotKitContext = createContext<CopilotKitCore | null>(null);

// Provider props interface
export interface CopilotKitProviderProps {
  children: ReactNode;
  runtimeUrl?: string;
  headers?: Record<string, string>;
  properties?: Record<string, unknown>;
  agents?: Record<string, AbstractAgent>;
}

// Provider component
export const CopilotKitProvider: React.FC<CopilotKitProviderProps> = ({
  children,
  runtimeUrl,
  headers = {},
  properties = {},
  agents = {},
}) => {
  // Create the CopilotKitCore instance with memoization to prevent recreation on re-renders
  const copilotKit = useMemo(() => {
    const config: CopilotKitCoreConfig = {
      runtimeUrl,
      headers,
      properties,
      agents,
    };
    return new CopilotKitCore(config);
  }, [runtimeUrl, headers, properties, agents]);

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

import React, {
  createContext,
  useContext,
  ReactNode,
  useMemo,
  useEffect,
  useState,
  useRef,
} from "react";
import { ReactToolCallRender } from "../types/react-tool-call-render";
import { CopilotKitCore, CopilotKitCoreConfig } from "@copilotkit/core";
import { AbstractAgent } from "@ag-ui/client";

// Define the context value interface - idiomatic React naming
export interface CopilotKitContextValue {
  copilotkit: CopilotKitCore;
  renderToolCalls: Record<string, ReactToolCallRender<unknown>>;
  currentRenderToolCalls: Record<string, ReactToolCallRender<unknown>>;
  setCurrentRenderToolCalls: (
    renderToolCalls: Record<string, ReactToolCallRender<unknown>>
  ) => void;
}

// Create the CopilotKit context
const CopilotKitContext = createContext<CopilotKitContextValue>({
  copilotkit: null!,
  renderToolCalls: {},
  currentRenderToolCalls: {},
  setCurrentRenderToolCalls: () => {},
});

// Provider props interface
export interface CopilotKitProviderProps {
  children: ReactNode;
  runtimeUrl?: string;
  headers?: Record<string, string>;
  properties?: Record<string, unknown>;
  agents?: Record<string, AbstractAgent>;
  renderToolCalls?: Record<string, ReactToolCallRender<unknown>>;
}

// Provider component
export const CopilotKitProvider: React.FC<CopilotKitProviderProps> = ({
  children,
  runtimeUrl,
  headers = {},
  properties = {},
  agents = {},
  renderToolCalls = {},
}) => {
  const initialRenderToolCalls = useMemo(() => renderToolCalls, []);
  const [currentRenderToolCalls, setCurrentRenderToolCalls] = useState<
    Record<string, ReactToolCallRender<unknown>>
  >(initialRenderToolCalls);

  useEffect(() => {
    if (
      JSON.stringify(renderToolCalls) !== JSON.stringify(initialRenderToolCalls)
    ) {
      console.error(
        "renderToolCalls must be a stable object. If you want to dynamically add or remove tools, use `useFrontendTool` instead."
      );
    }
  }, [renderToolCalls]);

  const copilotkit = useMemo(() => {
    const config: CopilotKitCoreConfig = {
      runtimeUrl,
      headers,
      properties,
      agents,
    };
    return new CopilotKitCore(config);
  }, []);

  useEffect(() => {
    copilotkit.setRuntimeUrl(runtimeUrl);
    copilotkit.setHeaders(headers);
    copilotkit.setProperties(properties);
    copilotkit.setAgents(agents);
  }, [runtimeUrl, headers, properties, agents]);

  return (
    <CopilotKitContext.Provider
      value={{
        copilotkit,
        renderToolCalls,
        currentRenderToolCalls,
        setCurrentRenderToolCalls,
      }}
    >
      {children}
    </CopilotKitContext.Provider>
  );
};

// Hook to use the CopilotKit instance - returns the full context value
export const useCopilotKit = (): CopilotKitContextValue => {
  const context = useContext(CopilotKitContext);
  if (!context) {
    throw new Error("useCopilotKit must be used within CopilotKitProvider");
  }
  return context;
};

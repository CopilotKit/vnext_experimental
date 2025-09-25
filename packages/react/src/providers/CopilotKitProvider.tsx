"use client";

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState, useReducer, useRef } from "react";
import { ReactToolCallRender } from "../types/react-tool-call-render";
import { ReactFrontendTool } from "../types/frontend-tool";
import { ReactHumanInTheLoop } from "../types/human-in-the-loop";
import { z } from "zod";
import { CopilotKitCore, CopilotKitCoreConfig, FrontendTool } from "@copilotkitnext/core";
import { AbstractAgent } from "@ag-ui/client";

// Define the context value interface - idiomatic React naming
export interface CopilotKitContextValue {
  copilotkit: CopilotKitCore;
  renderToolCalls: ReactToolCallRender<any>[];
  currentRenderToolCalls: ReactToolCallRender<unknown>[];
  setCurrentRenderToolCalls: React.Dispatch<React.SetStateAction<ReactToolCallRender<unknown>[]>>;
}

// Create the CopilotKit context
const CopilotKitContext = createContext<CopilotKitContextValue>({
  copilotkit: null!,
  renderToolCalls: [],
  currentRenderToolCalls: [],
  setCurrentRenderToolCalls: () => {},
});

// Provider props interface
export interface CopilotKitProviderProps {
  children: ReactNode;
  runtimeUrl?: string;
  headers?: Record<string, string>;
  properties?: Record<string, unknown>;
  agents__unsafe_dev_only?: Record<string, AbstractAgent>;
  renderToolCalls?: ReactToolCallRender<any>[];
  frontendTools?: ReactFrontendTool[];
  humanInTheLoop?: ReactHumanInTheLoop[];
}

// Small helper to normalize array props to a stable reference and warn
function useStableArrayProp<T>(
  prop: T[] | undefined,
  warningMessage?: string,
  isMeaningfulChange?: (initial: T[], next: T[]) => boolean,
): T[] {
  const empty = useMemo<T[]>(() => [], []);
  const value = prop ?? empty;
  const initial = useRef(value);

  useEffect(() => {
    if (
      warningMessage &&
      value !== initial.current &&
      (isMeaningfulChange ? isMeaningfulChange(initial.current, value) : true)
    ) {
      console.error(warningMessage);
    }
  }, [value, warningMessage]);

  return value;
}

// Provider component
export const CopilotKitProvider: React.FC<CopilotKitProviderProps> = ({
  children,
  runtimeUrl,
  headers = {},
  properties = {},
  agents__unsafe_dev_only: agents = {},
  renderToolCalls,
  frontendTools,
  humanInTheLoop,
}) => {
  // Normalize array props to stable references with clear dev warnings
  const renderToolCallsList = useStableArrayProp<ReactToolCallRender<any>>(
    renderToolCalls,
    "renderToolCalls must be a stable array. If you want to dynamically add or remove tools, use `useFrontendTool` instead.",
    (initial, next) => {
      // Only warn if the shape (names+agentId) changed. Allow identity changes
      // to support updated closures from parents (e.g., Storybook state).
      const key = (rc?: ReactToolCallRender<unknown>) => `${rc?.agentId ?? ""}:${rc?.name ?? ""}`;
      const setFrom = (arr: ReactToolCallRender<unknown>[]) => new Set(arr.map(key));
      const a = setFrom(initial);
      const b = setFrom(next);
      if (a.size !== b.size) return true;
      for (const k of a) if (!b.has(k)) return true;
      return false;
    },
  );
  const frontendToolsList = useStableArrayProp<ReactFrontendTool>(
    frontendTools,
    "frontendTools must be a stable array. If you want to dynamically add or remove tools, use `useFrontendTool` instead.",
  );
  const humanInTheLoopList = useStableArrayProp<ReactHumanInTheLoop>(
    humanInTheLoop,
    "humanInTheLoop must be a stable array. If you want to dynamically add or remove human-in-the-loop tools, use `useHumanInTheLoop` instead.",
  );

  const initialRenderToolCalls = useMemo(() => renderToolCallsList, []);
  const [currentRenderToolCalls, setCurrentRenderToolCalls] = useState<ReactToolCallRender<unknown>[]>([]);

  // Note: warnings for array identity changes are handled by useStableArrayProp

  // Process humanInTheLoop tools to create handlers and add render components
  const processedHumanInTheLoopTools = useMemo(() => {
    const processedTools: FrontendTool[] = [];
    const processedRenderToolCalls: ReactToolCallRender<unknown>[] = [];

    humanInTheLoopList.forEach((tool) => {
      // Create a promise-based handler for each human-in-the-loop tool
      const frontendTool: FrontendTool = {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        followUp: tool.followUp,
        ...(tool.agentId && { agentId: tool.agentId }),
        handler: async () => {
          // This handler will be replaced by the hook when it runs
          // For provider-level tools, we create a basic handler that waits for user interaction
          return new Promise((resolve) => {
            // The actual implementation will be handled by the render component
            // This is a placeholder that the hook will override
            console.warn(`Human-in-the-loop tool '${tool.name}' called but no interactive handler is set up.`);
            resolve(undefined);
          });
        },
      };
      processedTools.push(frontendTool);

      // Add the render component to renderToolCalls
      if (tool.render) {
        processedRenderToolCalls.push({
          name: tool.name,
          args: tool.parameters!,
          render: tool.render,
          ...(tool.agentId && { agentId: tool.agentId }),
        } as ReactToolCallRender<unknown>);
      }
    });

    return { tools: processedTools, renderToolCalls: processedRenderToolCalls };
  }, [humanInTheLoopList]);

  // Combine all tools for CopilotKitCore
  const allTools = useMemo(() => {
    const tools: FrontendTool[] = [];

    // Add frontend tools
    tools.push(...frontendToolsList);

    // Add processed human-in-the-loop tools
    tools.push(...processedHumanInTheLoopTools.tools);

    return tools;
  }, [frontendToolsList, processedHumanInTheLoopTools]);

  // Combine all render tool calls
  const allRenderToolCalls = useMemo(() => {
    const combined: ReactToolCallRender<unknown>[] = [...renderToolCallsList];

    // Add render components from frontend tools
    frontendToolsList.forEach((tool) => {
      if (tool.render) {
        // For wildcard tools without parameters, default to z.any()
        const args = tool.parameters || (tool.name === "*" ? z.any() : undefined);
        if (args) {
          combined.push({
            name: tool.name,
            args: args,
            render: tool.render,
          } as ReactToolCallRender<unknown>);
        }
      }
    });

    // Add render components from human-in-the-loop tools
    combined.push(...processedHumanInTheLoopTools.renderToolCalls);

    return combined;
  }, [renderToolCallsList, frontendToolsList, processedHumanInTheLoopTools]);

  const copilotkit = useMemo(() => {
    const config: CopilotKitCoreConfig = {
      // Don't set runtimeUrl during initialization to prevent server-side fetching
      runtimeUrl: undefined,
      headers,
      properties,
      agents__unsafe_dev_only: agents,
      tools: allTools,
    };
    const copilotkit = new CopilotKitCore(config);

    return copilotkit;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTools]);

  // Merge computed render tool calls with any dynamically registered ones.
  // Computed entries (from props) take precedence for the same name/agentId.
  useEffect(() => {
    setCurrentRenderToolCalls((prev) => {
      // Build a map from computed entries
      const keyOf = (rc?: ReactToolCallRender<unknown>) => `${rc?.agentId ?? ""}:${rc?.name ?? ""}`;
      const computedMap = new Map<string, ReactToolCallRender<unknown>>();
      for (const rc of allRenderToolCalls) {
        computedMap.set(keyOf(rc), rc);
      }

      // Start with computed, then add any dynamic entries not present
      const merged: ReactToolCallRender<unknown>[] = [...computedMap.values()];
      for (const rc of prev) {
        const k = keyOf(rc);
        if (!computedMap.has(k)) merged.push(rc);
      }

      // If equal by shallow key comparison and reference order, avoid updates
      const sameLength = merged.length === prev.length;
      if (sameLength) {
        let same = true;
        for (let i = 0; i < merged.length; i++) {
          if (merged[i] !== prev[i]) {
            same = false;
            break;
          }
        }
        if (same) return prev;
      }
      return merged;
    });
  }, [allRenderToolCalls]);

  useEffect(() => {
    copilotkit.setRuntimeUrl(runtimeUrl);
    copilotkit.setHeaders(headers);
    copilotkit.setProperties(properties);
    copilotkit.setAgents__unsafe_dev_only(agents);
  }, [runtimeUrl, headers, properties, agents]);

  return (
    <CopilotKitContext.Provider
      value={{
        copilotkit,
        renderToolCalls: allRenderToolCalls,
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
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  if (!context) {
    throw new Error("useCopilotKit must be used within CopilotKitProvider");
  }
  useEffect(() => {
    const unsubscribe = context.copilotkit.subscribe({
      onRuntimeConnectionStatusChanged: () => {
        forceUpdate();
      },
    });
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return context;
};

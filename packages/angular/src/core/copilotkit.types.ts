import { InjectionToken } from "@angular/core";
import { CopilotKitCoreConfig, CopilotKitCore } from "@copilotkit/core";
import { AbstractAgent } from "@ag-ui/client";

// Replace your React type with a generic Angular-friendly alias
export type ToolCallRender<T = unknown> = (toolCall: T) => unknown;

export interface CopilotKitContextValue {
  copilotkit: CopilotKitCore;
  renderToolCalls: Record<string, ToolCallRender<unknown>>;
  currentRenderToolCalls: Record<string, ToolCallRender<unknown>>;
  setCurrentRenderToolCalls: (
    v: Record<string, ToolCallRender<unknown>>
  ) => void;
}

export interface CopilotKitRuntimeInputs {
  runtimeUrl?: string;
  headers?: Record<string, string>;
  properties?: Record<string, unknown>;
  agents?: Record<string, AbstractAgent>;
  renderToolCalls?: Record<string, ToolCallRender<unknown>>;
}

export const COPILOTKIT_INITIAL_CONFIG = new InjectionToken<
  Partial<CopilotKitCoreConfig>
>("COPILOTKIT_INITIAL_CONFIG");

export const COPILOTKIT_INITIAL_RENDERERS = new InjectionToken<
  Record<string, ToolCallRender<unknown>>
>("COPILOTKIT_INITIAL_RENDERERS", { factory: () => ({}) });

import { InjectionToken, TemplateRef, Type } from "@angular/core";
import { CopilotKitCoreConfig, CopilotKitCore, FrontendTool } from "@copilotkit/core";
import { AbstractAgent } from "@ag-ui/client";
import { z } from "zod";

// Re-export commonly used types
export type { Context } from "@ag-ui/client";

// Tool call status type
export type ToolCallStatus = 'inProgress' | 'executing' | 'complete';

// Props passed to tool render components
export interface ToolCallProps<T = unknown> {
  name: string;
  description: string;
  args: T | Partial<T>;
  status: ToolCallStatus;
  result?: unknown;
}

// Angular-specific tool call render definition
export interface AngularToolCallRender<T = unknown> {
  args: z.ZodSchema<T>;
  render: Type<any> | TemplateRef<any>;  // Angular component class or template ref
}

// Angular-specific frontend tool extending core FrontendTool
export interface AngularFrontendTool<T extends Record<string, any> = Record<string, any>> 
  extends FrontendTool<T> {
  render?: Type<any> | TemplateRef<any>;
}

// Legacy type alias for backward compatibility
export type ToolCallRender<T = unknown> = AngularToolCallRender<T>;

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

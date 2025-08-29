import { InjectionToken, TemplateRef, Type, Signal } from "@angular/core";
import { Observable } from "rxjs";
import { CopilotKitCoreConfig, CopilotKitCore } from "@copilotkit/core";
import { AbstractAgent } from "@ag-ui/client";
import type { z } from "zod";

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

// Angular-specific frontend tool definition
export interface AngularFrontendTool<T extends Record<string, any> = Record<string, any>> {
  name: string;
  description?: string;
  parameters?: z.ZodSchema<T>;
  handler?: (args: T) => Promise<any>;
  render?: Type<any> | TemplateRef<any>;
  followUp?: boolean;
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

// Agent-related types
import type { Message } from '@ag-ui/client';

export interface AgentWatchResult {
  agent: Signal<AbstractAgent | undefined>;
  messages: Signal<Message[]>;
  isRunning: Signal<boolean>;
  agent$: Observable<AbstractAgent | undefined>;
  messages$: Observable<Message[]>;
  isRunning$: Observable<boolean>;
  unsubscribe: () => void;
}

export interface AgentSubscriptionCallbacks {
  onMessagesChanged?: (params: any) => void;
  onStateChanged?: (params: any) => void;
  onRunInitialized?: (params: any) => void;
  onRunFinalized?: (params: any) => void;
  onRunFailed?: (params: any) => void;
}

// Human-in-the-loop types
export type HumanInTheLoopStatus = 'inProgress' | 'executing' | 'complete';

// Extended props for human-in-the-loop components
export interface HumanInTheLoopProps<T = unknown> extends ToolCallProps<T> {
  respond?: (result: unknown) => Promise<void>;
}

// Angular human-in-the-loop tool definition
export interface AngularHumanInTheLoop<T extends Record<string, any> = Record<string, any>> 
  extends Omit<AngularFrontendTool<T>, 'handler' | 'render'> {
  render: Type<any> | TemplateRef<HumanInTheLoopProps<T>>;
  // Redefine parameters to ensure it's present (it's optional in FrontendTool)
  parameters: z.ZodType<T>;
}

// Human-in-the-loop state result
export interface HumanInTheLoopState {
  status: Signal<HumanInTheLoopStatus>;
  toolId: string;
  destroy: () => void;
}

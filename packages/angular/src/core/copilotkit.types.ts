import { InjectionToken, TemplateRef, Type, Signal } from "@angular/core";
import { Observable } from "rxjs";
import { CopilotKitCore, ToolCallStatus } from "@copilotkitnext/core";
import { AbstractAgent } from "@ag-ui/client";
import type { z } from "zod";
import type { AngularFrontendTool } from "../types/frontend-tool";
import type { AngularHumanInTheLoop } from "../types/human-in-the-loop";

// Re-export commonly used types
export type { Context } from "@ag-ui/client";

// Re-export tool types from their own files
export type { AngularFrontendTool } from "../types/frontend-tool";
export type {
  AngularHumanInTheLoop,
  HumanInTheLoopProps,
} from "../types/human-in-the-loop";

// Re-export ToolCallStatus from core
export { ToolCallStatus } from "@copilotkitnext/core";

// Props passed to tool render components - discriminated union matching React
export type ToolCallProps<T = unknown> =
  | {
      name: string;
      description: string;
      args: Partial<T>;
      status: ToolCallStatus.InProgress;
      result: undefined;
    }
  | {
      name: string;
      description: string;
      args: T;
      status: ToolCallStatus.Executing;
      result: undefined;
    }
  | {
      name: string;
      description: string;
      args: T;
      status: ToolCallStatus.Complete;
      result: string;
    };

// Angular-specific tool call render definition with proper typing
export interface AngularToolCallRender<T = unknown> {
  name: string;
  args: z.ZodSchema<T>;
  /**
   * Optional agent ID to constrain this tool render to a specific agent.
   * If specified, this render will only be used for the specified agent.
   */
  agentId?: string;
  render: Type<any> | TemplateRef<ToolCallProps<T>>;
}

// Type alias for convenience
export type ToolCallRender<T = unknown> = AngularToolCallRender<T>;

export interface CopilotKitContextValue {
  copilotkit: CopilotKitCore;
  renderToolCalls: ToolCallRender<unknown>[];
  currentRenderToolCalls: ToolCallRender<unknown>[];
  setCurrentRenderToolCalls: (v: ToolCallRender<unknown>[]) => void;
}

export interface CopilotKitRuntimeInputs {
  runtimeUrl?: string;
  headers?: Record<string, string>;
  properties?: Record<string, unknown>;
  agents?: Record<string, AbstractAgent>;
  renderToolCalls?: ToolCallRender<unknown>[];
}

// Injection tokens for dependency injection
export const COPILOTKIT_RUNTIME_URL = new InjectionToken<string | undefined>(
  "COPILOTKIT_RUNTIME_URL"
);

export const COPILOTKIT_HEADERS = new InjectionToken<Record<string, string>>(
  "COPILOTKIT_HEADERS",
  { factory: () => ({}) }
);

export const COPILOTKIT_PROPERTIES = new InjectionToken<
  Record<string, unknown>
>("COPILOTKIT_PROPERTIES", { factory: () => ({}) });

export const COPILOTKIT_AGENTS = new InjectionToken<
  Record<string, AbstractAgent>
>("COPILOTKIT_AGENTS", { factory: () => ({}) });

export const COPILOTKIT_RENDER_TOOL_CALLS = new InjectionToken<
  ToolCallRender<unknown>[]
>("COPILOTKIT_RENDER_TOOL_CALLS", { factory: () => [] });

export const COPILOTKIT_FRONTEND_TOOLS = new InjectionToken<
  AngularFrontendTool<any>[]
>("COPILOTKIT_FRONTEND_TOOLS", { factory: () => [] });

export const COPILOTKIT_HUMAN_IN_THE_LOOP = new InjectionToken<
  AngularHumanInTheLoop<any>[]
>("COPILOTKIT_HUMAN_IN_THE_LOOP", { factory: () => [] });

// Agent-related types
import type { Message } from "@ag-ui/client";

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

// Human-in-the-loop state result
export interface HumanInTheLoopState {
  status: Signal<ToolCallStatus>;
  toolId: string;
  destroy: () => void;
}

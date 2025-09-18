import { inject, InjectionToken, Provider } from "@angular/core";
import { AbstractAgent } from "@ag-ui/client";
import { ClientTool, ToolCallRendererConfig } from "./client-tool";

export interface CopilotKitConfig {
  runtimeUrl?: string;
  headers?: Record<string, string>;
  properties?: Record<string, unknown>;
  agents?: Record<string, AbstractAgent>;
  tools?: ClientTool[];
  renderToolCalls?: ToolCallRendererConfig[];
}

export const COPILOT_KIT_CONFIG = new InjectionToken<CopilotKitConfig>(
  "COPILOT_KIT_CONFIG"
);

export function injectCopilotKitConfig(): CopilotKitConfig {
  return inject(COPILOT_KIT_CONFIG);
}

export function provideCopilotKit(config: CopilotKitConfig): Provider {
  return { provide: COPILOT_KIT_CONFIG, useValue: config };
}

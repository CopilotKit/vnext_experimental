import { Provider } from "@angular/core";
import {
  COPILOTKIT_RUNTIME_URL,
  COPILOTKIT_HEADERS,
  COPILOTKIT_PROPERTIES,
  COPILOTKIT_AGENTS,
  COPILOTKIT_RENDER_TOOL_CALLS,
  COPILOTKIT_FRONTEND_TOOLS,
  COPILOTKIT_HUMAN_IN_THE_LOOP,
  ToolCallRender,
  AngularFrontendTool,
  AngularHumanInTheLoop,
} from "./copilotkit.types";
import { AbstractAgent } from "@ag-ui/client";

export interface ProvideCopilotKitOptions {
  runtimeUrl?: string;
  headers?: Record<string, string>;
  properties?: Record<string, unknown>;
  agents?: Record<string, AbstractAgent>;
  renderToolCalls?: ToolCallRender<unknown>[];
  frontendTools?: AngularFrontendTool<any>[];
  humanInTheLoop?: AngularHumanInTheLoop<any>[];
}

export function provideCopilotKit(
  options: ProvideCopilotKitOptions = {}
): Provider[] {
  return [
    {
      provide: COPILOTKIT_RUNTIME_URL,
      useValue: options.runtimeUrl,
    },
    {
      provide: COPILOTKIT_HEADERS,
      useValue: options.headers ?? {},
    },
    {
      provide: COPILOTKIT_PROPERTIES,
      useValue: options.properties ?? {},
    },
    {
      provide: COPILOTKIT_AGENTS,
      useValue: options.agents ?? {},
    },
    {
      provide: COPILOTKIT_RENDER_TOOL_CALLS,
      useValue: options.renderToolCalls ?? [],
    },
    {
      provide: COPILOTKIT_FRONTEND_TOOLS,
      useValue: options.frontendTools ?? [],
    },
    {
      provide: COPILOTKIT_HUMAN_IN_THE_LOOP,
      useValue: options.humanInTheLoop ?? [],
    },
  ];
}

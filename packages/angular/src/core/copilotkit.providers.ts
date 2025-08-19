import { Provider } from "@angular/core";
import {
  COPILOTKIT_INITIAL_CONFIG,
  COPILOTKIT_INITIAL_RENDERERS,
  ToolCallRender,
} from "./copilotkit.types";
import { CopilotKitCoreConfig } from "@copilotkit/core";

export function provideCopilotKit(
  options: {
    initialConfig?: Partial<CopilotKitCoreConfig>;
    renderToolCalls?: Record<string, ToolCallRender<unknown>>;
  } = {}
): Provider[] {
  return [
    {
      provide: COPILOTKIT_INITIAL_CONFIG,
      useValue: options.initialConfig ?? {},
    },
    {
      provide: COPILOTKIT_INITIAL_RENDERERS,
      useValue: options.renderToolCalls ?? {},
    },
  ];
}

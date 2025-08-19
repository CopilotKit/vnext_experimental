import { inject } from "@angular/core";
import { CopilotKitStore } from "../core/copilotkit.store";
import { CopilotKitContextValue } from "../core/copilotkit.types";

export function injectCopilotKit(): CopilotKitContextValue {
  const store = inject(CopilotKitStore);
  return {
    copilotkit: store.copilotkit,
    renderToolCalls: store.renderToolCalls(),
    currentRenderToolCalls: store.currentRenderToolCalls(),
    setCurrentRenderToolCalls: store.context.setCurrentRenderToolCalls,
  };
}

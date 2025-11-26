import { APP_INITIALIZER, Provider } from "@angular/core";
import { CopilotKit } from "./copilotkit";

type DevtoolsHook = {
  core?: unknown;
  setCore: (core: unknown) => void;
};

function initializeDevtools(copilotkit: CopilotKit): () => void {
  return () => {
    if (typeof window === "undefined") {
      return;
    }

    const globalWindow = window as typeof window & { __COPILOTKIT_DEVTOOLS__?: DevtoolsHook };
    const hook = globalWindow.__COPILOTKIT_DEVTOOLS__ ?? {
      core: undefined,
      setCore(nextCore: unknown) {
        this.core = nextCore;
      },
    };

    hook.setCore(copilotkit.core);
    globalWindow.__COPILOTKIT_DEVTOOLS__ = hook;
  };
}

export function provideCopilotKitDevtools(): Provider {
  return {
    provide: APP_INITIALIZER,
    useFactory: initializeDevtools,
    deps: [CopilotKit],
    multi: true,
  };
}

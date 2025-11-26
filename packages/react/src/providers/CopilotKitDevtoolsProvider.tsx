"use client";

import { ReactNode, useEffect } from "react";
import { useCopilotKit } from "./CopilotKitProvider";

type DevtoolsHook = {
  core?: unknown;
  setCore: (core: unknown) => void;
};

export interface CopilotKitDevtoolsProviderProps {
  children?: ReactNode;
}

export const CopilotKitDevtoolsProvider: React.FC<CopilotKitDevtoolsProviderProps> = ({ children }) => {
  const { copilotkit } = useCopilotKit();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const globalWindow = window as typeof window & { __COPILOTKIT_DEVTOOLS__?: DevtoolsHook };
    const hook =
      globalWindow.__COPILOTKIT_DEVTOOLS__ ??
      ({
        core: undefined,
        setCore(nextCore: unknown) {
          this.core = nextCore;
        },
      } satisfies DevtoolsHook);

    hook.setCore(copilotkit);
    globalWindow.__COPILOTKIT_DEVTOOLS__ = hook;
  }, [copilotkit]);

  return <>{children}</>;
};

import { useCopilotKit } from "../providers/CopilotKitProvider";
import { Context } from "@ag-ui/client";
import { useEffect } from "react";

export function useAgentContext(context: Context) {
  const { description, value } = context;
  const { copilotkit } = useCopilotKit();

  useEffect(() => {
    if (!copilotkit) return;

    const id = copilotkit.addContext(context);
    return () => {
      copilotkit.removeContext(id);
    };
  }, [description, value, copilotkit]);
}

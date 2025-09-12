import { useEffect } from "react";
import { useCopilotKit } from "../providers/CopilotKitProvider";
import { ReactFrontendTool } from "../types/frontend-tool";
import { ReactToolCallRender } from "../types/react-tool-call-render";

export function useFrontendTool<T extends Record<string, unknown> = Record<string, unknown>>(
  tool: ReactFrontendTool<T>
) {
  const { copilotkit, setCurrentRenderToolCalls } = useCopilotKit();

  useEffect(() => {
    // Register tool if not already present (idempotent by name)
    if (!(tool.name in copilotkit.tools)) {
      copilotkit.addTool(tool);
    }

    // Register renderer idempotently
    if (tool.render && tool.parameters) {
      setCurrentRenderToolCalls((prev) => {
        const exists = prev.some((rc) => rc.name === tool.name);
        if (exists) return prev;
        return [
          ...prev,
          {
            name: tool.name,
            args: tool.parameters,
            render: tool.render,
          } as ReactToolCallRender<unknown>,
        ];
      });
    }

    return () => {
      copilotkit.removeTool(tool.name);
      setCurrentRenderToolCalls((prev) => 
        prev.filter(rc => rc.name !== tool.name)
      );
    };
  // Depend only on stable keys to avoid re-register loops due to object identity
  }, [tool.name, copilotkit, setCurrentRenderToolCalls]);
}

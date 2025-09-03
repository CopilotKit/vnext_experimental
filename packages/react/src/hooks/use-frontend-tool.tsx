import { useEffect } from "react";
import { useCopilotKit } from "../providers/CopilotKitProvider";
import { ReactFrontendTool } from "../types/frontend-tool";
import { ReactToolCallRender } from "../types/react-tool-call-render";

export function useFrontendTool<T extends Record<string, unknown> = Record<string, unknown>>(
  tool: ReactFrontendTool<T>
) {
  const { renderToolCalls, copilotkit, setCurrentRenderToolCalls } =
    useCopilotKit();

  useEffect(() => {
    // Check if tool already exists
    if (tool.name in copilotkit.tools) {
      console.warn(
        `Tool '${tool.name}' already exists. It will be overridden.`
      );
    }

    copilotkit.addTool(tool);

    if (tool.render && tool.name in renderToolCalls) {
      console.warn(
        `Render component for tool '${tool.name}' already exists. It will be overridden.`
      );
    }
    
    if (tool.render && tool.parameters) {
      setCurrentRenderToolCalls((prev) => [
        ...prev,
        {
          name: tool.name,
          args: tool.parameters,
          render: tool.render,
        } as ReactToolCallRender<unknown>,
      ]);
    }

    return () => {
      copilotkit.removeTool(tool.name);
      setCurrentRenderToolCalls((prev) => 
        prev.filter(rc => rc.name !== tool.name)
      );
    };
  }, [tool, copilotkit, renderToolCalls, setCurrentRenderToolCalls]);
}

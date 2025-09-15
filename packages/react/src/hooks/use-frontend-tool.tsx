import { useEffect } from "react";
import { useCopilotKit } from "../providers/CopilotKitProvider";
import { ReactFrontendTool } from "../types/frontend-tool";
import { ReactToolCallRender } from "../types/react-tool-call-render";

export function useFrontendTool<
  T extends Record<string, unknown> = Record<string, unknown>,
>(tool: ReactFrontendTool<T>) {
  const { copilotkit, setCurrentRenderToolCalls } = useCopilotKit();

  useEffect(() => {
    const name = tool.name;

    // Always register/override the tool for this name on mount
    if (copilotkit.getTool({ toolName: name, agentId: tool.agentId })) {
      console.warn(
        `Tool '${name}' already exists for agent '${tool.agentId || 'global'}'. Overriding with latest registration.`
      );
      copilotkit.removeTool(name, tool.agentId);
    }
    copilotkit.addTool(tool);

    // Register/override renderer by name and agentId
    if (tool.render) {
      setCurrentRenderToolCalls((prev) => {
        // Only replace renderers with the same name AND agentId
        const replaced = prev.filter((rc) => 
          !(rc.name === name && rc.agentId === tool.agentId)
        );
        return [
          ...replaced,
          {
            name,
            args: tool.parameters,
            agentId: tool.agentId,
            render: tool.render,
          } as ReactToolCallRender<unknown>,
        ];
      });
    }

    return () => {
      copilotkit.removeTool(name, tool.agentId);
      // we are intentionally not removing the render here so that the tools can still render in the chat history
    };
    // Depend only on stable keys to avoid re-register loops due to object identity
  }, [tool.name, copilotkit, setCurrentRenderToolCalls]);
}

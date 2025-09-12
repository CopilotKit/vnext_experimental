import { useEffect } from "react";
import { useCopilotKit } from "../providers/CopilotKitProvider";
import { ReactFrontendTool } from "../types/frontend-tool";
import { ReactToolCallRender } from "../types/react-tool-call-render";

export function useFrontendTool<T extends Record<string, unknown> = Record<string, unknown>>(
  tool: ReactFrontendTool<T>
) {
  const { copilotkit, setCurrentRenderToolCalls } = useCopilotKit();

  // Track latest owner per tool name to avoid removing overrides on unmount
  // Module-scoped across hook instances
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const owners = (useFrontendTool as any)._owners || new Map<string, number>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useFrontendTool as any)._owners = owners;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextIdRef = (useFrontendTool as any)._nextIdRef || { value: 1 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useFrontendTool as any)._nextIdRef = nextIdRef;

  useEffect(() => {
    const name = tool.name;
    const ownerId = nextIdRef.value++ as number;

    // Always register/override the tool for this name on mount
    if (name in copilotkit.tools) {
      console.warn(`Tool '${name}' already exists. Overriding with latest registration.`);
      copilotkit.removeTool(name);
    }
    copilotkit.addTool(tool);
    owners.set(name, ownerId);

    // Register/override renderer by name
    if (tool.render && tool.parameters) {
      setCurrentRenderToolCalls((prev) => {
        const existing = prev.find((rc) => rc.name === name);
        if (existing) {
          console.warn(
            `Render component for tool '${name}' already exists. Overriding with latest registration.`
          );
        }
        const replaced = prev.filter((rc) => rc.name !== name);
        return [
          ...replaced,
          {
            name,
            args: tool.parameters,
            render: tool.render,
          } as ReactToolCallRender<unknown>,
        ];
      });
    }

    return () => {
      const currentOwner = owners.get(name);
      if (currentOwner === ownerId) {
        copilotkit.removeTool(name);
        owners.delete(name);
        setCurrentRenderToolCalls((prev) => prev.filter((rc) => rc.name !== name));
      }
    };
  // Depend only on stable keys to avoid re-register loops due to object identity
  }, [tool.name, copilotkit, setCurrentRenderToolCalls]);
}

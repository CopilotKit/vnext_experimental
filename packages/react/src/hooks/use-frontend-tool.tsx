import { FrontendTool } from "@copilotkit/core";
import { useEffect } from "react";
import { useCopilotKit } from "../providers/CopilotKitProvider";
import { RenderToolCall } from "../types/render-tool-call";

export type ReactFrontendTool<T> = FrontendTool<T> & {
  render: RenderToolCall<T>["component"];
};

export function useFrontendTool<T>(tool: ReactFrontendTool<T>) {
  const { renderToolCalls, copilotkit, setCurrentRenderToolCalls } =
    useCopilotKit();

  useEffect(() => {
    copilotkit.addTool(tool);

    if (tool.name in renderToolCalls) {
      console.error(`Tool with name '${tool.name}' already exists. Skipping.`);
    } else {
      setCurrentRenderToolCalls({
        ...renderToolCalls,
        [tool.name]: {
          args: tool.parameters,
          component: tool.render,
        } as RenderToolCall<unknown>,
      });
    }

    return () => {
      copilotkit.removeTool(tool.name);
      setCurrentRenderToolCalls({
        ...Object.fromEntries(
          Object.entries(renderToolCalls).filter(([name]) => name !== tool.name)
        ),
      });
    };
  }, [tool, copilotkit]);
}

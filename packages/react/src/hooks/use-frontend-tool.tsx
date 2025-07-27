import { FrontendTool } from "@copilotkit/core";
import { useEffect } from "react";
import { useCopilotKit } from "../providers/CopilotKitProvider";
import { ReactToolCallRender } from "../types/react-tool-call-render";

export type ReactFrontendTool<T extends Record<string, any> = {}> =
  FrontendTool<T> & {
    render?: ReactToolCallRender<T>["render"];
  };

export function useFrontendTool<T extends Record<string, any> = {}>(
  tool: ReactFrontendTool<T>
) {
  const { renderToolCalls, copilotkit, setCurrentRenderToolCalls } =
    useCopilotKit();

  useEffect(() => {
    copilotkit.addTool(tool);

    if (tool.render && tool.name in renderToolCalls) {
      console.error(`Tool with name '${tool.name}' already exists. Skipping.`);
    } else if (tool.render) {
      setCurrentRenderToolCalls({
        ...renderToolCalls,
        [tool.name]: {
          args: tool.parameters,
          render: tool.render,
        } as ReactToolCallRender<unknown>,
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

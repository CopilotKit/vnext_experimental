import { ReactToolCallRender } from "@/types/react-tool-call-render";
import { useFrontendTool } from "./use-frontend-tool";
import { ReactFrontendTool } from "@/types/frontend-tool";
import { ReactHumanInTheLoop } from "@/types/human-in-the-loop";
import { useState, useCallback, useRef, useEffect } from "react";
import React from "react";
import { useCopilotKit } from "@/providers/CopilotKitProvider";

export function useHumanInTheLoop<T extends Record<string, unknown> = Record<string, unknown>>(
  tool: ReactHumanInTheLoop<T>
) {
  const [status, setStatus] = useState<"inProgress" | "executing" | "complete">(
    "inProgress"
  );
  const statusRef = useRef(status);
  const resolvePromiseRef = useRef<((result: unknown) => void) | null>(null);
  const { setCurrentRenderToolCalls } = useCopilotKit();

  statusRef.current = status;

  const respond = useCallback(async (result: unknown) => {
    if (resolvePromiseRef.current) {
      resolvePromiseRef.current(result);
      setStatus("complete");
      resolvePromiseRef.current = null;
    }
  }, []);

  const handler = useCallback(async () => {
    return new Promise((resolve) => {
      setStatus("executing");
      resolvePromiseRef.current = resolve;
    });
  }, []);

  const RenderComponent: ReactToolCallRender<T>["render"] = useCallback(
    (props) => {
      const ToolComponent = tool.render;
      const currentStatus = statusRef.current;

      // Enhance props based on current status
      if (currentStatus === "inProgress" && props.status === "inProgress") {
        const enhancedProps = {
          ...props,
          name: tool.name,
          description: tool.description || "",
          respond: undefined,
        };
        return React.createElement(ToolComponent, enhancedProps);
      } else if (currentStatus === "executing" && props.status === "executing") {
        const enhancedProps = {
          ...props,
          name: tool.name,
          description: tool.description || "",
          respond,
        };
        return React.createElement(ToolComponent, enhancedProps);
      } else if (currentStatus === "complete" && props.status === "complete") {
        const enhancedProps = {
          ...props,
          name: tool.name,
          description: tool.description || "",
          respond: undefined,
        };
        return React.createElement(ToolComponent, enhancedProps);
      }

      // Fallback - just render with original props
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return React.createElement(ToolComponent, props as any);
    },
    [tool.render, tool.name, tool.description, respond]
  );

  const frontendTool: ReactFrontendTool<T> = {
    ...tool,
    handler,
    render: RenderComponent,
  };

  useFrontendTool(frontendTool);

  useEffect(() => {
    return () => {
      setCurrentRenderToolCalls((prev) =>
        prev.filter(
          (rc) => rc.name !== tool.name || rc.agentId !== tool.agentId
        )
      );
    };
  }, [setCurrentRenderToolCalls, tool.name, tool.agentId]);
}

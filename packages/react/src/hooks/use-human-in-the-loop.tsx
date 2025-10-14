import { ReactToolCallRenderer } from "@/types/react-tool-call-renderer";
import { useFrontendTool } from "./use-frontend-tool";
import { ReactFrontendTool } from "@/types/frontend-tool";
import { ReactHumanInTheLoop } from "@/types/human-in-the-loop";
import { useState, useCallback, useRef, useEffect } from "react";
import React from "react";
import { useCopilotKit } from "@/providers/CopilotKitProvider";

export function useHumanInTheLoop<T extends object = Record<string, unknown>>(
  tool: ReactHumanInTheLoop<T>
) {
  const { copilotkit } = useCopilotKit();
  const [status, setStatus] = useState<"inProgress" | "executing" | "complete">(
    "inProgress"
  );
  const statusRef = useRef(status);
  const resolvePromiseRef = useRef<((result: unknown) => void) | null>(null);

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

  const RenderComponent: ReactToolCallRenderer<T>["render"] = useCallback(
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

  // Human-in-the-loop tools should remove their renderer on unmount
  // since they can't respond to user interactions anymore
  useEffect(() => {
    return () => {
      const keyOf = (rc: ReactToolCallRenderer<any>) => `${rc.agentId ?? ""}:${rc.name}`;
      const currentRenderToolCalls = copilotkit.renderToolCalls as ReactToolCallRenderer<any>[];
      const filtered = currentRenderToolCalls.filter(
        rc => keyOf(rc) !== keyOf({ name: tool.name, agentId: tool.agentId } as any)
      );
      copilotkit.setRenderToolCalls(filtered);
    };
  }, [copilotkit, tool.name, tool.agentId]);
}

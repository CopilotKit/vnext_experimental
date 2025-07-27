import { ReactToolCallRender } from "@/types/react-tool-call-render";
import { FrontendTool } from "@copilotkit/core";
import { useFrontendTool, ReactFrontendTool } from "./use-frontend-tool";
import { useState, useCallback, useRef } from "react";
import React from "react";

export type ReactHumanInTheLoop<T extends Record<string, any> = {}> = Omit<
  FrontendTool<T>,
  "handler"
> & {
  render: React.ComponentType<
    | {
        name: string;
        description: string;
        args: Partial<T>;
        status: "inProgress";
        result: undefined;
        respond: undefined;
      }
    | {
        name: string;
        description: string;
        args: T;
        status: "executing";
        result: undefined;
        respond: (result: unknown) => Promise<void>;
      }
    | {
        name: string;
        description: string;
        args: T;
        status: "complete";
        result: unknown;
        respond: undefined;
      }
  >;
};

export function useHumanInTheLoop<T extends Record<string, any> = {}>(
  tool: ReactHumanInTheLoop<T>
) {
  const [status, setStatus] = useState<"inProgress" | "executing" | "complete">(
    "inProgress"
  );
  const resolvePromiseRef = useRef<((result: unknown) => void) | null>(null);

  const respond = useCallback(async (result: unknown) => {
    if (resolvePromiseRef.current) {
      resolvePromiseRef.current(result);
      setStatus("complete");
      resolvePromiseRef.current = null;
    }
  }, []);

  const handler = useCallback(async (args: T) => {
    return new Promise((resolve) => {
      setStatus("executing");
      resolvePromiseRef.current = resolve;
    });
  }, []);

  const RenderComponent: ReactToolCallRender<T>["render"] = useCallback(
    (props) => {
      const ToolComponent = tool.render;

      // Enhance props based on current status
      if (status === "inProgress" && props.status === "inProgress") {
        const enhancedProps = {
          ...props,
          respond: undefined,
        };
        return React.createElement(ToolComponent, enhancedProps);
      } else if (status === "executing" && props.status === "executing") {
        const enhancedProps = {
          ...props,
          respond,
        };
        return React.createElement(ToolComponent, enhancedProps);
      } else if (status === "complete" && props.status === "complete") {
        const enhancedProps = {
          ...props,
          respond: undefined,
        };
        return React.createElement(ToolComponent, enhancedProps);
      }

      // Fallback - just render with original props
      return React.createElement(ToolComponent, props as any);
    },
    [tool.render, status, respond]
  );

  const frontendTool: ReactFrontendTool<T> = {
    ...tool,
    handler,
    render: RenderComponent,
  };

  useFrontendTool(frontendTool);
}

import { FrontendTool } from "@copilotkit/core";
import { ReactToolCallRender } from "./react-tool-call-render";

export type ReactFrontendTool<T extends Record<string, unknown> = Record<string, unknown>> =
  FrontendTool<T> & {
    render?: ReactToolCallRender<T>["render"];
  };
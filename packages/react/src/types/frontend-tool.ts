import { FrontendTool } from "@copilotkitnext/core";
import { ReactToolCallRenderer } from "./react-tool-call-renderer";

export type ReactFrontendTool<
  T extends object = Record<string, unknown>,
> = FrontendTool<T> & {
  render?: ReactToolCallRenderer<T>["render"];
};

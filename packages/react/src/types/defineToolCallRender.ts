import React from "react";
import { z } from "zod";
import { ReactToolCallRender } from "./react-tool-call-render";

/**
 * Helper to define a type-safe tool call render entry.
 * - Accepts a single object whose keys match ReactToolCallRender's fields: { name, args, render, agentId? }.
 * - Derives `args` type from the provided Zod schema.
 * - Ensures the render function param type exactly matches ReactToolCallRender<T>["render"]'s param.
 */
type RenderProps<S extends z.ZodTypeAny> = React.ComponentProps<
  ReactToolCallRender<z.infer<S>>["render"]
>;

export function defineToolCallRender<S extends z.ZodTypeAny>(def: {
  name: string;
  args: S;
  render: (props: RenderProps<S>) => React.ReactElement;
  agentId?: string;
}): ReactToolCallRender<z.infer<S>> {
  return {
    name: def.name,
    args: def.args,
    // Coerce to ComponentType to align with ReactToolCallRender
    render: def.render as unknown as React.ComponentType<RenderProps<S>>,
    ...(def.agentId ? { agentId: def.agentId } : {}),
  };
}

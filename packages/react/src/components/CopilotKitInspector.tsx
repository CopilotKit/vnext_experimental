import * as React from "react";
import { createComponent } from "@lit-labs/react";
import type { CopilotKitCore } from "@copilotkitnext/core";

type CopilotKitInspectorBaseProps = {
  core?: CopilotKitCore | null;
  [key: string]: unknown;
};

type InspectorComponent = React.ComponentType<CopilotKitInspectorBaseProps>;

// Lazy-load the lit custom element so consumers don't pay the cost until they render it.
const CopilotKitInspectorBase = React.lazy<InspectorComponent>(() => {
  if (typeof window === "undefined") {
    const NullComponent: InspectorComponent = () => null;
    return Promise.resolve({ default: NullComponent });
  }

  return import("@copilotkitnext/web-inspector").then((mod) => {
    mod.defineWebInspector?.();

    const Component = createComponent({
      tagName: mod.WEB_INSPECTOR_TAG,
      elementClass: mod.WebInspectorElement,
      react: React,
    }) as InspectorComponent;

    return { default: Component };
  });
});

export interface CopilotKitInspectorProps extends CopilotKitInspectorBaseProps {}

export const CopilotKitInspector: React.FC<CopilotKitInspectorProps> = ({ core, ...rest }) => (
  <React.Suspense fallback={null}>
    <CopilotKitInspectorBase {...rest} core={core ?? null} />
  </React.Suspense>
);

CopilotKitInspector.displayName = "CopilotKitInspector";

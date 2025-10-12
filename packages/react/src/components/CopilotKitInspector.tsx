import * as React from "react";
import { createComponent } from "@lit-labs/react";
import * as WebInspectorModule from "@copilotkitnext/web-inspector";
import type { CopilotKitCore } from "@copilotkitnext/core";

const WEB_INSPECTOR_TAG = (WebInspectorModule as { WEB_INSPECTOR_TAG: string }).WEB_INSPECTOR_TAG;
const defineWebInspector = (WebInspectorModule as { defineWebInspector: () => void }).defineWebInspector;
const WebInspectorElementClass = (WebInspectorModule as { WebInspectorElement: typeof HTMLElement }).WebInspectorElement;

type WebInspectorElementInstance = HTMLElement & { core: CopilotKitCore | null };

defineWebInspector();

const CopilotKitInspectorBase = createComponent({
  tagName: WEB_INSPECTOR_TAG,
  elementClass: WebInspectorElementClass,
  react: React,
});

export type CopilotKitInspectorBaseProps = React.ComponentProps<typeof CopilotKitInspectorBase>;

export interface CopilotKitInspectorProps extends Omit<CopilotKitInspectorBaseProps, "core"> {
  core?: CopilotKitCore | null;
}

export const CopilotKitInspector = React.forwardRef<WebInspectorElementInstance, CopilotKitInspectorProps>(
  ({ core, ...rest }, ref) => {
    const innerRef = React.useRef<WebInspectorElementInstance>(null);

    React.useImperativeHandle(ref, () => innerRef.current as WebInspectorElementInstance, []);

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.core = core ?? null;
      }
    }, [core]);

    return (
      <CopilotKitInspectorBase
        {...(rest as CopilotKitInspectorBaseProps)}
        ref={innerRef}
      />
    ); // eslint-disable-line react/jsx-props-no-spreading
  },
);

CopilotKitInspector.displayName = "CopilotKitInspector";

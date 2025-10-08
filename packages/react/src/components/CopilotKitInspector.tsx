import * as React from "react";
import { createComponent } from "@lit-labs/react";
import {
  WEB_INSPECTOR_TAG,
  WebInspectorElement,
  defineWebInspector,
} from "@copilotkitnext/web-inspector";
import type { CopilotKitCore } from "@copilotkitnext/core";

defineWebInspector();

const CopilotKitInspectorBase = createComponent({
  tagName: WEB_INSPECTOR_TAG,
  elementClass: WebInspectorElement,
  react: React,
});

export type CopilotKitInspectorBaseProps = React.ComponentProps<typeof CopilotKitInspectorBase>;

export interface CopilotKitInspectorProps extends Omit<CopilotKitInspectorBaseProps, "core"> {
  core?: CopilotKitCore | null;
}

export const CopilotKitInspector = React.forwardRef<
  WebInspectorElement,
  CopilotKitInspectorProps
>(
  ({ core, ...rest }, ref) => {
    const innerRef = React.useRef<WebInspectorElement>(null);

    React.useImperativeHandle(ref, () => innerRef.current as WebInspectorElement, []);

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

import * as React from "react";
import { createComponent } from "@lit-labs/react";
import {
  WEB_INSPECTOR_TAG,
  WebInspectorElement,
  defineWebInspector,
} from "@copilotkitnext/web-inspector";
import type { CopilotKitCore } from "@copilotkitnext/core";

defineWebInspector();

const WebInspectorBase = createComponent({
  tagName: WEB_INSPECTOR_TAG,
  elementClass: WebInspectorElement,
  react: React,
});

export type WebInspectorBaseProps = React.ComponentProps<typeof WebInspectorBase>;

export interface WebInspectorProps extends Omit<WebInspectorBaseProps, "core"> {
  core?: CopilotKitCore | null;
}

export const WebInspector = React.forwardRef<WebInspectorElement, WebInspectorProps>(
  ({ core, ...rest }, ref) => {
    const innerRef = React.useRef<WebInspectorElement>(null);

    React.useImperativeHandle(ref, () => innerRef.current as WebInspectorElement, []);

    React.useEffect(() => {
      if (innerRef.current) {
        innerRef.current.core = core ?? null;
      }
    }, [core]);

    return <WebInspectorBase {...(rest as WebInspectorBaseProps)} ref={innerRef} />; // eslint-disable-line react/jsx-props-no-spreading
  },
);

WebInspector.displayName = "WebInspector";

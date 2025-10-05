import * as React from "react";
import { createComponent } from "@lit-labs/react";
import {
  WEB_INSPECTOR_TAG,
  WebInspectorElement,
  defineWebInspector,
} from "@copilotkitnext/web-inspector";

defineWebInspector();

export const WebInspector = createComponent({
  tagName: WEB_INSPECTOR_TAG,
  elementClass: WebInspectorElement,
  react: React,
});

export type WebInspectorProps = React.ComponentProps<typeof WebInspector>;

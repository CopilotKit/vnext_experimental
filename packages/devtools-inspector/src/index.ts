import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";
import { defineWebInspector } from "@copilotkitnext/web-inspector";
import type { WebInspectorElement } from "@copilotkitnext/web-inspector";
import { RemoteCopilotCore } from "./remote-core";
import type {
  AgentsPayload,
  ContextPayload,
  EventsPatchPayload,
  InitInstancePayload,
  RuntimeStatusPayload,
  ToolsPayload,
} from "./types";

defineWebInspector();

export const DEVTOOLS_INSPECTOR_HOST_TAG = "devtools-inspector-host" as const;

@customElement(DEVTOOLS_INSPECTOR_HOST_TAG)
export class DevtoolsInspectorHost extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: 100%;
      width: 100%;
    }

    .panel {
      position: relative;
      height: 100%;
      width: 100%;
      background: #f8fafc;
      color: #0f172a;
      font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .empty {
      align-items: center;
      color: #475569;
      display: flex;
      font-size: 13px;
      height: 100%;
      justify-content: center;
      letter-spacing: 0.01em;
      text-align: center;
      padding: 16px;
    }

    .inspector {
      height: 100%;
      width: 100%;
    }
  `;

  private readonly core = new RemoteCopilotCore();
  private hasData = false;
  private resizeObserver: ResizeObserver | null = null;

  updateFromInit(payload: InitInstancePayload): void {
    this.hasData = true;
    this.core.reset(payload);
    this.expandInspector();
    this.requestUpdate();
  }

  updateFromStatus(payload: RuntimeStatusPayload): void {
    this.hasData = true;
    this.core.updateStatus(payload);
    this.expandInspector();
    this.requestUpdate();
  }

  updateFromAgents(payload: AgentsPayload): void {
    this.hasData = true;
    this.core.applyAgents(payload);
    this.expandInspector();
    this.requestUpdate();
  }

  updateFromTools(payload: ToolsPayload): void {
    this.hasData = true;
    this.core.updateTools(payload);
    this.expandInspector();
    this.requestUpdate();
  }

  updateFromContext(payload: ContextPayload): void {
    this.hasData = true;
    this.core.updateContext(payload);
    this.expandInspector();
    this.requestUpdate();
  }

  updateFromEvents(payload: EventsPatchPayload): void {
    this.hasData = true;
    this.core.applyEvents(payload);
    this.expandInspector();
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.resizeObserver = new ResizeObserver(() => this.applyFullPanelLayout());
    this.resizeObserver.observe(this);
  }

  disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    super.disconnectedCallback();
  }

  render() {
    return html`
      <div class="panel">
        ${this.hasData
          ? html`<web-inspector class="inspector" .core=${this.core} .autoAttachCore=${false}></web-inspector>`
          : html`<div class="empty">No CopilotKit runtime found in this tab yet.</div>`}
      </div>
    `;
  }

  private expandInspector(): void {
    const inspector = this.getInspector();
    if (!inspector) {
      return;
    }

    // Force the window open and sized to the panel.
    (inspector as unknown as { openInspector?: () => void }).openInspector?.();
    (inspector as unknown as { setDockMode?: (mode: string) => void }).setDockMode?.("floating");
    this.applyFullPanelLayout();
  }

  private applyFullPanelLayout(): void {
    const inspector = this.getInspector();
    if (!inspector) {
      return;
    }

    const width = this.clientWidth || this.offsetWidth || 1200;
    const height = this.clientHeight || this.offsetHeight || 800;

    const windowContext = (inspector as unknown as { contextState?: Record<string, Record<string, unknown>> }).contextState
      ?.window as
      | {
          size?: { width: number; height: number };
          position?: { x: number; y: number };
          anchor?: { horizontal: string; vertical: string };
          anchorOffset?: { x: number; y: number };
        }
      | undefined;
    if (windowContext) {
      windowContext.size = { width, height };
      windowContext.position = { x: 0, y: 0 };
      windowContext.anchor = { horizontal: "left", vertical: "top" };
      windowContext.anchorOffset = { x: 0, y: 0 };
      const hasCustomPosition = (inspector as unknown as { hasCustomPosition?: Record<string, boolean> }).hasCustomPosition;
      if (hasCustomPosition) {
        hasCustomPosition.window = true;
      }
      inspector.style.transform = "translate3d(0px, 0px, 0)";
    }

    const windowEl = inspector.shadowRoot?.querySelector<HTMLElement>(".inspector-window");
    if (windowEl) {
      windowEl.style.width = "100%";
      windowEl.style.height = "100%";
      windowEl.style.maxWidth = "100%";
      windowEl.style.maxHeight = "100%";
      windowEl.style.borderRadius = "0";
      windowEl.style.boxShadow = "none";
      windowEl.style.border = "none";
    }

    inspector.requestUpdate?.();
  }

  private getInspector(): WebInspectorElement | null {
    return this.renderRoot?.querySelector("web-inspector") as WebInspectorElement | null;
  }
}

export function defineDevtoolsInspectorHost(): void {
  if (!customElements.get(DEVTOOLS_INSPECTOR_HOST_TAG)) {
    customElements.define(DEVTOOLS_INSPECTOR_HOST_TAG, DevtoolsInspectorHost);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [DEVTOOLS_INSPECTOR_HOST_TAG]: DevtoolsInspectorHost;
  }
}

export { RemoteCopilotCore } from "./remote-core";
export type * from "./types";

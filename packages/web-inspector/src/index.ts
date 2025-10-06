import { LitElement, css, html, nothing, unsafeCSS } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import tailwindStyles from "./styles/generated.css";
import logoMarkUrl from "./assets/logo-mark.svg";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { icons } from "lucide";
import type { Anchor, ContextKey, ContextState, Position, Size } from "./lib/types";
import {
  applyAnchorPosition as applyAnchorPositionHelper,
  centerContext as centerContextHelper,
  constrainToViewport,
  keepPositionWithinViewport,
  updateAnchorFromPosition as updateAnchorFromPositionHelper,
  updateSizeFromElement,
  clampSize as clampSizeToViewport,
} from "./lib/context-helpers";
import {
  loadInspectorState,
  saveInspectorState,
  type PersistedState,
  isValidAnchor,
  isValidPosition,
  isValidSize,
} from "./lib/persistence";

export const WEB_INSPECTOR_TAG = "web-inspector" as const;

type LucideIconName = keyof typeof icons;

type MenuKey = "ag-ui-events" | "agents" | "frontend-tools" | "agent-context";

type MenuItem = {
  key: MenuKey;
  label: string;
  icon: LucideIconName;
};

const EDGE_MARGIN = 24;
const DRAG_THRESHOLD = 6;
const MIN_WINDOW_WIDTH = 280;
const MIN_WINDOW_HEIGHT = 240;
const COOKIE_NAME = "copilotkit_inspector_state";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const DEFAULT_BUTTON_SIZE: Size = { width: 48, height: 48 };
const DEFAULT_WINDOW_SIZE: Size = { width: 360, height: 420 };

export class WebInspectorElement extends LitElement {
  private pointerId: number | null = null;
  private dragStart: Position | null = null;
  private dragOffset: Position = { x: 0, y: 0 };
  private isDragging = false;
  private pointerContext: ContextKey | null = null;
  private isOpen = false;
  private draggedDuringInteraction = false;
  private ignoreNextButtonClick = false;
  private selectedMenu: MenuKey = "ag-ui-events";
  private contextMenuOpen = false;

  private readonly contextState: Record<ContextKey, ContextState> = {
    button: {
      position: { x: EDGE_MARGIN, y: EDGE_MARGIN },
      size: { ...DEFAULT_BUTTON_SIZE },
      anchor: { horizontal: "right", vertical: "bottom" },
      anchorOffset: { x: EDGE_MARGIN, y: EDGE_MARGIN },
    },
    window: {
      position: { x: EDGE_MARGIN, y: EDGE_MARGIN },
      size: { ...DEFAULT_WINDOW_SIZE },
      anchor: { horizontal: "right", vertical: "bottom" },
      anchorOffset: { x: EDGE_MARGIN, y: EDGE_MARGIN },
    },
  };

  private hasCustomPosition: Record<ContextKey, boolean> = {
    button: false,
    window: false,
  };

  private resizePointerId: number | null = null;
  private resizeStart: Position | null = null;
  private resizeInitialSize: { width: number; height: number } | null = null;
  private isResizing = false;

  private readonly menuItems: MenuItem[] = [
    { key: "ag-ui-events", label: "AG-UI Events", icon: "Zap" },
    { key: "agents", label: "Agents", icon: "Bot" },
    { key: "frontend-tools", label: "Frontend Tools", icon: "Hammer" },
    { key: "agent-context", label: "Agent Context", icon: "FileText" },
  ];

  static styles = [
    unsafeCSS(tailwindStyles),
    css`
      :host {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 2147483646;
        display: block;
        will-change: transform;
      }

      .console-button {
        transition:
          transform 160ms ease,
          opacity 160ms ease;
      }

      .resize-handle {
        touch-action: none;
        user-select: none;
      }
    `,
  ];

  connectedCallback(): void {
    super.connectedCallback();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this.handleResize);
      window.addEventListener("pointerdown", this.handleGlobalPointerDown as EventListener);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.handleResize);
      window.removeEventListener("pointerdown", this.handleGlobalPointerDown as EventListener);
    }
  }

  firstUpdated(): void {
    if (typeof window === "undefined") {
      return;
    }

    this.measureContext("button");
    this.measureContext("window");

    this.contextState.button.anchor = { horizontal: "right", vertical: "bottom" };
    this.contextState.button.anchorOffset = { x: EDGE_MARGIN, y: EDGE_MARGIN };

    this.contextState.window.anchor = { horizontal: "right", vertical: "bottom" };
    this.contextState.window.anchorOffset = { x: EDGE_MARGIN, y: EDGE_MARGIN };

    this.hydrateStateFromCookie();

    this.applyAnchorPosition("button");

    if (this.hasCustomPosition.window) {
      this.applyAnchorPosition("window");
    } else {
      this.centerContext("window");
    }

    this.updateHostTransform("button");
  }

  render() {
    return this.isOpen ? this.renderWindow() : this.renderButton();
  }

  private renderButton() {
    const buttonClasses = [
      "console-button",
      "group",
      "pointer-events-auto",
      "inline-flex",
      "h-12",
      "w-12",
      "items-center",
      "justify-center",
      "rounded-full",
      "border",
      "border-white/25",
      "bg-slate-950/90",
      "text-sm",
      "font-medium",
      "text-white",
      "ring-1",
      "ring-white/10",
      "backdrop-blur-md",
      "transition",
      "hover:border-white/40",
      "hover:bg-slate-900/90",
      "hover:scale-105",
      "focus-visible:outline",
      "focus-visible:outline-2",
      "focus-visible:outline-offset-2",
      "focus-visible:outline-rose-500",
      "touch-none",
      "select-none",
      this.isDragging ? "cursor-grabbing" : "cursor-grab",
    ].join(" ");

    return html`
      <button
        class=${buttonClasses}
        type="button"
        aria-label="Web Inspector"
        data-drag-context="button"
        @pointerdown=${this.handlePointerDown}
        @pointermove=${this.handlePointerMove}
        @pointerup=${this.handlePointerUp}
        @pointercancel=${this.handlePointerCancel}
        @click=${this.handleButtonClick}
      >
        <img src=${logoMarkUrl} alt="" class="h-7 w-7" loading="lazy" />
      </button>
    `;
  }

  private renderWindow() {
    const windowState = this.contextState.window;
    const windowStyles = {
      width: `${Math.round(windowState.size.width)}px`,
      height: `${Math.round(windowState.size.height)}px`,
      minWidth: `${MIN_WINDOW_WIDTH}px`,
      minHeight: `${MIN_WINDOW_HEIGHT}px`,
    };
    const contextDropdown = this.renderContextDropdown();
    const hasContextDropdown = contextDropdown !== nothing;

    return html`
      <section
        class="inspector-window pointer-events-auto relative flex flex-col overflow-hidden rounded-3xl border border-gray-200/80 bg-white text-gray-900 shadow-[0_18px_45px_rgba(15,23,42,0.07)]"
        style=${styleMap(windowStyles)}
      >
        <div class="flex flex-1 overflow-hidden bg-white text-gray-800">
          <nav
            class="flex w-72 shrink-0 flex-col justify-between border-r border-gray-200/80 bg-white/60 px-6 pb-6 pt-5 text-sm"
            aria-label="Inspector sections"
          >
            <div class="flex flex-col gap-6 overflow-y-auto">
              <div class="flex items-center gap-3 pl-2">
                <span
                  class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]"
                >
                  ${this.renderIcon("Building2")}
                </span>
                <div class="flex flex-1 flex-col leading-tight">
                  <span class="text-[1rem] font-semibold text-gray-900">Acme Inc</span>
                  <span class="text-xs text-gray-500">Enterprise</span>
                </div>
              </div>

              <div class="flex flex-col gap-5">
                <div class="px-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Platform</div>
                <div class="flex flex-col gap-1.5">
                  ${this.menuItems.map(({ key, label, icon }) => {
                    const isSelected = this.selectedMenu === key;
                    const buttonClasses = [
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[0.95rem] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-300",
                      isSelected
                        ? "bg-[#0f172a] text-white shadow-[0_8px_20px_rgba(15,23,42,0.12)]"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                    ].join(" ");

                    const badgeClasses = isSelected
                      ? "border-transparent bg-[#121c34] text-white"
                      : "border-gray-200/80 bg-white text-gray-500 group-hover:border-gray-300 group-hover:text-gray-900";

                    return html`
                      <button
                        type="button"
                        class=${buttonClasses}
                        aria-pressed=${isSelected}
                        @click=${() => this.handleMenuSelect(key)}
                      >
                        <span
                          class="flex h-9 w-9 items-center justify-center rounded-xl border ${badgeClasses}"
                          aria-hidden="true"
                        >
                          ${this.renderIcon(icon)}
                        </span>
                        <span class="flex-1">${label}</span>
                        <span class="text-gray-400 group-hover:text-gray-600">${this.renderIcon("ChevronRight")}</span>
                      </button>
                    `;
                  })}
                </div>
              </div>
            </div>

            <div
              class="relative flex items-center rounded-2xl border border-gray-200/80 bg-white px-3 py-3 text-left text-[0.95rem] text-gray-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            >
              <span
                class="w-8 h-8 flex items-center justify-center overflow-hidden rounded-full bg-gray-100 text-base font-semibold text-gray-700"
              >
                JS
              </span>
              <div class="pl-4 flex flex-1 flex-col leading-tight">
                <span class="font-medium text-gray-900">John Snow</span>
                <span class="text-xs text-gray-500">john@snow.com</span>
              </div>
              <span class="text-gray-300">${this.renderIcon("ChevronRight")}</span>
            </div>
          </nav>
          <div class="relative flex flex-1 flex-col overflow-hidden">
            <div
              class="drag-handle flex items-center justify-between border-b border-gray-200/80 px-7 py-5"
              data-drag-context="window"
              @pointerdown=${this.handlePointerDown}
              @pointermove=${this.handlePointerMove}
              @pointerup=${this.handlePointerUp}
              @pointercancel=${this.handlePointerCancel}
            >
              <div class="flex items-center gap-3 text-[0.95rem] text-gray-500">
                <span class="text-gray-400">
                  ${this.renderIcon(this.getSelectedMenu().icon)}
                </span>
                <div class="flex items-center text-sm text-gray-600">
                  <span class="pr-4">${this.getSelectedMenu().label}</span>
                  ${hasContextDropdown
                    ? html`
                        <span class="h-4 w-px bg-gray-200/90"></span>
                        <div class="pl-4">${contextDropdown}</div>
                      `
                    : nothing}
                </div>
              </div>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                type="button"
                aria-label="Close Web Inspector"
                @pointerdown=${this.handleClosePointerDown}
                @click=${this.handleCloseClick}
              >
                ${this.renderIcon("X")}
              </button>
            </div>
            <div class="flex-1 overflow-auto px-7 py-7">
              <div class="flex flex-col gap-6">
                <div class="h-40 rounded-2xl bg-[#f8f8f8]"></div>
                <div class="h-32 rounded-2xl bg-[#f8f8f8]"></div>
              </div>
              <slot></slot>
            </div>
          </div>
        </div>
        <div
          class="resize-handle pointer-events-auto absolute bottom-2 right-2 flex h-6 w-6 cursor-nwse-resize items-center justify-center text-gray-400 transition hover:text-gray-600"
          role="presentation"
          aria-hidden="true"
          @pointerdown=${this.handleResizePointerDown}
          @pointermove=${this.handleResizePointerMove}
          @pointerup=${this.handleResizePointerUp}
          @pointercancel=${this.handleResizePointerCancel}
        >
          <svg
            class="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-width="1.3"
          >
            <path d="M5 15L15 5" />
            <path d="M9 15L15 9" />
          </svg>
        </div>
      </section>
    `;
  }

  private hydrateStateFromCookie(): void {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const persisted = loadInspectorState(COOKIE_NAME);
    if (!persisted) {
      return;
    }

    const persistedButton = persisted.button;
    if (persistedButton) {
      if (isValidAnchor(persistedButton.anchor)) {
        this.contextState.button.anchor = persistedButton.anchor;
      }

      if (isValidPosition(persistedButton.anchorOffset)) {
        this.contextState.button.anchorOffset = persistedButton.anchorOffset;
      }

      if (typeof persistedButton.hasCustomPosition === "boolean") {
        this.hasCustomPosition.button = persistedButton.hasCustomPosition;
      }
    }

    const persistedWindow = persisted.window;
    if (persistedWindow) {
      if (isValidAnchor(persistedWindow.anchor)) {
        this.contextState.window.anchor = persistedWindow.anchor;
      }

      if (isValidPosition(persistedWindow.anchorOffset)) {
        this.contextState.window.anchorOffset = persistedWindow.anchorOffset;
      }

      if (isValidSize(persistedWindow.size)) {
        this.contextState.window.size = this.clampWindowSize(persistedWindow.size);
      }

      if (typeof persistedWindow.hasCustomPosition === "boolean") {
        this.hasCustomPosition.window = persistedWindow.hasCustomPosition;
      }
    }
  }

  private get activeContext(): ContextKey {
    return this.isOpen ? "window" : "button";
  }

  private handlePointerDown = (event: PointerEvent) => {
    const target = event.currentTarget as HTMLElement | null;
    const contextAttr = target?.dataset.dragContext;
    const context: ContextKey = contextAttr === "window" ? "window" : "button";

    this.pointerContext = context;
    this.measureContext(context);

    event.preventDefault();

    this.pointerId = event.pointerId;
    this.dragStart = { x: event.clientX, y: event.clientY };
    const state = this.contextState[context];
    this.dragOffset = {
      x: event.clientX - state.position.x,
      y: event.clientY - state.position.y,
    };
    this.isDragging = false;
    this.draggedDuringInteraction = false;
    this.ignoreNextButtonClick = false;

    target?.setPointerCapture?.(this.pointerId);
  };

  private handlePointerMove = (event: PointerEvent) => {
    if (this.pointerId !== event.pointerId || !this.dragStart || !this.pointerContext) {
      return;
    }

    const distance = Math.hypot(event.clientX - this.dragStart.x, event.clientY - this.dragStart.y);
    if (!this.isDragging && distance < DRAG_THRESHOLD) {
      return;
    }

    event.preventDefault();
    this.setDragging(true);
    this.draggedDuringInteraction = true;

    const desired: Position = {
      x: event.clientX - this.dragOffset.x,
      y: event.clientY - this.dragOffset.y,
    };

    const constrained = this.constrainToViewport(desired, this.pointerContext);
    this.contextState[this.pointerContext].position = constrained;
    this.updateHostTransform(this.pointerContext);
  };

  private handlePointerUp = (event: PointerEvent) => {
    if (this.pointerId !== event.pointerId) {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    if (target?.hasPointerCapture(this.pointerId)) {
      target.releasePointerCapture(this.pointerId);
    }

    const context = this.pointerContext ?? this.activeContext;

    if (this.isDragging && this.pointerContext) {
      event.preventDefault();
      this.setDragging(false);
      this.updateAnchorFromPosition(this.pointerContext);
      if (this.pointerContext === "window") {
        this.hasCustomPosition.window = true;
      } else if (this.pointerContext === "button") {
        this.hasCustomPosition.button = true;
        if (this.draggedDuringInteraction) {
          this.ignoreNextButtonClick = true;
        }
      }
      this.applyAnchorPosition(this.pointerContext);
    } else if (context === "button" && !this.isOpen && !this.draggedDuringInteraction) {
      this.openInspector();
    }

    this.resetPointerTracking();
  };

  private handlePointerCancel = (event: PointerEvent) => {
    if (this.pointerId !== event.pointerId) {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    if (target?.hasPointerCapture(this.pointerId)) {
      target.releasePointerCapture(this.pointerId);
    }

    this.resetPointerTracking();
  };

  private handleButtonClick = (event: Event) => {
    if (this.isDragging) {
      event.preventDefault();
      return;
    }

    if (this.ignoreNextButtonClick) {
      event.preventDefault();
      this.ignoreNextButtonClick = false;
      return;
    }

    if (!this.isOpen) {
      event.preventDefault();
      this.openInspector();
    }
  };

  private handleClosePointerDown = (event: PointerEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };

  private handleCloseClick = () => {
    this.closeInspector();
  };

  private handleResizePointerDown = (event: PointerEvent) => {
    event.stopPropagation();
    event.preventDefault();

    this.hasCustomPosition.window = true;
    this.isResizing = true;
    this.resizePointerId = event.pointerId;
    this.resizeStart = { x: event.clientX, y: event.clientY };
    this.resizeInitialSize = { ...this.contextState.window.size };

    const target = event.currentTarget as HTMLElement | null;
    target?.setPointerCapture?.(event.pointerId);
  };

  private handleResizePointerMove = (event: PointerEvent) => {
    if (!this.isResizing || this.resizePointerId !== event.pointerId || !this.resizeStart || !this.resizeInitialSize) {
      return;
    }

    event.preventDefault();

    const deltaX = event.clientX - this.resizeStart.x;
    const deltaY = event.clientY - this.resizeStart.y;
    const state = this.contextState.window;

    state.size = this.clampWindowSize({
      width: this.resizeInitialSize.width + deltaX,
      height: this.resizeInitialSize.height + deltaY,
    });
    this.keepPositionWithinViewport("window");
    this.updateAnchorFromPosition("window");
    this.requestUpdate();
    this.updateHostTransform("window");
  };

  private handleResizePointerUp = (event: PointerEvent) => {
    if (this.resizePointerId !== event.pointerId) {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    if (target?.hasPointerCapture(this.resizePointerId)) {
      target.releasePointerCapture(this.resizePointerId);
    }

    this.updateAnchorFromPosition("window");
    this.applyAnchorPosition("window");
    this.resetResizeTracking();
  };

  private handleResizePointerCancel = (event: PointerEvent) => {
    if (this.resizePointerId !== event.pointerId) {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    if (target?.hasPointerCapture(this.resizePointerId)) {
      target.releasePointerCapture(this.resizePointerId);
    }

    this.updateAnchorFromPosition("window");
    this.applyAnchorPosition("window");
    this.resetResizeTracking();
  };

  private handleResize = () => {
    this.measureContext("button");
    this.applyAnchorPosition("button");

    this.measureContext("window");
    if (this.hasCustomPosition.window) {
      this.applyAnchorPosition("window");
    } else {
      this.centerContext("window");
    }

    this.updateHostTransform();
  };

  private measureContext(context: ContextKey): void {
    const selector = context === "window" ? ".inspector-window" : ".console-button";
    const element = this.renderRoot?.querySelector(selector) as HTMLElement | null;
    if (!element) {
      return;
    }
    const fallback = context === "window" ? DEFAULT_WINDOW_SIZE : DEFAULT_BUTTON_SIZE;
    updateSizeFromElement(this.contextState[context], element, fallback);
  }

  private centerContext(context: ContextKey): void {
    if (typeof window === "undefined") {
      return;
    }

    const viewport = this.getViewportSize();
    centerContextHelper(this.contextState[context], viewport, EDGE_MARGIN);

    if (context === this.activeContext) {
      this.updateHostTransform(context);
    }

    this.hasCustomPosition[context] = false;
    this.persistState();
  }

  private ensureWindowPlacement(): void {
    if (typeof window === "undefined") {
      return;
    }

    if (!this.hasCustomPosition.window) {
      this.centerContext("window");
      return;
    }

    const viewport = this.getViewportSize();
    keepPositionWithinViewport(this.contextState.window, viewport, EDGE_MARGIN);
    updateAnchorFromPositionHelper(this.contextState.window, viewport, EDGE_MARGIN);
    this.updateHostTransform("window");
    this.persistState();
  }

  private constrainToViewport(position: Position, context: ContextKey): Position {
    if (typeof window === "undefined") {
      return position;
    }

    const viewport = this.getViewportSize();
    return constrainToViewport(this.contextState[context], position, viewport, EDGE_MARGIN);
  }

  private keepPositionWithinViewport(context: ContextKey): void {
    if (typeof window === "undefined") {
      return;
    }

    const viewport = this.getViewportSize();
    keepPositionWithinViewport(this.contextState[context], viewport, EDGE_MARGIN);
  }

  private getViewportSize(): Size {
    if (typeof window === "undefined") {
      return { ...DEFAULT_WINDOW_SIZE };
    }

    return { width: window.innerWidth, height: window.innerHeight };
  }

  private persistState(): void {
    const state: PersistedState = {
      button: {
        anchor: this.contextState.button.anchor,
        anchorOffset: this.contextState.button.anchorOffset,
        hasCustomPosition: this.hasCustomPosition.button,
      },
      window: {
        anchor: this.contextState.window.anchor,
        anchorOffset: this.contextState.window.anchorOffset,
        size: {
          width: Math.round(this.contextState.window.size.width),
          height: Math.round(this.contextState.window.size.height),
        },
        hasCustomPosition: this.hasCustomPosition.window,
      },
    };
    saveInspectorState(COOKIE_NAME, state, COOKIE_MAX_AGE_SECONDS);
  }

  private clampWindowSize(size: Size): Size {
    if (typeof window === "undefined") {
      return {
        width: Math.max(MIN_WINDOW_WIDTH, size.width),
        height: Math.max(MIN_WINDOW_HEIGHT, size.height),
      };
    }

    const viewport = this.getViewportSize();
    return clampSizeToViewport(size, viewport, EDGE_MARGIN, MIN_WINDOW_WIDTH, MIN_WINDOW_HEIGHT);
  }

  private updateHostTransform(context: ContextKey = this.activeContext): void {
    if (context !== this.activeContext) {
      return;
    }

    const { position } = this.contextState[context];
    this.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
  }

  private setDragging(value: boolean): void {
    if (this.isDragging !== value) {
      this.isDragging = value;
      this.requestUpdate();
    }
  }

  private updateAnchorFromPosition(context: ContextKey): void {
    if (typeof window === "undefined") {
      return;
    }
    const viewport = this.getViewportSize();
    updateAnchorFromPositionHelper(this.contextState[context], viewport, EDGE_MARGIN);
  }

  private applyAnchorPosition(context: ContextKey): void {
    if (typeof window === "undefined") {
      return;
    }
    const viewport = this.getViewportSize();
    applyAnchorPositionHelper(this.contextState[context], viewport, EDGE_MARGIN);
    this.updateHostTransform(context);
    this.persistState();
  }

  private resetResizeTracking(): void {
    this.resizePointerId = null;
    this.resizeStart = null;
    this.resizeInitialSize = null;
    this.isResizing = false;
  }

  private resetPointerTracking(): void {
    this.pointerId = null;
    this.dragStart = null;
    this.pointerContext = null;
    this.setDragging(false);
    this.draggedDuringInteraction = false;
  }

  private openInspector(): void {
    if (this.isOpen) {
      return;
    }

    this.isOpen = true;
    this.ensureWindowPlacement();
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.measureContext("window");
      if (this.hasCustomPosition.window) {
        this.applyAnchorPosition("window");
      } else {
        this.centerContext("window");
      }
    });
  }

  private closeInspector(): void {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.updateHostTransform("button");
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.measureContext("button");
      this.applyAnchorPosition("button");
    });
  }

  private renderIcon(name: LucideIconName) {
    const iconNode = icons[name];
    if (!iconNode) {
      return nothing;
    }

    const svgAttrs: Record<string, string | number> = {
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "1.7",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      class: "h-4 w-4",
    };

    const svgMarkup = `<svg ${this.serializeAttributes(svgAttrs)}>${iconNode
      .map(([tag, attrs]) => `<${tag} ${this.serializeAttributes(attrs)} />`)
      .join("")}</svg>`;

    return unsafeHTML(svgMarkup);
  }

  private serializeAttributes(attributes: Record<string, string | number | undefined>): string {
    return Object.entries(attributes)
      .filter(([key, value]) => key !== "key" && value !== undefined && value !== null && value !== "")
      .map(([key, value]) => `${key}="${String(value).replace(/"/g, "&quot;")}"`)
      .join(" ");
  }

  private contextOptions = [
    { key: "all-agents", label: "All Agents" },
    { key: "default", label: "default" },
  ] as const;

  private selectedContext = this.contextOptions[0].key;

  private getSelectedMenu(): MenuItem {
    return this.menuItems.find((item) => item.key === this.selectedMenu) ?? this.menuItems[0];
  }

  private renderContextDropdown() {
    if (this.selectedMenu !== "ag-ui-events") {
      return nothing;
    }

    const selectedLabel = this.contextOptions.find((opt) => opt.key === this.selectedContext)?.label ?? "";

    return html`
      <div class="relative" data-context-dropdown-root="true">
        <button
          type="button"
          class="flex items-center gap-2 rounded-full bg-transparent px-0 py-0.5 text-xs font-medium text-gray-500 transition hover:text-gray-700"
          @pointerdown=${this.handleContextDropdownToggle}
        >
          <span>${selectedLabel}</span>
          <span class="text-gray-300">${this.renderIcon("ChevronDown")}</span>
        </button>
        ${this.contextMenuOpen
          ? html`
              <div
                class="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200/80 bg-white py-1 text-xs shadow-lg"
                data-context-dropdown-root="true"
              >
                ${this.contextOptions.map(
                  (option) => html`
                    <button
                      type="button"
                      class="flex w-full items-center justify-between px-3 py-1.5 text-left transition hover:bg-gray-50"
                      data-context-dropdown-root="true"
                      @click=${() => this.handleContextOptionSelect(option.key)}
                    >
                      <span class="text-gray-700">${option.label}</span>
                      ${option.key === this.selectedContext
                        ? html`<span class="text-gray-400">${this.renderIcon("Check")}</span>`
                        : nothing}
                    </button>
                  `,
                )}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private handleMenuSelect(key: MenuKey): void {
    if (!this.menuItems.some((item) => item.key === key)) {
      return;
    }

    this.selectedMenu = key;
    this.contextMenuOpen = false;
    this.requestUpdate();
  }

  private handleContextDropdownToggle(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuOpen = !this.contextMenuOpen;
    this.requestUpdate();
  }

  private handleContextOptionSelect(key: (typeof this.contextOptions)[number]["key"]): void {
    if (this.selectedContext !== key) {
      this.selectedContext = key;
    }
    this.contextMenuOpen = false;
    this.requestUpdate();
  }

  private handleGlobalPointerDown = (event: PointerEvent): void => {
    if (!this.contextMenuOpen) {
      return;
    }

    const clickedDropdown = event.composedPath().some((node) => {
      return node instanceof HTMLElement && node.dataset?.contextDropdownRoot === "true";
    });

    if (!clickedDropdown) {
      this.contextMenuOpen = false;
      this.requestUpdate();
    }
  };
}

export function defineWebInspector(): void {
  if (!customElements.get(WEB_INSPECTOR_TAG)) {
    customElements.define(WEB_INSPECTOR_TAG, WebInspectorElement);
  }
}

defineWebInspector();

declare global {
  interface HTMLElementTagNameMap {
    "web-inspector": WebInspectorElement;
  }
}

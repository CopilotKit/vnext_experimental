import { LitElement, css, html, unsafeCSS } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import tailwindStyles from './styles/generated.css';
import logoMarkUrl from './assets/logo-mark.svg';
import type { Anchor, ContextKey, ContextState, Position, Size } from './lib/types';
import {
  applyAnchorPosition as applyAnchorPositionHelper,
  centerContext as centerContextHelper,
  constrainToViewport,
  keepPositionWithinViewport,
  updateAnchorFromPosition as updateAnchorFromPositionHelper,
  updateSizeFromElement,
  clampSize as clampSizeToViewport,
} from './lib/context-helpers';
import {
  loadInspectorState,
  saveInspectorState,
  type PersistedState,
  isValidAnchor,
  isValidPosition,
  isValidSize,
} from './lib/persistence';

export const WEB_INSPECTOR_TAG = 'web-inspector' as const;

const EDGE_MARGIN = 24;
const DRAG_THRESHOLD = 6;
const MIN_WINDOW_WIDTH = 280;
const MIN_WINDOW_HEIGHT = 240;
const COOKIE_NAME = 'copilotkit_inspector_state';
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

  private readonly contextState: Record<ContextKey, ContextState> = {
    button: {
      position: { x: EDGE_MARGIN, y: EDGE_MARGIN },
      size: { ...DEFAULT_BUTTON_SIZE },
      anchor: { horizontal: 'right', vertical: 'bottom' },
      anchorOffset: { x: EDGE_MARGIN, y: EDGE_MARGIN },
    },
    window: {
      position: { x: EDGE_MARGIN, y: EDGE_MARGIN },
      size: { ...DEFAULT_WINDOW_SIZE },
      anchor: { horizontal: 'right', vertical: 'bottom' },
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
        transition: transform 160ms ease, opacity 160ms ease;
      }

      .resize-handle {
        touch-action: none;
        user-select: none;
      }
    `,
  ];

  connectedCallback(): void {
    super.connectedCallback();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.handleResize);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.handleResize);
    }
  }

  firstUpdated(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.measureContext('button');
    this.measureContext('window');

    this.contextState.button.anchor = { horizontal: 'right', vertical: 'bottom' };
    this.contextState.button.anchorOffset = { x: EDGE_MARGIN, y: EDGE_MARGIN };

    this.contextState.window.anchor = { horizontal: 'right', vertical: 'bottom' };
    this.contextState.window.anchorOffset = { x: EDGE_MARGIN, y: EDGE_MARGIN };

    this.hydrateStateFromCookie();

    this.applyAnchorPosition('button');

    if (this.hasCustomPosition.window) {
      this.applyAnchorPosition('window');
    } else {
      this.centerContext('window');
    }

    this.updateHostTransform('button');
  }

  render() {
    return this.isOpen ? this.renderWindow() : this.renderButton();
  }

  private renderButton() {
    const buttonClasses = [
      'console-button',
      'group',
      'pointer-events-auto',
      'inline-flex',
      'h-12',
      'w-12',
      'items-center',
      'justify-center',
      'rounded-full',
      'border',
      'border-white/25',
      'bg-slate-950/90',
      'text-sm',
      'font-medium',
      'text-white',
      'ring-1',
      'ring-white/10',
      'backdrop-blur-md',
      'transition',
      'hover:border-white/40',
      'hover:bg-slate-900/90',
      'hover:scale-105',
      'focus-visible:outline',
      'focus-visible:outline-2',
      'focus-visible:outline-offset-2',
      'focus-visible:outline-rose-500',
      'touch-none',
      'select-none',
      this.isDragging ? 'cursor-grabbing' : 'cursor-grab',
    ].join(' ');

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

    return html`
      <section
        class="inspector-window pointer-events-auto relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/70 bg-white text-gray-900 shadow-xl shadow-gray-900/10"
        style=${styleMap(windowStyles)}
      >
        <header
          class="drag-handle relative flex cursor-grab items-center bg-white px-4 py-3 text-sm font-medium text-gray-900 active:cursor-grabbing"
          data-drag-context="window"
          @pointerdown=${this.handlePointerDown}
          @pointermove=${this.handlePointerMove}
          @pointerup=${this.handlePointerUp}
          @pointercancel=${this.handlePointerCancel}
        >
          <span class="flex-1"></span>
          <span class="pointer-events-none absolute left-1/2 -translate-x-1/2 select-none text-[0.95rem] font-semibold tracking-wide text-gray-800">
            CopilotKit Inspector
          </span>
          <button
            class="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-200 hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gray-500"
            type="button"
            aria-label="Close Web Inspector"
            @pointerdown=${this.handleClosePointerDown}
            @click=${this.handleCloseClick}
          >
            <svg
              aria-hidden="true"
              class="h-3.5 w-3.5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="1.4"
            >
              <path d="M4.5 4.5l7 7" />
              <path d="M11.5 4.5l-7 7" />
            </svg>
          </button>
        </header>
        <div class="flex-1 overflow-auto bg-white px-4 py-4 pr-8 pb-8 text-sm text-gray-700">
          <slot></slot>
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
          <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.3">
            <path d="M5 15L15 5" />
            <path d="M9 15L15 9" />
          </svg>
        </div>
      </section>
    `;
  }

  private hydrateStateFromCookie(): void {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
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

      if (typeof persistedButton.hasCustomPosition === 'boolean') {
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

      if (typeof persistedWindow.hasCustomPosition === 'boolean') {
        this.hasCustomPosition.window = persistedWindow.hasCustomPosition;
      }
    }
  }

  private get activeContext(): ContextKey {
    return this.isOpen ? 'window' : 'button';
  }

  private handlePointerDown = (event: PointerEvent) => {
    const target = event.currentTarget as HTMLElement | null;
    const contextAttr = target?.dataset.dragContext;
    const context: ContextKey = contextAttr === 'window' ? 'window' : 'button';

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
      if (this.pointerContext === 'window') {
        this.hasCustomPosition.window = true;
      } else if (this.pointerContext === 'button') {
        this.hasCustomPosition.button = true;
        if (this.draggedDuringInteraction) {
          this.ignoreNextButtonClick = true;
        }
      }
      this.applyAnchorPosition(this.pointerContext);
    } else if (context === 'button' && !this.isOpen && !this.draggedDuringInteraction) {
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
    if (
      !this.isResizing ||
      this.resizePointerId !== event.pointerId ||
      !this.resizeStart ||
      !this.resizeInitialSize
    ) {
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
    this.keepPositionWithinViewport('window');
    this.updateAnchorFromPosition('window');
    this.requestUpdate();
    this.updateHostTransform('window');
  };

  private handleResizePointerUp = (event: PointerEvent) => {
    if (this.resizePointerId !== event.pointerId) {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    if (target?.hasPointerCapture(this.resizePointerId)) {
      target.releasePointerCapture(this.resizePointerId);
    }

    this.updateAnchorFromPosition('window');
    this.applyAnchorPosition('window');
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

    this.updateAnchorFromPosition('window');
    this.applyAnchorPosition('window');
    this.resetResizeTracking();
  };

  private handleResize = () => {
    this.measureContext('button');
    this.applyAnchorPosition('button');

    this.measureContext('window');
    if (this.hasCustomPosition.window) {
      this.applyAnchorPosition('window');
    } else {
      this.centerContext('window');
    }

    this.updateHostTransform();
  };

  private measureContext(context: ContextKey): void {
    const selector = context === 'window' ? '.inspector-window' : '.console-button';
    const element = this.renderRoot?.querySelector(selector) as HTMLElement | null;
    if (!element) {
      return;
    }
    const fallback = context === 'window' ? DEFAULT_WINDOW_SIZE : DEFAULT_BUTTON_SIZE;
    updateSizeFromElement(this.contextState[context], element, fallback);
  }

  private centerContext(context: ContextKey): void {
    if (typeof window === 'undefined') {
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
    if (typeof window === 'undefined') {
      return;
    }

    if (!this.hasCustomPosition.window) {
      this.centerContext('window');
      return;
    }

    const viewport = this.getViewportSize();
    keepPositionWithinViewport(this.contextState.window, viewport, EDGE_MARGIN);
    updateAnchorFromPositionHelper(this.contextState.window, viewport, EDGE_MARGIN);
    this.updateHostTransform('window');
    this.persistState();
  }

  private constrainToViewport(position: Position, context: ContextKey): Position {
    if (typeof window === 'undefined') {
      return position;
    }

    const viewport = this.getViewportSize();
    return constrainToViewport(this.contextState[context], position, viewport, EDGE_MARGIN);
  }

  private keepPositionWithinViewport(context: ContextKey): void {
    if (typeof window === 'undefined') {
      return;
    }

    const viewport = this.getViewportSize();
    keepPositionWithinViewport(this.contextState[context], viewport, EDGE_MARGIN);
  }

  private getViewportSize(): Size {
    if (typeof window === 'undefined') {
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
    if (typeof window === 'undefined') {
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
    if (typeof window === 'undefined') {
      return;
    }
    const viewport = this.getViewportSize();
    updateAnchorFromPositionHelper(this.contextState[context], viewport, EDGE_MARGIN);
  }

  private applyAnchorPosition(context: ContextKey): void {
    if (typeof window === 'undefined') {
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
  }

  private openInspector(): void {
    if (this.isOpen) {
      return;
    }

    this.isOpen = true;
    this.ensureWindowPlacement();
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.measureContext('window');
      if (this.hasCustomPosition.window) {
        this.applyAnchorPosition('window');
      } else {
        this.centerContext('window');
      }
    });
  }

  private closeInspector(): void {
    if (!this.isOpen) {
      return;
    }

    this.isOpen = false;
    this.updateHostTransform('button');
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.measureContext('button');
      this.applyAnchorPosition('button');
    });
  }
}

export function defineWebInspector(): void {
  if (!customElements.get(WEB_INSPECTOR_TAG)) {
    customElements.define(WEB_INSPECTOR_TAG, WebInspectorElement);
  }
}

defineWebInspector();

declare global {
  interface HTMLElementTagNameMap {
    'web-inspector': WebInspectorElement;
  }
}

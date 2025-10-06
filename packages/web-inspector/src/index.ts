import { LitElement, css, html, unsafeCSS } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import tailwindStyles from './styles/generated.css';
import logoMarkUrl from './assets/logo-mark.svg';

export const WEB_INSPECTOR_TAG = 'web-inspector' as const;

type Position = { x: number; y: number };

type Anchor = {
  horizontal: 'left' | 'right';
  vertical: 'top' | 'bottom';
};

type ContextKey = 'button' | 'window';

type ContextState = {
  position: Position;
  size: { width: number; height: number };
  anchor: Anchor;
  anchorOffset: Position;
};

const EDGE_MARGIN = 24;
const DRAG_THRESHOLD = 6;
const MIN_WINDOW_WIDTH = 280;
const MIN_WINDOW_HEIGHT = 240;

export class WebInspectorElement extends LitElement {
  private pointerId: number | null = null;
  private dragStart: Position | null = null;
  private dragOffset: Position = { x: 0, y: 0 };
  private isDragging = false;
  private pointerContext: ContextKey | null = null;
  private isOpen = false;

  private readonly contextState: Record<ContextKey, ContextState> = {
    button: {
      position: { x: EDGE_MARGIN, y: EDGE_MARGIN },
      size: { width: 48, height: 48 },
      anchor: { horizontal: 'right', vertical: 'bottom' },
      anchorOffset: { x: EDGE_MARGIN, y: EDGE_MARGIN },
    },
    window: {
      position: { x: EDGE_MARGIN, y: EDGE_MARGIN },
      size: { width: 360, height: 420 },
      anchor: { horizontal: 'right', vertical: 'bottom' },
      anchorOffset: { x: EDGE_MARGIN, y: EDGE_MARGIN },
    },
  };

  private hasCustomPosition: Record<ContextKey, boolean> = {
    button: true,
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
    this.contextState.button.anchor = { horizontal: 'right', vertical: 'bottom' };
    this.contextState.button.anchorOffset = { x: EDGE_MARGIN, y: EDGE_MARGIN };
    this.applyAnchorPosition('button');

    this.measureContext('window');
    this.centerContext('window');

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
      this.applyAnchorPosition(this.pointerContext);
      if (this.pointerContext === 'window') {
        this.hasCustomPosition.window = true;
      }
      this.updateHostTransform(this.pointerContext);
    } else if (context === 'button' && !this.isOpen) {
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

    let nextWidth = this.resizeInitialSize.width + deltaX;
    let nextHeight = this.resizeInitialSize.height + deltaY;

    nextWidth = Math.max(MIN_WINDOW_WIDTH, nextWidth);
    nextHeight = Math.max(MIN_WINDOW_HEIGHT, nextHeight);

    if (typeof window !== 'undefined') {
      const maxWidth = Math.max(MIN_WINDOW_WIDTH, window.innerWidth - state.position.x - EDGE_MARGIN);
      const maxHeight = Math.max(MIN_WINDOW_HEIGHT, window.innerHeight - state.position.y - EDGE_MARGIN);
      nextWidth = Math.min(nextWidth, maxWidth);
      nextHeight = Math.min(nextHeight, maxHeight);
    }

    state.size = { width: nextWidth, height: nextHeight };
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
    this.updateHostTransform('window');
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
    this.updateHostTransform('window');
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

    const rect = element.getBoundingClientRect();
    this.contextState[context].size = {
      width: rect.width || this.contextState[context].size.width,
      height: rect.height || this.contextState[context].size.height,
    };
  }

  private centerContext(context: ContextKey): void {
    if (typeof window === 'undefined') {
      return;
    }

    const state = this.contextState[context];
    const centered: Position = {
      x: Math.round((window.innerWidth - state.size.width) / 2),
      y: Math.round((window.innerHeight - state.size.height) / 2),
    };

    state.position = this.constrainToViewport(centered, context);
    this.updateAnchorFromPosition(context);

    if (context === this.activeContext) {
      this.updateHostTransform(context);
    }
  }

  private ensureWindowPlacement(): void {
    if (!this.hasCustomPosition.window) {
      this.centerContext('window');
      return;
    }

    this.keepPositionWithinViewport('window');
    this.updateHostTransform('window');
  }

  private constrainToViewport(position: Position, context: ContextKey): Position {
    if (typeof window === 'undefined') {
      return position;
    }

    const { size } = this.contextState[context];
    const maxX = Math.max(EDGE_MARGIN, window.innerWidth - size.width - EDGE_MARGIN);
    const maxY = Math.max(EDGE_MARGIN, window.innerHeight - size.height - EDGE_MARGIN);

    return {
      x: Math.min(Math.max(EDGE_MARGIN, position.x), maxX),
      y: Math.min(Math.max(EDGE_MARGIN, position.y), maxY),
    };
  }

  private keepPositionWithinViewport(context: ContextKey): void {
    this.contextState[context].position = this.constrainToViewport(this.contextState[context].position, context);
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

    const { innerWidth, innerHeight } = window;
    const state = this.contextState[context];
    const centerX = state.position.x + state.size.width / 2;
    const centerY = state.position.y + state.size.height / 2;

    const horizontal: Anchor['horizontal'] = centerX < innerWidth / 2 ? 'left' : 'right';
    const vertical: Anchor['vertical'] = centerY < innerHeight / 2 ? 'top' : 'bottom';

    state.anchor = { horizontal, vertical };

    const maxHorizontalOffset = Math.max(EDGE_MARGIN, innerWidth - state.size.width - EDGE_MARGIN);
    const maxVerticalOffset = Math.max(EDGE_MARGIN, innerHeight - state.size.height - EDGE_MARGIN);

    state.anchorOffset = {
      x:
        horizontal === 'left'
          ? Math.min(Math.max(EDGE_MARGIN, state.position.x), maxHorizontalOffset)
          : Math.min(
              Math.max(EDGE_MARGIN, innerWidth - state.position.x - state.size.width),
              maxHorizontalOffset,
            ),
      y:
        vertical === 'top'
          ? Math.min(Math.max(EDGE_MARGIN, state.position.y), maxVerticalOffset)
          : Math.min(
              Math.max(EDGE_MARGIN, innerHeight - state.position.y - state.size.height),
              maxVerticalOffset,
            ),
    };
  }

  private applyAnchorPosition(context: ContextKey): void {
    if (typeof window === 'undefined') {
      return;
    }

    const { innerWidth, innerHeight } = window;
    const state = this.contextState[context];

    const maxHorizontalOffset = Math.max(EDGE_MARGIN, innerWidth - state.size.width - EDGE_MARGIN);
    const maxVerticalOffset = Math.max(EDGE_MARGIN, innerHeight - state.size.height - EDGE_MARGIN);

    const horizontalOffset = Math.min(Math.max(EDGE_MARGIN, state.anchorOffset.x), maxHorizontalOffset);
    const verticalOffset = Math.min(Math.max(EDGE_MARGIN, state.anchorOffset.y), maxVerticalOffset);

    const x =
      state.anchor.horizontal === 'left'
        ? horizontalOffset
        : innerWidth - state.size.width - horizontalOffset;

    const y =
      state.anchor.vertical === 'top'
        ? verticalOffset
        : innerHeight - state.size.height - verticalOffset;

    state.position = this.constrainToViewport({ x, y }, context);
    this.updateHostTransform(context);
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

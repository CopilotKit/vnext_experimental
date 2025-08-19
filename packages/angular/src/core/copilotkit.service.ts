import {
  Injectable,
  inject,
  signal,
  computed,
  effect,
  DestroyRef,
  untracked,
} from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import {
  COPILOTKIT_INITIAL_CONFIG,
  COPILOTKIT_INITIAL_RENDERERS,
  CopilotKitContextValue,
  ToolCallRender,
} from "./copilotkit.types";
import { CopilotKitCore, CopilotKitCoreConfig } from "@copilotkit/core";
import { AbstractAgent } from "@ag-ui/client";

/**
 * Angular service for managing CopilotKit state and interactions.
 * Provides reactive state management using Angular signals and observables.
 */
@Injectable({ providedIn: "root" })
export class CopilotKitService {
  private readonly initialRenderers = inject(COPILOTKIT_INITIAL_RENDERERS);
  private readonly initialConfig = inject(COPILOTKIT_INITIAL_CONFIG);
  private readonly destroyRef = inject(DestroyRef);

  // Core instance - created once
  readonly copilotkit = new CopilotKitCore({
    ...this.initialConfig,
    runtimeUrl: undefined, // Prevent server-side fetching
  } as CopilotKitCoreConfig);

  // State signals
  private readonly _renderToolCalls = signal<Record<string, ToolCallRender<unknown>>>(
    this.initialRenderers
  );
  private readonly _currentRenderToolCalls = signal<Record<string, ToolCallRender<unknown>>>(
    this.initialRenderers
  );
  private readonly _runtimeUrl = signal<string | undefined>(undefined);
  private readonly _headers = signal<Record<string, string>>({});
  private readonly _properties = signal<Record<string, unknown>>({});
  private readonly _agents = signal<Record<string, AbstractAgent>>({});

  // Public readonly signals
  readonly renderToolCalls = this._renderToolCalls.asReadonly();
  readonly currentRenderToolCalls = this._currentRenderToolCalls.asReadonly();
  readonly runtimeUrl = this._runtimeUrl.asReadonly();
  readonly headers = this._headers.asReadonly();
  readonly properties = this._properties.asReadonly();
  readonly agents = this._agents.asReadonly();

  // Observable APIs for RxJS users
  readonly renderToolCalls$ = toObservable(this.renderToolCalls);
  readonly currentRenderToolCalls$ = toObservable(this.currentRenderToolCalls);
  readonly runtimeUrl$ = toObservable(this.runtimeUrl);
  readonly headers$ = toObservable(this.headers);
  readonly properties$ = toObservable(this.properties);
  readonly agents$ = toObservable(this.agents);

  // Context value as computed signal
  readonly context = computed<CopilotKitContextValue>(() => ({
    copilotkit: this.copilotkit,
    renderToolCalls: this.renderToolCalls(),
    currentRenderToolCalls: this.currentRenderToolCalls(),
    setCurrentRenderToolCalls: (v) => this.setCurrentRenderToolCalls(v),
  }));

  readonly context$ = toObservable(this.context);

  constructor() {
    // Effects must be created in injection context (constructor)
    this.setupRuntimeSyncEffects();
    this.setupEventSubscription();
  }

  /**
   * Setup effects to sync runtime configuration with CopilotKitCore
   */
  private setupRuntimeSyncEffects(): void {
    // Sync runtime URL
    effect(() => {
      const url = this.runtimeUrl();
      untracked(() => this.copilotkit.setRuntimeUrl(url));
    });

    // Sync headers
    effect(() => {
      const headers = this.headers();
      untracked(() => this.copilotkit.setHeaders(headers));
    });

    // Sync properties
    effect(() => {
      const properties = this.properties();
      untracked(() => this.copilotkit.setProperties(properties));
    });

    // Sync agents
    effect(() => {
      const agents = this.agents();
      untracked(() => this.copilotkit.setAgents(agents));
    });
  }

  /**
   * Subscribe to CopilotKit runtime events
   */
  private setupEventSubscription(): void {
    const unsubscribe = this.copilotkit.subscribe({
      onRuntimeLoaded: () => {
        // Trigger signal update to notify consumers
        this._currentRenderToolCalls.update((x) => ({ ...x }));
      },
      onRuntimeLoadError: () => {
        this._currentRenderToolCalls.update((x) => ({ ...x }));
      },
    });

    this.destroyRef.onDestroy(() => unsubscribe());
  }

  // Public mutation methods

  /**
   * Update the runtime URL
   */
  setRuntimeUrl(url?: string): void {
    this._runtimeUrl.set(url);
  }

  /**
   * Update request headers
   */
  setHeaders(headers: Record<string, string>): void {
    this._headers.set(headers);
  }

  /**
   * Update runtime properties
   */
  setProperties(properties: Record<string, unknown>): void {
    this._properties.set(properties);
  }

  /**
   * Update agents configuration
   */
  setAgents(agents: Record<string, AbstractAgent>): void {
    this._agents.set(agents);
  }

  /**
   * Update render tool calls (warns if object reference changes)
   */
  setRenderToolCalls(renderToolCalls: Record<string, ToolCallRender<unknown>>): void {
    if (renderToolCalls !== this.initialRenderers) {
      console.error(
        "renderToolCalls must be a stable object. To add/remove tools dynamically, use dynamic tool registration."
      );
    }
    this._renderToolCalls.set(renderToolCalls);
  }

  /**
   * Update current render tool calls
   */
  setCurrentRenderToolCalls(renderToolCalls: Record<string, ToolCallRender<unknown>>): void {
    this._currentRenderToolCalls.set(renderToolCalls);
  }
}
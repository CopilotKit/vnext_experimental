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
  
  // Runtime state change notification signal
  private readonly _runtimeStateVersion = signal<number>(0);

  // Public readonly signals
  readonly renderToolCalls = this._renderToolCalls.asReadonly();
  readonly currentRenderToolCalls = this._currentRenderToolCalls.asReadonly();
  readonly runtimeUrl = this._runtimeUrl.asReadonly();
  readonly headers = this._headers.asReadonly();
  readonly properties = this._properties.asReadonly();
  readonly agents = this._agents.asReadonly();
  readonly runtimeStateVersion = this._runtimeStateVersion.asReadonly();

  // Observable APIs for RxJS users
  readonly renderToolCalls$ = toObservable(this.renderToolCalls);
  readonly currentRenderToolCalls$ = toObservable(this.currentRenderToolCalls);
  readonly runtimeUrl$ = toObservable(this.runtimeUrl);
  readonly headers$ = toObservable(this.headers);
  readonly properties$ = toObservable(this.properties);
  readonly agents$ = toObservable(this.agents);

  // Context value as computed signal
  readonly context = computed<CopilotKitContextValue>(() => {
    // Touch the runtime state version to ensure this computed updates
    // when runtime events occur (loaded/error)
    this.runtimeStateVersion();
    
    return {
      copilotkit: this.copilotkit,
      renderToolCalls: this.renderToolCalls(),
      currentRenderToolCalls: this.currentRenderToolCalls(),
      setCurrentRenderToolCalls: (v) => this.setCurrentRenderToolCalls(v),
    };
  });

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
        // Increment version to notify all consumers that runtime state has changed
        // This triggers re-evaluation of computed signals that depend on runtime state
        this.notifyRuntimeStateChange();
      },
      onRuntimeLoadError: () => {
        // Increment version to notify all consumers that runtime state has changed
        // This triggers re-evaluation of computed signals that depend on runtime state
        this.notifyRuntimeStateChange();
      },
    });

    this.destroyRef.onDestroy(() => unsubscribe());
  }

  /**
   * Notify consumers that the runtime state has changed.
   * This is similar to React's forceUpdate - it triggers change detection
   * for any computed signals or effects that depend on runtime state.
   */
  private notifyRuntimeStateChange(): void {
    this._runtimeStateVersion.update(version => version + 1);
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

  /**
   * Register a tool render
   */
  registerToolRender(name: string, render: ToolCallRender<unknown>): void {
    const current = this._currentRenderToolCalls();
    if (name in current) {
      console.warn(`Tool render for '${name}' is being overwritten`);
    }
    this._currentRenderToolCalls.set({
      ...current,
      [name]: render
    });
  }

  /**
   * Unregister a tool render
   */
  unregisterToolRender(name: string): void {
    const current = this._currentRenderToolCalls();
    if (!(name in current)) {
      return;
    }
    const { [name]: _, ...remaining } = current;
    this._currentRenderToolCalls.set(remaining);
  }

  /**
   * Get a specific tool render
   */
  getToolRender(name: string): ToolCallRender<unknown> | undefined {
    return this._currentRenderToolCalls()[name];
  }
}
import {
  Injectable,
  Inject,
  signal,
  computed,
  effect,
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
  private readonly initialRenderers: Record<string, ToolCallRender<unknown>>;
  private readonly initialConfig: Partial<CopilotKitCoreConfig>;

  // Core instance - created once
  readonly copilotkit: CopilotKitCore;

  // State signals
  private readonly _renderToolCalls: ReturnType<typeof signal<Record<string, ToolCallRender<unknown>>>>;
  private readonly _currentRenderToolCalls: ReturnType<typeof signal<Record<string, ToolCallRender<unknown>>>>;
  private readonly _runtimeUrl: ReturnType<typeof signal<string | undefined>>;
  private readonly _headers: ReturnType<typeof signal<Record<string, string>>>;
  private readonly _properties: ReturnType<typeof signal<Record<string, unknown>>>;
  private readonly _agents: ReturnType<typeof signal<Record<string, AbstractAgent>>>;
  
  // Runtime state change notification signal
  private readonly _runtimeStateVersion: ReturnType<typeof signal<number>>;

  // Public readonly signals - will be initialized in constructor
  readonly renderToolCalls: any;
  readonly currentRenderToolCalls: any;
  readonly runtimeUrl: any;
  readonly headers: any;
  readonly properties: any;
  readonly agents: any;
  readonly runtimeStateVersion: any;

  // Observable APIs for RxJS users - will be initialized in constructor
  readonly renderToolCalls$: any;
  readonly currentRenderToolCalls$: any;
  readonly runtimeUrl$: any;
  readonly headers$: any;
  readonly properties$: any;
  readonly agents$: any;

  // Context value as computed signal - will be initialized in constructor
  readonly context: any;
  readonly context$: any;

  constructor(
    @Inject(COPILOTKIT_INITIAL_RENDERERS) initialRenderers: Record<string, ToolCallRender<unknown>>,
    @Inject(COPILOTKIT_INITIAL_CONFIG) initialConfig: Partial<CopilotKitCoreConfig>
  ) {
    this.initialRenderers = initialRenderers;
    this.initialConfig = initialConfig;
    
    // Initialize core instance
    this.copilotkit = new CopilotKitCore({
      ...initialConfig,
      runtimeUrl: undefined, // Prevent server-side fetching
    } as CopilotKitCoreConfig);
    
    // Initialize state signals
    this._renderToolCalls = signal<Record<string, ToolCallRender<unknown>>>(initialRenderers);
    this._currentRenderToolCalls = signal<Record<string, ToolCallRender<unknown>>>(initialRenderers);
    this._runtimeUrl = signal<string | undefined>(undefined);
    this._headers = signal<Record<string, string>>({});
    this._properties = signal<Record<string, unknown>>({});
    this._agents = signal<Record<string, AbstractAgent>>({});
    this._runtimeStateVersion = signal<number>(0);
    
    // Initialize public readonly signals
    this.renderToolCalls = this._renderToolCalls.asReadonly();
    this.currentRenderToolCalls = this._currentRenderToolCalls.asReadonly();
    this.runtimeUrl = this._runtimeUrl.asReadonly();
    this.headers = this._headers.asReadonly();
    this.properties = this._properties.asReadonly();
    this.agents = this._agents.asReadonly();
    this.runtimeStateVersion = this._runtimeStateVersion.asReadonly();
    
    // Initialize Observable APIs
    this.renderToolCalls$ = toObservable(this.renderToolCalls);
    this.currentRenderToolCalls$ = toObservable(this.currentRenderToolCalls);
    this.runtimeUrl$ = toObservable(this.runtimeUrl);
    this.headers$ = toObservable(this.headers);
    this.properties$ = toObservable(this.properties);
    this.agents$ = toObservable(this.agents);
    
    // Initialize context value as computed signal
    this.context = computed<CopilotKitContextValue>(() => {
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
    
    this.context$ = toObservable(this.context);
    
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

    // Root service lives for app lifetime; unsubscribe not needed.
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
   * Get an agent by ID
   * @param agentId - The agent ID to retrieve
   * @returns The agent or undefined if not found
   */
  getAgent(agentId: string): AbstractAgent | undefined {
    return this.copilotkit.getAgent(agentId);
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

import {
  Injectable,
  Inject,
  signal,
  computed,
  effect,
  untracked,
  Signal,
  WritableSignal,
} from "@angular/core";
import type { Observable } from "rxjs";
import { toObservable } from "@angular/core/rxjs-interop";
import {
  COPILOTKIT_RUNTIME_URL,
  COPILOTKIT_HEADERS,
  COPILOTKIT_PROPERTIES,
  COPILOTKIT_AGENTS,
  COPILOTKIT_RENDER_TOOL_CALLS,
  COPILOTKIT_FRONTEND_TOOLS,
  COPILOTKIT_HUMAN_IN_THE_LOOP,
  CopilotKitContextValue,
  ToolCallRender,
  AngularFrontendTool,
  AngularHumanInTheLoop,
} from "./copilotkit.types";
import {
  CopilotKitCore,
  CopilotKitCoreConfig,
  FrontendTool,
} from "@copilotkitnext/core";
import { AbstractAgent } from "@ag-ui/client";

/**
 * Angular service for managing CopilotKit state and interactions.
 * Provides reactive state management using Angular signals and observables.
 */
@Injectable({ providedIn: "root" })
export class CopilotKit {
  // Initial values for stability tracking
  private readonly initialFrontendTools: AngularFrontendTool<any>[];
  private readonly initialHumanInTheLoop: AngularHumanInTheLoop<any>[];
  private readonly initialRenderToolCalls: ToolCallRender[];

  // Core instance - created once
  readonly copilotkit: CopilotKitCore;

  // State signals
  private readonly _renderToolCalls: WritableSignal<ToolCallRender[]>;
  private readonly _currentRenderToolCalls: WritableSignal<ToolCallRender[]>;
  private readonly _runtimeUrl: WritableSignal<string | undefined>;
  private readonly _headers: WritableSignal<Record<string, string>>;
  private readonly _properties: WritableSignal<Record<string, unknown>>;
  private readonly _agents: WritableSignal<Record<string, AbstractAgent>>;
  private readonly _frontendTools: WritableSignal<AngularFrontendTool<any>[]>;
  private readonly _humanInTheLoop: WritableSignal<
    AngularHumanInTheLoop<any>[]
  >;

  // Runtime state change notification signal
  private readonly _runtimeStateVersion: WritableSignal<number>;

  // Computed signals for processed values
  private readonly _allTools: Signal<Record<string, FrontendTool<any>>>;
  private readonly _allRenderToolCalls: Signal<ToolCallRender[]>;

  // Public readonly signals - will be initialized in constructor
  readonly renderToolCalls: Signal<ToolCallRender[]>;
  readonly currentRenderToolCalls: Signal<ToolCallRender[]>;
  readonly runtimeUrl: Signal<string | undefined>;
  readonly headers: Signal<Record<string, string>>;
  readonly properties: Signal<Record<string, unknown>>;
  readonly agents: Signal<Record<string, AbstractAgent>>;
  readonly frontendTools: Signal<AngularFrontendTool<any>[]>;
  readonly humanInTheLoop: Signal<AngularHumanInTheLoop<any>[]>;
  readonly runtimeStateVersion: Signal<number>;

  // Observable APIs for RxJS users - will be initialized in constructor
  readonly renderToolCalls$: Observable<ToolCallRender[]>;
  readonly currentRenderToolCalls$: Observable<ToolCallRender[]>;
  readonly runtimeUrl$: Observable<string | undefined>;
  readonly headers$: Observable<Record<string, string>>;
  readonly properties$: Observable<Record<string, unknown>>;
  readonly agents$: Observable<Record<string, AbstractAgent>>;
  readonly frontendTools$: Observable<AngularFrontendTool<any>[]>;
  readonly humanInTheLoop$: Observable<AngularHumanInTheLoop<any>[]>;

  // Context value as computed signal - will be initialized in constructor
  readonly context: Signal<CopilotKitContextValue>;
  readonly context$: Observable<CopilotKitContextValue>;

  constructor(
    @Inject(COPILOTKIT_RUNTIME_URL) runtimeUrl: string | undefined,
    @Inject(COPILOTKIT_HEADERS) headers: Record<string, string>,
    @Inject(COPILOTKIT_PROPERTIES) properties: Record<string, unknown>,
    @Inject(COPILOTKIT_AGENTS) agents: Record<string, AbstractAgent>,
    @Inject(COPILOTKIT_RENDER_TOOL_CALLS)
    renderToolCalls: ToolCallRender[],
    @Inject(COPILOTKIT_FRONTEND_TOOLS)
    frontendTools: AngularFrontendTool<any>[],
    @Inject(COPILOTKIT_HUMAN_IN_THE_LOOP)
    humanInTheLoop: AngularHumanInTheLoop<any>[]
  ) {
    // Store initial values for stability checking
    this.initialFrontendTools = frontendTools;
    this.initialHumanInTheLoop = humanInTheLoop;
    this.initialRenderToolCalls = renderToolCalls;

    // Process tools and humanInTheLoop
    const { allTools, allRenderToolCalls } = this.processTools(
      frontendTools,
      humanInTheLoop,
      renderToolCalls
    );

    // Initialize core instance with processed tools
    this.copilotkit = new CopilotKitCore({
      runtimeUrl: undefined, // Prevent server-side fetching
      headers,
      properties,
      agents,
      tools: allTools,
    } as CopilotKitCoreConfig);

    // Initialize state signals
    this._renderToolCalls = signal<ToolCallRender[]>(allRenderToolCalls);
    this._currentRenderToolCalls = signal<ToolCallRender[]>(allRenderToolCalls);
    this._runtimeUrl = signal<string | undefined>(runtimeUrl);
    this._headers = signal<Record<string, string>>(headers);
    this._properties = signal<Record<string, unknown>>(properties);
    this._agents = signal<Record<string, AbstractAgent>>(agents);
    this._frontendTools = signal<AngularFrontendTool<any>[]>(frontendTools);
    this._humanInTheLoop = signal<AngularHumanInTheLoop<any>[]>(humanInTheLoop);
    this._runtimeStateVersion = signal<number>(0);

    // Initialize computed signals for processed values
    this._allTools = computed(() => {
      const tools: Record<string, FrontendTool<any>> = {};

      // Add frontend tools
      this._frontendTools().forEach((tool) => {
        tools[tool.name] = tool as FrontendTool<any>;
      });

      // Process human-in-the-loop tools
      this._humanInTheLoop().forEach((tool) => {
        const frontendTool: FrontendTool<any> = {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          followUp: tool.followUp,
          handler: async () => {
            console.warn(
              `Human-in-the-loop tool '${tool.name}' called but no interactive handler is set up.`
            );
            return undefined;
          },
        };
        tools[tool.name] = frontendTool;
      });

      return tools;
    });

    this._allRenderToolCalls = computed(() => {
      const combined: ToolCallRender[] = [...this._renderToolCalls()];

      // Add render components from frontend tools
      this._frontendTools().forEach((tool) => {
        if (tool.render) {
          combined.push({
            name: tool.name,
            render: tool.render,
            ...(tool.agentId && { agentId: tool.agentId }),
          });
        }
      });

      // Add render components from human-in-the-loop tools
      this._humanInTheLoop().forEach((tool) => {
        if (tool.render) {
          combined.push({
            name: tool.name,
            render: tool.render,
            ...(tool.agentId && { agentId: tool.agentId }),
          });
        }
      });

      return combined;
    });

    // Initialize public readonly signals
    this.renderToolCalls = this._allRenderToolCalls;
    this.currentRenderToolCalls = this._currentRenderToolCalls.asReadonly();
    this.runtimeUrl = this._runtimeUrl.asReadonly();
    this.headers = this._headers.asReadonly();
    this.properties = this._properties.asReadonly();
    this.agents = this._agents.asReadonly();
    this.frontendTools = this._frontendTools.asReadonly();
    this.humanInTheLoop = this._humanInTheLoop.asReadonly();
    this.runtimeStateVersion = this._runtimeStateVersion.asReadonly();

    // Initialize Observable APIs
    this.renderToolCalls$ = toObservable(this.renderToolCalls);
    this.currentRenderToolCalls$ = toObservable(this.currentRenderToolCalls);
    this.runtimeUrl$ = toObservable(this.runtimeUrl);
    this.headers$ = toObservable(this.headers);
    this.properties$ = toObservable(this.properties);
    this.agents$ = toObservable(this.agents);
    this.frontendTools$ = toObservable(this.frontendTools);
    this.humanInTheLoop$ = toObservable(this.humanInTheLoop);

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
    this.setupStabilityWarnings();
    this.setupEventSubscription();
  }

  /**
   * Process frontend tools and human-in-the-loop tools
   */
  private processTools(
    frontendTools: AngularFrontendTool<any>[],
    humanInTheLoop: AngularHumanInTheLoop<any>[],
    renderToolCalls: ToolCallRender[]
  ): {
    allTools: Record<string, FrontendTool<any>>;
    allRenderToolCalls: ToolCallRender[];
  } {
    const allTools: Record<string, FrontendTool<any>> = {};
    const allRenderToolCalls: ToolCallRender[] = [...renderToolCalls];

    // Add frontend tools
    frontendTools.forEach((tool) => {
      allTools[tool.name] = tool as FrontendTool<any>;

      // Add render component if provided
      if (tool.render) {
        allRenderToolCalls.push({
          name: tool.name,
          render: tool.render,
          ...(tool.agentId && { agentId: tool.agentId }),
        });
      }
    });

    // Process human-in-the-loop tools
    humanInTheLoop.forEach((tool) => {
      // Create a frontend tool with placeholder handler
      const frontendTool: FrontendTool<any> = {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        followUp: tool.followUp,
        ...(tool.agentId && { agentId: tool.agentId }),
        handler: async () => {
          // Placeholder handler - actual implementation will be handled by the render component
          console.warn(
            `Human-in-the-loop tool '${tool.name}' called but no interactive handler is set up.`
          );
          return undefined;
        },
      };
      allTools[tool.name] = frontendTool;

      // Add the render component
      if (tool.render) {
        allRenderToolCalls.push({
          name: tool.name,
          render: tool.render,
          ...(tool.agentId && { agentId: tool.agentId }),
        });
      }
    });

    return { allTools, allRenderToolCalls };
  }

  /**
   * Setup stability warning effects
   */
  private setupStabilityWarnings(): void {
    // Warn if frontendTools changes
    effect(() => {
      const current = this._frontendTools();
      if (
        current !== this.initialFrontendTools &&
        this.initialFrontendTools.length > 0
      ) {
        untracked(() => {
          console.error(
            "frontendTools must be a stable array. To add/remove tools dynamically, use dynamic tool registration."
          );
        });
      }
    });

    // Warn if humanInTheLoop changes
    effect(() => {
      const current = this._humanInTheLoop();
      if (
        current !== this.initialHumanInTheLoop &&
        this.initialHumanInTheLoop.length > 0
      ) {
        untracked(() => {
          console.error(
            "humanInTheLoop must be a stable array. To add/remove human-in-the-loop tools dynamically, use dynamic tool registration."
          );
        });
      }
    });

    // Previously warned if renderToolCalls reference changed; removed per UX feedback
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

    // Sync tools - computed from frontend tools and human-in-the-loop
    effect(() => {
      const tools = this._allTools();
      // Update copilotkit.tools directly since there's no setTools method
      untracked(() => {
        this.copilotkit.tools = tools;
      });
    });
  }

  /**
   * Subscribe to CopilotKit runtime events
   */
  private setupEventSubscription(): void {
    this.copilotkit.subscribe({
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
    this._runtimeStateVersion.update((version) => version + 1);
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
  setRenderToolCalls(renderToolCalls: ToolCallRender[]): void {
    this._renderToolCalls.set(renderToolCalls);
  }

  /**
   * Update frontend tools array
   */
  setFrontendTools(frontendTools: AngularFrontendTool<any>[]): void {
    if (frontendTools !== this.initialFrontendTools) {
      console.error(
        "frontendTools must be a stable array. To add/remove tools dynamically, use dynamic tool registration."
      );
    }
    this._frontendTools.set(frontendTools);
  }

  /**
   * Update human-in-the-loop array
   */
  setHumanInTheLoop(humanInTheLoop: AngularHumanInTheLoop<any>[]): void {
    if (humanInTheLoop !== this.initialHumanInTheLoop) {
      console.error(
        "humanInTheLoop must be a stable array. To add/remove human-in-the-loop tools dynamically, use dynamic tool registration."
      );
    }
    this._humanInTheLoop.set(humanInTheLoop);
  }

  /**
   * Update current render tool calls
   */
  setCurrentRenderToolCalls(renderToolCalls: ToolCallRender[]): void {
    this._currentRenderToolCalls.set(renderToolCalls);
  }

  /**
   * Register a tool render
   */
  registerToolRender(name: string, render: ToolCallRender): void {
    const current = this._currentRenderToolCalls();
    if (current.find((r) => r.name === name)) {
      console.warn(`Tool render for '${name}' is being overwritten`);
    }
    this._currentRenderToolCalls.set([
      ...current.filter((r) => r.name !== name),
      render,
    ]);
  }

  /**
   * Unregister a tool render
   */
  unregisterToolRender(name: string): void {
    const current = this._currentRenderToolCalls();
    const filtered = current.filter((r) => r.name !== name);
    if (filtered.length !== current.length) {
      this._currentRenderToolCalls.set(filtered);
    }
  }

  /**
   * Get a specific tool render
   */
  getToolRender(name: string): ToolCallRender | undefined {
    return this._currentRenderToolCalls().find((r) => r.name === name);
  }
}

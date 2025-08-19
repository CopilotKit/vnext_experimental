// copilotkit.store.ts
import {
  Injectable,
  inject,
  signal,
  computed,
  effect,
  DestroyRef,
  untracked,
} from "@angular/core";
import {
  COPILOTKIT_INITIAL_CONFIG,
  COPILOTKIT_INITIAL_RENDERERS,
  CopilotKitContextValue,
} from "./copilotkit.types";
import { CopilotKitCore, CopilotKitCoreConfig } from "@copilotkit/core";

@Injectable({ providedIn: "root" })
export class CopilotKitStore {
  // initial, stable renderers
  private readonly initialRenderers = inject(COPILOTKIT_INITIAL_RENDERERS);
  private readonly initialConfig = inject(COPILOTKIT_INITIAL_CONFIG);

  // Core instance: created once, like your useMemo([])
  readonly copilotkit = new CopilotKitCore({
    ...this.initialConfig,
    // Important: like your React code, avoid setting runtimeUrl at construction if needed
    runtimeUrl: undefined,
  } as CopilotKitCoreConfig);

  // renderToolCalls: stable input; warn if replaced (like your JSON.stringify check)
  private readonly _renderToolCalls = signal<Record<string, any>>(
    this.initialRenderers
  );
  readonly renderToolCalls = computed(() => this._renderToolCalls()); // readonly

  private readonly _currentRenderToolCalls = signal<Record<string, any>>(
    this.initialRenderers
  );
  readonly currentRenderToolCalls = computed(() =>
    this._currentRenderToolCalls()
  );

  // Expose full context value, React-style
  readonly context: CopilotKitContextValue = {
    copilotkit: this.copilotkit,
    renderToolCalls: this.renderToolCalls(),
    currentRenderToolCalls: this.currentRenderToolCalls(),
    setCurrentRenderToolCalls: (v) => this._currentRenderToolCalls.set(v),
  };

  private destroyRef = inject(DestroyRef);

  constructor() {
    // Subscribe to runtime events → trigger consumers to re-read signals
    // In React you did a forceUpdate(); in Angular, we can derive reactivity from signals.
    const unsubscribe = this.copilotkit.subscribe({
      onRuntimeLoaded: () => {
        // touching a signal to notify dependents is enough (no payload necessary)
        this._currentRenderToolCalls.update((x) => ({ ...x }));
      },
      onRuntimeLoadError: () => {
        this._currentRenderToolCalls.update((x) => ({ ...x }));
      },
    });

    this.destroyRef.onDestroy(() => unsubscribe());
  }

  /** Idempotent setter that warns if devs pass a new object (non-stable) */
  setRenderToolCalls(obj: Record<string, any>) {
    if (obj !== this.initialRenderers) {
      console.error(
        "renderToolCalls must be a stable object. To add/remove tools dynamically, prefer a dedicated API."
      );
    }
    this._renderToolCalls.set(obj);
  }

  // Runtime “inputs” setters — mirrors your effect that pushes props into copilotkit
  setRuntimeUrl(url?: string) {
    this.copilotkit.setRuntimeUrl(url);
  }
  setHeaders(h: Record<string, string> = {}) {
    this.copilotkit.setHeaders(h);
  }
  setProperties(p: Record<string, unknown> = {}) {
    this.copilotkit.setProperties(p);
  }
  setAgents(a: Record<string, unknown> = {}) {
    this.copilotkit.setAgents(a as any);
  }
}

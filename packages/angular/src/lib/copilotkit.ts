import { AbstractAgent } from "@ag-ui/client";
import { FrontendTool, CopilotKitCore } from "@copilotkitnext/core";
import {
  Injectable,
  Injector,
  Signal,
  WritableSignal,
  runInInjectionContext,
  signal,
} from "@angular/core";
import { ClientTool, ToolCallRendererConfig } from "./client-tool";
import { injectCopilotKitConfig } from "./config";

@Injectable({ providedIn: "root" })
export class CopilotKit {
  readonly #config = injectCopilotKitConfig();
  readonly #didLoadRuntime = signal(false);
  readonly #agents = signal<Record<string, AbstractAgent>>(
    this.#config.agents ?? {}
  );
  readonly didLoadRuntime = this.#didLoadRuntime.asReadonly();
  readonly agents = this.#agents.asReadonly();

  readonly core = new CopilotKitCore({
    runtimeUrl: this.#config.runtimeUrl,
    headers: this.#config.headers,
    properties: this.#config.properties,
    agents: this.#config.agents,
    tools: Object.fromEntries(
      (this.#config.tools ?? []).map<readonly [string, FrontendTool<any>]>(
        (tool) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { renderer, ...frontendCandidate } = tool;
          return [tool.name, frontendCandidate];
        }
      )
    ),
  });

  readonly #renderToolCalls: WritableSignal<ToolCallRendererConfig[]> = signal(
    []
  );
  readonly renderToolCalls: Signal<ToolCallRendererConfig[]> =
    this.#renderToolCalls.asReadonly();

  constructor() {
    this.#config.renderToolCalls?.forEach((renderConfig) => {
      this.addRenderToolCall(renderConfig);
    });

    this.#config.tools?.forEach((tool) => {
      if (tool.renderer && tool.parameters) {
        this.addRenderToolCall({
          name: tool.name,
          args: tool.parameters,
          component: tool.renderer,
          agentId: tool.agentId,
        });
      }
    });

    this.core.subscribe({
      onRuntimeLoaded: () => {
        this.#didLoadRuntime.set(true);
        this.#agents.set(this.core.agents);
      },
      onRuntimeLoadError: () => {
        this.#didLoadRuntime.set(false);
        this.#agents.set({});
      },
    });
  }

  addTool<Args extends Record<string, unknown>>(
    clientToolWithInjector: ClientTool<Args> & {
      injector: Injector;
    }
  ): void {
    const { injector, renderer, handler, ...frontendCandidate } =
      clientToolWithInjector;

    const tool: FrontendTool<Args> = {
      ...frontendCandidate,
      handler:
        handler !== undefined
          ? async (args) =>
              await runInInjectionContext(injector, () => handler(args))
          : undefined,
    };

    this.core.addTool(tool);

    if (renderer && clientToolWithInjector.parameters) {
      this.addRenderToolCall({
        name: clientToolWithInjector.name,
        args: clientToolWithInjector.parameters,
        component: renderer,
        agentId: clientToolWithInjector.agentId,
      });
    }
  }

  addRenderToolCall(renderConfig: ToolCallRendererConfig): void {
    this.#renderToolCalls.update((current) => [
      ...current.filter(
        (existing) =>
          existing.name !== renderConfig.name ||
          existing.agentId !== renderConfig.agentId
      ),
      renderConfig,
    ]);
  }

  removeRenderToolCall(name: string, agentId?: string): void {
    this.#renderToolCalls.update((current) =>
      current.filter(
        (renderConfig) =>
          renderConfig.name !== name || renderConfig.agentId !== agentId
      )
    );
  }

  removeTool(toolName: string, agentId?: string): void {
    this.core.removeTool(toolName);
    this.removeRenderToolCall(toolName, agentId);
  }

  getAgent(agentId: string): AbstractAgent | undefined {
    return this.core.getAgent(agentId);
  }

  updateRuntime(options: {
    runtimeUrl?: string;
    headers?: Record<string, string>;
    properties?: Record<string, unknown>;
    agents?: Record<string, AbstractAgent>;
  }): void {
    if (options.runtimeUrl !== undefined) {
      this.core.setRuntimeUrl(options.runtimeUrl);
    }
    if (options.headers !== undefined) {
      this.core.setHeaders(options.headers);
    }
    if (options.properties !== undefined) {
      this.core.setProperties(options.properties);
    }
    if (options.agents !== undefined) {
      this.core.setAgents(options.agents);
    }
  }
}

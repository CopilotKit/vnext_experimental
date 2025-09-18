import {
  DestroyRef,
  inject,
  signal,
  computed,
  Injector,
  runInInjectionContext,
} from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { CopilotKitService } from "../core/copilotkit.service";
import {
  AgentSubscriptionCallbacks,
  AgentWatchResult,
} from "../core/copilotkit.types";
import { AbstractAgent } from "@ag-ui/client";
import { DEFAULT_AGENT_ID } from "@copilotkitnext/shared";
import { CopilotKitCoreRuntimeConnectionStatus } from "@copilotkitnext/core";

/**
 * Watches an agent and provides reactive signals for its state.
 * Must be called within an injection context.
 * Automatically cleans up when the component/service is destroyed.
 *
 * @param config - Optional configuration with agentId
 * @returns Object with agent, messages, and isRunning signals plus observables
 *
 * @example
 * ```typescript
 * export class MyComponent {
 *   // Automatically tracks agent state
 *   agentState = watchAgent({ agentId: 'my-agent' });
 *
 *   constructor() {
 *     effect(() => {
 *       const messages = this.agentState.messages();
 *       const isRunning = this.agentState.isRunning();
 *       console.log('Messages:', messages.length, 'Running:', isRunning);
 *     });
 *   }
 * }
 * ```
 */
export function watchAgent(config?: { agentId?: string }): AgentWatchResult {
  // Use inject() internally to get required services
  const service = inject(CopilotKitService);
  const destroyRef = inject(DestroyRef);
  const effectiveAgentId = config?.agentId ?? DEFAULT_AGENT_ID;

  // Create reactive signals with tick mechanism for reliable updates
  const agentSignal = signal<AbstractAgent | undefined>(undefined);
  const tick = signal<number>(0);
  const isRunningSignal = signal<boolean>(false);

  // Create computed messages signal that reacts to tick changes
  const messages = computed(() => {
    // Access tick to ensure recomputation
    tick();
    const a = agentSignal();
    if (!a) return [];
    // Return a shallow clone to ensure change detection
    return a.messages.map((m) => ({ ...m }));
  });

  // Get initial agent
  const updateAgent = () => {
    const agent = service.copilotkit.getAgent(effectiveAgentId);
    agentSignal.set(agent);
    return agent;
  };

  // Initial update
  let currentAgent = updateAgent();

  // Subscribe to agent changes
  let agentSubscription: { unsubscribe: () => void } | undefined;

  const subscribeToAgent = () => {
    // Unsubscribe from previous agent if any
    agentSubscription?.unsubscribe();

    if (currentAgent) {
      agentSubscription = currentAgent.subscribe({
        onMessagesChanged() {
          // Increment tick to force recomputation of messages computed
          tick.update((v) => v + 1);
        },
        onStateChanged() {
          // Increment tick to force recomputation
          tick.update((v) => v + 1);
        },
        onRunInitialized() {
          isRunningSignal.set(true);
        },
        onRunFinalized() {
          isRunningSignal.set(false);
        },
        onRunFailed() {
          isRunningSignal.set(false);
        },
      });
    }
  };

  // Initial subscription
  subscribeToAgent();

  // Subscribe to CopilotKit changes to detect agent updates
  const coreUnsubscribe = service.copilotkit.subscribe({
    onRuntimeConnectionStatusChanged({ status }) {
      if (
        status === CopilotKitCoreRuntimeConnectionStatus.Connected ||
        status === CopilotKitCoreRuntimeConnectionStatus.Disconnected ||
        status === CopilotKitCoreRuntimeConnectionStatus.Error
      ) {
        // Re-check agent when runtime connection state changes
        currentAgent = updateAgent();
        subscribeToAgent();
      }
    },
  });

  // Register cleanup
  const unsubscribe = () => {
    agentSubscription?.unsubscribe();
    coreUnsubscribe(); // subscribe returns a function directly
  };

  destroyRef.onDestroy(unsubscribe);

  // Create observables from signals using toObservable
  const agent$ = toObservable(agentSignal);
  const isRunning$ = toObservable(isRunningSignal);
  const messages$ = toObservable(messages);

  return {
    agent: agentSignal.asReadonly(),
    messages: messages,
    isRunning: isRunningSignal.asReadonly(),
    agent$,
    messages$,
    isRunning$,
    unsubscribe,
  };
}

/**
 * Gets an agent by ID without subscribing to changes.
 *
 * @param service - The CopilotKitService instance
 * @param agentId - Optional agent ID (defaults to DEFAULT_AGENT_ID)
 * @returns The agent or undefined if not found
 *
 * @example
 * ```typescript
 * export class MyComponent {
 *   constructor(private copilotkit: CopilotKitService) {}
 *
 *   getCurrentAgent() {
 *     return getAgent(this.copilotkit, 'my-agent');
 *   }
 * }
 * ```
 */
export function getAgent(
  service: CopilotKitService,
  agentId?: string
): AbstractAgent | undefined {
  const effectiveAgentId = agentId ?? DEFAULT_AGENT_ID;
  return service.copilotkit.getAgent(effectiveAgentId);
}

// Re-export the type for convenience (the actual type is in copilotkit.types)
export type { AgentWatchResult } from "../core/copilotkit.types";

/**
 * Convenience wrapper for watchAgent that handles injection context.
 * Useful when you need to call watchAgent outside of a constructor or field initializer.
 *
 * @param injector - The Angular Injector to use for injection context
 * @param config - Optional configuration with agentId
 * @returns Object with agent, messages, and isRunning signals plus observables
 *
 * @example
 * ```typescript
 * export class MyComponent {
 *   constructor(private injector: Injector) {}
 *
 *   switchAgent(newAgentId: string) {
 *     // Can call outside of constructor using watchAgentWith
 *     const watcher = watchAgentWith(this.injector, { agentId: newAgentId });
 *     this.agent = watcher.agent;
 *     this.messages = watcher.messages;
 *     this.isRunning = watcher.isRunning;
 *   }
 * }
 * ```
 */
export function watchAgentWith(
  injector: Injector,
  config?: { agentId?: string }
): AgentWatchResult {
  return runInInjectionContext(injector, () => watchAgent(config));
}

/**
 * Subscribes to an agent's events with custom callbacks.
 * Returns a cleanup function that should be called to unsubscribe.
 *
 * @param service - The CopilotKitService instance
 * @param agentId - Optional agent ID (defaults to DEFAULT_AGENT_ID)
 * @param callbacks - Event callbacks
 * @returns Cleanup function to unsubscribe
 *
 * @example
 * ```typescript
 * export class MyComponent implements OnInit, OnDestroy {
 *   private unsubscribe?: () => void;
 *
 *   constructor(private copilotkit: CopilotKitService) {}
 *
 *   ngOnInit() {
 *     this.unsubscribe = subscribeToAgent(this.copilotkit, 'my-agent', {
 *       onRunInitialized: () => console.log('Run started'),
 *       onRunFinalized: () => console.log('Run completed'),
 *       onRunFailed: (error) => console.error('Run failed', error),
 *     });
 *   }
 *
 *   ngOnDestroy() {
 *     this.unsubscribe?.();
 *   }
 * }
 * ```
 */
export function subscribeToAgent(
  service: CopilotKitService,
  agentId?: string,
  callbacks?: AgentSubscriptionCallbacks
): () => void {
  const effectiveAgentId = agentId ?? DEFAULT_AGENT_ID;
  const agent = service.copilotkit.getAgent(effectiveAgentId);

  if (!agent) {
    // Return no-op cleanup if agent doesn't exist
    return () => {};
  }

  const subscription = agent.subscribe({
    onMessagesChanged: callbacks?.onMessagesChanged,
    onStateChanged: callbacks?.onStateChanged,
    onRunInitialized: callbacks?.onRunInitialized,
    onRunFinalized: callbacks?.onRunFinalized,
    onRunFailed: callbacks?.onRunFailed,
  });

  return () => subscription.unsubscribe();
}

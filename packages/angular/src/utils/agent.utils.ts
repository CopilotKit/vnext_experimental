import { DestroyRef, inject, signal, Injector } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CopilotKitService } from '../core/copilotkit.service';
import { AgentSubscriptionCallbacks, AgentWatchResult } from '../core/copilotkit.types';
import { AbstractAgent } from '@ag-ui/client';
import { DEFAULT_AGENT_ID } from '@copilotkit/shared';

// Re-export for convenience
export type { AgentWatchResult } from '../core/copilotkit.types';

/**
 * Watches an agent and provides reactive signals for its state.
 * Must be called within an injection context.
 * Automatically cleans up when the component/service is destroyed.
 * 
 * @param agentId - Optional agent ID (defaults to DEFAULT_AGENT_ID)
 * @returns Object with agent and isRunning signals
 * 
 * @example
 * ```typescript
 * export class MyComponent {
 *   // Automatically tracks agent state
 *   agentState = watchAgent('my-agent');
 *   
 *   constructor() {
 *     effect(() => {
 *       const agent = this.agentState.agent();
 *       const isRunning = this.agentState.isRunning();
 *       console.log('Agent running:', isRunning);
 *     });
 *   }
 * }
 * ```
 */
export function watchAgent(
  agentId?: string,
  service?: CopilotKitService,
  destroyRef?: DestroyRef,
  injector?: Injector
): AgentWatchResult {
  // Require explicit services to avoid accidental injection in reactive contexts
  if (!service || !destroyRef) {
    throw new Error(
      'watchAgent() requires CopilotKitService and DestroyRef parameters. ' +
      'Call it from a constructor/field initializer and pass both explicitly.'
    );
  }
  
  const effectiveAgentId = agentId ?? DEFAULT_AGENT_ID;
  
  // Create reactive signals - use a version counter to force updates
  const agentSignal = signal<AbstractAgent | undefined>(undefined);
  const agentVersionSignal = signal<number>(0);
  const isRunningSignal = signal<boolean>(false);
  const agentSubject = new BehaviorSubject<AbstractAgent | undefined>(undefined);
  const isRunningSubject = new BehaviorSubject<boolean>(false);
  
  // Get initial agent
  const updateAgent = () => {
    const agent = service.copilotkit.getAgent(effectiveAgentId);
    agentSignal.set(agent);
    agentSubject.next(agent);
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
          // Increment version to force signal update
          agentVersionSignal.update(v => v + 1);
          agentSignal.set(currentAgent);
          agentSubject.next(currentAgent);
        },
        onStateChanged() {
          // Increment version to force signal update
          agentVersionSignal.update(v => v + 1);
          agentSignal.set(currentAgent);
          agentSubject.next(currentAgent);
        },
        onRunInitialized() {
          isRunningSignal.set(true);
          isRunningSubject.next(true);
        },
        onRunFinalized() {
          isRunningSignal.set(false);
          isRunningSubject.next(false);
        },
        onRunFailed() {
          isRunningSignal.set(false);
          isRunningSubject.next(false);
        },
      });
    }
  };
  
  // Initial subscription
  subscribeToAgent();
  
  // Subscribe to CopilotKit changes to detect agent updates
  const coreUnsubscribe = service.copilotkit.subscribe({
    onRuntimeLoaded() {
      // Re-check agent when runtime loads
      currentAgent = updateAgent();
      subscribeToAgent();
    },
  });
  
  // Register cleanup
  const unsubscribe = () => {
    agentSubscription?.unsubscribe();
    coreUnsubscribe();  // subscribe returns a function directly
    agentSubject.complete();
    isRunningSubject.complete();
  };
  
  destroyRef.onDestroy(unsubscribe);
  
  // Expose Observables without creating nested effects
  const agent$ = agentSubject.asObservable();
  const isRunning$ = isRunningSubject.asObservable();
  
  return {
    agent: agentSignal.asReadonly(),
    isRunning: isRunningSignal.asReadonly(),
    agent$,
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

/**
 * Registers an agent watcher that automatically cleans up on component destroy.
 * This is an alias for watchAgent with a more explicit name.
 * Must be called within an injection context.
 * 
 * @param agentId - Optional agent ID (defaults to DEFAULT_AGENT_ID)
 * @returns Object with agent and isRunning signals
 * 
 * @example
 * ```typescript
 * export class MyComponent {
 *   agentState = registerAgentWatcher('my-agent');
 * }
 * ```
 */
export function registerAgentWatcher(agentId?: string): AgentWatchResult {
  return watchAgent(agentId);
}

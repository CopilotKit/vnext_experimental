import { DestroyRef, inject } from '@angular/core';
import { CopilotKitService } from '../core/copilotkit.service';
import { Context } from '@ag-ui/client';

/**
 * Programmatically adds an agent context to CopilotKit and returns a cleanup function.
 * 
 * @param context - The context to add
 * @returns A cleanup function that removes the context
 * 
 * @example
 * ```typescript
 * export class MyComponent implements OnInit {
 *   private copilotkit = injectCopilotKit();
 *   
 *   ngOnInit() {
 *     const cleanup = addAgentContext(this.copilotkit, {
 *       description: 'User preferences',
 *       value: this.userSettings
 *     });
 *     
 *     // Store cleanup for later or register with DestroyRef
 *     this.cleanupFns.push(cleanup);
 *   }
 * }
 * ```
 */
export function addAgentContext(
  copilotkit: CopilotKitService,
  context: Context
): () => void {
  const contextId = copilotkit.copilotkit.addContext(context);
  
  return () => {
    copilotkit.copilotkit.removeContext(contextId);
  };
}

/**
 * Registers an agent context with CopilotKit and automatically removes it when the component/service is destroyed.
 * Must be called within an injection context.
 * 
 * @param context - The context to add
 * @returns The context ID
 * 
 * @example
 * ```typescript
 * export class MyComponent implements OnInit {
 *   ngOnInit() {
 *     // Automatically cleaned up on component destroy
 *     registerAgentContext({
 *       description: 'Component state',
 *       value: this.state
 *     });
 *   }
 * }
 * ```
 */
export function registerAgentContext(context: Context): string {
  const copilotkit = inject(CopilotKitService);
  const destroyRef = inject(DestroyRef);
  
  const contextId = copilotkit.copilotkit.addContext(context);
  
  // Register cleanup with Angular's DestroyRef
  destroyRef.onDestroy(() => {
    copilotkit.copilotkit.removeContext(contextId);
  });
  
  return contextId;
}

/**
 * Creates a reactive context that updates whenever the value changes.
 * Uses Angular signals for reactivity.
 * 
 * @param description - Static or signal-based description
 * @param value - Signal that provides the context value
 * @returns Object with update and destroy methods
 * 
 * @example
 * ```typescript
 * export class MyComponent {
 *   private userSettings = signal({ theme: 'dark' });
 *   
 *   ngOnInit() {
 *     const context = createReactiveContext(
 *       'User settings',
 *       computed(() => this.userSettings())
 *     );
 *     
 *     // Updates automatically when userSettings signal changes
 *   }
 * }
 * ```
 */
export function createReactiveContext(
  description: string | (() => string),
  value: () => any
): { update: () => void; destroy: () => void } {
  const copilotkit = inject(CopilotKitService);
  let currentContextId: string | undefined;
  
  const update = () => {
    // Remove old context if it exists
    if (currentContextId) {
      copilotkit.copilotkit.removeContext(currentContextId);
    }
    
    // Add new context
    const desc = typeof description === 'function' ? description() : description;
    currentContextId = copilotkit.copilotkit.addContext({
      description: desc,
      value: value()
    });
  };
  
  const destroy = () => {
    if (currentContextId) {
      copilotkit.copilotkit.removeContext(currentContextId);
      currentContextId = undefined;
    }
  };
  
  // Initial setup
  update();
  
  // Register cleanup
  const destroyRef = inject(DestroyRef);
  destroyRef.onDestroy(destroy);
  
  return { update, destroy };
}
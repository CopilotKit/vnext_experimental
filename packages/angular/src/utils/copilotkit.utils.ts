import { inject } from "@angular/core";
import { CopilotKitService } from "../core/copilotkit.service";

/**
 * Utility function to inject the CopilotKit service in a component or directive.
 * 
 * @example
 * ```typescript
 * export class MyComponent {
 *   private copilotKit = useCopilotKit();
 *   
 *   sendMessage() {
 *     this.copilotKit.copilotkit.sendMessage(...);
 *   }
 * }
 * ```
 */
export function useCopilotKit() {
  return inject(CopilotKitService);
}

/**
 * @deprecated Use `useCopilotKit()` instead
 */
export function injectCopilotKit() {
  console.warn('injectCopilotKit() is deprecated. Use useCopilotKit() instead.');
  return useCopilotKit();
}
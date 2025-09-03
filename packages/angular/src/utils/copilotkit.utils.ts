import { inject } from "@angular/core";
import { CopilotKitService } from "../core/copilotkit.service";

/**
 * Utility function to inject the CopilotKit service in a component or directive.
 * 
 * @example
 * ```typescript
 * export class MyComponent {
 *   private copilotkit = injectCopilotKit();
 *   
 *   sendMessage() {
 *     this.copilotkit.copilotkit.sendMessage(...);
 *   }
 * }
 * ```
 */
export function injectCopilotKit() {
  return inject(CopilotKitService);
}
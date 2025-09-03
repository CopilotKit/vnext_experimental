import { Provider } from '@angular/core';
import { CopilotChatConfigurationService } from './chat-configuration.service';
import { 
  CopilotChatConfiguration,
  COPILOT_CHAT_INITIAL_CONFIG 
} from './chat-configuration.types';

/**
 * Provides CopilotKit chat configuration at a specific component level.
 * This allows for scoped configuration where different parts of the app
 * can have different chat configurations.
 * 
 * @param config - Optional initial configuration
 * @returns Array of providers
 * 
 * @example
 * ```typescript
 * // Global configuration in app.config.ts
 * export const appConfig: ApplicationConfig = {
 *   providers: [
 *     provideCopilotChatConfiguration({
 *       labels: {
 *         chatInputPlaceholder: "How can I help you today?"
 *       }
 *     })
 *   ]
 * };
 * 
 * // Component-scoped configuration
 * @Component({
 *   selector: 'customer-support-chat',
 *   providers: [
 *     provideCopilotChatConfiguration({
 *       labels: {
 *         chatInputPlaceholder: "Describe your issue..."
 *       },
 *       onSubmitInput: (value) => console.log('Support message:', value)
 *     })
 *   ],
 *   template: `...`
 * })
 * export class CustomerSupportChatComponent {}
 * 
 * // Multiple independent chats
 * @Component({
 *   selector: 'sales-chat',
 *   providers: [
 *     provideCopilotChatConfiguration({
 *       labels: {
 *         chatInputPlaceholder: "Ask about our products..."
 *       }
 *     })
 *   ],
 *   template: `...`
 * })
 * export class SalesChatComponent {}
 * ```
 */
export function provideCopilotChatConfiguration(
  config?: CopilotChatConfiguration
): Provider[] {
  return [
    // Provide the service
    CopilotChatConfigurationService,
    // Provide the initial configuration
    {
      provide: COPILOT_CHAT_INITIAL_CONFIG,
      useValue: config || {}
    }
  ];
}
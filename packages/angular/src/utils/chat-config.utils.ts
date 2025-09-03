import { inject, Signal } from '@angular/core';
import { CopilotChatConfigurationService } from '../core/chat-configuration/chat-configuration.service';
import { 
  CopilotChatConfiguration,
  CopilotChatLabels
} from '../core/chat-configuration/chat-configuration.types';

/**
 * Watches chat configuration and provides reactive access to all configuration values.
 * Must be called within an injection context.
 * 
 * @returns Object with reactive signals and handler functions
 * 
 * @example
 * ```typescript
 * export class ChatInputComponent {
 *   config = watchChatConfig();
 *   
 *   constructor() {
 *     effect(() => {
 *       const placeholder = this.config.labels().chatInputPlaceholder;
 *       console.log('Placeholder:', placeholder);
 *     });
 *   }
 *   
 *   handleSubmit(value: string) {
 *     this.config.submitInput(value);
 *   }
 * }
 * ```
 */
export function watchChatConfig(): {
  labels: Signal<CopilotChatLabels>;
  inputValue: Signal<string | undefined>;
  submitInput: (value: string) => void;
  changeInput: (value: string) => void;
} {
  const service = inject(CopilotChatConfigurationService);
  
  return {
    labels: service.labels,
    inputValue: service.inputValue,
    submitInput: (value: string) => service.submitInput(value),
    changeInput: (value: string) => service.changeInput(value)
  };
}

/**
 * Registers chat configuration within an injection context.
 * Automatically updates the configuration when called.
 * 
 * @param config - The configuration to register
 * 
 * @example
 * ```typescript
 * export class ChatComponent {
 *   constructor() {
 *     registerChatConfig({
 *       labels: {
 *         chatInputPlaceholder: "How can I help?"
 *       },
 *       onSubmitInput: (value) => this.handleSubmit(value)
 *     });
 *   }
 * }
 * ```
 */
export function registerChatConfig(config: CopilotChatConfiguration): void {
  const service = inject(CopilotChatConfigurationService);
  service.updateConfiguration(config);
}

/**
 * Gets the current chat labels signal.
 * 
 * @param service - The CopilotChatConfigurationService instance
 * @returns Signal containing the current labels
 * 
 * @example
 * ```typescript
 * export class ChatComponent {
 *   constructor(private chatConfig: CopilotChatConfigurationService) {
 *     const labels = getChatLabels(this.chatConfig);
 *     effect(() => {
 *       console.log('Current labels:', labels());
 *     });
 *   }
 * }
 * ```
 */
export function getChatLabels(
  service: CopilotChatConfigurationService
): Signal<CopilotChatLabels> {
  return service.labels;
}

/**
 * Updates chat labels.
 * 
 * @param service - The CopilotChatConfigurationService instance
 * @param labels - Partial labels to merge with defaults
 * 
 * @example
 * ```typescript
 * export class ChatComponent {
 *   updatePlaceholder(text: string) {
 *     setChatLabels(this.chatConfig, {
 *       chatInputPlaceholder: text
 *     });
 *   }
 * }
 * ```
 */
export function setChatLabels(
  service: CopilotChatConfigurationService,
  labels: Partial<CopilotChatLabels>
): void {
  service.setLabels(labels);
}

/**
 * Gets the current input value signal.
 * 
 * @param service - The CopilotChatConfigurationService instance
 * @returns Signal containing the current input value
 * 
 * @example
 * ```typescript
 * export class ChatInputComponent {
 *   inputValue = getChatInputValue(this.chatConfig);
 *   
 *   constructor(private chatConfig: CopilotChatConfigurationService) {
 *     effect(() => {
 *       const value = this.inputValue();
 *       if (value) {
 *         this.updateTextarea(value);
 *       }
 *     });
 *   }
 * }
 * ```
 */
export function getChatInputValue(
  service: CopilotChatConfigurationService
): Signal<string | undefined> {
  return service.inputValue;
}

/**
 * Sets the current input value.
 * 
 * @param service - The CopilotChatConfigurationService instance
 * @param value - The new input value
 * 
 * @example
 * ```typescript
 * export class ChatInputComponent {
 *   onInputChange(event: Event) {
 *     const value = (event.target as HTMLInputElement).value;
 *     setChatInputValue(this.chatConfig, value);
 *   }
 * }
 * ```
 */
export function setChatInputValue(
  service: CopilotChatConfigurationService,
  value: string | undefined
): void {
  service.setInputValue(value);
}

/**
 * Creates a chat configuration controller with dynamic update capabilities.
 * This is useful when you need to programmatically manage configuration.
 * 
 * @param service - The CopilotChatConfigurationService instance
 * @param initialConfig - Optional initial configuration
 * @returns Controller object with update and reset methods
 * 
 * @example
 * ```typescript
 * export class ChatManagerComponent {
 *   chatController = createChatConfigController(this.chatConfig, {
 *     labels: { chatInputPlaceholder: "Ask me..." }
 *   });
 *   
 *   constructor(private chatConfig: CopilotChatConfigurationService) {}
 *   
 *   updateForSupportMode() {
 *     this.chatController.update({
 *       labels: { chatInputPlaceholder: "Describe your issue..." }
 *     });
 *   }
 *   
 *   resetToDefaults() {
 *     this.chatController.reset();
 *   }
 * }
 * ```
 */
export function createChatConfigController(
  service: CopilotChatConfigurationService,
  initialConfig?: CopilotChatConfiguration
): {
  update: (config: CopilotChatConfiguration) => void;
  reset: () => void;
  getLabels: () => CopilotChatLabels;
  getInputValue: () => string | undefined;
} {
  // Apply initial configuration if provided
  if (initialConfig) {
    service.updateConfiguration(initialConfig);
  }
  
  return {
    update: (config: CopilotChatConfiguration) => service.updateConfiguration(config),
    reset: () => service.reset(),
    getLabels: () => service.labels(),
    getInputValue: () => service.inputValue()
  };
}
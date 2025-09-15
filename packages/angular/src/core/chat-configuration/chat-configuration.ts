import { Injectable, Inject, Optional, signal, Signal, WritableSignal } from '@angular/core';
import { 
  CopilotChatConfiguration, 
  CopilotChatLabels,
  COPILOT_CHAT_DEFAULT_LABELS,
  COPILOT_CHAT_INITIAL_CONFIG
} from './chat-configuration.types';

/**
 * Service for managing CopilotKit chat configuration.
 * Can be provided at different component levels for scoped configuration.
 * 
 * @example
 * ```typescript
 * // Global configuration
 * providers: [provideCopilotChatConfiguration({
    standalone: true,
labels: { ... } })]
 * 
 * // Component-scoped configuration
 * @Component({
  standalone: true,
*   providers: [provideCopilotChatConfiguration()],
 *   ...
 * })
 * ```
 */
@Injectable()
export class CopilotChatConfigurationService {
  // State signals
  private readonly _labels: WritableSignal<CopilotChatLabels>;
  private readonly _inputValue: WritableSignal<string | undefined>;
  private readonly _onSubmitInput: WritableSignal<((value: string) => void) | undefined>;
  private readonly _onChangeInput: WritableSignal<((value: string) => void) | undefined>;
  
  // Public readonly signals
  readonly labels: Signal<CopilotChatLabels>;
  readonly inputValue: Signal<string | undefined>;
  
  constructor(
    @Optional() @Inject(COPILOT_CHAT_INITIAL_CONFIG) private readonly initialConfig: CopilotChatConfiguration | null
  ) {
    // Initialize state signals
    this._labels = signal<CopilotChatLabels>(
      this.mergeLabels(this.initialConfig?.labels)
    );
    this._inputValue = signal<string | undefined>(
      this.initialConfig?.inputValue
    );
    this._onSubmitInput = signal<((value: string) => void) | undefined>(
      this.initialConfig?.onSubmitInput
    );
    this._onChangeInput = signal<((value: string) => void) | undefined>(
      this.initialConfig?.onChangeInput
    );
    
    // Initialize public readonly signals
    this.labels = this._labels.asReadonly();
    this.inputValue = this._inputValue.asReadonly();
  }
  
  /**
   * Update chat labels (partial update, merged with defaults)
   */
  setLabels(labels: Partial<CopilotChatLabels>): void {
    this._labels.set(this.mergeLabels(labels));
  }
  
  /**
   * Update the current input value
   */
  setInputValue(value: string | undefined): void {
    this._inputValue.set(value);
    // Also trigger change handler if set
    if (value !== undefined) {
      this.changeInput(value);
    }
  }
  
  /**
   * Set the submit input handler
   */
  setSubmitHandler(handler: ((value: string) => void) | undefined): void {
    this._onSubmitInput.set(handler);
  }
  
  /**
   * Set the change input handler
   */
  setChangeHandler(handler: ((value: string) => void) | undefined): void {
    this._onChangeInput.set(handler);
  }
  
  /**
   * Submit the current input value
   */
  submitInput(value: string): void {
    const handler = this._onSubmitInput();
    if (handler) {
      handler(value);
    }
  }
  
  /**
   * Handle input value change
   */
  changeInput(value: string): void {
    const handler = this._onChangeInput();
    if (handler) {
      handler(value);
    }
  }
  
  /**
   * Update the entire configuration at once
   */
  updateConfiguration(config: CopilotChatConfiguration): void {
    if (config.labels) {
      this.setLabels(config.labels);
    }
    if (config.inputValue !== undefined) {
      this._inputValue.set(config.inputValue);
    }
    if (config.onSubmitInput) {
      this.setSubmitHandler(config.onSubmitInput);
    }
    if (config.onChangeInput) {
      this.setChangeHandler(config.onChangeInput);
    }
  }
  
  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this._labels.set(COPILOT_CHAT_DEFAULT_LABELS);
    this._inputValue.set(undefined);
    this._onSubmitInput.set(undefined);
    this._onChangeInput.set(undefined);
  }
  
  /**
   * Get the current submit handler
   */
  getSubmitHandler(): ((value: string) => void) | undefined {
    return this._onSubmitInput();
  }
  
  /**
   * Get the current change handler
   */
  getChangeHandler(): ((value: string) => void) | undefined {
    return this._onChangeInput();
  }
  
  /**
   * Merge partial labels with defaults
   */
  private mergeLabels(partial?: Partial<CopilotChatLabels>): CopilotChatLabels {
    return {
      ...COPILOT_CHAT_DEFAULT_LABELS,
      ...partial
    };
  }
}

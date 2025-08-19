import {
  Directive,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject
} from '@angular/core';
import { CopilotChatConfigurationService } from '../core/chat-configuration/chat-configuration.service';
import { 
  CopilotChatConfiguration,
  CopilotChatLabels
} from '../core/chat-configuration/chat-configuration.types';

/**
 * Directive for configuring CopilotKit chat settings declaratively in templates.
 * Works with the CopilotChatConfigurationService to provide reactive chat configuration.
 * 
 * @example
 * ```html
 * <!-- Basic usage with individual inputs -->
 * <div copilotkitChatConfig
 *      [labels]="customLabels"
 *      [inputValue]="currentInput"
 *      (submitInput)="onSubmit($event)"
 *      (changeInput)="onChange($event)">
 *   <!-- Chat UI components -->
 * </div>
 * 
 * <!-- Using configuration object -->
 * <div [copilotkitChatConfig]="chatConfig">
 *   <!-- Chat UI components -->
 * </div>
 * 
 * <!-- Two-way binding for input value -->
 * <div copilotkitChatConfig
 *      [(value)]="chatInput"
 *      (submitInput)="handleSubmit($event)">
 *   <!-- Chat UI components -->
 * </div>
 * ```
 */
@Directive({
  selector: '[copilotkitChatConfig]',
  standalone: true
})
export class CopilotkitChatConfigDirective implements OnInit, OnChanges, OnDestroy {
  private readonly chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  private _value?: string;
  private submitHandler?: (value: string) => void;
  private changeHandler?: (value: string) => void;

  /**
   * Partial labels to override defaults
   */
  @Input() labels?: Partial<CopilotChatLabels>;

  /**
   * The current input value
   */
  @Input() inputValue?: string;

  /**
   * Event emitted when input is submitted
   */
  @Output() submitInput = new EventEmitter<string>();

  /**
   * Event emitted when input value changes
   */
  @Output() changeInput = new EventEmitter<string>();

  /**
   * Alternative: accept full configuration object
   */
  @Input('copilotkitChatConfig')
  set config(value: CopilotChatConfiguration | undefined) {
    if (value) {
      if (value.labels) this.labels = value.labels;
      if (value.inputValue !== undefined) this.inputValue = value.inputValue;
      // Store handlers for later setup
      if (value.onSubmitInput) this.submitHandler = value.onSubmitInput;
      if (value.onChangeInput) this.changeHandler = value.onChangeInput;
    }
  }

  /**
   * Two-way binding for input value
   */
  @Input()
  get value(): string | undefined {
    return this._value;
  }
  set value(v: string | undefined) {
    this._value = v;
    this.valueChange.emit(v);
    if (v !== undefined) {
      this.updateInputValue(v);
    }
  }

  /**
   * Two-way binding output for value
   */
  @Output() valueChange = new EventEmitter<string | undefined>();

  ngOnInit(): void {
    if (!this.chatConfig) {
      console.warn('CopilotkitChatConfigDirective: No CopilotChatConfigurationService found. ' +
                   'Make sure to provide it using provideCopilotChatConfiguration().');
      return;
    }

    this.updateConfiguration();
    this.setupHandlers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.chatConfig) {
      return;
    }

    const relevantChanges = changes['labels'] || 
                          changes['inputValue'] ||
                          changes['value'];
    
    if (relevantChanges && !relevantChanges.firstChange) {
      this.updateConfiguration();
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Submit the current input value
   */
  submit(value: string): void {
    // Emit to template binding
    this.submitInput.emit(value);
    
    // Call service handler
    if (this.chatConfig) {
      this.chatConfig.submitInput(value);
    }
    
    // Call provided handler
    if (this.submitHandler) {
      this.submitHandler(value);
    }
  }

  /**
   * Handle input value change
   */
  change(value: string): void {
    // Update internal value
    this._value = value;
    
    // Emit to template bindings
    this.changeInput.emit(value);
    this.valueChange.emit(value);
    
    // Call service handler
    if (this.chatConfig) {
      this.chatConfig.changeInput(value);
    }
    
    // Call provided handler
    if (this.changeHandler) {
      this.changeHandler(value);
    }
  }

  private updateConfiguration(): void {
    if (!this.chatConfig) {
      return;
    }

    // Update labels if provided
    if (this.labels) {
      this.chatConfig.setLabels(this.labels);
    }

    // Update input value if provided
    const valueToSet = this._value !== undefined ? this._value : this.inputValue;
    if (valueToSet !== undefined) {
      this.chatConfig.setInputValue(valueToSet);
    }
  }

  private updateInputValue(value: string): void {
    if (this.chatConfig) {
      this.chatConfig.setInputValue(value);
      this.chatConfig.changeInput(value);
    }
  }

  private setupHandlers(): void {
    if (!this.chatConfig) {
      return;
    }

    // Create composite handlers that call both service and directive handlers
    const submitComposite = (value: string) => {
      this.submitInput.emit(value);
      if (this.submitHandler) {
        this.submitHandler(value);
      }
    };

    const changeComposite = (value: string) => {
      this.changeInput.emit(value);
      this.valueChange.emit(value);
      if (this.changeHandler) {
        this.changeHandler(value);
      }
    };

    // Set handlers on the service
    this.chatConfig.setSubmitHandler(submitComposite);
    this.chatConfig.setChangeHandler(changeComposite);
  }
}
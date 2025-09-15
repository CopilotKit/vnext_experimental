import {
  Directive,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  Optional,
  isDevMode,
  Inject,
  input,
  output,
  Input,
} from "@angular/core";
import { CopilotChatConfigurationService } from "../core/chat-configuration/chat-configuration";
import {
  CopilotChatConfiguration,
  CopilotChatLabels,
} from "../core/chat-configuration/chat-configuration.types";

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
  selector: "[copilotkitChatConfig]",
  standalone: true,
})
export class CopilotKitChatConfig implements OnInit, OnChanges, OnDestroy {
  private _value?: string;
  private submitHandler?: (value: string) => void;
  private changeHandler?: (value: string) => void;

  constructor(
    @Optional()
    @Inject(CopilotChatConfigurationService)
    private readonly chatConfig: CopilotChatConfigurationService | null
  ) {}

  /**
   * Partial labels to override defaults
   */
  labels = input<Partial<CopilotChatLabels> | undefined>(undefined);

  /**
   * The current input value
   */
  inputValue = input<string | undefined>(undefined);

  /**
   * Event emitted when input is submitted
   */
  submitInput = output<string>();

  /**
   * Event emitted when input value changes
   */
  changeInput = output<string>();

  /**
   * Alternative: accept full configuration object
   */
  // Maintain alias via classic @Input for now
  @Input("copilotkitChatConfig")
  set config(value: CopilotChatConfiguration | undefined) {
    if (value) {
      if (value.labels) {
        /* leave to updateConfiguration */
      }
      if (value.inputValue !== undefined) {
        this._value = value.inputValue;
      }
      if (value.onSubmitInput) this.submitHandler = value.onSubmitInput;
      if (value.onChangeInput) this.changeHandler = value.onChangeInput;
    }
  }

  /**
   * Two-way binding for input value
   */
  value = input<string | undefined>(undefined);

  /**
   * Two-way binding output for value
   */
  valueChange = output<string | undefined>();

  ngOnInit(): void {
    if (!this.chatConfig) {
      if (isDevMode()) {
        console.warn(
          "CopilotKitChatConfig: No CopilotChatConfigurationService found. " +
            "Make sure to provide it using provideCopilotChatConfiguration()."
        );
      }
      return;
    }

    this.updateConfiguration();
    this.setupHandlers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.chatConfig) {
      return;
    }

    const relevantChanges =
      changes["labels"] || changes["inputValue"] || changes["value"];

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
    if (this.labels()) {
      this.chatConfig.setLabels(this.labels()!);
    }

    // Update input value if provided
    const incoming = this.value() ?? this.inputValue();
    const valueToSet = incoming !== undefined ? incoming : this._value;
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

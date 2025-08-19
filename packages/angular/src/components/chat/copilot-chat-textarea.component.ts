import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  effect,
  inject,
  ChangeDetectionStrategy
} from '@angular/core';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';

@Component({
  selector: 'copilot-chat-textarea',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <textarea
      #textareaRef
      [value]="value()"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
      [class]="computedClass()"
      [style.max-height.px]="maxHeight()"
      [style.overflow]="'auto'"
      [style.resize]="'none'"
      (input)="onInput($event)"
      (keydown)="onKeyDown($event)"
      rows="1"
    ></textarea>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    
    textarea {
      width: 100%;
      padding: 1.25rem;
      padding-bottom: 0;
      outline: none;
      resize: none;
      background: transparent;
      font-size: 16px;
      line-height: 1.625;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    textarea::placeholder {
      color: rgba(0, 0, 0, 0.47);
    }
    
    :host-context(.dark) textarea::placeholder {
      color: rgba(255, 255, 255, 0.8);
    }
  `],
  host: {
    '[class.copilot-chat-textarea]': 'true'
  }
})
export class CopilotChatTextareaComponent implements AfterViewInit, OnChanges {
  @ViewChild('textareaRef', { static: true }) textareaRef!: ElementRef<HTMLTextAreaElement>;
  
  @Input() set inputValue(val: string | undefined) {
    this.value.set(val || '');
  }
  @Input() set inputPlaceholder(val: string | undefined) {
    this.customPlaceholder.set(val);
  }
  @Input() set inputMaxRows(val: number | undefined) {
    this.maxRows.set(val || 5);
  }
  @Input() set inputAutoFocus(val: boolean | undefined) {
    this.autoFocus.set(val ?? true);
  }
  @Input() set inputDisabled(val: boolean | undefined) {
    this.disabled.set(val || false);
  }
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  @Output() valueChange = new EventEmitter<string>();
  @Output() keyDown = new EventEmitter<KeyboardEvent>();
  
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  // Signals for reactive state
  value = signal<string>('');
  customPlaceholder = signal<string | undefined>(undefined);
  maxRows = signal<number>(5);
  autoFocus = signal<boolean>(true);
  disabled = signal<boolean>(false);
  customClass = signal<string | undefined>(undefined);
  maxHeight = signal<number>(0);
  
  // Computed values
  placeholder = computed(() => {
    return this.customPlaceholder() || 
           this.chatConfig?.labels().chatInputPlaceholder || 
           'Type a message...';
  });
  
  computedClass = computed(() => {
    const baseClasses = 'copilot-chat-textarea-input';
    return this.customClass() || baseClasses;
  });
  
  constructor() {
    // Effect to sync value with chat configuration if available
    effect(() => {
      const configValue = this.chatConfig?.inputValue();
      if (configValue !== undefined && !this.customPlaceholder()) {
        this.value.set(configValue);
      }
    });
  }
  
  ngAfterViewInit(): void {
    this.calculateMaxHeight();
    this.adjustHeight();
    
    if (this.autoFocus()) {
      setTimeout(() => {
        this.textareaRef.nativeElement.focus();
      });
    }
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['inputMaxRows']) {
      this.calculateMaxHeight();
    }
  }
  
  onInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    const newValue = textarea.value;
    
    this.value.set(newValue);
    this.valueChange.emit(newValue);
    
    // Update chat configuration if available
    if (this.chatConfig) {
      this.chatConfig.setInputValue(newValue);
    }
    
    this.adjustHeight();
  }
  
  onKeyDown(event: KeyboardEvent): void {
    // Check for Enter key without Shift
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.keyDown.emit(event);
    } else {
      this.keyDown.emit(event);
    }
  }
  
  private calculateMaxHeight(): void {
    const textarea = this.textareaRef.nativeElement;
    const maxRowsValue = this.maxRows();
    
    // Save current value
    const currentValue = textarea.value;
    
    // Clear content to measure single row height
    textarea.value = '';
    textarea.style.height = 'auto';
    
    // Get computed styles to account for padding
    const computedStyle = window.getComputedStyle(textarea);
    const paddingTop = parseFloat(computedStyle.paddingTop);
    const paddingBottom = parseFloat(computedStyle.paddingBottom);
    
    // Calculate actual content height (without padding)
    const contentHeight = textarea.scrollHeight - paddingTop - paddingBottom;
    
    // Calculate max height: content height for maxRows + padding
    const calculatedMaxHeight = contentHeight * maxRowsValue + paddingTop + paddingBottom;
    this.maxHeight.set(calculatedMaxHeight);
    
    // Restore original value
    textarea.value = currentValue;
    
    // Adjust height after calculating maxHeight
    if (currentValue) {
      this.adjustHeight();
    }
  }
  
  private adjustHeight(): void {
    const textarea = this.textareaRef.nativeElement;
    const maxHeightValue = this.maxHeight();
    
    if (maxHeightValue > 0) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeightValue)}px`;
    }
  }
  
  /**
   * Public method to focus the textarea
   */
  focus(): void {
    this.textareaRef.nativeElement.focus();
  }
  
  /**
   * Public method to get current value
   */
  getValue(): string {
    return this.value();
  }
  
  /**
   * Public method to set value programmatically
   */
  setValue(value: string): void {
    this.value.set(value);
    this.valueChange.emit(value);
    
    if (this.chatConfig) {
      this.chatConfig.setInputValue(value);
    }
    
    setTimeout(() => this.adjustHeight());
  }
}
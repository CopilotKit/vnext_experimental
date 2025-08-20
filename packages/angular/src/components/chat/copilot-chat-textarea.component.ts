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
  ChangeDetectionStrategy,
  ViewEncapsulation
} from '@angular/core';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import { cn } from '../../lib/utils';

@Component({
  selector: 'textarea[copilotChatTextarea]',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[value]': 'value()',
    '[placeholder]': 'placeholder()',
    '[disabled]': 'disabled()',
    '[class]': 'computedClass()',
    '[style.max-height.px]': 'maxHeight()',
    '[style.overflow]': "'auto'",
    '[style.resize]': "'none'",
    '(input)': 'onInput($event)',
    '(keydown)': 'onKeyDown($event)',
    '[attr.rows]': '1'
  },
  template: '',
  styles: []
})
export class CopilotChatTextareaComponent implements AfterViewInit, OnChanges {
  private elementRef = inject(ElementRef<HTMLTextAreaElement>);
  get textareaRef() { return this.elementRef; }
  
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
    const baseClasses = cn(
      // Layout and sizing
      'w-full p-5 pb-0',
      // Behavior
      'outline-none resize-none',
      // Background
      'bg-transparent',
      // Typography
      'antialiased font-regular leading-relaxed text-[16px]',
      // Placeholder styles
      'placeholder:text-[#00000077] dark:placeholder:text-[#fffc]'
    );
    return cn(baseClasses, this.customClass());
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
        this.elementRef.nativeElement.focus();
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
    const textarea = this.elementRef.nativeElement;
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
    const textarea = this.elementRef.nativeElement;
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
    this.elementRef.nativeElement.focus();
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
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ContentChild,
  TemplateRef,
  Type,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewEncapsulation,
  signal,
  computed,
  OnInit,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  ViewContainerRef,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotSlotComponent } from '../../lib/slots/copilot-slot.component';
import { CopilotChatMessageViewComponent } from './copilot-chat-message-view.component';
import { CopilotChatInputComponent } from './copilot-chat-input.component';
import { CopilotChatViewScrollViewComponent } from './copilot-chat-view-scroll-view.component';
import { CopilotChatViewScrollToBottomButtonComponent } from './copilot-chat-view-scroll-to-bottom-button.component';
import { CopilotChatViewFeatherComponent } from './copilot-chat-view-feather.component';
import { CopilotChatViewInputContainerComponent } from './copilot-chat-view-input-container.component';
import { CopilotChatViewDisclaimerComponent } from './copilot-chat-view-disclaimer.component';
import { Message } from '@ag-ui/client';
import { cn } from '../../lib/utils';
import { ResizeObserverService } from '../../services/resize-observer.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * CopilotChatView component - Angular port of the React component.
 * A complete chat interface with message feed and input components.
 * 
 * @example
 * ```html
 * <copilot-chat-view
 *   [messages]="messages"
 *   [autoScroll]="true"
 *   [messageViewProps]="{ assistantMessage: { onThumbsUp: handleThumbsUp } }">
 * </copilot-chat-view>
 * ```
 */
@Component({
  selector: 'copilot-chat-view',
  standalone: true,
  imports: [
    CommonModule,
    CopilotSlotComponent,
    CopilotChatMessageViewComponent,
    CopilotChatInputComponent,
    CopilotChatViewScrollViewComponent,
    CopilotChatViewScrollToBottomButtonComponent,
    CopilotChatViewFeatherComponent,
    CopilotChatViewInputContainerComponent,
    CopilotChatViewDisclaimerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [ResizeObserverService],
  template: `
    <!-- Custom layout template support (render prop pattern) -->
    @if (customLayoutTemplate) {
      <ng-container *ngTemplateOutlet="customLayoutTemplate; context: layoutContext()"></ng-container>
    } @else {
      <!-- Default layout - exact React DOM structure -->
      <div [class]="computedClass()">
        <!-- ScrollView -->
        <copilot-chat-view-scroll-view
          [autoScroll]="autoScrollSignal()"
          [inputContainerHeight]="inputContainerHeight()"
          [isResizing]="isResizing()"
          [messages]="messagesSignal()"
          [messageView]="messageViewSlot()"
          [messageViewClass]="messageViewClass"
          [scrollToBottomButton]="scrollToBottomButtonSlot()"
          [scrollToBottomButtonClass]="scrollToBottomButtonClass"
          (assistantMessageThumbsUp)="assistantMessageThumbsUp.emit($event)"
          (assistantMessageThumbsDown)="assistantMessageThumbsDown.emit($event)"
          (assistantMessageReadAloud)="assistantMessageReadAloud.emit($event)"
          (assistantMessageRegenerate)="assistantMessageRegenerate.emit($event)"
          (userMessageCopy)="userMessageCopy.emit($event)"
          (userMessageEdit)="userMessageEdit.emit($event)">
        </copilot-chat-view-scroll-view>

        <!-- Feather effect -->
        <copilot-slot
          [slot]="featherSlot()"
          [context]="{ className: featherClass }"
          [defaultComponent]="defaultFeatherComponent">
        </copilot-slot>

        <!-- Input container -->
        <copilot-slot
          #inputContainerSlotRef
          [slot]="inputContainerSlot()"
          [context]="inputContainerContext()"
          [defaultComponent]="defaultInputContainerComponent">
        </copilot-slot>
      </div>
    }
  `
})
export class CopilotChatViewComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  // Core inputs matching React props
  @Input() messages: Message[] = [];
  @Input() autoScroll: boolean = true;
  @Input() inputClass?: string;
  
  // MessageView slot inputs
  @Input() messageViewComponent?: Type<any>;
  @Input() messageViewTemplate?: TemplateRef<any>;
  @Input() messageViewClass?: string;
  
  // ScrollView slot inputs
  @Input() scrollViewComponent?: Type<any>;
  @Input() scrollViewTemplate?: TemplateRef<any>;
  @Input() scrollViewClass?: string;
  
  // ScrollToBottomButton slot inputs
  @Input() scrollToBottomButtonComponent?: Type<any>;
  @Input() scrollToBottomButtonTemplate?: TemplateRef<any>;
  @Input() scrollToBottomButtonClass?: string;
  
  // Input slot inputs
  @Input() inputComponent?: Type<any>;
  @Input() inputTemplate?: TemplateRef<any>;
  
  // InputContainer slot inputs
  @Input() inputContainerComponent?: Type<any>;
  @Input() inputContainerTemplate?: TemplateRef<any>;
  @Input() inputContainerClass?: string;
  
  // Feather slot inputs
  @Input() featherComponent?: Type<any>;
  @Input() featherTemplate?: TemplateRef<any>;
  @Input() featherClass?: string;
  
  // Disclaimer slot inputs
  @Input() disclaimerComponent?: Type<any>;
  @Input() disclaimerTemplate?: TemplateRef<any>;
  @Input() disclaimerClass?: string;
  @Input() disclaimerText?: string;
  
  // Custom layout template (render prop pattern)
  @ContentChild('customLayout') customLayoutTemplate?: TemplateRef<any>;
  
  // Named template slots for deep customization
  @ContentChild('sendButton') sendButtonTemplate?: TemplateRef<any>;
  @ContentChild('toolbar') toolbarTemplate?: TemplateRef<any>;
  @ContentChild('textArea') textAreaTemplate?: TemplateRef<any>;
  @ContentChild('audioRecorder') audioRecorderTemplate?: TemplateRef<any>;
  @ContentChild('assistantMessageMarkdownRenderer') assistantMessageMarkdownRendererTemplate?: TemplateRef<any>;
  @ContentChild('thumbsUpButton') thumbsUpButtonTemplate?: TemplateRef<any>;
  @ContentChild('thumbsDownButton') thumbsDownButtonTemplate?: TemplateRef<any>;
  @ContentChild('readAloudButton') readAloudButtonTemplate?: TemplateRef<any>;
  @ContentChild('regenerateButton') regenerateButtonTemplate?: TemplateRef<any>;
  
  // Output events for assistant message actions (bubbled from child components)
  @Output() assistantMessageThumbsUp = new EventEmitter<{ message: Message }>();
  @Output() assistantMessageThumbsDown = new EventEmitter<{ message: Message }>();
  @Output() assistantMessageReadAloud = new EventEmitter<{ message: Message }>();
  @Output() assistantMessageRegenerate = new EventEmitter<{ message: Message }>();
  
  // Output events for user message actions (if applicable)
  @Output() userMessageCopy = new EventEmitter<{ message: Message }>();
  @Output() userMessageEdit = new EventEmitter<{ message: Message }>();
  
  // ViewChild references
  @ViewChild('inputContainerSlotRef', { read: ElementRef }) inputContainerSlotRef?: ElementRef;
  
  // Default components for slots
  protected readonly defaultScrollViewComponent = CopilotChatViewScrollViewComponent;
  protected readonly defaultScrollToBottomButtonComponent = CopilotChatViewScrollToBottomButtonComponent;
  protected readonly defaultInputContainerComponent = CopilotChatViewInputContainerComponent;
  protected readonly defaultFeatherComponent = CopilotChatViewFeatherComponent;
  protected readonly defaultDisclaimerComponent = CopilotChatViewDisclaimerComponent;
  
  // Signals for reactive state
  protected messagesSignal = signal<Message[]>([]);
  protected autoScrollSignal = signal(true);
  protected inputClassSignal = signal<string | undefined>(undefined);
  protected disclaimerTextSignal = signal<string | undefined>(undefined);
  protected disclaimerClassSignal = signal<string | undefined>(undefined);
  protected inputContainerHeight = signal<number>(0);
  protected isResizing = signal<boolean>(false);
  protected contentPaddingBottom = computed(() => this.inputContainerHeight() + 32);
  
  // Computed signals
  protected computedClass = computed(() => 
    cn('relative h-full', this.inputClassSignal())
  );
  
  // Slot resolution computed signals
  protected messageViewSlot = computed(() => 
    this.messageViewTemplate || this.messageViewComponent
  );
  
  protected scrollViewSlot = computed(() => 
    this.scrollViewTemplate || this.scrollViewComponent
  );
  
  protected scrollToBottomButtonSlot = computed(() => 
    this.scrollToBottomButtonTemplate || this.scrollToBottomButtonComponent
  );
  
  protected inputSlot = computed(() => 
    this.inputTemplate || this.inputComponent
  );
  
  protected inputContainerSlot = computed(() => 
    this.inputContainerTemplate || this.inputContainerComponent
  );
  
  protected featherSlot = computed(() => 
    this.featherTemplate || this.featherComponent
  );
  
  protected disclaimerSlot = computed(() => 
    this.disclaimerTemplate || this.disclaimerComponent
  );
  
  // Context objects for slots
  protected scrollViewContext = computed(() => ({
    autoScroll: this.autoScrollSignal(),
    scrollToBottomButton: this.scrollToBottomButtonSlot(),
    scrollToBottomButtonClass: this.scrollToBottomButtonClass,
    inputContainerHeight: this.inputContainerHeight(),
    isResizing: this.isResizing(),
    messages: this.messagesSignal(),
    messageView: this.messageViewSlot(),
    messageViewClass: this.messageViewClass
  }));
  
  // Removed scrollViewPropsComputed - no longer needed
  
  protected inputContainerContext = computed(() => ({
    input: this.inputSlot(),
    inputClass: this.inputClass,
    disclaimer: this.disclaimerSlot(),
    disclaimerText: this.disclaimerTextSignal(),
    disclaimerClass: this.disclaimerClassSignal(),
    inputContainerClass: this.inputContainerClass
  }));
  
  // Removed inputContainerPropsComputed - no longer needed
  
  // Layout context for custom templates (render prop pattern)
  protected layoutContext = computed(() => ({
    messageView: this.messageViewSlot(),
    input: this.inputSlot(),
    scrollView: this.scrollViewSlot(),
    scrollToBottomButton: this.scrollToBottomButtonSlot(),
    feather: this.featherSlot(),
    inputContainer: this.inputContainerSlot(),
    disclaimer: this.disclaimerSlot()
  }));
  
  private destroy$ = new Subject<void>();
  private resizeTimeoutRef?: number;
  
  constructor(
    private resizeObserverService: ResizeObserverService,
    private cdr: ChangeDetectorRef
  ) {
    // Set up effect to handle resize state timeout
    effect(() => {
      const resizing = this.isResizing();
      if (resizing && this.resizeTimeoutRef) {
        clearTimeout(this.resizeTimeoutRef);
        this.resizeTimeoutRef = undefined;
      }
    });
  }
  
  ngOnInit(): void {
    // Initialize signals with input values
    this.messagesSignal.set(this.messages);
    this.autoScrollSignal.set(this.autoScroll);
    this.inputClassSignal.set(this.inputClass);
    this.disclaimerTextSignal.set(this.disclaimerText);
    this.disclaimerClassSignal.set(this.disclaimerClass);
  }
  
  ngOnChanges(): void {
    // Update signals when inputs change
    this.messagesSignal.set(this.messages);
    this.autoScrollSignal.set(this.autoScroll);
    this.inputClassSignal.set(this.inputClass);
    this.disclaimerTextSignal.set(this.disclaimerText);
    this.disclaimerClassSignal.set(this.disclaimerClass);
  }
  
  ngAfterViewInit(): void {
    // Don't set a default height - measure it dynamically
    
    // Set up input container height monitoring
    const measureAndObserve = () => {
      if (!this.inputContainerSlotRef || !this.inputContainerSlotRef.nativeElement) {
        return false;
      }
      
      // The slot ref points to the copilot-slot element
      // We need to find the actual input container component inside it
      const slotElement = this.inputContainerSlotRef.nativeElement;
      const componentElement = slotElement.querySelector('copilot-chat-view-input-container');
      
      if (!componentElement) {
        return false;
      }
      
      // Look for the absolute positioned div that contains the input
      let innerDiv = componentElement.querySelector('div.absolute') as HTMLElement;
      
      // If not found by class, try first child
      if (!innerDiv) {
        innerDiv = componentElement.firstElementChild as HTMLElement;
      }
      
      if (!innerDiv) {
        return false;
      }
      
      // Measure the actual height
      const measuredHeight = innerDiv.offsetHeight;
      
      if (measuredHeight === 0) {
        return false;
      }
      
      // Success! Set the initial height
      this.inputContainerHeight.set(measuredHeight);
      this.cdr.detectChanges();
      
      // Create an ElementRef wrapper for ResizeObserver
      const innerDivRef = new ElementRef(innerDiv);
      
      // Set up ResizeObserver to track changes
      this.resizeObserverService.observeElement(innerDivRef, 0, 250)
        .pipe(takeUntil(this.destroy$))
        .subscribe(state => {
          const newHeight = state.height;
          
          if (newHeight !== this.inputContainerHeight() && newHeight > 0) {
            this.inputContainerHeight.set(newHeight);
            this.isResizing.set(true);
            this.cdr.detectChanges();
            
            // Clear existing timeout
            if (this.resizeTimeoutRef) {
              clearTimeout(this.resizeTimeoutRef);
            }
            
            // Set isResizing to false after a short delay
            this.resizeTimeoutRef = window.setTimeout(() => {
              this.isResizing.set(false);
              this.resizeTimeoutRef = undefined;
              this.cdr.detectChanges();
            }, 250);
          }
        });
      
      return true;
    };
    
    // Try to measure immediately
    if (!measureAndObserve()) {
      // If failed, retry with increasing delays
      let attempts = 0;
      const maxAttempts = 10;
      
      const retry = () => {
        attempts++;
        if (measureAndObserve()) {
          // Successfully measured
        } else if (attempts < maxAttempts) {
          // Exponential backoff: 50ms, 100ms, 200ms, 400ms, etc.
          const delay = 50 * Math.pow(2, Math.min(attempts - 1, 4));
          setTimeout(retry, delay);
        } else {
          // Failed to measure after max attempts
        }
      };
      
      // Start retry with first delay
      setTimeout(retry, 50);
    }
  }
  
  ngOnDestroy(): void {
    if (this.resizeTimeoutRef) {
      clearTimeout(this.resizeTimeoutRef);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}
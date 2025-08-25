import {
  Component,
  Input,
  Output,
  EventEmitter,
  ContentChild,
  TemplateRef,
  Type,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  signal,
  computed,
  OnInit,
  OnChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotSlotComponent } from '../../lib/slots/copilot-slot.component';
import { Message } from '@ag-ui/client';
import { CopilotChatAssistantMessageComponent } from './copilot-chat-assistant-message.component';
import { CopilotChatUserMessageComponent } from './copilot-chat-user-message.component';
import { CopilotChatMessageViewCursorComponent } from './copilot-chat-message-view-cursor.component';
import { cn } from '../../lib/utils';

/**
 * CopilotChatMessageView component - Angular port of the React component.
 * Renders a list of chat messages with support for custom slots and layouts.
 * DOM structure and Tailwind classes match the React implementation exactly.
 */
@Component({
  selector: 'copilot-chat-message-view',
  standalone: true,
  imports: [
    CommonModule,
    CopilotSlotComponent,
    CopilotChatAssistantMessageComponent,
    CopilotChatUserMessageComponent,
    CopilotChatMessageViewCursorComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- Custom layout template support (render prop pattern) -->
    @if (customLayoutTemplate) {
      <ng-container *ngTemplateOutlet="customLayoutTemplate; context: layoutContext()"></ng-container>
    } @else {
      <!-- Default layout - exact React DOM structure: div with "flex flex-col" classes -->
      <div [class]="computedClass()">
        <!-- Message iteration - exactly like React's messages.map() -->
        @for (message of filteredMessages(); track trackByMessageId($index, message)) {
          @if (message.role === 'assistant') {
            <!-- Assistant message with slot support -->
            @if (assistantMessageComponent || assistantMessageTemplate) {
              <copilot-slot
                [slot]="assistantMessageTemplate || assistantMessageComponent"
                [context]="mergeAssistantProps(message)"
                [defaultComponent]="defaultAssistantComponent">
              </copilot-slot>
            } @else {
              <copilot-chat-assistant-message 
                [message]="message"
                [inputClass]="assistantMessageClass"
                (thumbsUp)="assistantMessageThumbsUp.emit($event)"
                (thumbsDown)="assistantMessageThumbsDown.emit($event)"
                (readAloud)="assistantMessageReadAloud.emit($event)"
                (regenerate)="assistantMessageRegenerate.emit($event)">
              </copilot-chat-assistant-message>
            }
          } @else if (message.role === 'user') {
            <!-- User message with slot support -->
            @if (userMessageComponent || userMessageTemplate) {
              <copilot-slot
                [slot]="userMessageTemplate || userMessageComponent"
                [context]="mergeUserProps(message)"
                [defaultComponent]="defaultUserComponent">
              </copilot-slot>
            } @else {
              <copilot-chat-user-message 
                [message]="message"
                [inputClass]="userMessageClass">
              </copilot-chat-user-message>
            }
          }
        }
        
        <!-- Cursor - exactly like React's conditional rendering -->
        @if (showCursor) {
          @if (cursorComponent || cursorTemplate) {
            <copilot-slot
              [slot]="cursorTemplate || cursorComponent"
              [context]="cursorProps || {}"
              [defaultComponent]="defaultCursorComponent">
            </copilot-slot>
          } @else {
            <copilot-chat-message-view-cursor 
              [inputClass]="cursorClass">
            </copilot-chat-message-view-cursor>
          }
        }
      </div>
    }
  `
})
export class CopilotChatMessageViewComponent implements OnInit, OnChanges {
  // Core inputs matching React props
  @Input() messages: Message[] = [];
  @Input() showCursor = false;
  @Input() inputClass?: string;
  
  // Assistant message slot inputs
  @Input() assistantMessageComponent?: Type<any>;
  @Input() assistantMessageTemplate?: TemplateRef<any>;
  @Input() assistantMessageClass?: string;
  @Input() assistantMessageProps?: any;
  
  // User message slot inputs
  @Input() userMessageComponent?: Type<any>;
  @Input() userMessageTemplate?: TemplateRef<any>;
  @Input() userMessageClass?: string;
  @Input() userMessageProps?: any;
  
  // Cursor slot inputs
  @Input() cursorComponent?: Type<any>;
  @Input() cursorTemplate?: TemplateRef<any>;
  @Input() cursorClass?: string;
  @Input() cursorProps?: any;
  
  // Custom layout template (render prop pattern)
  @ContentChild('customLayout') customLayoutTemplate?: TemplateRef<any>;
  
  // Output events (bubbled from child components)
  @Output() assistantMessageThumbsUp = new EventEmitter<{ message: Message }>();
  @Output() assistantMessageThumbsDown = new EventEmitter<{ message: Message }>();
  @Output() assistantMessageReadAloud = new EventEmitter<{ message: Message }>();
  @Output() assistantMessageRegenerate = new EventEmitter<{ message: Message }>();
  @Output() userMessageCopy = new EventEmitter<{ message: Message }>();
  @Output() userMessageEdit = new EventEmitter<{ message: Message }>();
  
  // Default components for slots
  protected readonly defaultAssistantComponent = CopilotChatAssistantMessageComponent;
  protected readonly defaultUserComponent = CopilotChatUserMessageComponent;
  protected readonly defaultCursorComponent = CopilotChatMessageViewCursorComponent;
  
  // Signals for reactive updates
  private messagesSignal = signal<Message[]>([]);
  private showCursorSignal = signal(false);
  private inputClassSignal = signal<string | undefined>(undefined);
  
  // Computed class matching React: twMerge("flex flex-col", className)
  computedClass = computed(() => 
    cn('flex flex-col', this.inputClassSignal())
  );
  
  // Filtered messages - matches React's filter logic exactly
  filteredMessages = computed(() => {
    return this.messagesSignal()
      .filter(message => message && (message.role === 'assistant' || message.role === 'user'))
      .filter(Boolean) as Message[];
  });
  
  // Message elements for custom layout context
  messageElements = computed(() => {
    return this.filteredMessages().map(message => ({
      role: message.role,
      id: message.id,
      component: message.role === 'assistant' ? 'assistant-message' : 'user-message'
    }));
  });
  
  // Layout context for custom templates (render prop pattern)
  layoutContext = computed(() => ({
    showCursor: this.showCursorSignal(),
    messages: this.messagesSignal(),
    messageElements: this.messageElements()
  }));
  
  // Slot resolution computed signals
  assistantMessageSlot = computed(() => 
    this.assistantMessageComponent || this.assistantMessageClass
  );
  
  userMessageSlot = computed(() => 
    this.userMessageComponent || this.userMessageClass
  );
  
  cursorSlot = computed(() => 
    this.cursorComponent || this.cursorClass
  );
  
  // Props merging helpers
  mergeAssistantProps(message: Message) {
    return {
      message,
      ...this.assistantMessageProps
    };
  }
  
  mergeUserProps(message: Message) {
    return {
      message,
      ...this.userMessageProps
    };
  }
  
  // TrackBy function for performance optimization
  trackByMessageId(index: number, message: Message): string {
    return message.id;
  }
  
  // Lifecycle hooks
  ngOnInit() {
    // Initialize signals with input values
    this.messagesSignal.set(this.messages);
    this.showCursorSignal.set(this.showCursor);
    this.inputClassSignal.set(this.inputClass);
  }
  
  ngOnChanges() {
    this.messagesSignal.set(this.messages);
    this.showCursorSignal.set(this.showCursor);
    this.inputClassSignal.set(this.inputClass);
  }
}
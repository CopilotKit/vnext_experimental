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
import type { Message } from '@ag-ui/core';
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
        <!-- Message iteration - simplified without tool calls -->
        @for (message of messagesSignal(); track message.id) {
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
                [messages]="messagesSignal()"
                [isLoading]="isLoadingSignal()"
                [inputClass]="assistantMessageClass"
                (thumbsUp)="handleAssistantThumbsUp($event)"
                (thumbsDown)="handleAssistantThumbsDown($event)"
                (readAloud)="handleAssistantReadAloud($event)"
                (regenerate)="handleAssistantRegenerate($event)">
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
              [context]="{ inputClass: cursorClass }"
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
  @Input() isLoading = false;
  @Input() inputClass?: string;
  
  // Handler availability handled via DI service
  
  // Assistant message slot inputs
  @Input() assistantMessageComponent?: Type<any>;
  @Input() assistantMessageTemplate?: TemplateRef<any>;
  @Input() assistantMessageClass?: string;
  
  // User message slot inputs
  @Input() userMessageComponent?: Type<any>;
  @Input() userMessageTemplate?: TemplateRef<any>;
  @Input() userMessageClass?: string;
  
  
  // Cursor slot inputs
  @Input() cursorComponent?: Type<any>;
  @Input() cursorTemplate?: TemplateRef<any>;
  @Input() cursorClass?: string;
  
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
  protected messagesSignal = signal<Message[]>([]);
  protected showCursorSignal = signal(false);
  protected isLoadingSignal = signal(false);
  protected inputClassSignal = signal<string | undefined>(undefined);
  
  // Computed class matching React: twMerge("flex flex-col", className)
  computedClass = computed(() => 
    cn('flex flex-col', this.inputClassSignal())
  );
  
  
  // Layout context for custom templates (render prop pattern)
  layoutContext = computed(() => ({
    isLoading: this.isLoadingSignal(),
    messages: this.messagesSignal()
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
      messages: this.messagesSignal(),
      isLoading: this.isLoadingSignal(),
      inputClass: this.assistantMessageClass
    };
  }
  
  mergeUserProps(message: Message) {
    return {
      message,
      inputClass: this.userMessageClass
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
    this.isLoadingSignal.set(this.isLoading);
    this.inputClassSignal.set(this.inputClass);
  }
  
  ngOnChanges() {
    this.messagesSignal.set(this.messages);
    this.showCursorSignal.set(this.showCursor);
    this.isLoadingSignal.set(this.isLoading);
    this.inputClassSignal.set(this.inputClass);
  }
  
  // Event handlers - just pass them through
  handleAssistantThumbsUp(event: { message: Message }): void {
    this.assistantMessageThumbsUp.emit(event);
  }
  
  handleAssistantThumbsDown(event: { message: Message }): void {
    this.assistantMessageThumbsDown.emit(event);
  }
  
  handleAssistantReadAloud(event: { message: Message }): void {
    this.assistantMessageReadAloud.emit(event);
  }
  
  handleAssistantRegenerate(event: { message: Message }): void {
    this.assistantMessageRegenerate.emit(event);
  }
}

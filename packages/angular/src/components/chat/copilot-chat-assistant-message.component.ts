import {
  Component,
  Input,
  Output,
  EventEmitter,
  TemplateRef,
  ContentChild,
  signal,
  computed,
  Type,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  Optional,
  Inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotSlotComponent } from '../../lib/slots/copilot-slot.component';
import { CopilotChatToolCallsViewComponent } from './copilot-chat-tool-calls-view.component';
import type { Message } from '@ag-ui/core';
import {
  type AssistantMessage,
  type CopilotChatAssistantMessageOnThumbsUpProps,
  type CopilotChatAssistantMessageOnThumbsDownProps,
  type CopilotChatAssistantMessageOnReadAloudProps,
  type CopilotChatAssistantMessageOnRegenerateProps,
  type AssistantMessageMarkdownRendererContext,
  type AssistantMessageCopyButtonContext,
  type ThumbsUpButtonContext,
  type ThumbsDownButtonContext,
  type ReadAloudButtonContext,
  type RegenerateButtonContext,
  type AssistantMessageToolbarContext
} from './copilot-chat-assistant-message.types';
import { CopilotChatAssistantMessageRendererComponent } from './copilot-chat-assistant-message-renderer.component';
import {
  CopilotChatAssistantMessageCopyButtonComponent,
  CopilotChatAssistantMessageThumbsUpButtonComponent,
  CopilotChatAssistantMessageThumbsDownButtonComponent,
  CopilotChatAssistantMessageReadAloudButtonComponent,
  CopilotChatAssistantMessageRegenerateButtonComponent
} from './copilot-chat-assistant-message-buttons.component';
import { CopilotChatAssistantMessageToolbarComponent } from './copilot-chat-assistant-message-toolbar.component';
import { cn } from '../../lib/utils';
import { CopilotChatViewHandlersService } from './copilot-chat-view-handlers.service';

@Component({
  selector: 'copilot-chat-assistant-message',
  standalone: true,
  imports: [
    CommonModule,
    CopilotSlotComponent,
    CopilotChatAssistantMessageRendererComponent,
    CopilotChatAssistantMessageCopyButtonComponent,
    CopilotChatAssistantMessageThumbsUpButtonComponent,
    CopilotChatAssistantMessageThumbsDownButtonComponent,
    CopilotChatAssistantMessageReadAloudButtonComponent,
    CopilotChatAssistantMessageRegenerateButtonComponent,
    CopilotChatAssistantMessageToolbarComponent,
    CopilotChatToolCallsViewComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div 
      [class]="computedClass()"
      [attr.data-message-id]="message?.id">
      
      <!-- Markdown Renderer -->
      @if (markdownRendererTemplate || markdownRendererComponent) {
        <copilot-slot
          [slot]="markdownRendererTemplate || markdownRendererComponent"
          [context]="markdownRendererContext()"
          [defaultComponent]="CopilotChatAssistantMessageRendererComponent"
          >
        </copilot-slot>
      } @else {
        <copilot-chat-assistant-message-renderer
          [content]="message?.content || ''"
          [inputClass]="markdownRendererClass">
        </copilot-chat-assistant-message-renderer>
      }
      
      <!-- Tool Calls View -->
      @if (toolCallsViewTemplate || toolCallsViewComponent) {
        <copilot-slot
          [slot]="toolCallsViewTemplate || toolCallsViewComponent"
          [context]="toolCallsViewContext()"
          [defaultComponent]="CopilotChatToolCallsViewComponent">
        </copilot-slot>
      } @else if (message?.toolCalls && message.toolCalls.length > 0) {
        <copilot-chat-tool-calls-view
          [message]="message"
          [messages]="messages"
          [isLoading]="isLoading">
        </copilot-chat-tool-calls-view>
      }
      
      <!-- Toolbar -->
      <ng-container *ngIf="toolbarVisible">
        @if (toolbarTemplate || toolbarComponent) {
          <copilot-slot
            [slot]="toolbarTemplate || toolbarComponent"
            [context]="toolbarContext()"
            [defaultComponent]="CopilotChatAssistantMessageToolbarComponent"
            >
          </copilot-slot>
        } @else {
          <div copilotChatAssistantMessageToolbar [inputClass]="toolbarClass">
            <div class="flex items-center gap-1">
              <!-- Copy button -->
              @if (copyButtonTemplate || copyButtonComponent) {
                <copilot-slot
                  [slot]="copyButtonTemplate || copyButtonComponent"
                  [context]="{ content: message?.content || '' }"
                  [defaultComponent]="CopilotChatAssistantMessageCopyButtonComponent"
                  [outputs]="copyButtonOutputs"
                  >
                </copilot-slot>
              } @else {
                <copilot-chat-assistant-message-copy-button
                  [content]="message?.content"
                  [inputClass]="copyButtonClass"
                  (clicked)="handleCopy()">
                </copilot-chat-assistant-message-copy-button>
              }
              
              <!-- Thumbs up button - show if custom slot provided OR if handler available at top level -->
              @if (thumbsUpButtonComponent || thumbsUpButtonTemplate || handlers.hasAssistantThumbsUpHandler()) {
                <copilot-slot
                  [slot]="thumbsUpButtonTemplate || thumbsUpButtonComponent"
                  [context]="{}"
                  [defaultComponent]="defaultThumbsUpButtonComponent"
                  [outputs]="thumbsUpButtonOutputs">
                </copilot-slot>
              }
              
              <!-- Thumbs down button - show if custom slot provided OR if handler available at top level -->
              @if (thumbsDownButtonComponent || thumbsDownButtonTemplate || handlers.hasAssistantThumbsDownHandler()) {
                <copilot-slot
                  [slot]="thumbsDownButtonTemplate || thumbsDownButtonComponent"
                  [context]="{}"
                  [defaultComponent]="defaultThumbsDownButtonComponent"
                  [outputs]="thumbsDownButtonOutputs">
                </copilot-slot>
              }
              
              <!-- Read aloud button - only show if custom slot provided -->
              @if (readAloudButtonComponent || readAloudButtonTemplate) {
                <copilot-slot
                  [slot]="readAloudButtonTemplate || readAloudButtonComponent"
                  [context]="{}"
                  [outputs]="readAloudButtonOutputs"
                  >
                </copilot-slot>
              }
              
              <!-- Regenerate button - only show if custom slot provided -->
              @if (regenerateButtonComponent || regenerateButtonTemplate) {
                <copilot-slot
                  [slot]="regenerateButtonTemplate || regenerateButtonComponent"
                  [context]="{}"
                  [outputs]="regenerateButtonOutputs"
                  >
                </copilot-slot>
              }
              
              <!-- Additional toolbar items -->
              @if (additionalToolbarItems) {
                <ng-container *ngTemplateOutlet="additionalToolbarItems"></ng-container>
              }
            </div>
          </div>
        }
      </ng-container>
    </div>
  `,
  styles: [`
    /* Import KaTeX styles */
    @import 'katex/dist/katex.min.css';

    :host {
      display: block;
      width: 100%;
    }

    /* Atom One Light theme for highlight.js */
    .hljs {
      color: rgb(56, 58, 66);
      background: transparent;
    }

    .hljs-comment,
    .hljs-quote {
      color: #a0a1a7;
      font-style: italic;
    }

    .hljs-doctag,
    .hljs-formula,
    .hljs-keyword {
      color: #a626a4;
    }

    .hljs-deletion,
    .hljs-name,
    .hljs-section,
    .hljs-selector-tag,
    .hljs-subst {
      color: #e45649;
    }

    .hljs-literal {
      color: #0184bb;
    }

    .hljs-addition,
    .hljs-attribute,
    .hljs-meta .hljs-string,
    .hljs-regexp,
    .hljs-string {
      color: #50a14f;
    }

    .hljs-attr,
    .hljs-number,
    .hljs-selector-attr,
    .hljs-selector-class,
    .hljs-selector-pseudo,
    .hljs-template-variable,
    .hljs-type,
    .hljs-variable {
      color: #986801;
    }

    .hljs-params {
      color: rgb(56, 58, 66);
    }

    .hljs-bullet,
    .hljs-link,
    .hljs-meta,
    .hljs-selector-id,
    .hljs-symbol,
    .hljs-title {
      color: #4078f2;
    }

    .hljs-built_in,
    .hljs-class .hljs-title,
    .hljs-title.class_ {
      color: #c18401;
    }

    .hljs-emphasis {
      font-style: italic;
    }

    .hljs-strong {
      font-weight: 700;
    }

    .hljs-link {
      text-decoration: underline;
    }

    /* Atom One Dark theme for highlight.js */
    .dark .hljs {
      color: #abb2bf;
      background: transparent;
    }

    .dark .hljs-comment,
    .dark .hljs-quote {
      color: #5c6370;
      font-style: italic;
    }

    .dark .hljs-doctag,
    .dark .hljs-formula,
    .dark .hljs-keyword {
      color: #c678dd;
    }

    .dark .hljs-deletion,
    .dark .hljs-name,
    .dark .hljs-section,
    .dark .hljs-selector-tag,
    .dark .hljs-subst {
      color: #e06c75;
    }

    .dark .hljs-literal {
      color: #56b6c2;
    }

    .dark .hljs-addition,
    .dark .hljs-attribute,
    .dark .hljs-meta .hljs-string,
    .dark .hljs-regexp,
    .dark .hljs-string {
      color: #98c379;
    }

    .dark .hljs-attr,
    .dark .hljs-number,
    .dark .hljs-selector-attr,
    .dark .hljs-selector-class,
    .dark .hljs-selector-pseudo,
    .dark .hljs-template-variable,
    .dark .hljs-type,
    .dark .hljs-variable {
      color: #d19a66;
    }

    .dark .hljs-bullet,
    .dark .hljs-link,
    .dark .hljs-meta,
    .dark .hljs-selector-id,
    .dark .hljs-symbol,
    .dark .hljs-title {
      color: #61aeee;
    }

    .dark .hljs-built_in,
    .dark .hljs-class .hljs-title,
    .dark .hljs-title.class_ {
      color: #e6c07b;
    }

    .dark .hljs-params {
      color: #abb2bf; /* same as regular text */
    }

    .dark .hljs-emphasis {
      font-style: italic;
    }

    .dark .hljs-strong {
      font-weight: 700;
    }

    .dark .hljs-link {
      text-decoration: underline;
    }
  `]
})
export class CopilotChatAssistantMessageComponent {
  // Capture templates from content projection
  @ContentChild('markdownRenderer', { read: TemplateRef }) markdownRendererTemplate?: TemplateRef<AssistantMessageMarkdownRendererContext>;
  @ContentChild('toolbar', { read: TemplateRef }) toolbarTemplate?: TemplateRef<AssistantMessageToolbarContext>;
  @ContentChild('copyButton', { read: TemplateRef }) copyButtonTemplate?: TemplateRef<AssistantMessageCopyButtonContext>;
  @ContentChild('thumbsUpButton', { read: TemplateRef }) thumbsUpButtonTemplate?: TemplateRef<ThumbsUpButtonContext>;
  @ContentChild('thumbsDownButton', { read: TemplateRef }) thumbsDownButtonTemplate?: TemplateRef<ThumbsDownButtonContext>;
  @ContentChild('readAloudButton', { read: TemplateRef }) readAloudButtonTemplate?: TemplateRef<ReadAloudButtonContext>;
  @ContentChild('regenerateButton', { read: TemplateRef }) regenerateButtonTemplate?: TemplateRef<RegenerateButtonContext>;
  @ContentChild('toolCallsView', { read: TemplateRef }) toolCallsViewTemplate?: TemplateRef<any>;
  
  // Class inputs for styling default components
  @Input() markdownRendererClass?: string;
  @Input() toolbarClass?: string;
  @Input() copyButtonClass?: string;
  @Input() thumbsUpButtonClass?: string;
  @Input() thumbsDownButtonClass?: string;
  @Input() readAloudButtonClass?: string;
  @Input() regenerateButtonClass?: string;
  @Input() toolCallsViewClass?: string;
  
  // Component inputs for overrides
  @Input() markdownRendererComponent?: Type<any>;
  @Input() toolbarComponent?: Type<any>;
  @Input() copyButtonComponent?: Type<any>;
  @Input() thumbsUpButtonComponent?: Type<any>;
  @Input() thumbsDownButtonComponent?: Type<any>;
  @Input() readAloudButtonComponent?: Type<any>;
  @Input() regenerateButtonComponent?: Type<any>;
  @Input() toolCallsViewComponent?: Type<any>;
  
  // Regular inputs
  @Input() message!: AssistantMessage;
  @Input() messages: Message[] = [];
  @Input() isLoading = false;
  @Input() additionalToolbarItems?: TemplateRef<any>;
  @Input() toolbarVisible = true;
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  // DI service exposes handler availability scoped to CopilotChatView
  // Make it optional with a default fallback for testing
  handlers: CopilotChatViewHandlersService;
  
  constructor(@Optional() @Inject(CopilotChatViewHandlersService) handlers?: CopilotChatViewHandlersService | null) {
    this.handlers = handlers || new CopilotChatViewHandlersService();
  }
  
  // Output events
  @Output() thumbsUp = new EventEmitter<CopilotChatAssistantMessageOnThumbsUpProps>();
  @Output() thumbsDown = new EventEmitter<CopilotChatAssistantMessageOnThumbsDownProps>();
  @Output() readAloud = new EventEmitter<CopilotChatAssistantMessageOnReadAloudProps>();
  @Output() regenerate = new EventEmitter<CopilotChatAssistantMessageOnRegenerateProps>();
  
  // Signals
  customClass = signal<string | undefined>(undefined);
  
  // Computed values
  computedClass = computed(() => {
    return cn(
      "prose max-w-full break-words dark:prose-invert",
      this.customClass()
    );
  });
  
  // Default components
  protected readonly defaultThumbsUpButtonComponent = CopilotChatAssistantMessageThumbsUpButtonComponent;
  protected readonly defaultThumbsDownButtonComponent = CopilotChatAssistantMessageThumbsDownButtonComponent;
  protected readonly CopilotChatAssistantMessageRendererComponent = CopilotChatAssistantMessageRendererComponent;
  protected readonly CopilotChatAssistantMessageToolbarComponent = CopilotChatAssistantMessageToolbarComponent;
  protected readonly CopilotChatAssistantMessageCopyButtonComponent = CopilotChatAssistantMessageCopyButtonComponent;
  protected readonly CopilotChatToolCallsViewComponent = CopilotChatToolCallsViewComponent;
  
  // Context for slots (reactive via signals)
  markdownRendererContext = computed<AssistantMessageMarkdownRendererContext>(() => ({
    content: this.message?.content || ''
  }));
  
  // Output maps for slots
  copyButtonOutputs = { clicked: () => this.handleCopy() };
  thumbsUpButtonOutputs = { clicked: () => this.handleThumbsUp() };
  thumbsDownButtonOutputs = { clicked: () => this.handleThumbsDown() };
  readAloudButtonOutputs = { clicked: () => this.handleReadAloud() };
  regenerateButtonOutputs = { clicked: () => this.handleRegenerate() };
  
  toolbarContext = computed<AssistantMessageToolbarContext>(() => ({
    children: null // Will be populated by the toolbar content
  }));
  
  toolCallsViewContext = computed(() => ({
    message: this.message,
    messages: this.messages,
    isLoading: this.isLoading
  }));
  
  handleCopy(): void {
    // Copy is handled by the button component itself
    // This is just for any additional logic if needed
  }
  
  handleThumbsUp(): void {
    this.thumbsUp.emit({ message: this.message });
  }
  
  handleThumbsDown(): void {
    this.thumbsDown.emit({ message: this.message });
  }
  
  handleReadAloud(): void {
    this.readAloud.emit({ message: this.message });
  }
  
  handleRegenerate(): void {
    this.regenerate.emit({ message: this.message });
  }
}

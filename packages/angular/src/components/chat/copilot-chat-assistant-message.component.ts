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
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotSlotComponent } from '../../lib/slots/copilot-slot.component';
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
    CopilotChatAssistantMessageToolbarComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div 
      [class]="computedClass()"
      [attr.data-message-id]="message?.id">
      
      <!-- Markdown Renderer -->
      @if (markdownRendererTemplate || markdownRendererSlot) {
        <copilot-slot
          [slot]="markdownRendererTemplate || markdownRendererSlot"
          [context]="markdownRendererContext()"
          >
        </copilot-slot>
      } @else {
        <copilot-chat-assistant-message-renderer
          [content]="message?.content || ''"
          [inputClass]="markdownRendererClass">
        </copilot-chat-assistant-message-renderer>
      }
      
      <!-- Toolbar -->
      <ng-container *ngIf="toolbarVisible">
        @if (toolbarTemplate || toolbarSlot) {
          <copilot-slot
            [slot]="toolbarTemplate || toolbarSlot"
            [context]="toolbarContext()"
            >
          </copilot-slot>
        } @else {
          <div copilotChatAssistantMessageToolbar [inputClass]="toolbarClass">
            <div class="flex items-center gap-1">
              <!-- Copy button -->
              @if (copyButtonTemplate || copyButtonSlot) {
                <copilot-slot
                  [slot]="copyButtonTemplate || copyButtonSlot"
                  [context]="copyButtonContext()"
                  >
                </copilot-slot>
              } @else {
                <copilot-chat-assistant-message-copy-button
                  [content]="message?.content"
                  [inputClass]="copyButtonClass"
                  (click)="handleCopy()">
                </copilot-chat-assistant-message-copy-button>
              }
              
              <!-- Thumbs up button - show if custom slot provided OR if event is observed -->
              @if (thumbsUpButtonSlot || thumbsUpButtonTemplate || thumbsUp.observed) {
                <copilot-slot
                  [slot]="thumbsUpButtonTemplate || thumbsUpButtonSlot"
                  [context]="thumbsUpButtonContext()"
                  [defaultComponent]="defaultThumbsUpButtonComponent">
                </copilot-slot>
              }
              
              <!-- Thumbs down button - show if custom slot provided OR if event is observed -->
              @if (thumbsDownButtonSlot || thumbsDownButtonTemplate || thumbsDown.observed) {
                <copilot-slot
                  [slot]="thumbsDownButtonTemplate || thumbsDownButtonSlot"
                  [context]="thumbsDownButtonContext()"
                  [defaultComponent]="defaultThumbsDownButtonComponent">
                </copilot-slot>
              }
              
              <!-- Read aloud button - only show if custom slot provided -->
              @if (readAloudButtonSlot || readAloudButtonTemplate) {
                <copilot-slot
                  [slot]="readAloudButtonTemplate || readAloudButtonSlot"
                  [context]="readAloudButtonContext()"
                  >
                </copilot-slot>
              }
              
              <!-- Regenerate button - only show if custom slot provided -->
              @if (regenerateButtonSlot || regenerateButtonTemplate) {
                <copilot-slot
                  [slot]="regenerateButtonTemplate || regenerateButtonSlot"
                  [context]="regenerateButtonContext()"
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
  
  // Class inputs for styling default components
  @Input() markdownRendererClass?: string;
  @Input() toolbarClass?: string;
  @Input() copyButtonClass?: string;
  @Input() thumbsUpButtonClass?: string;
  @Input() thumbsDownButtonClass?: string;
  @Input() readAloudButtonClass?: string;
  @Input() regenerateButtonClass?: string;
  
  // Slot inputs for backward compatibility
  @Input() markdownRendererSlot?: Type<any> | TemplateRef<any>;
  @Input() toolbarSlot?: Type<any> | TemplateRef<any>;
  @Input() copyButtonSlot?: Type<any> | TemplateRef<any>;
  @Input() thumbsUpButtonSlot?: Type<any> | TemplateRef<any>;
  @Input() thumbsDownButtonSlot?: Type<any> | TemplateRef<any>;
  @Input() readAloudButtonSlot?: Type<any> | TemplateRef<any>;
  @Input() regenerateButtonSlot?: Type<any> | TemplateRef<any>;
  
  // Regular inputs
  @Input() message!: AssistantMessage;
  @Input() additionalToolbarItems?: TemplateRef<any>;
  @Input() toolbarVisible = true;
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
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
  
  // Context for slots (reactive via signals)
  markdownRendererContext = computed<AssistantMessageMarkdownRendererContext>(() => ({
    content: this.message?.content || ''
  }));
  
  copyButtonContext = computed<AssistantMessageCopyButtonContext>(() => ({
    onClick: () => this.handleCopy()
  }));
  
  thumbsUpButtonContext = computed<ThumbsUpButtonContext>(() => ({
    onClick: () => this.handleThumbsUp()
  }));
  
  thumbsDownButtonContext = computed<ThumbsDownButtonContext>(() => ({
    onClick: () => this.handleThumbsDown()
  }));
  
  readAloudButtonContext = computed<ReadAloudButtonContext>(() => ({
    onClick: () => this.handleReadAloud()
  }));
  
  regenerateButtonContext = computed<RegenerateButtonContext>(() => ({
    onClick: () => this.handleRegenerate()
  }));
  
  toolbarContext = computed<AssistantMessageToolbarContext>(() => ({
    children: null // Will be populated by the toolbar content
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
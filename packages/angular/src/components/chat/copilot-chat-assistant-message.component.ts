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
          [props]="markdownRendererProps">
        </copilot-slot>
      } @else {
        <copilot-chat-assistant-message-renderer
          [content]="message?.content || ''"
          [inputClass]="markdownRendererProps?.className || markdownRendererProps?.class">
        </copilot-chat-assistant-message-renderer>
      }
      
      <!-- Toolbar -->
      <ng-container *ngIf="toolbarVisible">
        @if (toolbarTemplate || toolbarSlot) {
          <copilot-slot
            [slot]="toolbarTemplate || toolbarSlot"
            [context]="toolbarContext()"
            [props]="toolbarProps">
          </copilot-slot>
        } @else {
          <div copilotChatAssistantMessageToolbar [inputClass]="toolbarProps?.className || toolbarProps?.class">
            <div class="flex items-center gap-1">
              <!-- Copy button -->
              @if (copyButtonTemplate || copyButtonSlot) {
                <copilot-slot
                  [slot]="copyButtonTemplate || copyButtonSlot"
                  [context]="copyButtonContext()"
                  [props]="copyButtonProps">
                </copilot-slot>
              } @else {
                <copilot-chat-assistant-message-copy-button
                  [content]="message?.content"
                  [inputClass]="copyButtonProps?.className || copyButtonProps?.class"
                  (click)="handleCopy()">
                </copilot-chat-assistant-message-copy-button>
              }
              
              <!-- Thumbs up button -->
              @if (thumbsUp.observed || thumbsUpButtonSlot || thumbsUpButtonTemplate) {
                @if (thumbsUpButtonTemplate || thumbsUpButtonSlot) {
                  <copilot-slot
                    [slot]="thumbsUpButtonTemplate || thumbsUpButtonSlot"
                    [context]="thumbsUpButtonContext()"
                    [props]="thumbsUpButtonProps">
                  </copilot-slot>
                } @else {
                  <copilot-chat-assistant-message-thumbs-up-button
                    [inputClass]="thumbsUpButtonProps?.className || thumbsUpButtonProps?.class"
                    (click)="handleThumbsUp()">
                  </copilot-chat-assistant-message-thumbs-up-button>
                }
              }
              
              <!-- Thumbs down button -->
              @if (thumbsDown.observed || thumbsDownButtonSlot || thumbsDownButtonTemplate) {
                @if (thumbsDownButtonTemplate || thumbsDownButtonSlot) {
                  <copilot-slot
                    [slot]="thumbsDownButtonTemplate || thumbsDownButtonSlot"
                    [context]="thumbsDownButtonContext()"
                    [props]="thumbsDownButtonProps">
                  </copilot-slot>
                } @else {
                  <copilot-chat-assistant-message-thumbs-down-button
                    [inputClass]="thumbsDownButtonProps?.className || thumbsDownButtonProps?.class"
                    (click)="handleThumbsDown()">
                  </copilot-chat-assistant-message-thumbs-down-button>
                }
              }
              
              <!-- Read aloud button -->
              @if (readAloud.observed || readAloudButtonSlot || readAloudButtonTemplate) {
                @if (readAloudButtonTemplate || readAloudButtonSlot) {
                  <copilot-slot
                    [slot]="readAloudButtonTemplate || readAloudButtonSlot"
                    [context]="readAloudButtonContext()"
                    [props]="readAloudButtonProps">
                  </copilot-slot>
                } @else {
                  <copilot-chat-assistant-message-read-aloud-button
                    [inputClass]="readAloudButtonProps?.className || readAloudButtonProps?.class"
                    (click)="handleReadAloud()">
                  </copilot-chat-assistant-message-read-aloud-button>
                }
              }
              
              <!-- Regenerate button -->
              @if (regenerate.observed || regenerateButtonSlot || regenerateButtonTemplate) {
                @if (regenerateButtonTemplate || regenerateButtonSlot) {
                  <copilot-slot
                    [slot]="regenerateButtonTemplate || regenerateButtonSlot"
                    [context]="regenerateButtonContext()"
                    [props]="regenerateButtonProps">
                  </copilot-slot>
                } @else {
                  <copilot-chat-assistant-message-regenerate-button
                    [inputClass]="regenerateButtonProps?.className || regenerateButtonProps?.class"
                    (click)="handleRegenerate()">
                  </copilot-chat-assistant-message-regenerate-button>
                }
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

    /* Light mode highlight.js theme (GitHub style) */
    .hljs {
      color: #24292e;
      background: transparent;
    }

    .hljs-comment,
    .hljs-quote {
      color: #6a737d;
    }

    .hljs-keyword,
    .hljs-selector-tag,
    .hljs-literal,
    .hljs-title,
    .hljs-section,
    .hljs-doctag,
    .hljs-type,
    .hljs-name,
    .hljs-strong {
      color: #d73a49;
      font-weight: bold;
    }

    .hljs-string,
    .hljs-number,
    .hljs-regexp,
    .hljs-meta .hljs-meta-string,
    .hljs-template-tag,
    .hljs-template-variable {
      color: #032f62;
    }

    .hljs-subst {
      color: #24292e;
    }

    .hljs-function,
    .hljs-title.function_,
    .hljs-built_in {
      color: #6f42c1;
    }

    .hljs-symbol,
    .hljs-bullet,
    .hljs-link {
      color: #005cc5;
    }

    .hljs-meta,
    .hljs-attribute,
    .hljs-variable,
    .hljs-params {
      color: #e36209;
    }

    .hljs-attr {
      color: #6f42c1;
    }

    .hljs-formula {
      background-color: #f6f8fa;
    }

    .hljs-deletion {
      background-color: #ffeef0;
      color: #d73a49;
    }

    .hljs-addition {
      background-color: #f0fff4;
      color: #22863a;
    }

    .hljs-emphasis {
      font-style: italic;
    }

    /* Dark mode adjustments for highlight.js */
    .dark .hljs {
      background: transparent;
      color: #e1e4e8;
    }

    .dark .hljs-comment,
    .dark .hljs-quote {
      color: #6a737d;
    }

    .dark .hljs-keyword,
    .dark .hljs-selector-tag,
    .dark .hljs-addition {
      color: #f97583;
    }

    .dark .hljs-number,
    .dark .hljs-string,
    .dark .hljs-meta .hljs-meta-string,
    .dark .hljs-literal,
    .dark .hljs-doctag,
    .dark .hljs-regexp {
      color: #79b8ff;
    }

    .dark .hljs-title,
    .dark .hljs-section,
    .dark .hljs-name,
    .dark .hljs-selector-id,
    .dark .hljs-selector-class {
      color: #b392f0;
    }

    .dark .hljs-attribute,
    .dark .hljs-attr,
    .dark .hljs-variable,
    .dark .hljs-template-variable,
    .dark .hljs-class .hljs-title,
    .dark .hljs-type {
      color: #ffab70;
    }

    .dark .hljs-symbol,
    .dark .hljs-bullet,
    .dark .hljs-subst,
    .dark .hljs-meta,
    .dark .hljs-meta .hljs-keyword,
    .dark .hljs-selector-attr,
    .dark .hljs-selector-pseudo,
    .dark .hljs-link {
      color: #85e89d;
    }

    .dark .hljs-built_in,
    .dark .hljs-deletion {
      color: #f97583;
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
  
  // Props for tweaking default components
  @Input() markdownRendererProps?: any;
  @Input() toolbarProps?: any;
  @Input() copyButtonProps?: any;
  @Input() thumbsUpButtonProps?: any;
  @Input() thumbsDownButtonProps?: any;
  @Input() readAloudButtonProps?: any;
  @Input() regenerateButtonProps?: any;
  
  // Slot inputs for backward compatibility
  @Input() markdownRendererSlot?: Type<any> | TemplateRef<any> | string;
  @Input() toolbarSlot?: Type<any> | TemplateRef<any> | string;
  @Input() copyButtonSlot?: Type<any> | TemplateRef<any> | string;
  @Input() thumbsUpButtonSlot?: Type<any> | TemplateRef<any> | string;
  @Input() thumbsDownButtonSlot?: Type<any> | TemplateRef<any> | string;
  @Input() readAloudButtonSlot?: Type<any> | TemplateRef<any> | string;
  @Input() regenerateButtonSlot?: Type<any> | TemplateRef<any> | string;
  
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
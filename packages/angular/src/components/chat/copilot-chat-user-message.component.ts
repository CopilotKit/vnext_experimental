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
  type UserMessage,
  type CopilotChatUserMessageOnEditMessageProps,
  type CopilotChatUserMessageOnSwitchToBranchProps,
  type MessageRendererContext,
  type CopyButtonContext,
  type EditButtonContext,
  type BranchNavigationContext,
  type ToolbarContext
} from './copilot-chat-user-message.types';
import { CopilotChatUserMessageRendererComponent } from './copilot-chat-user-message-renderer.component';
import {
  CopilotChatUserMessageCopyButtonComponent,
  CopilotChatUserMessageEditButtonComponent
} from './copilot-chat-user-message-buttons.component';
import { CopilotChatUserMessageToolbarComponent } from './copilot-chat-user-message-toolbar.component';
import { CopilotChatUserMessageBranchNavigationComponent } from './copilot-chat-user-message-branch-navigation.component';
import { cn } from '../../lib/utils';

@Component({
  selector: 'copilot-chat-user-message',
  standalone: true,
  imports: [
    CommonModule,
    CopilotSlotComponent,
    CopilotChatUserMessageRendererComponent,
    CopilotChatUserMessageCopyButtonComponent,
    CopilotChatUserMessageEditButtonComponent,
    CopilotChatUserMessageToolbarComponent,
    CopilotChatUserMessageBranchNavigationComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div 
      [class]="computedClass()"
      [attr.data-message-id]="message.id">
      
      <!-- Message Renderer -->
      @if (messageRendererTemplate || messageRendererComponent) {
        <copilot-slot
          [slot]="messageRendererTemplate || messageRendererComponent"
          [context]="messageRendererContext()"
          [defaultComponent]="CopilotChatUserMessageRendererComponent"
          >
        </copilot-slot>
      } @else {
        <copilot-chat-user-message-renderer
          [content]="message.content || ''"
          [inputClass]="messageRendererClass">
        </copilot-chat-user-message-renderer>
      }
      
      <!-- Toolbar -->
      @if (toolbarTemplate || toolbarComponent) {
        <copilot-slot
          [slot]="toolbarTemplate || toolbarComponent"
          [context]="toolbarContext()"
          [defaultComponent]="CopilotChatUserMessageToolbarComponent"
          >
        </copilot-slot>
      } @else {
        <div copilotChatUserMessageToolbar [inputClass]="toolbarClass">
          <div class="flex items-center gap-1 justify-end">
            <!-- Additional toolbar items -->
            @if (additionalToolbarItems) {
              <ng-container *ngTemplateOutlet="additionalToolbarItems"></ng-container>
            }
            
            <!-- Copy button -->
            @if (copyButtonTemplate || copyButtonComponent) {
              <copilot-slot
                [slot]="copyButtonTemplate || copyButtonComponent"
                [context]="{ content: message?.content || '' }"
                [outputs]="copyButtonOutputs"
                [defaultComponent]="CopilotChatUserMessageCopyButtonComponent"
                >
              </copilot-slot>
            } @else {
              <copilot-chat-user-message-copy-button
                [content]="message.content"
                [inputClass]="copyButtonClass"
                (clicked)="handleCopy()">
              </copilot-chat-user-message-copy-button>
            }
            
            <!-- Edit button -->
            @if (editMessage.observed) {
              @if (editButtonTemplate || editButtonComponent) {
                <copilot-slot
                  [slot]="editButtonTemplate || editButtonComponent"
                  [context]="{}"
                  [outputs]="editButtonOutputs"
                  [defaultComponent]="CopilotChatUserMessageEditButtonComponent"
                  >
                </copilot-slot>
              } @else {
                <copilot-chat-user-message-edit-button
                  [inputClass]="editButtonClass"
                  (clicked)="handleEdit()">
                </copilot-chat-user-message-edit-button>
              }
            }
            
            <!-- Branch navigation -->
            @if (showBranchNavigation()) {
              @if (branchNavigationTemplate || branchNavigationComponent) {
                <copilot-slot
                  [slot]="branchNavigationTemplate || branchNavigationComponent"
                  [context]="branchNavigationContext()"
                  [defaultComponent]="CopilotChatUserMessageBranchNavigationComponent"
                  >
                </copilot-slot>
              } @else {
                <copilot-chat-user-message-branch-navigation
                  [currentBranch]="branchIndexSignal()"
                  [numberOfBranches]="numberOfBranchesSignal()"
                  [message]="message"
                  [inputClass]="branchNavigationClass"
                  (switchToBranch)="handleSwitchToBranch($event)">
                </copilot-chat-user-message-branch-navigation>
              }
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class CopilotChatUserMessageComponent {
  // Capture templates from content projection
  @ContentChild('messageRenderer', { read: TemplateRef }) messageRendererTemplate?: TemplateRef<MessageRendererContext>;
  @ContentChild('toolbar', { read: TemplateRef }) toolbarTemplate?: TemplateRef<ToolbarContext>;
  @ContentChild('copyButton', { read: TemplateRef }) copyButtonTemplate?: TemplateRef<CopyButtonContext>;
  @ContentChild('editButton', { read: TemplateRef }) editButtonTemplate?: TemplateRef<EditButtonContext>;
  @ContentChild('branchNavigation', { read: TemplateRef }) branchNavigationTemplate?: TemplateRef<BranchNavigationContext>;
  
  // Props for tweaking default components
  @Input() messageRendererClass?: string;
  @Input() toolbarClass?: string;
  @Input() copyButtonClass?: string;
  @Input() editButtonClass?: string;
  @Input() branchNavigationClass?: string;
  
  // Component inputs for overrides
  @Input() messageRendererComponent?: Type<any>;
  @Input() toolbarComponent?: Type<any>;
  @Input() copyButtonComponent?: Type<any>;
  @Input() editButtonComponent?: Type<any>;
  @Input() branchNavigationComponent?: Type<any>;
  
  // Regular inputs
  @Input() message!: UserMessage;
  @Input() set branchIndex(val: number | undefined) {
    this.branchIndexSignal.set(val ?? 0);
  }
  @Input() set numberOfBranches(val: number | undefined) {
    this.numberOfBranchesSignal.set(val ?? 1);
  }
  @Input() additionalToolbarItems?: TemplateRef<any>;
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  // Output events
  @Output() editMessage = new EventEmitter<CopilotChatUserMessageOnEditMessageProps>();
  @Output() switchToBranch = new EventEmitter<CopilotChatUserMessageOnSwitchToBranchProps>();
  
  // Signals
  branchIndexSignal = signal(0);
  numberOfBranchesSignal = signal(1);
  customClass = signal<string | undefined>(undefined);
  
  // Default components
  CopilotChatUserMessageRendererComponent = CopilotChatUserMessageRendererComponent;
  CopilotChatUserMessageToolbarComponent = CopilotChatUserMessageToolbarComponent;
  CopilotChatUserMessageCopyButtonComponent = CopilotChatUserMessageCopyButtonComponent;
  CopilotChatUserMessageEditButtonComponent = CopilotChatUserMessageEditButtonComponent;
  CopilotChatUserMessageBranchNavigationComponent = CopilotChatUserMessageBranchNavigationComponent;
  
  // Computed values
  showBranchNavigation = computed(() => {
    const branches = this.numberOfBranchesSignal();
    return branches > 1 && this.switchToBranch.observed;
  });
  
  computedClass = computed(() => {
    return cn(
      "flex flex-col items-end group pt-10",
      this.customClass()
    );
  });
  
  // Context for slots (reactive via signals)
  messageRendererContext = computed<MessageRendererContext>(() => ({
    content: this.message?.content || ''
  }));
  
  // Output maps for slots
  copyButtonOutputs = { clicked: this.handleCopy.bind(this) };
  editButtonOutputs = { clicked: this.handleEdit.bind(this) };
  
  branchNavigationContext = computed<BranchNavigationContext>(() => ({
    currentBranch: this.branchIndexSignal(),
    numberOfBranches: this.numberOfBranchesSignal(),
    onSwitchToBranch: (props) => this.handleSwitchToBranch(props),
    message: this.message
  }));
  
  toolbarContext = computed<ToolbarContext>(() => ({
    children: null // Will be populated by the toolbar content
  }));
  
  handleCopy(): void {
    // Copy is handled by the button component itself
    // This is just for any additional logic if needed
  }
  
  handleEdit(): void {
    this.editMessage.emit({ message: this.message });
  }
  
  handleSwitchToBranch(props: CopilotChatUserMessageOnSwitchToBranchProps): void {
    this.switchToBranch.emit(props);
  }
}
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  TemplateRef,
  signal,
  computed,
  effect,
  inject,
  ChangeDetectionStrategy,
  AfterViewInit,
  OnDestroy,
  Type,
  ViewContainerRef,
  ViewEncapsulation,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotSlotDirective } from '../../lib/slots/slot.directive';
import { SlotProxyDirective } from '../../lib/slots/slot-proxy.directive';
import { SlotRegistryService } from '../../lib/slots/slot-registry.service';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import { LucideAngularModule, ArrowUp } from 'lucide-angular';
import { CopilotChatTextareaComponent } from './copilot-chat-textarea.component';
import { CopilotChatAudioRecorderComponent } from './copilot-chat-audio-recorder.component';
import {
  CopilotChatSendButtonComponent,
  CopilotChatStartTranscribeButtonComponent,
  CopilotChatCancelTranscribeButtonComponent,
  CopilotChatFinishTranscribeButtonComponent,
  CopilotChatAddFileButtonComponent
} from './copilot-chat-buttons.component';
import { CopilotChatToolbarComponent } from './copilot-chat-toolbar.component';
import { CopilotChatToolsMenuComponent } from './copilot-chat-tools-menu.component';
import type {
  CopilotChatInputMode,
  ToolsMenuItem
} from './copilot-chat-input.types';
import { cn } from '../../lib/utils';

@Component({
  selector: 'copilot-chat-input',
  standalone: true,
  imports: [
    CommonModule,
    CopilotSlotDirective,
    SlotProxyDirective,
    LucideAngularModule,
    CopilotChatTextareaComponent,
    CopilotChatAudioRecorderComponent,
    CopilotChatSendButtonComponent,
    CopilotChatStartTranscribeButtonComponent,
    CopilotChatCancelTranscribeButtonComponent,
    CopilotChatFinishTranscribeButtonComponent,
    CopilotChatAddFileButtonComponent,
    CopilotChatToolbarComponent,
    CopilotChatToolsMenuComponent
  ],
  providers: [SlotRegistryService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="computedClass()">
      <!-- Main input area: either textarea or audio recorder -->
      @if (computedMode() === 'transcribe') {
        <copilot-chat-audio-recorder
          [inputShowControls]="true">
        </copilot-chat-audio-recorder>
      } @else {
        <textarea copilotChatTextarea
          [inputValue]="computedValue()"
          [inputAutoFocus]="computedAutoFocus()"
          [inputDisabled]="computedMode() === 'processing'"
          (keyDown)="handleKeyDown($event)"
          (valueChange)="handleValueChange($event)"></textarea>
      }
      
      <!-- Toolbar -->
      <div copilotChatToolbar>
        <div class="flex items-center">
          @if (addFile.observed) {
            <copilot-chat-add-file-button
              [disabled]="computedMode() === 'transcribe'"
              (click)="handleAddFile()">
            </copilot-chat-add-file-button>
          }
          @if (computedToolsMenu().length > 0) {
            <copilot-chat-tools-menu
              [inputToolsMenu]="computedToolsMenu()"
              [inputDisabled]="computedMode() === 'transcribe'">
            </copilot-chat-tools-menu>
          }
        </div>
        <div class="flex items-center">
          @if (computedMode() === 'transcribe') {
            @if (cancelTranscribe.observed) {
              <copilot-chat-cancel-transcribe-button
                (click)="handleCancelTranscribe()">
              </copilot-chat-cancel-transcribe-button>
            }
            @if (finishTranscribe.observed) {
              <copilot-chat-finish-transcribe-button
                (click)="handleFinishTranscribe()">
              </copilot-chat-finish-transcribe-button>
            }
          } @else {
            @if (startTranscribe.observed) {
              <copilot-chat-start-transcribe-button
                (click)="handleStartTranscribe()">
              </copilot-chat-start-transcribe-button>
            }
            <!-- Use the new slot proxy system -->
            <button 
              [slotProxy]="'chat.input.sendButton'"
              [defaultClass]="defaultButtonClass"
              [defaultProps]="sendButtonProps()"
              (slotClick)="send()"
              [disabled]="!computedValue().trim()"
              (click)="send()">
              <lucide-angular [img]="ArrowUpIcon" [size]="18"></lucide-angular>
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .shadow-\\[0_4px_4px_0_\\#0000000a\\2c_0_0_1px_0_\\#0000009e\\] {
      box-shadow: 0 4px 4px 0 #0000000a, 0 0 1px 0 #0000009e !important;
    }
  `]
})
export class CopilotChatInputComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('slotContainer', { read: ViewContainerRef }) slotContainer!: ViewContainerRef;
  @ViewChild(CopilotChatTextareaComponent, { read: CopilotChatTextareaComponent }) textAreaRef?: CopilotChatTextareaComponent;
  @ViewChild(CopilotChatAudioRecorderComponent) audioRecorderRef?: CopilotChatAudioRecorderComponent;
  
  // Input properties
  @Input() set mode(val: CopilotChatInputMode | undefined) {
    this.modeSignal.set(val || 'input');
  }
  @Input() set toolsMenu(val: (ToolsMenuItem | '-')[] | undefined) {
    this.toolsMenuSignal.set(val || []);
  }
  @Input() set autoFocus(val: boolean | undefined) {
    this.autoFocusSignal.set(val ?? true);
  }
  @Input() set additionalToolbarItems(val: TemplateRef<any> | undefined) {
    this.additionalToolbarItemsSignal.set(val);
  }
  @Input() set value(val: string | undefined) {
    this.valueSignal.set(val || '');
  }
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  // Slot inputs
  @Input() set textAreaSlot(val: Type<any> | TemplateRef<any> | string | undefined) {
    this.textAreaSlotSignal.set(val);
  }
  @Input() set sendButtonSlot(val: Type<any> | TemplateRef<any> | string | undefined) {
    this.sendButtonSlotSignal.set(val);
  }
  @Input() set startTranscribeButtonSlot(val: Type<any> | TemplateRef<any> | string | undefined) {
    this.startTranscribeButtonSlotSignal.set(val);
  }
  @Input() set cancelTranscribeButtonSlot(val: Type<any> | TemplateRef<any> | string | undefined) {
    this.cancelTranscribeButtonSlotSignal.set(val);
  }
  @Input() set finishTranscribeButtonSlot(val: Type<any> | TemplateRef<any> | string | undefined) {
    this.finishTranscribeButtonSlotSignal.set(val);
  }
  @Input() set addFileButtonSlot(val: Type<any> | TemplateRef<any> | string | undefined) {
    this.addFileButtonSlotSignal.set(val);
  }
  @Input() set toolsButtonSlot(val: Type<any> | TemplateRef<any> | string | undefined) {
    this.toolsButtonSlotSignal.set(val);
  }
  @Input() set toolbarSlot(val: Type<any> | TemplateRef<any> | string | undefined) {
    this.toolbarSlotSignal.set(val);
  }
  @Input() set audioRecorderSlot(val: Type<any> | TemplateRef<any> | string | undefined) {
    this.audioRecorderSlotSignal.set(val);
  }
  
  // Output events
  @Output() submitMessage = new EventEmitter<string>();
  @Output() startTranscribe = new EventEmitter<void>();
  @Output() cancelTranscribe = new EventEmitter<void>();
  @Output() finishTranscribe = new EventEmitter<void>();
  @Output() addFile = new EventEmitter<void>();
  @Output() valueChange = new EventEmitter<string>();
  
  // Event handler for send button (used with slot)
  sendButtonClick = () => this.send();
  
  // Icons and default classes
  readonly ArrowUpIcon = ArrowUp;
  readonly defaultButtonClass = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full h-9 w-9 bg-black text-white dark:bg-white dark:text-black transition-colors hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed';
  
  // Services
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  private slotRegistry = inject(SlotRegistryService);
  
  // Signals
  modeSignal = signal<CopilotChatInputMode>('input');
  toolsMenuSignal = signal<(ToolsMenuItem | '-')[]>([]);
  autoFocusSignal = signal<boolean>(true);
  additionalToolbarItemsSignal = signal<TemplateRef<any> | undefined>(undefined);
  valueSignal = signal<string>('');
  customClass = signal<string | undefined>(undefined);
  
  // Slot signals
  textAreaSlotSignal = signal<Type<any> | TemplateRef<any> | string | undefined>(undefined);
  sendButtonSlotSignal = signal<Type<any> | TemplateRef<any> | string | undefined>(undefined);
  startTranscribeButtonSlotSignal = signal<Type<any> | TemplateRef<any> | string | undefined>(undefined);
  cancelTranscribeButtonSlotSignal = signal<Type<any> | TemplateRef<any> | string | undefined>(undefined);
  finishTranscribeButtonSlotSignal = signal<Type<any> | TemplateRef<any> | string | undefined>(undefined);
  addFileButtonSlotSignal = signal<Type<any> | TemplateRef<any> | string | undefined>(undefined);
  toolsButtonSlotSignal = signal<Type<any> | TemplateRef<any> | string | undefined>(undefined);
  toolbarSlotSignal = signal<Type<any> | TemplateRef<any> | string | undefined>(undefined);
  audioRecorderSlotSignal = signal<Type<any> | TemplateRef<any> | string | undefined>(undefined);
  
  // Default components
  defaultTextArea = CopilotChatTextareaComponent;
  defaultAudioRecorder = CopilotChatAudioRecorderComponent;
  defaultSendButton = CopilotChatSendButtonComponent;
  defaultStartTranscribeButton = CopilotChatStartTranscribeButtonComponent;
  defaultCancelTranscribeButton = CopilotChatCancelTranscribeButtonComponent;
  defaultFinishTranscribeButton = CopilotChatFinishTranscribeButtonComponent;
  defaultAddFileButton = CopilotChatAddFileButtonComponent;
  defaultToolsButton = CopilotChatToolsMenuComponent;
  defaultToolbar = CopilotChatToolbarComponent;
  
  // Computed values - use different names to avoid conflicts with Input setters
  computedMode = computed(() => this.modeSignal());
  computedToolsMenu = computed(() => this.toolsMenuSignal());
  computedAutoFocus = computed(() => this.autoFocusSignal());
  computedAdditionalToolbarItems = computed(() => this.additionalToolbarItemsSignal());
  computedValue = computed(() => {
    const customValue = this.valueSignal();
    const configValue = this.chatConfig?.inputValue();
    return customValue || configValue || '';
  });
  
  computedClass = computed(() => {
    const baseClasses = cn(
      // Layout
      'flex w-full flex-col items-center justify-center',
      // Interaction
      'cursor-text',
      // Overflow and clipping - REMOVED contain-inline-size which causes vertical text
      'overflow-visible bg-clip-padding',
      // Background
      'bg-white dark:bg-[#303030]',
      // Visual effects
      'shadow-[0_4px_4px_0_#0000000a,0_0_1px_0_#0000009e] rounded-[28px]'
    );
    return cn(baseClasses, this.customClass());
  });
  
  // Slot getters - use different names to avoid conflicts with Input setters
  computedTextAreaSlot = computed(() => this.textAreaSlotSignal());
  computedSendButtonSlot = computed(() => this.sendButtonSlotSignal());
  computedStartTranscribeButtonSlot = computed(() => this.startTranscribeButtonSlotSignal());
  computedCancelTranscribeButtonSlot = computed(() => this.cancelTranscribeButtonSlotSignal());
  computedFinishTranscribeButtonSlot = computed(() => this.finishTranscribeButtonSlotSignal());
  computedAddFileButtonSlot = computed(() => this.addFileButtonSlotSignal());
  computedToolsButtonSlot = computed(() => this.toolsButtonSlotSignal());
  computedToolbarSlot = computed(() => this.toolbarSlotSignal());
  computedAudioRecorderSlot = computed(() => this.audioRecorderSlotSignal());
  
  // Props for slots
  textAreaProps = computed(() => ({
    inputValue: this.computedValue(),
    inputAutoFocus: this.computedAutoFocus(),
    inputDisabled: this.computedMode() === 'processing',
    onKeyDown: (event: KeyboardEvent) => this.handleKeyDown(event),
    valueChange: (value: string) => this.handleValueChange(value)
  }));
  
  sendButtonProps = computed(() => ({
    disabled: !this.computedValue().trim(),
    click: () => this.send()
  }));
  
  audioRecorderProps = computed(() => ({
    inputShowControls: true
  }));
  
  toolbarProps = computed(() => {
    // Create the toolbar content
    const content = this.createToolbarContent();
    return { content };
  });
  
  constructor() {
    // Effect to handle mode changes
    effect(() => {
      const currentMode = this.computedMode();
      if (currentMode === 'transcribe' && this.audioRecorderRef) {
        this.audioRecorderRef.start().catch(console.error);
      } else if (this.audioRecorderRef?.getState() === 'recording') {
        this.audioRecorderRef.stop().catch(console.error);
      }
    });
    
    // Sync with chat configuration
    effect(() => {
      const configValue = this.chatConfig?.inputValue();
      if (configValue !== undefined && !this.valueSignal()) {
        this.valueSignal.set(configValue);
      }
    });
    
    // Register slots when they change
    effect(() => {
      this.registerSlot('chat.input.sendButton', this.sendButtonSlotSignal());
      this.registerSlot('chat.input.startTranscribeButton', this.startTranscribeButtonSlotSignal());
      this.registerSlot('chat.input.cancelTranscribeButton', this.cancelTranscribeButtonSlotSignal());
      this.registerSlot('chat.input.finishTranscribeButton', this.finishTranscribeButtonSlotSignal());
      this.registerSlot('chat.input.addFileButton', this.addFileButtonSlotSignal());
      this.registerSlot('chat.input.toolsButton', this.toolsButtonSlotSignal());
      this.registerSlot('chat.input.toolbar', this.toolbarSlotSignal());
      this.registerSlot('chat.input.textArea', this.textAreaSlotSignal());
      this.registerSlot('chat.input.audioRecorder', this.audioRecorderSlotSignal());
    });
  }
  
  ngOnInit(): void {
    // Register initial slots
    this.registerSlot('chat.input.sendButton', this.sendButtonSlotSignal());
    this.registerSlot('chat.input.startTranscribeButton', this.startTranscribeButtonSlotSignal());
    this.registerSlot('chat.input.cancelTranscribeButton', this.cancelTranscribeButtonSlotSignal());
    this.registerSlot('chat.input.finishTranscribeButton', this.finishTranscribeButtonSlotSignal());
    this.registerSlot('chat.input.addFileButton', this.addFileButtonSlotSignal());
    this.registerSlot('chat.input.toolsButton', this.toolsButtonSlotSignal());
    this.registerSlot('chat.input.toolbar', this.toolbarSlotSignal());
    this.registerSlot('chat.input.textArea', this.textAreaSlotSignal());
    this.registerSlot('chat.input.audioRecorder', this.audioRecorderSlotSignal());
  }
  
  ngAfterViewInit(): void {
    // Auto-focus if needed
    if (this.computedAutoFocus() && this.textAreaRef) {
      setTimeout(() => {
        this.textAreaRef?.focus();
      });
    }
  }
  
  ngOnDestroy(): void {
    // Clean up any resources
    if (this.audioRecorderRef?.getState() === 'recording') {
      this.audioRecorderRef.stop().catch(console.error);
    }
  }
  
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }
  
  handleValueChange(value: string): void {
    this.valueSignal.set(value);
    this.valueChange.emit(value);
    
    if (this.chatConfig) {
      this.chatConfig.setInputValue(value);
    }
  }
  
  send(): void {
    const trimmed = this.computedValue().trim();
    if (trimmed) {
      this.submitMessage.emit(trimmed);
      
      // Use chat config handler if available
      if (this.chatConfig) {
        this.chatConfig.submitInput(trimmed);
      }
      
      // Clear input
      this.valueSignal.set('');
      if (this.textAreaRef) {
        this.textAreaRef.setValue('');
      }
      
      // Refocus input
      if (this.textAreaRef) {
        setTimeout(() => {
          this.textAreaRef?.focus();
        });
      }
    }
  }
  
  handleStartTranscribe(): void {
    this.startTranscribe.emit();
    this.modeSignal.set('transcribe');
  }
  
  handleCancelTranscribe(): void {
    this.cancelTranscribe.emit();
    this.modeSignal.set('input');
  }
  
  handleFinishTranscribe(): void {
    this.finishTranscribe.emit();
    this.modeSignal.set('input');
  }
  
  handleAddFile(): void {
    this.addFile.emit();
  }
  
  private createToolbarContent(): TemplateRef<any> | undefined {
    // This will be rendered inside the toolbar slot
    // The actual rendering will be handled by the slot directive
    return undefined;
  }
  
  private registerSlot(path: string, value: Type<any> | TemplateRef<any> | string | undefined): void {
    if (!value) {
      return;
    }
    
    // Determine slot type and register
    if (typeof value === 'string') {
      // String is treated as a class override
      this.slotRegistry.register(path, {
        type: 'class',
        value: value
      });
    } else if (value instanceof TemplateRef) {
      // Template reference
      this.slotRegistry.register(path, {
        type: 'template',
        value: value
      });
    } else {
      // Component type
      this.slotRegistry.register(path, {
        type: 'component',
        value: {
          componentType: value,
          props: {}
        }
      });
    }
  }
}
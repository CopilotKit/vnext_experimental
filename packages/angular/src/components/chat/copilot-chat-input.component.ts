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
  ViewContainerRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotSlotDirective } from '../../lib/slots/slot.directive';
import { renderSlot } from '../../lib/slots/slot.utils';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
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
  ToolsMenuItem,
  CopilotChatInputSlots
} from './copilot-chat-input.types';

@Component({
  selector: 'copilot-chat-input',
  standalone: true,
  imports: [
    CommonModule,
    CopilotSlotDirective,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="computedClass()">
      <!-- Main input area: either textarea or audio recorder -->
      @if (computedMode() === 'transcribe') {
        <ng-container 
          [copilotSlot]="computedAudioRecorderSlot()"
          [slotDefault]="defaultAudioRecorder"
          [slotProps]="audioRecorderProps()">
        </ng-container>
      } @else {
        <ng-container 
          [copilotSlot]="computedTextAreaSlot()"
          [slotDefault]="defaultTextArea"
          [slotProps]="textAreaProps()">
        </ng-container>
      }
      
      <!-- Toolbar -->
      <ng-container 
        [copilotSlot]="computedToolbarSlot()"
        [slotDefault]="defaultToolbar"
        [slotProps]="toolbarProps()">
      </ng-container>
      
      <!-- Hidden containers for rendering slot content -->
      <div class="slot-content" style="display: none;">
        <div #slotContainer></div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    
    .chat-input-container {
      display: flex;
      width: 100%;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: text;
      overflow: visible;
      background-clip: padding-box;
      contain: inline-size;
      background: white;
      box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.04), 0 0 1px 0 rgba(0, 0, 0, 0.62);
      border-radius: 28px;
    }
    
    :host-context(.dark) .chat-input-container {
      background: #303030;
    }
  `],
  host: {
    '[class.copilot-chat-input]': 'true'
  }
})
export class CopilotChatInputComponent implements AfterViewInit, OnDestroy {
  @ViewChild('slotContainer', { read: ViewContainerRef }) slotContainer!: ViewContainerRef;
  @ViewChild(CopilotChatTextareaComponent) textAreaRef?: CopilotChatTextareaComponent;
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
  
  // Services
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
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
    const baseClasses = 'chat-input-container';
    return this.customClass() || baseClasses;
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
}
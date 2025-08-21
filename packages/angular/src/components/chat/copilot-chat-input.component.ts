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
  ViewEncapsulation,
  ContentChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotSlotComponent } from '../../lib/slots/copilot-slot.component';
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

/**
 * Context provided to slot templates
 */
export interface SendButtonContext {
  send: () => void;
  disabled: boolean;
  value: string;
}

export interface ToolbarContext {
  mode: CopilotChatInputMode;
  value: string;
}

@Component({
  selector: 'copilot-chat-input',
  standalone: true,
  imports: [
    CommonModule,
    CopilotSlotComponent,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="computedClass()">
      <!-- Main input area: either textarea or audio recorder -->
      @if (computedMode() === 'transcribe') {
        @if (audioRecorderTemplate || audioRecorderSlot) {
          <copilot-slot 
            [slot]="audioRecorderTemplate || audioRecorderSlot"
            [context]="audioRecorderContext()"
            [props]="audioRecorderProps">
          </copilot-slot>
        } @else {
          <copilot-chat-audio-recorder
            [inputShowControls]="true">
          </copilot-chat-audio-recorder>
        }
      } @else {
        @if (textAreaTemplate) {
          <ng-container *ngTemplateOutlet="textAreaTemplate; context: textAreaContext()"></ng-container>
        } @else if (textAreaSlot && !isDirective(textAreaSlot)) {
          <copilot-slot
            [slot]="textAreaSlot"
            [context]="textAreaContext()"
            [props]="textAreaProps">
          </copilot-slot>
        } @else {
          <textarea copilotChatTextarea
            [inputValue]="computedValue()"
            [inputAutoFocus]="computedAutoFocus()"
            [inputDisabled]="computedMode() === 'processing'"
            [inputClass]="textAreaProps?.className"
            (keyDown)="handleKeyDown($event)"
            (valueChange)="handleValueChange($event)"></textarea>
        }
      }
      
      <!-- Toolbar -->
      <copilot-slot
        [slot]="toolbarTemplate || toolbarSlot"
        [context]="toolbarContext()"
        [props]="toolbarProps"
        [defaultComponent]="defaultToolbar">
        <div copilotChatToolbar>
          <div class="flex items-center">
            @if (addFile.observed) {
              <copilot-slot
                [slot]="addFileButtonTemplate || addFileButtonSlot"
                [context]="addFileContext()"
                [props]="addFileButtonProps"
                [defaultComponent]="defaultAddFileButton">
                <copilot-chat-add-file-button
                  [disabled]="computedMode() === 'transcribe'"
                  (click)="handleAddFile()">
                </copilot-chat-add-file-button>
              </copilot-slot>
            }
            @if (computedToolsMenu().length > 0) {
              <copilot-slot
                [slot]="toolsButtonTemplate || toolsButtonSlot"
                [context]="toolsContext()"
                [props]="toolsButtonProps"
                [defaultComponent]="defaultToolsButton">
                <copilot-chat-tools-menu
                  [inputToolsMenu]="computedToolsMenu()"
                  [inputDisabled]="computedMode() === 'transcribe'">
                </copilot-chat-tools-menu>
              </copilot-slot>
            }
          </div>
          <div class="flex items-center">
            @if (computedMode() === 'transcribe') {
              @if (cancelTranscribe.observed) {
                <copilot-slot
                  [slot]="cancelTranscribeButtonTemplate || cancelTranscribeButtonSlot"
                  [context]="cancelTranscribeContext()"
                  [props]="cancelTranscribeButtonProps"
                  [defaultComponent]="defaultCancelTranscribeButton">
                  <copilot-chat-cancel-transcribe-button
                    (click)="handleCancelTranscribe()">
                  </copilot-chat-cancel-transcribe-button>
                </copilot-slot>
              }
              @if (finishTranscribe.observed) {
                <copilot-slot
                  [slot]="finishTranscribeButtonTemplate || finishTranscribeButtonSlot"
                  [context]="finishTranscribeContext()"
                  [props]="finishTranscribeButtonProps"
                  [defaultComponent]="defaultFinishTranscribeButton">
                  <copilot-chat-finish-transcribe-button
                    (click)="handleFinishTranscribe()">
                  </copilot-chat-finish-transcribe-button>
                </copilot-slot>
              }
            } @else {
              @if (startTranscribe.observed) {
                <copilot-slot
                  [slot]="startTranscribeButtonTemplate || startTranscribeButtonSlot"
                  [context]="startTranscribeContext()"
                  [props]="startTranscribeButtonProps"
                  [defaultComponent]="defaultStartTranscribeButton">
                  <copilot-chat-start-transcribe-button
                    (click)="handleStartTranscribe()">
                  </copilot-chat-start-transcribe-button>
                </copilot-slot>
              }
              <!-- Send button with slot -->
              <copilot-slot
                [slot]="sendButtonTemplate || sendButtonSlot || sendButtonComponent"
                [context]="sendButtonContext()"
                [props]="sendButtonProps"
                [defaultComponent]="defaultSendButton">
                <button 
                  [class]="sendButtonProps?.className || defaultButtonClass"
                  [disabled]="!computedValue().trim()"
                  (click)="send()">
                  <lucide-angular [img]="ArrowUpIcon" [size]="18"></lucide-angular>
                </button>
              </copilot-slot>
            }
          </div>
        </div>
      </copilot-slot>
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
export class CopilotChatInputComponent implements AfterViewInit, OnDestroy {
  @ViewChild(CopilotChatTextareaComponent, { read: CopilotChatTextareaComponent }) 
  textAreaRef?: CopilotChatTextareaComponent;
  
  @ViewChild(CopilotChatAudioRecorderComponent) 
  audioRecorderRef?: CopilotChatAudioRecorderComponent;
  
  // Capture templates from content projection
  @ContentChild('sendButton', { read: TemplateRef }) sendButtonTemplate?: TemplateRef<SendButtonContext>;
  @ContentChild('toolbar', { read: TemplateRef }) toolbarTemplate?: TemplateRef<ToolbarContext>;
  @ContentChild('textArea', { read: TemplateRef }) textAreaTemplate?: TemplateRef<any>;
  @ContentChild('audioRecorder', { read: TemplateRef }) audioRecorderTemplate?: TemplateRef<any>;
  @ContentChild('startTranscribeButton', { read: TemplateRef }) startTranscribeButtonTemplate?: TemplateRef<any>;
  @ContentChild('cancelTranscribeButton', { read: TemplateRef }) cancelTranscribeButtonTemplate?: TemplateRef<any>;
  @ContentChild('finishTranscribeButton', { read: TemplateRef }) finishTranscribeButtonTemplate?: TemplateRef<any>;
  @ContentChild('addFileButton', { read: TemplateRef }) addFileButtonTemplate?: TemplateRef<any>;
  @ContentChild('toolsButton', { read: TemplateRef }) toolsButtonTemplate?: TemplateRef<any>;
  
  // Props for tweaking default components
  @Input() sendButtonProps?: any;
  @Input() toolbarProps?: any;
  @Input() textAreaProps?: any;
  @Input() audioRecorderProps?: any;
  @Input() startTranscribeButtonProps?: any;
  @Input() cancelTranscribeButtonProps?: any;
  @Input() finishTranscribeButtonProps?: any;
  @Input() addFileButtonProps?: any;
  @Input() toolsButtonProps?: any;
  
  // Also support direct component inputs for backward compatibility
  @Input() sendButtonComponent?: Type<any>;
  @Input() toolbarComponent?: Type<any>;
  
  // Old slot inputs for backward compatibility
  @Input() sendButtonSlot?: Type<any> | TemplateRef<any> | string;
  @Input() toolbarSlot?: Type<any> | TemplateRef<any> | string;
  @Input() textAreaSlot?: Type<any> | TemplateRef<any> | string;
  @Input() audioRecorderSlot?: Type<any> | TemplateRef<any> | string;
  @Input() startTranscribeButtonSlot?: Type<any> | TemplateRef<any> | string;
  @Input() cancelTranscribeButtonSlot?: Type<any> | TemplateRef<any> | string;
  @Input() finishTranscribeButtonSlot?: Type<any> | TemplateRef<any> | string;
  @Input() addFileButtonSlot?: Type<any> | TemplateRef<any> | string;
  @Input() toolsButtonSlot?: Type<any> | TemplateRef<any> | string;
  
  // Regular inputs
  @Input() set mode(val: CopilotChatInputMode | undefined) {
    this.modeSignal.set(val || 'input');
  }
  @Input() set toolsMenu(val: (ToolsMenuItem | '-')[] | undefined) {
    this.toolsMenuSignal.set(val || []);
  }
  @Input() set autoFocus(val: boolean | undefined) {
    this.autoFocusSignal.set(val ?? true);
  }
  @Input() set value(val: string | undefined) {
    this.valueSignal.set(val || '');
  }
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  // Output events
  @Output() submitMessage = new EventEmitter<string>();
  @Output() startTranscribe = new EventEmitter<void>();
  @Output() cancelTranscribe = new EventEmitter<void>();
  @Output() finishTranscribe = new EventEmitter<void>();
  @Output() addFile = new EventEmitter<void>();
  @Output() valueChange = new EventEmitter<string>();
  
  // Icons and default classes
  readonly ArrowUpIcon = ArrowUp;
  readonly defaultButtonClass = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full h-9 w-9 bg-black text-white dark:bg-white dark:text-black transition-colors hover:opacity-70 disabled:opacity-50 disabled:cursor-not-allowed';
  
  // Services
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  // Signals
  modeSignal = signal<CopilotChatInputMode>('input');
  toolsMenuSignal = signal<(ToolsMenuItem | '-')[]>([]);
  autoFocusSignal = signal<boolean>(true);
  valueSignal = signal<string>('');
  customClass = signal<string | undefined>(undefined);
  
  // Default components
  // Note: CopilotChatTextareaComponent is a directive, not a component
  defaultAudioRecorder = CopilotChatAudioRecorderComponent;
  defaultSendButton = CopilotChatSendButtonComponent;
  defaultStartTranscribeButton = CopilotChatStartTranscribeButtonComponent;
  defaultCancelTranscribeButton = CopilotChatCancelTranscribeButtonComponent;
  defaultFinishTranscribeButton = CopilotChatFinishTranscribeButtonComponent;
  defaultAddFileButton = CopilotChatAddFileButtonComponent;
  defaultToolsButton = CopilotChatToolsMenuComponent;
  defaultToolbar = CopilotChatToolbarComponent;
  
  // Computed values
  computedMode = computed(() => this.modeSignal());
  computedToolsMenu = computed(() => this.toolsMenuSignal());
  computedAutoFocus = computed(() => this.autoFocusSignal());
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
      // Overflow and clipping
      'overflow-visible bg-clip-padding',
      // Background
      'bg-white dark:bg-[#303030]',
      // Visual effects
      'shadow-[0_4px_4px_0_#0000000a,0_0_1px_0_#0000009e] rounded-[28px]'
    );
    return cn(baseClasses, this.customClass());
  });
  
  // Context for slots (reactive via signals)
  sendButtonContext = computed<SendButtonContext>(() => ({
    send: () => this.send(),
    disabled: !this.computedValue().trim(),
    value: this.computedValue()
  }));
  
  toolbarContext = computed<ToolbarContext>(() => ({
    mode: this.computedMode(),
    value: this.computedValue()
  }));
  
  textAreaContext = computed(() => ({
    value: this.computedValue(),
    autoFocus: this.computedAutoFocus(),
    disabled: this.computedMode() === 'processing',
    onKeyDown: (event: KeyboardEvent) => this.handleKeyDown(event),
    onChange: (value: string) => this.handleValueChange(value)
  }));
  
  audioRecorderContext = computed(() => ({
    inputShowControls: true
  }));
  
  startTranscribeContext = computed(() => ({
    onClick: () => this.handleStartTranscribe()
  }));
  
  cancelTranscribeContext = computed(() => ({
    onClick: () => this.handleCancelTranscribe()
  }));
  
  finishTranscribeContext = computed(() => ({
    onClick: () => this.handleFinishTranscribe()
  }));
  
  addFileContext = computed(() => ({
    onClick: () => this.handleAddFile(),
    inputDisabled: this.computedMode() === 'transcribe'
  }));
  
  toolsContext = computed(() => ({
    inputToolsMenu: this.computedToolsMenu(),
    inputDisabled: this.computedMode() === 'transcribe'
  }));
  
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
  
  // Helper to check if a value is a directive (has ɵdir marker)
  isDirective(value: any): boolean {
    return !!(value?.ɵdir || Object.prototype.hasOwnProperty.call(value, 'ɵdir'));
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
}
import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  TemplateRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import type { CopilotChatLabels } from '../../core/chat-configuration/chat-configuration.types';

/**
 * Base button component with common styling
 */
@Component({
  selector: 'copilot-chat-button-base',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [class]="computedClass()"
      (click)="handleClick($event)"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      white-space: nowrap;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      transition: all 150ms;
      outline: none;
      border: none;
      cursor: pointer;
      flex-shrink: 0;
    }
    
    button:disabled {
      pointer-events: none;
      opacity: 0.5;
    }
    
    button:focus-visible {
      outline: 2px solid transparent;
      outline-offset: 2px;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.5);
    }
  `]
})
class CopilotChatButtonBase {
  @Input() set inputType(val: 'button' | 'submit' | 'reset' | undefined) {
    this.type.set(val || 'button');
  }
  @Input() set inputDisabled(val: boolean | undefined) {
    this.disabled.set(val || false);
  }
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  @Output() click = new EventEmitter<MouseEvent>();
  
  type = signal<'button' | 'submit' | 'reset'>('button');
  disabled = signal<boolean>(false);
  customClass = signal<string | undefined>(undefined);
  
  computedClass = computed(() => {
    return this.customClass() || 'button-base';
  });
  
  handleClick(event: MouseEvent): void {
    if (!this.disabled()) {
      this.click.emit(event);
    }
  }
}

/**
 * Send button component
 */
@Component({
  selector: 'copilot-chat-send-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="send-button-container">
      <button
        type="button"
        [disabled]="disabled()"
        [class]="computedClass()"
        (click)="handleClick()"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="19" x2="12" y2="5"></line>
          <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
      </button>
    </div>
  `,
  styles: [`
    .send-button-container {
      margin-right: 10px;
    }
    
    button {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: black;
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 150ms;
    }
    
    button:hover:not(:disabled) {
      opacity: 0.7;
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    button:focus {
      outline: none;
    }
    
    :host-context(.dark) button {
      background: white;
      color: black;
    }
  `]
})
export class CopilotChatSendButtonComponent {
  @Input() set inputDisabled(val: boolean | undefined) {
    this.disabled.set(val || false);
  }
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  @Output() click = new EventEmitter<void>();
  
  disabled = signal<boolean>(false);
  customClass = signal<string | undefined>(undefined);
  
  computedClass = computed(() => {
    const baseClasses = 'send-button';
    return this.customClass() || baseClasses;
  });
  
  handleClick(): void {
    if (!this.disabled()) {
      this.click.emit();
    }
  }
}

/**
 * Toolbar button component with tooltip support
 */
@Component({
  selector: 'copilot-chat-toolbar-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar-button-wrapper" [title]="tooltip()">
      <button
        type="button"
        [disabled]="disabled()"
        [class]="computedClass()"
        (click)="handleClick()"
      >
        <ng-content></ng-content>
      </button>
    </div>
  `,
  styles: [`
    .toolbar-button-wrapper {
      position: relative;
      display: inline-block;
    }
    
    button {
      width: 32px;
      height: 32px;
      padding: 0;
      border-radius: 6px;
      background: transparent;
      color: rgb(93, 93, 93);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 150ms;
    }
    
    button:hover:not(:disabled) {
      background: #E8E8E8;
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    :host-context(.dark) button {
      color: rgb(243, 243, 243);
    }
    
    :host-context(.dark) button:hover:not(:disabled) {
      background: #303030;
    }
    
    button.primary {
      background: black;
      color: white;
      border-radius: 50%;
    }
    
    button.primary:hover:not(:disabled) {
      opacity: 0.7;
      background: black;
    }
    
    :host-context(.dark) button.primary {
      background: white;
      color: black;
    }
  `]
})
export class CopilotChatToolbarButtonComponent {
  @Input() set inputDisabled(val: boolean | undefined) {
    this.disabled.set(val || false);
  }
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  @Input() set inputTooltip(val: string | undefined) {
    this.tooltip.set(val || '');
  }
  @Input() set inputVariant(val: 'primary' | 'secondary' | undefined) {
    this.variant.set(val || 'secondary');
  }
  
  @Output() click = new EventEmitter<void>();
  
  disabled = signal<boolean>(false);
  customClass = signal<string | undefined>(undefined);
  tooltip = signal<string>('');
  variant = signal<'primary' | 'secondary'>('secondary');
  
  computedClass = computed(() => {
    const variantClass = this.variant() === 'primary' ? 'primary' : 'secondary';
    return this.customClass() || `toolbar-button ${variantClass}`;
  });
  
  handleClick(): void {
    if (!this.disabled()) {
      this.click.emit();
    }
  }
}

/**
 * Start transcribe button
 */
@Component({
  selector: 'copilot-chat-start-transcribe-button',
  standalone: true,
  imports: [CommonModule, CopilotChatToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <copilot-chat-toolbar-button
      [inputDisabled]="disabled()"
      [inputClass]="customClass() || 'mr-2'"
      [inputTooltip]="tooltip()"
      (click)="handleClick()"
    >
      <!-- Microphone Icon -->
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
    </copilot-chat-toolbar-button>
  `
})
export class CopilotChatStartTranscribeButtonComponent {
  @Input() set inputDisabled(val: boolean | undefined) {
    this.disabled.set(val || false);
  }
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  @Output() click = new EventEmitter<void>();
  
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  disabled = signal<boolean>(false);
  customClass = signal<string | undefined>(undefined);
  
  tooltip = computed(() => {
    return this.chatConfig?.labels().chatInputToolbarStartTranscribeButtonLabel || 'Start recording';
  });
  
  handleClick(): void {
    this.click.emit();
  }
}

/**
 * Cancel transcribe button
 */
@Component({
  selector: 'copilot-chat-cancel-transcribe-button',
  standalone: true,
  imports: [CommonModule, CopilotChatToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <copilot-chat-toolbar-button
      [inputDisabled]="disabled()"
      [inputClass]="customClass() || 'mr-2'"
      [inputTooltip]="tooltip()"
      (click)="handleClick()"
    >
      <!-- X Icon -->
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </copilot-chat-toolbar-button>
  `
})
export class CopilotChatCancelTranscribeButtonComponent {
  @Input() set inputDisabled(val: boolean | undefined) {
    this.disabled.set(val || false);
  }
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  @Output() click = new EventEmitter<void>();
  
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  disabled = signal<boolean>(false);
  customClass = signal<string | undefined>(undefined);
  
  tooltip = computed(() => {
    return this.chatConfig?.labels().chatInputToolbarCancelTranscribeButtonLabel || 'Cancel recording';
  });
  
  handleClick(): void {
    this.click.emit();
  }
}

/**
 * Finish transcribe button
 */
@Component({
  selector: 'copilot-chat-finish-transcribe-button',
  standalone: true,
  imports: [CommonModule, CopilotChatToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <copilot-chat-toolbar-button
      [inputDisabled]="disabled()"
      [inputClass]="customClass() || 'mr-[10px]'"
      [inputTooltip]="tooltip()"
      (click)="handleClick()"
    >
      <!-- Check Icon -->
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </copilot-chat-toolbar-button>
  `
})
export class CopilotChatFinishTranscribeButtonComponent {
  @Input() set inputDisabled(val: boolean | undefined) {
    this.disabled.set(val || false);
  }
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  @Output() click = new EventEmitter<void>();
  
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  disabled = signal<boolean>(false);
  customClass = signal<string | undefined>(undefined);
  
  tooltip = computed(() => {
    return this.chatConfig?.labels().chatInputToolbarFinishTranscribeButtonLabel || 'Finish recording';
  });
  
  handleClick(): void {
    this.click.emit();
  }
}

/**
 * Add file button
 */
@Component({
  selector: 'copilot-chat-add-file-button',
  standalone: true,
  imports: [CommonModule, CopilotChatToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <copilot-chat-toolbar-button
      [inputDisabled]="disabled()"
      [inputClass]="customClass() || 'ml-2'"
      [inputTooltip]="tooltip()"
      (click)="handleClick()"
    >
      <!-- Plus Icon -->
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </copilot-chat-toolbar-button>
  `
})
export class CopilotChatAddFileButtonComponent {
  @Input() set inputDisabled(val: boolean | undefined) {
    this.disabled.set(val || false);
  }
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  @Output() click = new EventEmitter<void>();
  
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  disabled = signal<boolean>(false);
  customClass = signal<string | undefined>(undefined);
  
  tooltip = computed(() => {
    return this.chatConfig?.labels().chatInputToolbarAddButtonLabel || 'Add file';
  });
  
  handleClick(): void {
    this.click.emit();
  }
}
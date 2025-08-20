import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import { cn } from '../../lib/utils';

// Base button classes matching React's button variants
const buttonBase = cn(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium',
  'transition-all disabled:pointer-events-none disabled:opacity-50',
  'shrink-0 outline-none',
  'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
);

const chatInputToolbarPrimary = cn(
  'cursor-pointer',
  // Background and text
  'bg-black text-white',
  // Dark mode
  'dark:bg-white dark:text-black dark:focus-visible:outline-white',
  // Shape and sizing
  'rounded-full h-9 w-9',
  // Interactions
  'transition-colors',
  // Focus states
  'focus:outline-none',
  // Hover states
  'hover:opacity-70 disabled:hover:opacity-100',
  // Disabled states
  'disabled:cursor-not-allowed disabled:bg-[#00000014] disabled:text-[rgb(13,13,13)]',
  'dark:disabled:bg-[#454545] dark:disabled:text-white'
);

const chatInputToolbarSecondary = cn(
  'cursor-pointer',
  // Background and text
  'bg-transparent text-[#444444]',
  // Dark mode
  'dark:text-white dark:border-[#404040]',
  // Shape and sizing
  'rounded-full h-9 w-9',
  // Interactions
  'transition-colors',
  // Focus states
  'focus:outline-none',
  // Hover states
  'hover:bg-[#f8f8f8] hover:text-[#333333]',
  'dark:hover:bg-[#404040] dark:hover:text-[#FFFFFF]',
  // Disabled states
  'disabled:cursor-not-allowed disabled:opacity-50',
  'disabled:hover:bg-transparent disabled:hover:text-[#444444]',
  'dark:disabled:hover:bg-transparent dark:disabled:hover:text-[#CCCCCC]'
);

@Component({
  selector: 'copilot-chat-send-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mr-[10px]">
      <button
        type="button"
        [disabled]="disabled"
        [class]="buttonClass"
        (click)="onClick()"
      >
        <svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="19" x2="12" y2="5"></line>
          <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
      </button>
    </div>
  `,
  styles: [``]
})
export class CopilotChatSendButtonComponent {
  @Input() disabled = false;
  @Output() click = new EventEmitter<void>();
  
  buttonClass = cn(buttonBase, chatInputToolbarPrimary);
  
  onClick(): void {
    if (!this.disabled) {
      this.click.emit();
    }
  }
}

@Component({
  selector: 'copilot-chat-start-transcribe-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [disabled]="disabled"
      [class]="buttonClass"
      [title]="label"
      (click)="onClick()"
    >
      <svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      </svg>
    </button>
  `,
  styles: [``]
})
export class CopilotChatStartTranscribeButtonComponent {
  @Input() disabled = false;
  @Output() click = new EventEmitter<void>();
  
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  buttonClass = cn(buttonBase, chatInputToolbarSecondary, 'mr-2');
  
  get label(): string {
    return this.chatConfig?.labels().chatInputToolbarStartTranscribeButtonLabel || 'Start recording';
  }
  
  onClick(): void {
    if (!this.disabled) {
      this.click.emit();
    }
  }
}

@Component({
  selector: 'copilot-chat-cancel-transcribe-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [disabled]="disabled"
      [class]="buttonClass"
      [title]="label"
      (click)="onClick()"
    >
      <svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `,
  styles: [``]
})
export class CopilotChatCancelTranscribeButtonComponent {
  @Input() disabled = false;
  @Output() click = new EventEmitter<void>();
  
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  buttonClass = cn(buttonBase, chatInputToolbarSecondary, 'mr-2');
  
  get label(): string {
    return this.chatConfig?.labels().chatInputToolbarCancelTranscribeButtonLabel || 'Cancel recording';
  }
  
  onClick(): void {
    if (!this.disabled) {
      this.click.emit();
    }
  }
}

@Component({
  selector: 'copilot-chat-finish-transcribe-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [disabled]="disabled"
      [class]="buttonClass"
      [title]="label"
      (click)="onClick()"
    >
      <svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </button>
  `,
  styles: [``]
})
export class CopilotChatFinishTranscribeButtonComponent {
  @Input() disabled = false;
  @Output() click = new EventEmitter<void>();
  
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  buttonClass = cn(buttonBase, chatInputToolbarSecondary, 'mr-[10px]');
  
  get label(): string {
    return this.chatConfig?.labels().chatInputToolbarFinishTranscribeButtonLabel || 'Finish recording';
  }
  
  onClick(): void {
    if (!this.disabled) {
      this.click.emit();
    }
  }
}

@Component({
  selector: 'copilot-chat-add-file-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [disabled]="disabled"
      [class]="buttonClass"
      [title]="label"
      (click)="onClick()"
    >
      <svg class="size-[20px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
    </button>
  `,
  styles: [``]
})
export class CopilotChatAddFileButtonComponent {
  @Input() disabled = false;
  @Output() click = new EventEmitter<void>();
  
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  buttonClass = cn(buttonBase, chatInputToolbarSecondary, 'ml-2');
  
  get label(): string {
    return this.chatConfig?.labels().chatInputToolbarAddButtonLabel || 'Add file';
  }
  
  onClick(): void {
    if (!this.disabled) {
      this.click.emit();
    }
  }
}

// Base toolbar button component that other buttons can use
@Component({
  selector: 'copilot-chat-toolbar-button',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      [disabled]="disabled()"
      [class]="computedClass()"
      [title]="title()"
      (click)="onClick()"
    >
      <ng-content></ng-content>
    </button>
  `,
  styles: [``]
})
export class CopilotChatToolbarButtonComponent {
  disabled = signal(false);
  variant = signal<'primary' | 'secondary'>('secondary');
  customClass = signal('');
  title = signal('');
  
  @Output() click = new EventEmitter<void>();
  
  computedClass = computed(() => {
    const variantClass = this.variant() === 'primary' 
      ? chatInputToolbarPrimary 
      : chatInputToolbarSecondary;
    return cn(buttonBase, variantClass, this.customClass());
  });
  
  onClick(): void {
    if (!this.disabled()) {
      this.click.emit();
    }
  }
}
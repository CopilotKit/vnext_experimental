import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Copy, Check, ThumbsUp, ThumbsDown, Volume2, RefreshCw } from 'lucide-angular';
import { CopilotTooltipDirective } from '../../lib/directives/tooltip.directive';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import { cn } from '../../lib/utils';

// Base toolbar button component
@Component({
  selector: 'button[copilotChatAssistantMessageToolbarButton]',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>
  `,
  host: {
    '[class]': 'computedClass()',
    '[attr.title]': 'title',
    '[attr.disabled]': 'disabled ? true : null',
    'type': 'button',
    '[attr.aria-label]': 'title'
  },
  hostDirectives: [
    {
      directive: CopilotTooltipDirective,
      inputs: ['copilotTooltip: title', 'tooltipPosition', 'tooltipDelay']
    }
  ]
})
export class CopilotChatAssistantMessageToolbarButtonComponent {
  @Input() title = '';
  @Input() disabled = false;
  @Input() set inputClass(value: string | undefined) {
    this.customClass.set(value);
  }
  
  private customClass = signal<string | undefined>(undefined);
  
  computedClass = computed(() => {
    return cn(
      // Flex centering
      'inline-flex items-center justify-center',
      // Cursor
      'cursor-pointer',
      // Background and text
      'p-0 text-[rgb(93,93,93)] hover:bg-[#E8E8E8]',
      // Dark mode
      'dark:text-[rgb(243,243,243)] dark:hover:bg-[#303030]',
      // Shape and sizing
      'h-8 w-8 rounded-md',
      // Interactions
      'transition-colors',
      // Hover states
      'hover:text-[rgb(93,93,93)]',
      'dark:hover:text-[rgb(243,243,243)]',
      // Focus states
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      // Disabled state
      'disabled:opacity-50 disabled:cursor-not-allowed',
      this.customClass()
    );
  });
}

// Copy button component
@Component({
  selector: 'copilot-chat-assistant-message-copy-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CopilotChatAssistantMessageToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <button 
      copilotChatAssistantMessageToolbarButton
      [title]="title || labels.assistantMessageToolbarCopyMessageLabel"
      [disabled]="disabled"
      [inputClass]="inputClass"
      (click)="handleCopy()">
      @if (copied()) {
        <lucide-angular [img]="CheckIcon" [size]="18"></lucide-angular>
      } @else {
        <lucide-angular [img]="CopyIcon" [size]="18"></lucide-angular>
      }
    </button>
  `
})
export class CopilotChatAssistantMessageCopyButtonComponent {
  @Input() title?: string;
  @Input() disabled = false;
  @Input() inputClass?: string;
  @Input() content?: string;
  @Output() click = new EventEmitter<void>();
  
  readonly CopyIcon = Copy;
  readonly CheckIcon = Check;
  
  copied = signal(false);
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  get labels() {
    return this.chatConfig?.labels() || {
      assistantMessageToolbarCopyMessageLabel: 'Copy'
    };
  }
  
  handleCopy(): void {
    if (!this.content) return;
    
    // Set copied immediately for instant feedback
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
    
    // Copy to clipboard (fire and forget)
    navigator.clipboard.writeText(this.content).then(
      () => this.click.emit(),
      (err) => {
        console.error('Failed to copy message:', err);
        this.copied.set(false);
      }
    );
  }
}

// Thumbs up button component
@Component({
  selector: 'copilot-chat-assistant-message-thumbs-up-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CopilotChatAssistantMessageToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <button 
      copilotChatAssistantMessageToolbarButton
      [title]="title || labels.assistantMessageToolbarThumbsUpLabel"
      [disabled]="disabled"
      [inputClass]="inputClass"
      (click)="handleClick()">
      <lucide-angular [img]="ThumbsUpIcon" [size]="18"></lucide-angular>
    </button>
  `
})
export class CopilotChatAssistantMessageThumbsUpButtonComponent {
  @Input() title?: string;
  @Input() disabled = false;
  @Input() inputClass?: string;
  @Output() click = new EventEmitter<void>();
  
  readonly ThumbsUpIcon = ThumbsUp;
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  get labels() {
    return this.chatConfig?.labels() || {
      assistantMessageToolbarThumbsUpLabel: 'Good response'
    };
  }
  
  handleClick(): void {
    if (!this.disabled) {
      this.click.emit();
    }
  }
}

// Thumbs down button component
@Component({
  selector: 'copilot-chat-assistant-message-thumbs-down-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CopilotChatAssistantMessageToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <button 
      copilotChatAssistantMessageToolbarButton
      [title]="title || labels.assistantMessageToolbarThumbsDownLabel"
      [disabled]="disabled"
      [inputClass]="inputClass"
      (click)="handleClick()">
      <lucide-angular [img]="ThumbsDownIcon" [size]="18"></lucide-angular>
    </button>
  `
})
export class CopilotChatAssistantMessageThumbsDownButtonComponent {
  @Input() title?: string;
  @Input() disabled = false;
  @Input() inputClass?: string;
  @Output() click = new EventEmitter<void>();
  
  readonly ThumbsDownIcon = ThumbsDown;
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  get labels() {
    return this.chatConfig?.labels() || {
      assistantMessageToolbarThumbsDownLabel: 'Bad response'
    };
  }
  
  handleClick(): void {
    if (!this.disabled) {
      this.click.emit();
    }
  }
}

// Read aloud button component
@Component({
  selector: 'copilot-chat-assistant-message-read-aloud-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CopilotChatAssistantMessageToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <button 
      copilotChatAssistantMessageToolbarButton
      [title]="title || labels.assistantMessageToolbarReadAloudLabel"
      [disabled]="disabled"
      [inputClass]="inputClass"
      (click)="handleClick()">
      <lucide-angular [img]="Volume2Icon" [size]="20"></lucide-angular>
    </button>
  `
})
export class CopilotChatAssistantMessageReadAloudButtonComponent {
  @Input() title?: string;
  @Input() disabled = false;
  @Input() inputClass?: string;
  @Output() click = new EventEmitter<void>();
  
  readonly Volume2Icon = Volume2;
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  get labels() {
    return this.chatConfig?.labels() || {
      assistantMessageToolbarReadAloudLabel: 'Read aloud'
    };
  }
  
  handleClick(): void {
    if (!this.disabled) {
      this.click.emit();
    }
  }
}

// Regenerate button component
@Component({
  selector: 'copilot-chat-assistant-message-regenerate-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CopilotChatAssistantMessageToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <button 
      copilotChatAssistantMessageToolbarButton
      [title]="title || labels.assistantMessageToolbarRegenerateLabel"
      [disabled]="disabled"
      [inputClass]="inputClass"
      (click)="handleClick()">
      <lucide-angular [img]="RefreshCwIcon" [size]="18"></lucide-angular>
    </button>
  `
})
export class CopilotChatAssistantMessageRegenerateButtonComponent {
  @Input() title?: string;
  @Input() disabled = false;
  @Input() inputClass?: string;
  @Output() click = new EventEmitter<void>();
  
  readonly RefreshCwIcon = RefreshCw;
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  get labels() {
    return this.chatConfig?.labels() || {
      assistantMessageToolbarRegenerateLabel: 'Regenerate'
    };
  }
  
  handleClick(): void {
    if (!this.disabled) {
      this.click.emit();
    }
  }
}
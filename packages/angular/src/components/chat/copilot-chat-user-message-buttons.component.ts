import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Copy, Check, Edit } from 'lucide-angular';
import { CopilotTooltipDirective } from '../../lib/directives/tooltip.directive';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import { cn } from '../../lib/utils';

// Base toolbar button component
@Component({
  selector: 'button[copilotChatUserMessageToolbarButton]',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ng-content></ng-content>
  `,
  host: {
    '[class]': 'computedClass()',
    '[attr.title]': 'title',
    'type': 'button',
    '[attr.aria-label]': 'title',
    '(click)': 'handleClick($event)'
  },
  hostDirectives: [
    {
      directive: CopilotTooltipDirective,
      inputs: ['copilotTooltip: title', 'tooltipPosition', 'tooltipDelay']
    }
  ]
})
export class CopilotChatUserMessageToolbarButtonComponent {
  @Input() title = '';
  @Input() disabled = false;
  @Input() inputClass?: string;
  @Output() click = new EventEmitter<MouseEvent>();
  
  computedClass = signal<string>('');
  
  ngOnInit() {
    this.computedClass.set(
      cn(
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
        this.inputClass
      )
    );
  }
  
  handleClick(event: MouseEvent): void {
    if (!this.disabled) {
      this.click.emit(event);
    }
  }
}

// Copy button component
@Component({
  selector: 'copilot-chat-user-message-copy-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CopilotChatUserMessageToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button 
      copilotChatUserMessageToolbarButton
      [title]="title || labels.userMessageToolbarCopyMessageLabel"
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
export class CopilotChatUserMessageCopyButtonComponent {
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
      userMessageToolbarCopyMessageLabel: 'Copy'
    };
  }
  
  async handleCopy(): Promise<void> {
    if (this.content) {
      try {
        await navigator.clipboard.writeText(this.content);
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
        this.click.emit();
      } catch (err) {
        console.error('Failed to copy message:', err);
      }
    }
  }
}

// Edit button component
@Component({
  selector: 'copilot-chat-user-message-edit-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CopilotChatUserMessageToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button 
      copilotChatUserMessageToolbarButton
      [title]="title || labels.userMessageToolbarEditMessageLabel"
      [disabled]="disabled"
      [inputClass]="inputClass"
      (click)="handleEdit()">
      <lucide-angular [img]="EditIcon" [size]="18"></lucide-angular>
    </button>
  `
})
export class CopilotChatUserMessageEditButtonComponent {
  @Input() title?: string;
  @Input() disabled = false;
  @Input() inputClass?: string;
  @Output() click = new EventEmitter<void>();
  
  readonly EditIcon = Edit;
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  
  get labels() {
    return this.chatConfig?.labels() || {
      userMessageToolbarEditMessageLabel: 'Edit'
    };
  }
  
  handleEdit(): void {
    if (!this.disabled) {
      this.click.emit();
    }
  }
}
import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  computed,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>
  `,
  host: {
    '[class]': 'computedClass()',
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
export class CopilotChatUserMessageToolbarButtonComponent {
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
  selector: 'copilot-chat-user-message-copy-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CopilotChatUserMessageToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
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
  @Output() clicked = new EventEmitter<void>();
  
  readonly CopyIcon = Copy;
  readonly CheckIcon = Check;
  
  copied = signal(false);
  private chatConfig = inject(CopilotChatConfigurationService);
  
  get labels() {
    return this.chatConfig.labels();
  }
  
  handleCopy(): void {
    if (!this.content) return;
    
    // Set copied immediately for instant feedback
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
    
    // Copy to clipboard (fire and forget)
    navigator.clipboard.writeText(this.content).then(
      () => this.clicked.emit(),
      (err) => {
        console.error('Failed to copy message:', err);
        this.copied.set(false);
      }
    );
  }
}

// Edit button component
@Component({
  selector: 'copilot-chat-user-message-edit-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CopilotChatUserMessageToolbarButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
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
  @Output() clicked = new EventEmitter<void>();
  
  readonly EditIcon = Edit;
  private chatConfig = inject(CopilotChatConfigurationService);
  
  get labels() {
    return this.chatConfig.labels();
  }
  
  handleEdit(): void {
    if (!this.disabled) {
      this.clicked.emit();
    }
  }
}

import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../lib/utils';

/**
 * Feather component for CopilotChatView
 * Creates a gradient overlay effect between messages and input
 * Matches React implementation exactly with same Tailwind classes
 */
@Component({
  selector: 'copilot-chat-view-feather',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div 
      [class]="computedClass"
      [style]="style">
    </div>
  `
})
export class CopilotChatViewFeatherComponent {
  @Input() inputClass?: string;
  @Input() className?: string;  // Support both className and inputClass
  @Input() style?: { [key: string]: any };
  
  // Computed class matching React exactly
  get computedClass(): string {
    return cn(
      // Positioning
      'absolute bottom-0 left-0 right-4 h-24 pointer-events-none z-10',
      // Gradient
      'bg-gradient-to-t',
      // Light mode colors
      'from-white via-white to-transparent',
      // Dark mode colors
      'dark:from-[rgb(33,33,33)] dark:via-[rgb(33,33,33)]',
      // Custom classes - support both className and inputClass
      this.className || this.inputClass
    );
  }
}
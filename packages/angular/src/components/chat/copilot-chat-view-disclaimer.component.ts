import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import { cn } from '../../lib/utils';

/**
 * Disclaimer component for CopilotChatView
 * Shows configurable disclaimer text below the input
 * Integrates with CopilotChatConfigurationService for labels
 */
@Component({
  selector: 'copilot-chat-view-disclaimer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="computedClass">
      {{ disclaimerText }}
    </div>
  `
})
export class CopilotChatViewDisclaimerComponent {
  @Input() inputClass?: string;
  @Input() text?: string;
  
  private configService = inject(CopilotChatConfigurationService, { optional: true });
  
  
  // Get disclaimer text from input or configuration
  get disclaimerText(): string {
    if (this.text) {
      return this.text;
    }
    
    const labels = this.configService?.labels();
    return labels?.chatDisclaimerText || 'AI can make mistakes. Please verify important information.';
  }
  
  // Computed class matching React exactly
  get computedClass(): string {
    return cn(
      'text-center text-xs text-muted-foreground py-3 px-4 max-w-3xl mx-auto',
      this.inputClass
    );
  }
}
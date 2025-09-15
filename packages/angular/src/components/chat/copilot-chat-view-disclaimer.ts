import {
  Component,
  input,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { CopilotChatConfigurationService } from "../../core/chat-configuration/chat-configuration";
import { cn } from "../../lib/utils";

/**
 * Disclaimer component for CopilotChatView
 * Shows configurable disclaimer text below the input
 * Integrates with CopilotChatConfigurationService for labels
 */
@Component({
  selector: "copilot-chat-view-disclaimer",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="computedClass">
      {{ disclaimerText }}
    </div>
  `,
})
export class CopilotChatViewDisclaimer {
  inputClass = input<string | undefined>();
  text = input<string | undefined>();

  private configService = inject(CopilotChatConfigurationService);

  // Get disclaimer text from input or configuration
  get disclaimerText(): string {
    if (this.text()) {
      return this.text() as string;
    }

    return this.configService.labels().chatDisclaimerText;
  }

  // Computed class matching React exactly
  get computedClass(): string {
    return cn(
      "text-center text-xs text-muted-foreground py-3 px-4 max-w-3xl mx-auto",
      this.inputClass()
    );
  }
}

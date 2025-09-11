import { ChangeDetectionStrategy, Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  CopilotKitConfigDirective,
  CopilotChatViewComponent,
  CopilotChatComponent,
  provideCopilotChatConfiguration,
} from "@copilotkitnext/angular";
import { CustomChatInputComponent } from "./custom-chat-input.component";

@Component({
  selector: "nextgen-custom-input-chat",
  standalone: true,
  imports: [
    CommonModule,
    CopilotKitConfigDirective,
    CopilotChatViewComponent,
    CustomChatInputComponent,
    CopilotChatComponent,
  ],
  template: `
    <div
      [copilotkitConfig]="{ runtimeUrl: runtimeUrl }"
      style="display:block;height:100vh;"
    >
      <copilot-chat [inputComponent]="customInput"></copilot-chat>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    // Optional: tweak labels/placeholders shown by CopilotKit
    provideCopilotChatConfiguration({
      labels: {
        chatInputPlaceholder: "Ask anything...",
        chatDisclaimerText: "AI can make mistakes. Verify important info.",
      },
    }),
  ],
})
export class CustomInputChatComponent {
  runtimeUrl = "http://localhost:3001/api/copilotkit";
  customInput = CustomChatInputComponent;
}

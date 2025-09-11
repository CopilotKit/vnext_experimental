import { ChangeDetectionStrategy, Component } from "@angular/core";
import {
  CopilotKitConfigDirective,
  CopilotChatViewComponent,
  provideCopilotChatConfiguration,
  CopilotChatComponent,
} from "@copilotkitnext/angular";
import { CustomChatInputComponent } from "../custom-input/custom-chat-input.component";

@Component({
  selector: "ukg-co-pilot-port",
  standalone: true,
  imports: [
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
      <copilot-chat-view [inputComponent]="customInput"></copilot-chat-view>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideCopilotChatConfiguration({
      labels: {
        chatInputPlaceholder: "Ask anything... (UKG port)",
        chatDisclaimerText: "AI may be inaccurate (UKG PORT).",
      },
    }),
  ],
})
export class CoPilotPortComponent {
  runtimeUrl = "http://localhost:3001/api/copilotkit";
  customInput = CustomChatInputComponent;
}

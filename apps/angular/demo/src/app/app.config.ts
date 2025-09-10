import { ApplicationConfig, importProvidersFrom } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import {
  provideCopilotKit,
  provideCopilotChatConfiguration,
} from "@copilotkitnext/angular";
import { WildcardToolRenderComponent } from "./app.component";

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(BrowserModule),
    ...provideCopilotKit({
      renderToolCalls: [
        {
          name: "*",
          render: WildcardToolRenderComponent,
        },
      ],
    }),
    provideCopilotChatConfiguration({
      labels: {
        chatInputPlaceholder: "Ask me anything...",
        chatDisclaimerText:
          "CopilotKit Angular Demo - AI responses may need verification.",
      },
    }),
  ],
};

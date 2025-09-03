import { ApplicationConfig, importProvidersFrom } from "@angular/core";
import { BrowserModule } from "@angular/platform-browser";
import {
  provideCopilotKit,
  provideCopilotChatConfiguration,
} from "@copilotkit/angular";

export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(BrowserModule),
    ...provideCopilotKit({}),
    provideCopilotChatConfiguration({
      labels: {
        chatInputPlaceholder: "Ask me anything...",
        chatDisclaimerText:
          "CopilotKit Angular Demo - AI responses may need verification.",
      },
    }),
  ],
};

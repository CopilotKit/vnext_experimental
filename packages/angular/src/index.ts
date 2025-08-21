export * from "./core/copilotkit.service";
export * from "./core/copilotkit.types";
export * from "./core/copilotkit.providers";
export * from "./core/chat-configuration/chat-configuration.types";
export * from "./core/chat-configuration/chat-configuration.service";
export * from "./core/chat-configuration/chat-configuration.providers";
export * from "./utils/copilotkit.utils";
export * from "./utils/agent-context.utils";
export * from "./utils/frontend-tool.utils";
export * from "./utils/agent.utils";
export * from "./utils/human-in-the-loop.utils";
export * from "./utils/chat-config.utils";
export * from "./lib/slots/slot.types";
export * from "./lib/slots/slot.utils";
export { CopilotSlotComponent } from "./lib/slots/copilot-slot.component";
export { CopilotTooltipDirective } from "./lib/directives/tooltip.directive";
export { CopilotKitConfigDirective } from "./directives/copilotkit-config.directive";
export { CopilotKitAgentContextDirective } from "./directives/copilotkit-agent-context.directive";
export { CopilotKitFrontendToolDirective } from "./directives/copilotkit-frontend-tool.directive";
export { CopilotKitAgentDirective } from "./directives/copilotkit-agent.directive";
export {
  CopilotKitHumanInTheLoopDirective,
  CopilotKitHumanInTheLoopRespondDirective,
} from "./directives/copilotkit-human-in-the-loop.directive";
export { CopilotKitChatConfigDirective } from "./directives/copilotkit-chat-config.directive";
export { CopilotKitToolRenderComponent } from "./components/copilotkit-tool-render.component";

// Chat Input Components
export * from "./components/chat/copilot-chat-input.types";
export { CopilotChatInputComponent } from "./components/chat/copilot-chat-input.component";
export { CopilotChatInputDefaults } from "./components/chat/copilot-chat-input-defaults";
export { CopilotChatTextareaComponent } from "./components/chat/copilot-chat-textarea.component";
export { CopilotChatAudioRecorderComponent } from "./components/chat/copilot-chat-audio-recorder.component";
export {
  CopilotChatSendButtonComponent,
  CopilotChatToolbarButtonComponent,
  CopilotChatStartTranscribeButtonComponent,
  CopilotChatCancelTranscribeButtonComponent,
  CopilotChatFinishTranscribeButtonComponent,
  CopilotChatAddFileButtonComponent,
} from "./components/chat/copilot-chat-buttons.component";
export { CopilotChatToolbarComponent } from "./components/chat/copilot-chat-toolbar.component";
export { CopilotChatToolsMenuComponent } from "./components/chat/copilot-chat-tools-menu.component";

// Chat User Message Components
export * from "./components/chat/copilot-chat-user-message.types";
export { CopilotChatUserMessageComponent } from "./components/chat/copilot-chat-user-message.component";
export { CopilotChatUserMessageRendererComponent } from "./components/chat/copilot-chat-user-message-renderer.component";
export {
  CopilotChatUserMessageToolbarButtonComponent,
  CopilotChatUserMessageCopyButtonComponent,
  CopilotChatUserMessageEditButtonComponent,
} from "./components/chat/copilot-chat-user-message-buttons.component";
export { CopilotChatUserMessageToolbarComponent } from "./components/chat/copilot-chat-user-message-toolbar.component";
export { CopilotChatUserMessageBranchNavigationComponent } from "./components/chat/copilot-chat-user-message-branch-navigation.component";

// Testing utilities are not exported from the main entry point
// They should be imported directly from '@copilotkit/angular/testing' if needed

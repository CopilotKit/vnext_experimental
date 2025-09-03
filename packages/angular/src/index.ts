export * from "./core/copilotkit.service";
export * from "./core/copilotkit.types";
export * from "./core/copilotkit.providers";
// Re-export types from @ag-ui/core for convenience
export type { Message, ToolCall, ToolMessage } from "@ag-ui/core";
export * from "./core/chat-configuration/chat-configuration.types";
export * from "./core/chat-configuration/chat-configuration.service";
export * from "./core/chat-configuration/chat-configuration.providers";
export * from "./utils/copilotkit.utils";
export * from "./utils/agent-context.utils";
export * from "./utils/frontend-tool.utils";
// Note: tool-render.utils removed in favor of direct ToolCallRender<T> usage
// Export all except AgentWatchResult which is already exported from copilotkit.types
export { watchAgent, getAgent, subscribeToAgent, registerAgentWatcher } from "./utils/agent.utils";
export * from "./utils/human-in-the-loop.utils";
export * from "./utils/chat-config.utils";
// Slot utilities are internal only, not exported
// export * from "./lib/slots/slot.types";
// export * from "./lib/slots/slot.utils";
// export { CopilotSlotComponent } from "./lib/slots/copilot-slot.component";
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

// Chat Assistant Message Components
export * from "./components/chat/copilot-chat-assistant-message.types";
export { CopilotChatAssistantMessageComponent } from "./components/chat/copilot-chat-assistant-message.component";
export { CopilotChatAssistantMessageRendererComponent } from "./components/chat/copilot-chat-assistant-message-renderer.component";
export {
  CopilotChatAssistantMessageToolbarButtonComponent,
  CopilotChatAssistantMessageCopyButtonComponent,
  CopilotChatAssistantMessageThumbsUpButtonComponent,
  CopilotChatAssistantMessageThumbsDownButtonComponent,
  CopilotChatAssistantMessageReadAloudButtonComponent,
  CopilotChatAssistantMessageRegenerateButtonComponent,
} from "./components/chat/copilot-chat-assistant-message-buttons.component";
export { CopilotChatAssistantMessageToolbarComponent } from "./components/chat/copilot-chat-assistant-message-toolbar.component";

// Chat Message View Components
export * from "./components/chat/copilot-chat-message-view.types";
export { CopilotChatMessageViewComponent } from "./components/chat/copilot-chat-message-view.component";
export { CopilotChatMessageViewCursorComponent } from "./components/chat/copilot-chat-message-view-cursor.component";
export { CopilotChatToolCallsViewComponent } from "./components/chat/copilot-chat-tool-calls-view.component";

// Chat View Components
export * from "./components/chat/copilot-chat-view.types";
export { CopilotChatViewComponent } from "./components/chat/copilot-chat-view.component";
export { CopilotChatViewScrollViewComponent } from "./components/chat/copilot-chat-view-scroll-view.component";
export { CopilotChatViewScrollToBottomButtonComponent } from "./components/chat/copilot-chat-view-scroll-to-bottom-button.component";
export { CopilotChatViewFeatherComponent } from "./components/chat/copilot-chat-view-feather.component";
export { CopilotChatViewInputContainerComponent } from "./components/chat/copilot-chat-view-input-container.component";
export { CopilotChatViewDisclaimerComponent } from "./components/chat/copilot-chat-view-disclaimer.component";

// Main Chat Component
export { CopilotChatComponent } from "./components/chat/copilot-chat.component";

// Services and Directives for Chat View
export { ScrollPositionService } from "./services/scroll-position.service";
export { ResizeObserverService } from "./services/resize-observer.service";
export { StickToBottomDirective } from "./directives/stick-to-bottom.directive";

// Testing utilities are not exported from the main entry point
// They should be imported directly from '@copilotkit/angular/testing' if needed

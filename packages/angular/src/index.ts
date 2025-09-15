export * from "./core/copilotkit";
export * from "./core/copilotkit.types";
export * from "./core/copilotkit.providers";
// Re-export types from @ag-ui/core for convenience
export type { Message, ToolCall, ToolMessage } from "@ag-ui/core";
export * from "./core/chat-configuration/chat-configuration.types";
export * from "./core/chat-configuration/chat-configuration";
export * from "./core/chat-configuration/chat-configuration.providers";
export * from "./utils/copilotkit.utils";
export * from "./utils/agent-context.utils";
export * from "./utils/frontend-tool.utils";
// Note: tool-render.utils removed in favor of direct ToolCallRender<T> usage
// Export all except AgentWatchResult which is already exported from copilotkit.types
export {
  watchAgent,
  watchAgentWith,
  getAgent,
  subscribeToAgent,
} from "./utils/agent.utils";
export * from "./utils/human-in-the-loop.utils";
export * from "./utils/chat-config.utils";
// Slot utilities are internal only, not exported
// export * from "./lib/slots/slot.types";
// export * from "./lib/slots/slot.utils";
// export { CopilotSlot } from "./lib/slots/copilot-slot";
export { CopilotTooltip } from "./lib/directives/tooltip";
export { CopilotKitConfig } from "./directives/copilotkit-config";
export { CopilotKitAgentContext } from "./directives/copilotkit-agent-context";
export { CopilotKitFrontendTool } from "./directives/copilotkit-frontend-tool";
export { CopilotKitAgent } from "./directives/copilotkit-agent";
export {
  CopilotKitHumanInTheLoop,
  CopilotKitHumanInTheLoopRespond,
} from "./directives/copilotkit-human-in-the-loop";
export { CopilotKitChatConfig } from "./directives/copilotkit-chat-config";
export { CopilotKitToolRender } from "./components/copilotkit-tool-render";

// Chat Input Components
export * from "./components/chat/copilot-chat-input.types";
export { CopilotChatInput } from "./components/chat/copilot-chat-input";
export { CopilotChatInputDefaults } from "./components/chat/copilot-chat-input-defaults";
export { CopilotChatTextarea } from "./components/chat/copilot-chat-textarea";
export { CopilotChatAudioRecorder } from "./components/chat/copilot-chat-audio-recorder";
export {
  CopilotChatSendButton,
  CopilotChatToolbarButton,
  CopilotChatStartTranscribeButton,
  CopilotChatCancelTranscribeButton,
  CopilotChatFinishTranscribeButton,
  CopilotChatAddFileButton,
} from "./components/chat/copilot-chat-buttons";
export { CopilotChatToolbar } from "./components/chat/copilot-chat-toolbar";
export { CopilotChatToolsMenu } from "./components/chat/copilot-chat-tools-menu";

// Chat User Message Components
export * from "./components/chat/copilot-chat-user-message.types";
export { CopilotChatUserMessage } from "./components/chat/copilot-chat-user-message";
export { CopilotChatUserMessageRenderer } from "./components/chat/copilot-chat-user-message-renderer";
export {
  CopilotChatUserMessageToolbarButton,
  CopilotChatUserMessageCopyButton,
  CopilotChatUserMessageEditButton,
} from "./components/chat/copilot-chat-user-message-buttons";
export { CopilotChatUserMessageToolbar } from "./components/chat/copilot-chat-user-message-toolbar";
export { CopilotChatUserMessageBranchNavigation } from "./components/chat/copilot-chat-user-message-branch-navigation";

// Chat Assistant Message Components
export * from "./components/chat/copilot-chat-assistant-message.types";
export { CopilotChatAssistantMessage } from "./components/chat/copilot-chat-assistant-message";
export { CopilotChatAssistantMessageRenderer } from "./components/chat/copilot-chat-assistant-message-renderer";
export {
  CopilotChatAssistantMessageToolbarButton,
  CopilotChatAssistantMessageCopyButton,
  CopilotChatAssistantMessageThumbsUpButton,
  CopilotChatAssistantMessageThumbsDownButton,
  CopilotChatAssistantMessageReadAloudButton,
  CopilotChatAssistantMessageRegenerateButton,
} from "./components/chat/copilot-chat-assistant-message-buttons";
export { CopilotChatAssistantMessageToolbar } from "./components/chat/copilot-chat-assistant-message-toolbar";

// Chat Message View Components
export * from "./components/chat/copilot-chat-message-view.types";
export { CopilotChatMessageView } from "./components/chat/copilot-chat-message-view";
export { CopilotChatMessageViewCursor } from "./components/chat/copilot-chat-message-view-cursor";
export { CopilotChatToolCallsView } from "./components/chat/copilot-chat-tool-calls-view";

// Chat View Components
export * from "./components/chat/copilot-chat-view.types";
export { CopilotChatView } from "./components/chat/copilot-chat-view";
export { CopilotChatViewScrollView } from "./components/chat/copilot-chat-view-scroll-view";
export { CopilotChatViewScrollToBottomButton } from "./components/chat/copilot-chat-view-scroll-to-bottom-button";
export { CopilotChatViewFeather } from "./components/chat/copilot-chat-view-feather";
export { CopilotChatViewInputContainer } from "./components/chat/copilot-chat-view-input-container";
export { CopilotChatViewDisclaimer } from "./components/chat/copilot-chat-view-disclaimer";

// Main Chat Component
export { CopilotChat } from "./components/chat/copilot-chat";

// Services and Directives for Chat View
export { ScrollPosition } from "./services/scroll-position";
export { ResizeObserverService } from "./services/resize-observer";
export { StickToBottom } from "./directives/stick-to-bottom";

// Testing utilities are not exported from the main entry point
// They should be imported directly from '@copilotkitnext/angular/testing' if needed

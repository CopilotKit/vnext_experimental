export * from './core/copilotkit.service';
export * from './core/copilotkit.types';
export * from './core/copilotkit.providers';
export * from './core/chat-configuration/chat-configuration.types';
export * from './core/chat-configuration/chat-configuration.service';
export * from './core/chat-configuration/chat-configuration.providers';
export * from './utils/copilotkit.utils';
export * from './utils/agent-context.utils';
export * from './utils/frontend-tool.utils';
export * from './utils/agent.utils';
export * from './utils/human-in-the-loop.utils';
export * from './utils/chat-config.utils';
export * from './lib/slots/slot.types';
export * from './lib/slots/slot.utils';
export { CopilotKitConfigDirective } from './directives/copilotkit-config.directive';
export { CopilotkitAgentContextDirective } from './directives/copilotkit-agent-context.directive';
export { CopilotkitFrontendToolDirective } from './directives/copilotkit-frontend-tool.directive';
export { CopilotkitAgentDirective } from './directives/copilotkit-agent.directive';
export { CopilotkitHumanInTheLoopDirective, CopilotkitHumanInTheLoopRespondDirective } from './directives/copilotkit-human-in-the-loop.directive';
export { CopilotkitChatConfigDirective } from './directives/copilotkit-chat-config.directive';
export { CopilotSlotDirective, CopilotSlotContentDirective } from './lib/slots/slot.directive';
export { CopilotkitToolRenderComponent } from './components/copilotkit-tool-render.component';

// Chat Input Components
export * from './components/chat/copilot-chat-input.types';
export { CopilotChatInputComponent } from './components/chat/copilot-chat-input.component';
export { CopilotChatTextareaComponent } from './components/chat/copilot-chat-textarea.component';
export { CopilotChatAudioRecorderComponent } from './components/chat/copilot-chat-audio-recorder.component';
export {
  CopilotChatSendButtonComponent,
  CopilotChatToolbarButtonComponent,
  CopilotChatStartTranscribeButtonComponent,
  CopilotChatCancelTranscribeButtonComponent,
  CopilotChatFinishTranscribeButtonComponent,
  CopilotChatAddFileButtonComponent
} from './components/chat/copilot-chat-buttons.component';
export { CopilotChatToolbarComponent } from './components/chat/copilot-chat-toolbar.component';
export { CopilotChatToolsMenuComponent } from './components/chat/copilot-chat-tools-menu.component';

// Testing utilities are not exported from the main entry point
// They should be imported directly from '@copilotkit/angular/testing' if needed


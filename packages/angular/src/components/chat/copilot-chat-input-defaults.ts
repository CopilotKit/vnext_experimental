import { CopilotChatTextareaComponent } from './copilot-chat-textarea.component';
import { CopilotChatAudioRecorderComponent } from './copilot-chat-audio-recorder.component';
import {
  CopilotChatSendButtonComponent,
  CopilotChatStartTranscribeButtonComponent,
  CopilotChatCancelTranscribeButtonComponent,
  CopilotChatFinishTranscribeButtonComponent,
  CopilotChatAddFileButtonComponent
} from './copilot-chat-buttons.component';
import { CopilotChatToolbarComponent } from './copilot-chat-toolbar.component';
import { CopilotChatToolsMenuComponent } from './copilot-chat-tools-menu.component';

/**
 * Default components used by CopilotChatInput.
 * These can be imported and reused when creating custom slot implementations.
 * 
 * @example
 * ```typescript
 * import { CopilotChatInputDefaults } from '@copilotkit/angular';
 * 
 * @Component({
 *   template: `
 *     <copilot-chat-input [sendButtonSlot]="CustomSendButton">
 *     </copilot-chat-input>
 *   `
 * })
 * export class MyComponent {
 *   CustomSendButton = class extends CopilotChatInputDefaults.SendButton {
 *     // Custom implementation
 *   };
 * }
 * ```
 */
export class CopilotChatInputDefaults {
  static readonly TextArea = CopilotChatTextareaComponent;
  static readonly AudioRecorder = CopilotChatAudioRecorderComponent;
  static readonly SendButton = CopilotChatSendButtonComponent;
  static readonly StartTranscribeButton = CopilotChatStartTranscribeButtonComponent;
  static readonly CancelTranscribeButton = CopilotChatCancelTranscribeButtonComponent;
  static readonly FinishTranscribeButton = CopilotChatFinishTranscribeButtonComponent;
  static readonly AddFileButton = CopilotChatAddFileButtonComponent;
  static readonly Toolbar = CopilotChatToolbarComponent;
  static readonly ToolsMenu = CopilotChatToolsMenuComponent;
}
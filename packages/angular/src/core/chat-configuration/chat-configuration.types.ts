import { InjectionToken } from '@angular/core';

// Default labels constant
export const COPILOT_CHAT_DEFAULT_LABELS = {
  chatInputPlaceholder: "Type a message...",
  chatInputToolbarStartTranscribeButtonLabel: "Transcribe",
  chatInputToolbarCancelTranscribeButtonLabel: "Cancel",
  chatInputToolbarFinishTranscribeButtonLabel: "Finish",
  chatInputToolbarAddButtonLabel: "Add photos or files",
  chatInputToolbarToolsButtonLabel: "Tools",
  assistantMessageToolbarCopyCodeLabel: "Copy",
  assistantMessageToolbarCopyCodeCopiedLabel: "Copied",
  assistantMessageToolbarCopyMessageLabel: "Copy",
  assistantMessageToolbarThumbsUpLabel: "Good response",
  assistantMessageToolbarThumbsDownLabel: "Bad response",
  assistantMessageToolbarReadAloudLabel: "Read aloud",
  assistantMessageToolbarRegenerateLabel: "Regenerate",
  userMessageToolbarCopyMessageLabel: "Copy",
  userMessageToolbarEditMessageLabel: "Edit",
  chatDisclaimerText: "AI can make mistakes. Please verify important information.",
} as const;

// Type for chat labels
export type CopilotChatLabels = typeof COPILOT_CHAT_DEFAULT_LABELS;

// Configuration interface
export interface CopilotChatConfiguration {
  labels?: Partial<CopilotChatLabels>;
  inputValue?: string;
  onSubmitInput?: (value: string) => void;
  onChangeInput?: (value: string) => void;
}

// Injection token for initial configuration
export const COPILOT_CHAT_INITIAL_CONFIG = new InjectionToken<CopilotChatConfiguration>(
  'COPILOT_CHAT_INITIAL_CONFIG',
  {
    providedIn: 'root',
    factory: () => ({})
  }
);
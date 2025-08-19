import type { Type, TemplateRef } from '@angular/core';

/**
 * Mode of the chat input component
 */
export type CopilotChatInputMode = 'input' | 'transcribe' | 'processing';

/**
 * Represents a menu item in the tools menu
 */
export type ToolsMenuItem = {
  label: string;
} & (
  | {
      action: () => void;
      items?: never;
    }
  | {
      action?: never;
      items: (ToolsMenuItem | '-')[];
    }
);

/**
 * Audio recorder state
 */
export type AudioRecorderState = 'idle' | 'recording' | 'processing';

/**
 * Error class for audio recorder failures
 */
export class AudioRecorderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudioRecorderError';
  }
}

/**
 * Props for textarea component
 */
export interface CopilotChatTextareaProps {
  value?: string;
  placeholder?: string;
  maxRows?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  onChange?: (value: string) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  class?: string;
}

/**
 * Props for button components
 */
export interface CopilotChatButtonProps {
  disabled?: boolean;
  onClick?: () => void;
  class?: string;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Props for toolbar button with tooltip
 */
export interface CopilotChatToolbarButtonProps extends CopilotChatButtonProps {
  icon?: TemplateRef<any>;
  tooltip?: string;
  variant?: 'primary' | 'secondary';
}

/**
 * Props for tools menu button
 */
export interface CopilotChatToolsButtonProps extends CopilotChatButtonProps {
  toolsMenu?: (ToolsMenuItem | '-')[];
}

/**
 * Props for audio recorder
 */
export interface CopilotChatAudioRecorderProps {
  class?: string;
  onStateChange?: (state: AudioRecorderState) => void;
}

/**
 * Props for toolbar
 */
export interface CopilotChatToolbarProps {
  class?: string;
}

/**
 * Slot configuration for chat input
 */
export interface CopilotChatInputSlots {
  textArea?: Type<any> | TemplateRef<any> | string;
  sendButton?: Type<any> | TemplateRef<any> | string;
  startTranscribeButton?: Type<any> | TemplateRef<any> | string;
  cancelTranscribeButton?: Type<any> | TemplateRef<any> | string;
  finishTranscribeButton?: Type<any> | TemplateRef<any> | string;
  addFileButton?: Type<any> | TemplateRef<any> | string;
  toolsButton?: Type<any> | TemplateRef<any> | string;
  toolbar?: Type<any> | TemplateRef<any> | string;
  audioRecorder?: Type<any> | TemplateRef<any> | string;
}

/**
 * Input configuration for the chat input component
 */
export interface CopilotChatInputConfig {
  mode?: CopilotChatInputMode;
  toolsMenu?: (ToolsMenuItem | '-')[];
  autoFocus?: boolean;
  additionalToolbarItems?: TemplateRef<any>;
  value?: string;
  class?: string;
}

/**
 * Output events for the chat input component
 */
export interface CopilotChatInputOutputs {
  submitMessage: (value: string) => void;
  startTranscribe: () => void;
  cancelTranscribe: () => void;
  finishTranscribe: () => void;
  addFile: () => void;
  changeValue: (value: string) => void;
}
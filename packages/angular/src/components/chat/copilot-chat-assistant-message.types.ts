import { AssistantMessage } from '@ag-ui/client';

// Context interfaces for slots
export interface AssistantMessageMarkdownRendererContext {
  content: string;
}

export interface AssistantMessageToolbarContext {
  children?: any;
}

export interface AssistantMessageCopyButtonContext {
  onClick: () => void;
}

export interface ThumbsUpButtonContext {
  onClick?: () => void;
}

export interface ThumbsDownButtonContext {
  onClick?: () => void;
}

export interface ReadAloudButtonContext {
  onClick?: () => void;
}

export interface RegenerateButtonContext {
  onClick?: () => void;
}

// Event handler props
export interface CopilotChatAssistantMessageOnThumbsUpProps {
  message: AssistantMessage;
}

export interface CopilotChatAssistantMessageOnThumbsDownProps {
  message: AssistantMessage;
}

export interface CopilotChatAssistantMessageOnReadAloudProps {
  message: AssistantMessage;
}

export interface CopilotChatAssistantMessageOnRegenerateProps {
  message: AssistantMessage;
}

// Re-export for convenience
export type { AssistantMessage };
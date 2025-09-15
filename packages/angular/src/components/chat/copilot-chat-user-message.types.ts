/* eslint-disable @typescript-eslint/no-empty-object-type */
export interface UserMessage {
  id: string;
  content?: string;
  role: "user";
  timestamp?: Date;
  [key: string]: any; // Allow additional properties
}

export interface CopilotChatUserMessageOnEditMessageProps {
  message: UserMessage;
}

export interface CopilotChatUserMessageOnSwitchToBranchProps {
  message: UserMessage;
  branchIndex: number;
  numberOfBranches: number;
}

// Context interfaces for slots
export interface MessageRendererContext {
  content: string;
}

export interface CopyButtonContext {
  content?: string;
  copied?: boolean;
}

export interface EditButtonContext {
  // Empty context - click handled via outputs map
}

export interface BranchNavigationContext {
  currentBranch: number;
  numberOfBranches: number;
  onSwitchToBranch?: (
    props: CopilotChatUserMessageOnSwitchToBranchProps
  ) => void;
  message: UserMessage;
}

export interface ToolbarContext {
  children?: any;
}

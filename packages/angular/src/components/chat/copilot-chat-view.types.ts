import { Type, TemplateRef } from '@angular/core';
import { Message } from '@ag-ui/client';

/**
 * Props for CopilotChatView component
 */
export interface CopilotChatViewProps {
  messages?: Message[];
  autoScroll?: boolean;
  className?: string;
  
  // Slot configurations
  messageViewComponent?: Type<any>;
  messageViewTemplate?: TemplateRef<any>;
  messageViewClass?: string;
  messageViewProps?: any;
  
  scrollViewComponent?: Type<any>;
  scrollViewTemplate?: TemplateRef<any>;
  scrollViewClass?: string;
  scrollViewProps?: any;
  
  scrollToBottomButtonComponent?: Type<any>;
  scrollToBottomButtonTemplate?: TemplateRef<any>;
  scrollToBottomButtonClass?: string;
  scrollToBottomButtonProps?: any;
  
  inputComponent?: Type<any>;
  inputTemplate?: TemplateRef<any>;
  inputClass?: string;
  inputProps?: any;
  
  inputContainerComponent?: Type<any>;
  inputContainerTemplate?: TemplateRef<any>;
  inputContainerClass?: string;
  inputContainerProps?: any;
  
  featherComponent?: Type<any>;
  featherTemplate?: TemplateRef<any>;
  featherClass?: string;
  featherProps?: any;
  
  disclaimerComponent?: Type<any>;
  disclaimerTemplate?: TemplateRef<any>;
  disclaimerClass?: string;
  disclaimerProps?: any;
}

/**
 * Context for custom layout template
 */
export interface CopilotChatViewLayoutContext {
  messageView: any;
  input: any;
  scrollView: any;
  scrollToBottomButton: any;
  feather: any;
  inputContainer: any;
  disclaimer: any;
}
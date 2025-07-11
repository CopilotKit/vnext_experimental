import React, { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { twMerge } from "tailwind-merge";
import { Plus, Settings, Mic, ArrowUp } from "lucide-react";
import CopilotChatInputTextArea from "./CopilotChatInputTextarea";
import { useCopilotChatContext } from "../../providers/CopilotChatContextProvider";

// Input component props interface
interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

// Button component props interface
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

// TranscribeButton component props interface
interface TranscribeButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

// AddButton component props interface
interface AddButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

// Container component props interface
interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

// ToolBar component props interface
interface ToolBarProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

// Default components
const DefaultTextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => {
    const { labels } = useCopilotChatContext();
    return (
      <CopilotChatInputTextArea
        ref={ref}
        placeholder={labels.inputPlaceholder}
        maxRows={4}
        className={twMerge(
          // Layout and sizing
          "w-full p-5 pb-0",
          // Behavior
          "outline-none resize-none",
          // Background
          "bg-transparent",
          // Typography
          "antialiased font-regular leading-relaxed text-[16px]",
          // Placeholder styles
          "placeholder:text-[#00000077]",
          className
        )}
        {...props}
      />
    );
  }
);
DefaultTextArea.displayName = "DefaultTextArea";

const DefaultButton: React.FC<ButtonProps> = ({ className, ...props }) => (
  <button
    type="button"
    className={twMerge(
      // Base styles
      "flex items-center justify-center rounded-full transition-colors h-9 w-9",
      // Position
      "mr-[10px]",
      // Normal state
      "bg-black text-white",
      // Dark mode
      "dark:bg-white dark:text-black dark:focus-visible:outline-white",
      // Disabled state
      "disabled:bg-[#EBEBEB] disabled:text-[#0d0d0d] disabled:cursor-not-allowed",
      // Dark mode disabled
      "dark:disabled:bg-token-text-quaternary dark:disabled:text-token-main-surface-secondary",
      // Hover/focus states
      "hover:opacity-70 disabled:hover:opacity-100",
      className
    )}
    {...props}
  >
    <ArrowUp size={20} />
  </button>
);

const DefaultTranscribeButton: React.FC<TranscribeButtonProps> = ({
  className,
  ...props
}) => {
  const { labels } = useCopilotChatContext();
  return (
    <div className="relative group mr-2">
      <button
        type="button"
        className={twMerge(
          // Base styles
          "flex items-center justify-center rounded-full transition-colors h-9 w-9",
          // Normal state
          "bg-transparent text-[#666666]",
          // Dark mode
          "dark:text-[#CCCCCC] dark:border-[#404040]",
          // Hover states
          "hover:bg-[#f8f8f8] hover:text-[#333333]",
          "dark:hover:bg-[#404040] dark:hover:text-[#FFFFFF]",
          // Disabled state
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      >
        <Mic size={20} />
      </button>
      <div className="absolute z-50 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap transform -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 top-full mt-2 left-1/2">
        {labels.inputTranscribeButtonLabel}
      </div>
    </div>
  );
};

const DefaultAddButton: React.FC<AddButtonProps> = ({
  className,
  ...props
}) => {
  const { labels } = useCopilotChatContext();
  return (
    <div className="relative group ml-3">
      <button
        type="button"
        className={twMerge(
          // Base styles
          "flex items-center justify-center rounded-full transition-colors h-9 w-9",
          // Normal state
          "bg-transparent text-[#666666]",
          // Dark mode
          "dark:text-[#CCCCCC] dark:border-[#404040]",
          // Hover states
          "hover:bg-[#f8f8f8] hover:text-[#333333]",
          "dark:hover:bg-[#404040] dark:hover:text-[#FFFFFF]",
          // Disabled state
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
        {...props}
      >
        <Plus size={20} />
      </button>
      <div className="absolute z-50 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap transform -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 top-full mt-2 left-1/2">
        {labels.inputAddButtonLabel}
      </div>
    </div>
  );
};

const DefaultContainer: React.FC<React.PropsWithChildren<ContainerProps>> = ({
  children,
  className,
  ...props
}) => (
  <div
    className={twMerge(
      // Layout
      "flex w-full flex-col items-center justify-center",
      // Interaction
      "cursor-text",
      // Overflow and clipping
      "overflow-visible bg-clip-padding contain-inline-size",
      // Background
      "bg-white dark:bg-[#303030]",
      // Visual effects
      "shadow-[0_4px_4px_0_#0000000a,0_0_1px_0_#0000009e] rounded-[28px]",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

const DefaultToolBar: React.FC<ToolBarProps> = ({ className, ...props }) => (
  <div
    className={twMerge(
      "w-full h-[60px] bg-transparent flex items-center",
      className
    )}
    {...props}
  />
);

export type CopilotChatInputProps = {
  /** Called with trimmed text when user submits. Clears input. */
  onSend: (text: string) => void;

  /** Called when user starts transcription. Optional. */
  onTranscribe?: () => void;

  /** Called when user wants to add photos or files. Optional. */
  onAdd?: () => void;

  /**
   * Component slots — override one or many:
   * - TextArea: must render <textarea …>
   * - Button:  must render <button …>
   * - TranscribeButton: must render <button …> with built-in tooltip
   * - AddButton: must render <button …> with built-in tooltip
   * - Container: wrapper around everything (default is <div>)
   * - ToolBar: bottom toolbar area (default is <div>)
   */
  components?: {
    TextArea?: React.ComponentType<TextAreaProps>;
    Button?: React.ComponentType<ButtonProps>;
    TranscribeButton?: React.ComponentType<TranscribeButtonProps>;
    AddButton?: React.ComponentType<AddButtonProps>;
    Container?: React.ComponentType<React.PropsWithChildren<ContainerProps>>;
    ToolBar?: React.ComponentType<ToolBarProps>;
  };

  /**
   * Style-only overrides (merged onto defaults).
   * Ignore if user also swaps that component.
   */
  appearance?: {
    container?: string;
    textarea?: string;
    button?: string;
    transcribeButton?: string;
    addButton?: string;
    toolbar?: string;
  };

  /**
   * Full-layout override (highest priority).
   * Receives the *pre-wired* sub-components so users never touch handlers.
   */
  children?: (parts: {
    TextArea: JSX.Element;
    Button: JSX.Element;
    TranscribeButton: JSX.Element;
    AddButton: JSX.Element;
    ToolBar: JSX.Element;
  }) => React.ReactNode;
};

export const CopilotChatInput: React.FC<CopilotChatInputProps> = ({
  onSend,
  onTranscribe,
  onAdd,
  components = {},
  appearance = {},
  children,
}) => {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Extract component overrides with defaults
  const {
    TextArea = DefaultTextArea,
    Button = DefaultButton,
    TranscribeButton = DefaultTranscribeButton,
    AddButton = DefaultAddButton,
    Container = DefaultContainer,
    ToolBar = DefaultToolBar,
  } = components;

  // Handlers
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const send = () => {
    const trimmed = text.trim();
    if (trimmed) {
      onSend(trimmed);
      setText("");
      // Refocus input after sending
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Build bound components with handlers
  const BoundTextArea = (
    <TextArea
      ref={inputRef}
      value={text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={TextArea === DefaultTextArea ? appearance.textarea : undefined}
    />
  );

  const BoundButton = (
    <Button
      onClick={send}
      disabled={!text.trim()}
      className={Button === DefaultButton ? appearance.button : undefined}
    />
  );

  const BoundTranscribeButton = (
    <TranscribeButton
      onClick={onTranscribe}
      className={
        TranscribeButton === DefaultTranscribeButton
          ? appearance.transcribeButton
          : undefined
      }
    />
  );

  const BoundAddButton = (
    <AddButton
      onClick={onAdd}
      className={
        AddButton === DefaultAddButton ? appearance.addButton : undefined
      }
    />
  );

  const BoundToolBar = (
    <ToolBar
      className={ToolBar === DefaultToolBar ? appearance.toolbar : undefined}
    />
  );

  // Render algorithm
  if (children) {
    // Custom layout via render prop
    return (
      <>
        {children({
          TextArea: BoundTextArea,
          Button: BoundButton,
          TranscribeButton: BoundTranscribeButton,
          AddButton: BoundAddButton,
          ToolBar: BoundToolBar,
        })}
      </>
    );
  }

  // Default layout
  return (
    <Container
      className={
        Container === DefaultContainer ? appearance.container : undefined
      }
    >
      {BoundTextArea}
      <ToolBar
        className={twMerge(
          "w-full h-[60px] bg-transparent flex items-center justify-between",
          ToolBar === DefaultToolBar ? appearance.toolbar : undefined
        )}
      >
        <div className="flex items-center">{onAdd && BoundAddButton}</div>
        <div className="flex items-center">
          {onTranscribe && BoundTranscribeButton}
          {BoundButton}
        </div>
      </ToolBar>
    </Container>
  );
};

export default CopilotChatInput;

import React, { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { twMerge } from "tailwind-merge";
import { Plus, Settings2, Mic, ArrowUp } from "lucide-react";
import AutoResizingTextArea from "./AutoResizingTextArea";
import { useCopilotChatContext } from "../../../providers/CopilotChatContextProvider";
import { cva } from "class-variance-authority";

export type CopilotChatInputMode = "input" | "transcribe" | "processing";

export type CopilotChatInputProps = {
  mode?: CopilotChatInputMode;

  /** Called with trimmed text when user submits. Clears input. */
  onSend: (text: string) => void;

  /** Called when user wants to add photos or files. Optional. */
  onAdd?: () => void;

  /** Called when user wants to open tools. Optional. */
  onTools?: () => void;

  /**
   * Component slots — override one or many:
   * - TextArea: must render <textarea …>
   * - SendButton:  must render <button …>
   * - StartTranscribeButton: must render <button …> with built-in tooltip
   * - AddButton: must render <button …> with built-in tooltip
   * - ToolsButton: must render <button …> with built-in tooltip and text
   * - Container: wrapper around everything (default is <div>)
   * - ToolBar: bottom toolbar area (default is <div>)
   */
  components?: {
    TextArea?: React.ComponentType<TextAreaProps>;
    SendButton?: React.ComponentType<SendButtonProps>;
    TranscribeButton?: React.ComponentType<TranscribeButtonProps>;
    AddButton?: React.ComponentType<AddButtonProps>;
    ToolsButton?: React.ComponentType<ToolsButtonProps>;
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
    sendButton?: string;
    transcribeButton?: string;
    addButton?: string;
    toolsButton?: string;
    toolbar?: string;
  };

  /**
   * Full-layout override (highest priority).
   * Receives the *pre-wired* sub-components so users never touch handlers.
   */
  children?: (parts: {
    TextArea: JSX.Element;
    SendButton: JSX.Element;
    TranscribeButton: JSX.Element;
    AddButton: JSX.Element;
    ToolsButton: JSX.Element;
    ToolBar: JSX.Element;
  }) => React.ReactNode;
} &
  // Either all or none of the transcribe callbacks are provided
  (| {
        onStartTranscribe: () => void;
        onCancelTranscribe: () => void;
        onFinishTranscribe: () => void;
      }
    | {
        onStartTranscribe?: never;
        onCancelTranscribe?: never;
        onFinishTranscribe?: never;
      }
  );

export const CopilotChatInput: React.FC<CopilotChatInputProps> = ({
  mode = "input",
  onSend,
  onStartTranscribe,
  onCancelTranscribe,
  onFinishTranscribe,
  onAdd,
  onTools,
  components = {},
  appearance = {},
  children,
}) => {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Extract component overrides with defaults
  const {
    TextArea = DefaultTextArea,
    SendButton = DefaultSendButton,
    TranscribeButton = DefaultTranscribeButton,
    AddButton = DefaultAddButton,
    ToolsButton = DefaultToolsButton,
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

  const BoundSendButton = (
    <SendButton
      onClick={send}
      disabled={!text.trim()}
      className={
        SendButton === DefaultSendButton ? appearance.sendButton : undefined
      }
    />
  );

  const BoundTranscribeButton = (
    <TranscribeButton
      onClick={onStartTranscribe}
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
      disabled={mode === "transcribe"}
      className={
        AddButton === DefaultAddButton ? appearance.addButton : undefined
      }
    />
  );

  const BoundToolsButton = (
    <ToolsButton
      onClick={onTools}
      disabled={mode === "transcribe"}
      className={
        ToolsButton === DefaultToolsButton ? appearance.toolsButton : undefined
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
          SendButton: BoundSendButton,
          TranscribeButton: BoundTranscribeButton,
          AddButton: BoundAddButton,
          ToolsButton: BoundToolsButton,
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
        <div className="flex items-center">
          {onAdd && BoundAddButton}
          {onTools && BoundToolsButton}
        </div>
        <div className="flex items-center">
          {onStartTranscribe && BoundTranscribeButton}
          {BoundSendButton}
        </div>
      </ToolBar>
    </Container>
  );
};

// Input component props interface
type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

// Button component props interface
type SendButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

// StartTranscribeButton component props interface
type TranscribeButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

// AddButton component props interface
type AddButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

// ToolsButton component props interface
type ToolsButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

// Container component props interface
type ContainerProps = React.HTMLAttributes<HTMLDivElement>;

// ToolBar component props interface
type ToolBarProps = React.HTMLAttributes<HTMLDivElement>;

const chatInputButton = cva(
  [
    // Layout
    "flex items-center justify-center",
    // Shape and sizing
    "rounded-full h-9",
    // Interactions
    "transition-colors",
    // Focus states
    "focus:outline-none",
    // Disabled states
    "disabled:cursor-not-allowed",
  ],
  {
    variants: {
      intent: {
        primary: [
          // Background and text
          "bg-black text-white",
          // Dark mode
          "dark:bg-white dark:text-black dark:focus-visible:outline-white",
          // Hover states
          "hover:opacity-70 disabled:hover:opacity-100",
          // Disabled states
          "disabled:bg-[#00000014] disabled:text-[rgb(13,13,13)]",
        ],
        secondary: [
          // Background and text
          "bg-transparent text-[#666666]",
          // Dark mode
          "dark:text-[#CCCCCC] dark:border-[#404040]",
          // Hover states
          "hover:bg-[#f8f8f8] hover:text-[#333333]",
          "dark:hover:bg-[#404040] dark:hover:text-[#FFFFFF]",
          // Disabled states
          "disabled:opacity-50",
          "disabled:hover:bg-transparent disabled:hover:text-[#666666]",
          "dark:disabled:hover:bg-transparent dark:disabled:hover:text-[#CCCCCC]",
        ],
      },
      size: {
        icon: ["w-9"],
        iconLabel: [
          // Layout
          "gap-2",
          // Sizing
          "px-3",
        ],
      },
      margin: {
        left: "ml-2",
        leftTight: "ml-1",
        leftWide: "ml-[11px]",
        right: "mr-2",
        rightWide: "mr-[10px]",
        none: "",
      },
    },
    defaultVariants: {
      intent: "secondary",
      size: "icon",
      margin: "none",
    },
  }
);

const chatTooltip = cva(
  [
    // Positioning
    "absolute z-50 top-full left-1/2",
    // Layout
    "mt-2 px-2 py-1",
    // Transform
    "transform -translate-x-1/2",
    // Background and text
    "bg-black text-white",
    // Typography
    "text-xs",
    // Shape
    "rounded whitespace-nowrap",
    // Interactions
    "pointer-events-none",
    // Animation
    "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
  ],
  {
    variants: {
      // Add variants here if you want to support different placements, colors, etc.
    },
    defaultVariants: {},
  }
);

// Default components
const DefaultTextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, ...props }, ref) => {
    const { labels } = useCopilotChatContext();
    return (
      <AutoResizingTextArea
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

const DefaultSendButton: React.FC<SendButtonProps> = ({
  className,
  ...props
}) => (
  <button
    type="button"
    className={twMerge(
      chatInputButton({ intent: "primary", size: "icon", margin: "rightWide" }),
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
    <div className="relative group">
      <button
        type="button"
        className={twMerge(
          chatInputButton({
            intent: "secondary",
            size: "icon",
            margin: "right",
          }),
          className
        )}
        {...props}
      >
        <Mic size={20} />
      </button>
      {props.disabled !== true && (
        <div className={chatTooltip()}>
          {labels.inputStartTranscribeButtonLabel}
        </div>
      )}
    </div>
  );
};

const DefaultAddButton: React.FC<AddButtonProps> = ({
  className,
  ...props
}) => {
  const { labels } = useCopilotChatContext();
  return (
    <div className="relative group">
      <button
        type="button"
        className={twMerge(
          chatInputButton({
            intent: "secondary",
            size: "icon",
            margin: "left",
          }),
          className
        )}
        {...props}
      >
        <Plus size={20} />
      </button>
      {props.disabled !== true && (
        <div className={chatTooltip()}>{labels.inputAddButtonLabel}</div>
      )}
    </div>
  );
};

const DefaultToolsButton: React.FC<ToolsButtonProps> = ({
  className,
  ...props
}) => {
  const { labels } = useCopilotChatContext();
  return (
    <div className="relative group">
      <button
        type="button"
        className={twMerge(
          chatInputButton({
            intent: "secondary",
            size: "iconLabel",
            margin: "none",
          }),
          "font-normal",
          className
        )}
        {...props}
      >
        <Settings2 size={20} />
        <span className="text-sm font-normal">
          {labels.inputToolsButtonLabel}
        </span>
      </button>
      {props.disabled !== true && (
        <div className={chatTooltip()}>{labels.inputToolsButtonLabel}</div>
      )}
    </div>
  );
};

// Default components
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

export default CopilotChatInput;

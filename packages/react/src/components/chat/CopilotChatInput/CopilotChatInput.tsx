import React, { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { twMerge } from "tailwind-merge";
import { Plus, Settings2, Mic, ArrowUp, X, Check } from "lucide-react";
import AutoResizingTextArea from "./AutoResizingTextArea";
import { RecordingIndicator as ImportedRecordingIndicator } from "./RecordingIndicator";
import { useCopilotChatContext } from "@/providers/CopilotChatContextProvider";
import { Button } from "@/components/ui/button";
import { ToolbarButton } from "./ToolbarButton";

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
   * - RecordingIndicator: shown instead of TextArea when mode is "transcribe"
   * - SendButton:  must render <button …>
   * - StartTranscribeButton: must render <button …> with built-in tooltip
   * - CancelTranscribeButton: must render <button …> with built-in tooltip
   * - FinishTranscribeButton: must render <button …> with built-in tooltip
   * - AddButton: must render <button …> with built-in tooltip
   * - ToolsButton: must render <button …> with built-in tooltip and text
   * - Container: wrapper around everything (default is <div>)
   * - ToolBar: bottom toolbar area (default is <div>)
   */
  components?: {
    TextArea?: React.ComponentType<TextAreaProps>;
    RecordingIndicator?: React.ComponentType<RecordingIndicatorProps>;
    SendButton?: React.ComponentType<SendButtonProps>;
    StartTranscribeButton?: React.ComponentType<StartTranscribeButtonProps>;
    CancelTranscribeButton?: React.ComponentType<CancelTranscribeButtonProps>;
    FinishTranscribeButton?: React.ComponentType<FinishTranscribeButtonProps>;
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
    recordingIndicator?: string;
    sendButton?: string;
    startTranscribeButton?: string;
    cancelTranscribeButton?: string;
    finishTranscribeButton?: string;
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
    RecordingIndicator: JSX.Element;
    SendButton: JSX.Element;
    StartTranscribeButton: JSX.Element;
    CancelTranscribeButton: JSX.Element;
    FinishTranscribeButton: JSX.Element;
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
    RecordingIndicator = DefaultRecordingIndicator,
    SendButton = DefaultSendButton,
    StartTranscribeButton = DefaultStartTranscribeButton,
    CancelTranscribeButton = DefaultCancelTranscribeButton,
    FinishTranscribeButton = DefaultFinishTranscribeButton,
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

  const BoundRecordingIndicator = (
    <RecordingIndicator
      className={
        RecordingIndicator === DefaultRecordingIndicator
          ? appearance.recordingIndicator
          : undefined
      }
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

  const BoundStartTranscribeButton = (
    <StartTranscribeButton
      onClick={onStartTranscribe}
      className={
        StartTranscribeButton === DefaultStartTranscribeButton
          ? appearance.startTranscribeButton
          : undefined
      }
    />
  );

  const BoundCancelTranscribeButton = (
    <CancelTranscribeButton
      onClick={onCancelTranscribe}
      className={
        CancelTranscribeButton === DefaultCancelTranscribeButton
          ? appearance.cancelTranscribeButton
          : undefined
      }
    />
  );

  const BoundFinishTranscribeButton = (
    <FinishTranscribeButton
      onClick={onFinishTranscribe}
      className={
        FinishTranscribeButton === DefaultFinishTranscribeButton
          ? appearance.finishTranscribeButton
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
          RecordingIndicator: BoundRecordingIndicator,
          SendButton: BoundSendButton,
          StartTranscribeButton: BoundStartTranscribeButton,
          CancelTranscribeButton: BoundCancelTranscribeButton,
          FinishTranscribeButton: BoundFinishTranscribeButton,
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
      {mode === "transcribe" ? BoundRecordingIndicator : BoundTextArea}
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
          {mode === "transcribe" ? (
            <>
              {onCancelTranscribe && BoundCancelTranscribeButton}
              {onFinishTranscribe && BoundFinishTranscribeButton}
            </>
          ) : (
            <>
              {onStartTranscribe && BoundStartTranscribeButton}
              {BoundSendButton}
            </>
          )}
        </div>
      </ToolBar>
    </Container>
  );
};

// Input component props interface
type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

// RecordingIndicator component props interface
type RecordingIndicatorProps = React.HTMLAttributes<HTMLDivElement>;

// Button component props interface
type SendButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

// StartTranscribeButton component props interface
type StartTranscribeButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

// CancelTranscribeButton component props interface
type CancelTranscribeButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement>;

// FinishTranscribeButton component props interface
type FinishTranscribeButtonProps =
  React.ButtonHTMLAttributes<HTMLButtonElement>;

// AddButton component props interface
type AddButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

// ToolsButton component props interface
type ToolsButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

// Container component props interface
type ContainerProps = React.HTMLAttributes<HTMLDivElement>;

// ToolBar component props interface
type ToolBarProps = React.HTMLAttributes<HTMLDivElement>;

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

const DefaultRecordingIndicator: React.FC<RecordingIndicatorProps> =
  ImportedRecordingIndicator;

const DefaultSendButton: React.FC<SendButtonProps> = ({
  className,
  ...props
}) => (
  <div className="mr-[10px]">
    <Button
      type="button"
      variant="chatInputToolbarPrimary"
      size="chatInputToolbarIcon"
      className={className}
      {...props}
    >
      <ArrowUp size={20} />
    </Button>
  </div>
);

const DefaultStartTranscribeButton: React.FC<StartTranscribeButtonProps> = ({
  className,
  ...props
}) => {
  const { labels } = useCopilotChatContext();
  return (
    <ToolbarButton
      tooltip={labels.inputStartTranscribeButtonLabel}
      disabled={props.disabled}
      className="mr-2"
    >
      <Button
        type="button"
        variant="chatInputToolbarSecondary"
        size="chatInputToolbarIcon"
        className={className}
        {...props}
      >
        <Mic size={20} />
      </Button>
    </ToolbarButton>
  );
};

const DefaultCancelTranscribeButton: React.FC<CancelTranscribeButtonProps> = ({
  className,
  ...props
}) => {
  const { labels } = useCopilotChatContext();
  return (
    <ToolbarButton
      tooltip={labels.inputCancelTranscribeButtonLabel}
      disabled={props.disabled}
      className="mr-2"
    >
      <Button
        type="button"
        variant="chatInputToolbarSecondary"
        size="chatInputToolbarIcon"
        className={className}
        {...props}
      >
        <X size={20} />
      </Button>
    </ToolbarButton>
  );
};

const DefaultFinishTranscribeButton: React.FC<FinishTranscribeButtonProps> = ({
  className,
  ...props
}) => {
  const { labels } = useCopilotChatContext();
  return (
    <ToolbarButton
      tooltip={labels.inputFinishTranscribeButtonLabel}
      disabled={props.disabled}
      className="mr-[10px]"
    >
      <Button
        type="button"
        variant="chatInputToolbarSecondary"
        size="chatInputToolbarIcon"
        className={className}
        {...props}
      >
        <Check size={20} />
      </Button>
    </ToolbarButton>
  );
};

const DefaultAddButton: React.FC<AddButtonProps> = ({
  className,
  ...props
}) => {
  const { labels } = useCopilotChatContext();
  return (
    <ToolbarButton
      tooltip={labels.inputAddButtonLabel}
      disabled={props.disabled}
      className="ml-2"
    >
      <Button
        type="button"
        variant="chatInputToolbarSecondary"
        size="chatInputToolbarIcon"
        className={className}
        {...props}
      >
        <Plus size={20} />
      </Button>
    </ToolbarButton>
  );
};

const DefaultToolsButton: React.FC<ToolsButtonProps> = ({
  className,
  ...props
}) => {
  const { labels } = useCopilotChatContext();
  return (
    <ToolbarButton
      tooltip={labels.inputToolsButtonLabel}
      disabled={props.disabled}
    >
      <Button
        type="button"
        variant="chatInputToolbarSecondary"
        size="chatInputToolbarIconLabel"
        className={className}
        {...props}
      >
        <Settings2 size={20} />
        <span className="text-sm font-normal">
          {labels.inputToolsButtonLabel}
        </span>
      </Button>
    </ToolbarButton>
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

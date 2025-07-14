import React, {
  useState,
  useRef,
  KeyboardEvent,
  ChangeEvent,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { twMerge } from "tailwind-merge";
import { Plus, Settings2, Mic, ArrowUp, X, Check } from "lucide-react";

import { RecordingIndicator as ImportedRecordingIndicator } from "./RecordingIndicator";
import { useCopilotChatContext } from "@/providers/CopilotChatContextProvider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
    TextArea?: React.ComponentType<
      React.TextareaHTMLAttributes<HTMLTextAreaElement>
    >;
    RecordingIndicator?: React.ComponentType<
      React.HTMLAttributes<HTMLDivElement>
    >;
    SendButton?: React.ComponentType<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
    StartTranscribeButton?: React.ComponentType<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
    CancelTranscribeButton?: React.ComponentType<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
    FinishTranscribeButton?: React.ComponentType<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
    AddButton?: React.ComponentType<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
    ToolsButton?: React.ComponentType<
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >;
    Container?: React.ComponentType<
      React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>
    >;
    ToolBar?: React.ComponentType<React.HTMLAttributes<HTMLDivElement>>;
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

export function CopilotChatInput({
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
}: CopilotChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Extract component overrides with defaults
  const {
    TextArea = CopilotChatInput.TextArea,
    RecordingIndicator = CopilotChatInput.RecordingIndicator,
    SendButton = CopilotChatInput.SendButton,
    StartTranscribeButton = CopilotChatInput.StartTranscribeButton,
    CancelTranscribeButton = CopilotChatInput.CancelTranscribeButton,
    FinishTranscribeButton = CopilotChatInput.FinishTranscribeButton,
    AddButton = CopilotChatInput.AddButton,
    ToolsButton = CopilotChatInput.ToolsButton,
    Container = CopilotChatInput.Container,
    ToolBar = CopilotChatInput.ToolBar,
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
      className={
        TextArea === CopilotChatInput.TextArea ? appearance.textarea : undefined
      }
    />
  );

  const BoundRecordingIndicator = (
    <RecordingIndicator
      className={
        RecordingIndicator === CopilotChatInput.RecordingIndicator
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
        SendButton === CopilotChatInput.SendButton
          ? appearance.sendButton
          : undefined
      }
    />
  );

  const BoundStartTranscribeButton = (
    <StartTranscribeButton
      onClick={onStartTranscribe}
      className={
        StartTranscribeButton === CopilotChatInput.StartTranscribeButton
          ? appearance.startTranscribeButton
          : undefined
      }
    />
  );

  const BoundCancelTranscribeButton = (
    <CancelTranscribeButton
      onClick={onCancelTranscribe}
      className={
        CancelTranscribeButton === CopilotChatInput.CancelTranscribeButton
          ? appearance.cancelTranscribeButton
          : undefined
      }
    />
  );

  const BoundFinishTranscribeButton = (
    <FinishTranscribeButton
      onClick={onFinishTranscribe}
      className={
        FinishTranscribeButton === CopilotChatInput.FinishTranscribeButton
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
        AddButton === CopilotChatInput.AddButton
          ? appearance.addButton
          : undefined
      }
    />
  );

  const BoundToolsButton = (
    <ToolsButton
      onClick={onTools}
      disabled={mode === "transcribe"}
      className={
        ToolsButton === CopilotChatInput.ToolsButton
          ? appearance.toolsButton
          : undefined
      }
    />
  );

  const BoundToolBar = (
    <ToolBar
      className={
        ToolBar === CopilotChatInput.ToolBar ? appearance.toolbar : undefined
      }
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
        Container === CopilotChatInput.Container
          ? appearance.container
          : undefined
      }
    >
      {mode === "transcribe" ? BoundRecordingIndicator : BoundTextArea}
      <ToolBar
        className={twMerge(
          "w-full h-[60px] bg-transparent flex items-center justify-between",
          ToolBar === CopilotChatInput.ToolBar ? appearance.toolbar : undefined
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
}

export namespace CopilotChatInput {
  export const RecordingIndicator: React.FC<
    React.HTMLAttributes<HTMLDivElement>
  > = ImportedRecordingIndicator;

  export const SendButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ className, ...props }) => (
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

  export const StartTranscribeButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ className, ...props }) => {
    const { labels } = useCopilotChatContext();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="chatInputToolbarSecondary"
            size="chatInputToolbarIcon"
            className={twMerge("mr-2", className)}
            {...props}
          >
            <Mic size={20} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels.inputStartTranscribeButtonLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  export const CancelTranscribeButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ className, ...props }) => {
    const { labels } = useCopilotChatContext();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="chatInputToolbarSecondary"
            size="chatInputToolbarIcon"
            className={twMerge("mr-2", className)}
            {...props}
          >
            <X size={20} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels.inputCancelTranscribeButtonLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  export const FinishTranscribeButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ className, ...props }) => {
    const { labels } = useCopilotChatContext();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="chatInputToolbarSecondary"
            size="chatInputToolbarIcon"
            className={twMerge("mr-[10px]", className)}
            {...props}
          >
            <Check size={20} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels.inputFinishTranscribeButtonLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  export const AddButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ className, ...props }) => {
    const { labels } = useCopilotChatContext();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="chatInputToolbarSecondary"
            size="chatInputToolbarIcon"
            className={twMerge("ml-2", className)}
            {...props}
          >
            <Plus size={20} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels.inputAddButtonLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  export const ToolsButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = ({ className, ...props }) => {
    const { labels } = useCopilotChatContext();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
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
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels.inputToolsButtonLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  export const Container: React.FC<
    React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>
  > = ({ children, className, ...props }) => (
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

  export const ToolBar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    ...props
  }) => (
    <div
      className={twMerge(
        "w-full h-[60px] bg-transparent flex items-center",
        className
      )}
      {...props}
    />
  );

  interface TextAreaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    maxRows?: number;
  }

  export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
    ({ maxRows = 1, style, className, ...props }, ref) => {
      const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
      const [maxHeight, setMaxHeight] = useState<number>(0);

      const { labels } = useCopilotChatContext();

      useImperativeHandle(
        ref,
        () => internalTextareaRef.current as HTMLTextAreaElement
      );

      useEffect(() => {
        const calculateMaxHeight = () => {
          const textarea = internalTextareaRef.current;
          if (textarea) {
            textarea.style.height = "auto";
            const singleRowHeight = textarea.scrollHeight;
            setMaxHeight(singleRowHeight * maxRows);
            if (props.autoFocus) {
              textarea.focus();
            }
          }
        };

        calculateMaxHeight();
      }, [maxRows, props.autoFocus]);

      useEffect(() => {
        const textarea = internalTextareaRef.current;
        if (textarea) {
          textarea.style.height = "auto";
          textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
        }
      }, [props.value, maxHeight]);

      return (
        <textarea
          ref={internalTextareaRef}
          {...props}
          style={{
            overflow: "auto",
            resize: "none",
            maxHeight: `${maxHeight}px`,
            ...style,
          }}
          placeholder={labels.inputPlaceholder}
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
          rows={1}
        />
      );
    }
  );
}

CopilotChatInput.TextArea.displayName = "CopilotChatInput.TextArea";
CopilotChatInput.RecordingIndicator.displayName =
  "CopilotChatInput.RecordingIndicator";
CopilotChatInput.SendButton.displayName = "CopilotChatInput.SendButton";
CopilotChatInput.StartTranscribeButton.displayName =
  "CopilotChatInput.StartTranscribeButton";
CopilotChatInput.CancelTranscribeButton.displayName =
  "CopilotChatInput.CancelTranscribeButton";
CopilotChatInput.FinishTranscribeButton.displayName =
  "CopilotChatInput.FinishTranscribeButton";
CopilotChatInput.AddButton.displayName = "CopilotChatInput.AddButton";
CopilotChatInput.ToolsButton.displayName = "CopilotChatInput.ToolsButton";
CopilotChatInput.Container.displayName = "CopilotChatInput.Container";
CopilotChatInput.ToolBar.displayName = "CopilotChatInput.ToolBar";

export default CopilotChatInput;

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

import {
  CopilotChatLabels,
  useCopilotChatConfiguration,
} from "@/providers/CopilotChatConfigurationProvider";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import { CopilotChatAudioRecorder } from "./CopilotChatAudioRecorder";
import { renderSlot, WithSlots } from "@/lib/slots";

export type CopilotChatInputMode = "input" | "transcribe" | "processing";

export type ToolsMenuItem = {
  label: string;
} & (
  | {
      action: () => void;
      items?: never;
    }
  | {
      action?: never;
      items: (ToolsMenuItem | "-")[];
    }
);

export type CopilotChatInputProps = WithSlots<
  {
    textArea: typeof CopilotChatInput.TextArea;
    sendButton: typeof CopilotChatInput.SendButton;
    startTranscribeButton: typeof CopilotChatInput.StartTranscribeButton;
    cancelTranscribeButton: typeof CopilotChatInput.CancelTranscribeButton;
    finishTranscribeButton: typeof CopilotChatInput.FinishTranscribeButton;
    addFileButton: typeof CopilotChatInput.AddFileButton;
    toolsButton: typeof CopilotChatInput.ToolsButton;
    toolbar: typeof CopilotChatInput.Toolbar;
    audioRecorder: typeof CopilotChatAudioRecorder;
  },
  {
    mode?: CopilotChatInputMode;
    toolsMenu?: (ToolsMenuItem | "-")[];
    autoFocus?: boolean;
    additionalToolbarItems?: React.ReactNode;
    onSubmitMessage?: (value: string) => void;
    onStartTranscribe?: () => void;
    onCancelTranscribe?: () => void;
    onFinishTranscribe?: () => void;
    onAddFile?: () => void;
    value?: string;
    onChange?: (value: string) => void;
  } & React.HTMLAttributes<HTMLDivElement>
>;

export function CopilotChatInput({
  mode = "input",
  onSubmitMessage,
  onStartTranscribe,
  onCancelTranscribe,
  onFinishTranscribe,
  onAddFile,
  onChange,
  value,
  toolsMenu,
  autoFocus = true,
  additionalToolbarItems,
  textArea,
  sendButton,
  startTranscribeButton,
  cancelTranscribeButton,
  finishTranscribeButton,
  addFileButton,
  toolsButton,
  toolbar,
  audioRecorder,
  children,
  className,
  ...props
}: CopilotChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRecorderRef =
    useRef<React.ElementRef<typeof CopilotChatAudioRecorder>>(null);

  // Handle recording based on mode changes
  useEffect(() => {
    const recorder = audioRecorderRef.current;
    if (!recorder) {
      return;
    }

    if (mode === "transcribe") {
      // Start recording when entering transcribe mode
      recorder.start().catch(console.error);
    } else {
      // Stop recording when leaving transcribe mode
      if (recorder.state === "recording") {
        recorder.stop().catch(console.error);
      }
    }
  }, [mode]);

  // Handlers
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange?.(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const send = () => {
    const trimmed = value?.trim();
    if (trimmed) {
      onSubmitMessage?.(trimmed);
      // Refocus input after sending
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const BoundTextArea = renderSlot(textArea, CopilotChatInput.TextArea, {
    ref: inputRef,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    autoFocus: autoFocus,
  });

  const BoundAudioRecorder = renderSlot(
    audioRecorder,
    CopilotChatAudioRecorder,
    {
      ref: audioRecorderRef,
    }
  );

  const BoundSendButton = renderSlot(sendButton, CopilotChatInput.SendButton, {
    onClick: send,
    disabled: !value?.trim() || !onSubmitMessage,
  });

  const BoundStartTranscribeButton = renderSlot(
    startTranscribeButton,
    CopilotChatInput.StartTranscribeButton,
    {
      onClick: onStartTranscribe,
    }
  );

  const BoundCancelTranscribeButton = renderSlot(
    cancelTranscribeButton,
    CopilotChatInput.CancelTranscribeButton,
    {
      onClick: onCancelTranscribe,
    }
  );

  const BoundFinishTranscribeButton = renderSlot(
    finishTranscribeButton,
    CopilotChatInput.FinishTranscribeButton,
    {
      onClick: onFinishTranscribe,
    }
  );

  const BoundAddFileButton = renderSlot(
    addFileButton,
    CopilotChatInput.AddFileButton,
    {
      onClick: onAddFile,
      disabled: mode === "transcribe",
    }
  );

  const BoundToolsButton = renderSlot(
    toolsButton,
    CopilotChatInput.ToolsButton,
    {
      disabled: mode === "transcribe",
      toolsMenu: toolsMenu,
    }
  );

  const BoundToolbar = renderSlot(
    typeof toolbar === "string" || toolbar === undefined
      ? twMerge(
          toolbar,
          "w-full h-[60px] bg-transparent flex items-center justify-between"
        )
      : toolbar,
    CopilotChatInput.Toolbar,
    {
      children: (
        <>
          <div className="flex items-center">
            {onAddFile && BoundAddFileButton}
            {BoundToolsButton}
            {additionalToolbarItems}
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
        </>
      ),
    }
  );

  if (children) {
    return (
      <>
        {children({
          textArea: BoundTextArea,
          audioRecorder: BoundAudioRecorder,
          sendButton: BoundSendButton,
          startTranscribeButton: BoundStartTranscribeButton,
          cancelTranscribeButton: BoundCancelTranscribeButton,
          finishTranscribeButton: BoundFinishTranscribeButton,
          addFileButton: BoundAddFileButton,
          toolsButton: BoundToolsButton,
          toolbar: BoundToolbar,
          onSubmitMessage,
          onStartTranscribe,
          onCancelTranscribe,
          onFinishTranscribe,
          onAddFile,
          mode,
          toolsMenu,
          autoFocus,
          additionalToolbarItems,
        })}
      </>
    );
  }

  return (
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
      {mode === "transcribe" ? BoundAudioRecorder : BoundTextArea}
      {BoundToolbar}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CopilotChatInput {
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
        <ArrowUp className="size-[18px]" />
      </Button>
    </div>
  );

  export const ToolbarButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      icon: React.ReactNode;
      labelKey: keyof CopilotChatLabels;
      defaultClassName?: string;
    }
  > = ({ icon, labelKey, defaultClassName, className, ...props }) => {
    const { labels } = useCopilotChatConfiguration();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="chatInputToolbarSecondary"
            size="chatInputToolbarIcon"
            className={twMerge(defaultClassName, className)}
            {...props}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels[labelKey]}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  export const StartTranscribeButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = (props) => (
    <ToolbarButton
      icon={<Mic className="size-[18px]" />}
      labelKey="chatInputToolbarStartTranscribeButtonLabel"
      defaultClassName="mr-2"
      {...props}
    />
  );

  export const CancelTranscribeButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = (props) => (
    <ToolbarButton
      icon={<X className="size-[18px]" />}
      labelKey="chatInputToolbarCancelTranscribeButtonLabel"
      defaultClassName="mr-2"
      {...props}
    />
  );

  export const FinishTranscribeButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = (props) => (
    <ToolbarButton
      icon={<Check className="size-[18px]" />}
      labelKey="chatInputToolbarFinishTranscribeButtonLabel"
      defaultClassName="mr-[10px]"
      {...props}
    />
  );

  export const AddFileButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  > = (props) => (
    <ToolbarButton
      icon={<Plus className="size-[20px]" />}
      labelKey="chatInputToolbarAddButtonLabel"
      defaultClassName="ml-2"
      {...props}
    />
  );

  export const ToolsButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      toolsMenu?: (ToolsMenuItem | "-")[];
    }
  > = ({ className, toolsMenu, ...props }) => {
    const { labels } = useCopilotChatConfiguration();

    const renderMenuItems = (
      items: (ToolsMenuItem | "-")[]
    ): React.ReactNode => {
      return items.map((item, index) => {
        if (item === "-") {
          // Separator
          return <DropdownMenuSeparator key={index} />;
        } else if (item.items && item.items.length > 0) {
          // Nested menu
          return (
            <DropdownMenuSub key={index}>
              <DropdownMenuSubTrigger>{item.label}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {renderMenuItems(item.items)}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          );
        } else {
          // Regular menu item
          return (
            <DropdownMenuItem key={index} onClick={item.action}>
              {item.label}
            </DropdownMenuItem>
          );
        }
      });
    };

    // Only render if toolsMenu is provided and has items
    if (!toolsMenu || toolsMenu.length === 0) {
      return null;
    }

    // Render dropdown menu
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="chatInputToolbarSecondary"
            size="chatInputToolbarIconLabel"
            className={className}
            {...props}
          >
            <Settings2 className="size-[18px]" />
            <span className="text-sm font-normal">
              {labels.chatInputToolbarToolsButtonLabel}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end">
          {renderMenuItems(toolsMenu)}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  export const Toolbar: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
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

  export interface TextAreaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    maxRows?: number;
  }

  export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
    function TextArea({ maxRows = 5, style, className, ...props }, ref) {
      const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
      const [maxHeight, setMaxHeight] = useState<number>(0);

      const { labels } = useCopilotChatConfiguration();

      useImperativeHandle(
        ref,
        () => internalTextareaRef.current as HTMLTextAreaElement
      );

      useEffect(() => {
        const calculateMaxHeight = () => {
          const textarea = internalTextareaRef.current;
          if (textarea) {
            // Save current value
            const currentValue = textarea.value;
            // Clear content to measure single row height
            textarea.value = "";
            textarea.style.height = "auto";

            // Get computed styles to account for padding
            const computedStyle = window.getComputedStyle(textarea);
            const paddingTop = parseFloat(computedStyle.paddingTop);
            const paddingBottom = parseFloat(computedStyle.paddingBottom);

            // Calculate actual content height (without padding)
            const contentHeight =
              textarea.scrollHeight - paddingTop - paddingBottom;

            // Calculate max height: content height for maxRows + padding
            setMaxHeight(contentHeight * maxRows + paddingTop + paddingBottom);

            // Restore original value
            textarea.value = currentValue;

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
          placeholder={labels.chatInputPlaceholder}
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
            "placeholder:text-[#00000077] dark:placeholder:text-[#fffc]",
            className
          )}
          rows={1}
        />
      );
    }
  );

  export const AudioRecorder = CopilotChatAudioRecorder;
}

CopilotChatInput.TextArea.displayName = "CopilotChatInput.TextArea";
CopilotChatInput.SendButton.displayName = "CopilotChatInput.SendButton";
CopilotChatInput.ToolbarButton.displayName = "CopilotChatInput.ToolbarButton";
CopilotChatInput.StartTranscribeButton.displayName =
  "CopilotChatInput.StartTranscribeButton";
CopilotChatInput.CancelTranscribeButton.displayName =
  "CopilotChatInput.CancelTranscribeButton";
CopilotChatInput.FinishTranscribeButton.displayName =
  "CopilotChatInput.FinishTranscribeButton";
CopilotChatInput.AddFileButton.displayName = "CopilotChatInput.AddButton";
CopilotChatInput.ToolsButton.displayName = "CopilotChatInput.ToolsButton";
CopilotChatInput.Toolbar.displayName = "CopilotChatInput.Toolbar";

export default CopilotChatInput;

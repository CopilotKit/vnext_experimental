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

import { useCopilotChatContext } from "@/providers/CopilotChatContextProvider";
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
import {
  AudioRecorderComponent,
  AudioRecorderControls,
} from "@/types/audio-recorder";
import { CopilotChatAudioRecorder } from "./CopilotChatAudioRecorder";
import { renderSlot } from "@/lib/slots";
import { Slots } from "@/types/slots";

export type CopilotChatInputSlots = {
  TextArea: React.ComponentType<
    React.TextareaHTMLAttributes<HTMLTextAreaElement> &
      React.RefAttributes<HTMLTextAreaElement>
  >;
  SendButton: React.ComponentType<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >;
  StartTranscribeButton: React.ComponentType<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >;
  CancelTranscribeButton: React.ComponentType<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >;
  FinishTranscribeButton: React.ComponentType<
    React.ButtonHTMLAttributes<HTMLButtonElement>
  >;
  AddButton: React.ComponentType<React.ButtonHTMLAttributes<HTMLButtonElement>>;
  ToolsButton: React.ComponentType<
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      toolsMenu?: (ToolsMenuItem | "-")[];
    }
  >;
  Container: React.ComponentType<
    React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>>
  >;
  Toolbar: React.ComponentType<React.HTMLAttributes<HTMLDivElement>>;
  AudioRecorder: AudioRecorderComponent;
};

export type CopilotChatInputCallbacks = {
  onSend: (text: string) => void;
  onStartTranscribe?: () => void;
  onCancelTranscribe?: () => void;
  onFinishTranscribe?: () => void;
  onAddFile?: () => void;
};

export type CopilotChatInputOptions = {
  mode?: "input" | "transcribe" | "processing";
  toolsMenu?: (ToolsMenuItem | "-")[];
  autoFocus?: boolean;
  additionalToolbarItems?: React.ReactNode;
};

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

export type CopilotChatInputProps = Slots<
  CopilotChatInputSlots,
  CopilotChatInputOptions & CopilotChatInputCallbacks
>;

export function CopilotChatInput({
  mode = "input",
  onSend,
  onStartTranscribe,
  onCancelTranscribe,
  onFinishTranscribe,
  onAddFile,
  toolsMenu,
  autoFocus = true,
  additionalToolbarItems,
  TextArea,
  SendButton,
  StartTranscribeButton,
  CancelTranscribeButton,
  FinishTranscribeButton,
  AddButton,
  ToolsButton,
  Container,
  Toolbar,
  AudioRecorder,
  children,
}: CopilotChatInputProps) {
  const { text, setText } = useCopilotChatContext();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRecorderRef = useRef<AudioRecorderControls>(null);

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

  const BoundTextArea = renderSlot(TextArea, CopilotChatInput.TextArea, {
    ref: inputRef,
    value: text,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    autoFocus: autoFocus,
  });

  const BoundAudioRecorder = renderSlot(
    AudioRecorder,
    CopilotChatAudioRecorder,
    {
      ref: audioRecorderRef,
    }
  );

  const BoundSendButton = renderSlot(SendButton, CopilotChatInput.SendButton, {
    onClick: send,
    disabled: !text.trim(),
  });

  const BoundStartTranscribeButton = renderSlot(
    StartTranscribeButton,
    CopilotChatInput.StartTranscribeButton,
    {
      onClick: onStartTranscribe,
    }
  );

  const BoundCancelTranscribeButton = renderSlot(
    CancelTranscribeButton,
    CopilotChatInput.CancelTranscribeButton,
    {
      onClick: onCancelTranscribe,
    }
  );

  const BoundFinishTranscribeButton = renderSlot(
    FinishTranscribeButton,
    CopilotChatInput.FinishTranscribeButton,
    {
      onClick: onFinishTranscribe,
    }
  );

  const BoundAddButton = renderSlot(AddButton, CopilotChatInput.AddButton, {
    onClick: onAddFile,
    disabled: mode === "transcribe",
  });

  const BoundToolsButton = renderSlot(
    ToolsButton,
    CopilotChatInput.ToolsButton,
    {
      disabled: mode === "transcribe",
      toolsMenu: toolsMenu,
    }
  );

  const BoundToolbar = renderSlot(
    typeof Toolbar === "string" || Toolbar === undefined
      ? twMerge(
          Toolbar,
          "w-full h-[60px] bg-transparent flex items-center justify-between"
        )
      : Toolbar,
    CopilotChatInput.Toolbar,
    {
      children: (
        <>
          <div className="flex items-center">
            {onAddFile && BoundAddButton}
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

  const BoundContainer = renderSlot(Container, CopilotChatInput.Container, {
    children: (
      <>
        {mode === "transcribe" ? BoundAudioRecorder : BoundTextArea}
        {BoundToolbar}
      </>
    ),
  });

  if (children) {
    return (
      <>
        {children({
          TextArea: BoundTextArea,
          AudioRecorder: BoundAudioRecorder,
          SendButton: BoundSendButton,
          StartTranscribeButton: BoundStartTranscribeButton,
          CancelTranscribeButton: BoundCancelTranscribeButton,
          FinishTranscribeButton: BoundFinishTranscribeButton,
          AddButton: BoundAddButton,
          ToolsButton: BoundToolsButton,
          Toolbar: BoundToolbar,
          Container: BoundContainer,
          onSend,
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

  return BoundContainer;
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
            <Mic className="size-[18px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels.chatInputToolbarStartTranscribeButtonLabel}</p>
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
            <X className="size-[18px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels.chatInputToolbarCancelTranscribeButtonLabel}</p>
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
            <Check className="size-[18px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels.chatInputToolbarFinishTranscribeButtonLabel}</p>
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
            <Plus className="size-[20px]" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>{labels.chatInputToolbarAddButtonLabel}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  export const ToolsButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      toolsMenu?: (ToolsMenuItem | "-")[];
    }
  > = ({ className, toolsMenu, ...props }) => {
    const { labels } = useCopilotChatContext();

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

  interface TextAreaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    maxRows?: number;
  }

  export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
    function TextArea({ maxRows = 5, style, className, ...props }, ref) {
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
CopilotChatInput.StartTranscribeButton.displayName =
  "CopilotChatInput.StartTranscribeButton";
CopilotChatInput.CancelTranscribeButton.displayName =
  "CopilotChatInput.CancelTranscribeButton";
CopilotChatInput.FinishTranscribeButton.displayName =
  "CopilotChatInput.FinishTranscribeButton";
CopilotChatInput.AddButton.displayName = "CopilotChatInput.AddButton";
CopilotChatInput.ToolsButton.displayName = "CopilotChatInput.ToolsButton";
CopilotChatInput.Container.displayName = "CopilotChatInput.Container";
CopilotChatInput.Toolbar.displayName = "CopilotChatInput.Toolbar";

export default CopilotChatInput;

import React, {
  useState,
  useRef,
  KeyboardEvent,
  ChangeEvent,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
  useMemo,
} from "react";
import { twMerge } from "tailwind-merge";
import { Plus, Mic, ArrowUp, X, Check } from "lucide-react";

import {
  CopilotChatLabels,
  useCopilotChatConfiguration,
  CopilotChatDefaultLabels,
} from "@/providers/CopilotChatConfigurationProvider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

type CopilotChatInputSlots = {
  textArea: typeof CopilotChatInput.TextArea;
  sendButton: typeof CopilotChatInput.SendButton;
  startTranscribeButton: typeof CopilotChatInput.StartTranscribeButton;
  cancelTranscribeButton: typeof CopilotChatInput.CancelTranscribeButton;
  finishTranscribeButton: typeof CopilotChatInput.FinishTranscribeButton;
  addMenuButton: typeof CopilotChatInput.AddMenuButton;
  audioRecorder: typeof CopilotChatAudioRecorder;
};

type CopilotChatInputRestProps = {
  mode?: CopilotChatInputMode;
  toolsMenu?: (ToolsMenuItem | "-")[];
  autoFocus?: boolean;
  onSubmitMessage?: (value: string) => void;
  onStartTranscribe?: () => void;
  onCancelTranscribe?: () => void;
  onFinishTranscribe?: () => void;
  onAddFile?: () => void;
  value?: string;
  onChange?: (value: string) => void;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "onChange">;

type CopilotChatInputBaseProps = WithSlots<CopilotChatInputSlots, CopilotChatInputRestProps>;

type CopilotChatInputChildrenArgs = CopilotChatInputBaseProps extends { children?: infer C }
  ? C extends (props: infer P) => React.ReactNode
    ? P
    : never
  : never;

export type CopilotChatInputProps = Omit<CopilotChatInputBaseProps, "children"> & {
  children?: (props: CopilotChatInputChildrenArgs & { isMultiline: boolean }) => React.ReactNode;
};

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
  textArea,
  sendButton,
  startTranscribeButton,
  cancelTranscribeButton,
  finishTranscribeButton,
  addMenuButton,
  audioRecorder,
  children,
  className,
  ...props
}: CopilotChatInputProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string>(() => value ?? "");

  useEffect(() => {
    if (!isControlled && value !== undefined) {
      setInternalValue(value);
    }
  }, [isControlled, value]);

  const resolvedValue = isControlled ? (value ?? "") : internalValue;

  const [isMultiline, setIsMultiline] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioRecorderRef = useRef<React.ElementRef<typeof CopilotChatAudioRecorder>>(null);
  const config = useCopilotChatConfiguration();

  const previousModalStateRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (!autoFocus) {
      previousModalStateRef.current = config?.isModalOpen;
      return;
    }

    if (config?.isModalOpen && !previousModalStateRef.current) {
      inputRef.current?.focus();
    }

    previousModalStateRef.current = config?.isModalOpen;
  }, [config?.isModalOpen, autoFocus]);

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

  useEffect(() => {
    if (mode !== "input") {
      setIsMultiline(false);
    }
  }, [mode]);

  // Handlers
  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = e.target.value;
    if (!isControlled) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const send = () => {
    if (!onSubmitMessage) {
      return;
    }
    const trimmed = resolvedValue.trim();
    if (!trimmed) {
      return;
    }

    onSubmitMessage(trimmed);

    if (!isControlled) {
      setInternalValue("");
      onChange?.("");
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const BoundTextArea = renderSlot(textArea, CopilotChatInput.TextArea, {
    ref: inputRef,
    value: resolvedValue,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    autoFocus: autoFocus,
    onMultilineChange: setIsMultiline,
    isMultiline,
  });

  const BoundAudioRecorder = renderSlot(audioRecorder, CopilotChatAudioRecorder, {
    ref: audioRecorderRef,
  });

  const BoundSendButton = renderSlot(sendButton, CopilotChatInput.SendButton, {
    onClick: send,
    disabled: !resolvedValue.trim() || !onSubmitMessage,
  });

  const BoundStartTranscribeButton = renderSlot(startTranscribeButton, CopilotChatInput.StartTranscribeButton, {
    onClick: onStartTranscribe,
  });

  const BoundCancelTranscribeButton = renderSlot(cancelTranscribeButton, CopilotChatInput.CancelTranscribeButton, {
    onClick: onCancelTranscribe,
  });

  const BoundFinishTranscribeButton = renderSlot(finishTranscribeButton, CopilotChatInput.FinishTranscribeButton, {
    onClick: onFinishTranscribe,
  });

  const BoundAddMenuButton = renderSlot(addMenuButton, CopilotChatInput.AddMenuButton, {
    disabled: mode === "transcribe",
    onAddFile,
    toolsMenu,
    isMultiline,
  });

  if (children) {
    const childProps = {
      textArea: BoundTextArea,
      audioRecorder: BoundAudioRecorder,
      sendButton: BoundSendButton,
      startTranscribeButton: BoundStartTranscribeButton,
      cancelTranscribeButton: BoundCancelTranscribeButton,
      finishTranscribeButton: BoundFinishTranscribeButton,
      addMenuButton: BoundAddMenuButton,
      onSubmitMessage,
      onStartTranscribe,
      onCancelTranscribe,
      onFinishTranscribe,
      onAddFile,
      mode,
      toolsMenu,
      autoFocus,
      isMultiline,
    } as CopilotChatInputChildrenArgs & { isMultiline: boolean };

    return <>{children(childProps)}</>;
  }

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't focus if clicking on buttons or other interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName !== "BUTTON" && !target.closest("button") && inputRef.current && mode === "input") {
      inputRef.current.focus();
    }
  };

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
        className,
      )}
      onClick={handleContainerClick}
      {...props}
    >
      <div
        className={twMerge(
          "grid w-full gap-x-3 gap-y-3 px-3 py-2",
          isMultiline
            ? "grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_auto]"
            : "grid-cols-[auto_minmax(0,1fr)_auto] items-center",
        )}
      >
        <div
          className={twMerge(
            "flex items-center",
            isMultiline ? "row-start-2" : "row-start-1",
            "col-start-1",
          )}
        >
          {BoundAddMenuButton}
        </div>
        <div
          className={twMerge(
            "flex min-w-0 flex-col",
            isMultiline ? "col-span-3 row-start-1" : "col-start-2 row-start-1",
          )}
        >
          {mode === "transcribe" ? BoundAudioRecorder : BoundTextArea}
        </div>
        <div
          className={twMerge(
            "flex items-center justify-end gap-2",
            isMultiline ? "col-start-3 row-start-2" : "col-start-3 row-start-1",
          )}
        >
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
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CopilotChatInput {
  export const SendButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className, ...props }) => (
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
    const config = useCopilotChatConfiguration();
    const labels = config?.labels ?? CopilotChatDefaultLabels;
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

  export const StartTranscribeButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
    <ToolbarButton
      icon={<Mic className="size-[18px]" />}
      labelKey="chatInputToolbarStartTranscribeButtonLabel"
      defaultClassName="mr-2"
      {...props}
    />
  );

  export const CancelTranscribeButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
    <ToolbarButton
      icon={<X className="size-[18px]" />}
      labelKey="chatInputToolbarCancelTranscribeButtonLabel"
      defaultClassName="mr-2"
      {...props}
    />
  );

  export const FinishTranscribeButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = (props) => (
    <ToolbarButton
      icon={<Check className="size-[18px]" />}
      labelKey="chatInputToolbarFinishTranscribeButtonLabel"
      defaultClassName="mr-[10px]"
      {...props}
    />
  );

  export const AddMenuButton: React.FC<
    React.ButtonHTMLAttributes<HTMLButtonElement> & {
      toolsMenu?: (ToolsMenuItem | "-")[];
      onAddFile?: () => void;
      isMultiline?: boolean;
    }
  > = ({ className, toolsMenu, onAddFile, disabled, isMultiline: _ignored, ...props }) => {
    const config = useCopilotChatConfiguration();
    const labels = config?.labels ?? CopilotChatDefaultLabels;

    const menuItems = useMemo<(ToolsMenuItem | "-")[]>(() => {
      const items: (ToolsMenuItem | "-")[] = [];

      if (onAddFile) {
        items.push({
          label: labels.chatInputToolbarAddButtonLabel,
          action: onAddFile,
        });
      }

      if (toolsMenu && toolsMenu.length > 0) {
        if (items.length > 0) {
          items.push("-");
        }

        for (const item of toolsMenu) {
          if (item === "-") {
            if (items.length === 0 || items[items.length - 1] === "-") {
              continue;
            }
            items.push(item);
          } else {
            items.push(item);
          }
        }

        while (items.length > 0 && items[items.length - 1] === "-") {
          items.pop();
        }
      }

      return items;
    }, [onAddFile, toolsMenu, labels.chatInputToolbarAddButtonLabel]);

    const renderMenuItems = useCallback(
      (items: (ToolsMenuItem | "-")[]): React.ReactNode =>
        items.map((item, index) => {
          if (item === "-") {
            return <DropdownMenuSeparator key={`separator-${index}`} />;
          }

          if (item.items && item.items.length > 0) {
            return (
              <DropdownMenuSub key={`group-${index}`}>
                <DropdownMenuSubTrigger>{item.label}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>{renderMenuItems(item.items)}</DropdownMenuSubContent>
              </DropdownMenuSub>
            );
          }

          return (
            <DropdownMenuItem key={`item-${index}`} onClick={item.action}>
              {item.label}
            </DropdownMenuItem>
          );
        }),
      [],
    );

    const hasMenuItems = menuItems.length > 0;
    const isDisabled = disabled || !hasMenuItems;

    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="chatInputToolbarSecondary"
                size="chatInputToolbarIcon"
                className={twMerge("ml-1", className)}
                disabled={isDisabled}
                {...props}
              >
                <Plus className="size-[20px]" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{labels.chatInputToolbarAddButtonLabel}</p>
          </TooltipContent>
        </Tooltip>
        {hasMenuItems && (
          <DropdownMenuContent side="top" align="start">
            {renderMenuItems(menuItems)}
          </DropdownMenuContent>
        )}
      </DropdownMenu>
    );
  };

  export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    maxRows?: number;
    onMultilineChange?: (isMultiline: boolean) => void;
    isMultiline?: boolean;
  }

  export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
    { maxRows = 5, style, className, onMultilineChange, isMultiline, ...props },
    ref,
  ) {
    const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
    const [maxHeight, setMaxHeight] = useState<number>(0);
    const [singleLineHeight, setSingleLineHeight] = useState<number | null>(null);
    const lastMultilineRef = useRef<boolean>(false);

    const config = useCopilotChatConfiguration();
    const labels = config?.labels ?? CopilotChatDefaultLabels;

    useImperativeHandle(ref, () => internalTextareaRef.current as HTMLTextAreaElement);

    const adjustHeight = () => {
      const textarea = internalTextareaRef.current;
      if (textarea && maxHeight > 0) {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;

        if (onMultilineChange) {
          const baseline = singleLineHeight ?? textarea.scrollHeight;
          const nextIsMultiline = textarea.scrollHeight > baseline + 1;
          if (nextIsMultiline !== lastMultilineRef.current) {
            lastMultilineRef.current = nextIsMultiline;
            onMultilineChange(nextIsMultiline);
          }
        }
      }
    };

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
          const contentHeight = textarea.scrollHeight - paddingTop - paddingBottom;
          const baselineHeight = contentHeight + paddingTop + paddingBottom;

          // Calculate max height: content height for maxRows + padding
          setMaxHeight(contentHeight * maxRows + paddingTop + paddingBottom);
          setSingleLineHeight(baselineHeight);

          // Restore original value
          textarea.value = currentValue;

          // Adjust height after calculating maxHeight
          if (currentValue) {
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, contentHeight * maxRows + paddingTop + paddingBottom)}px`;
          }

          if (props.autoFocus) {
            textarea.focus();
          }
        }
      };

      calculateMaxHeight();
    }, [maxRows, props.autoFocus]);

    // Adjust height when controlled value changes
    useEffect(() => {
      adjustHeight();
    }, [props.value, maxHeight, singleLineHeight]);

    // Handle input events for uncontrolled usage
    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      // Call the original onChange if provided
      if (props.onChange) {
        props.onChange(e as React.ChangeEvent<HTMLTextAreaElement>);
      }
    };

    return (
      <textarea
        ref={internalTextareaRef}
        {...props}
        onChange={handleInput}
        style={{
          overflow: "auto",
          resize: "none",
          maxHeight: `${maxHeight}px`,
          ...style,
        }}
        placeholder={labels.chatInputPlaceholder}
        className={twMerge(
          // Layout and sizing
          "w-full py-3",
          isMultiline ? "px-5" : "pr-5",
          // Behavior
          "outline-none resize-none",
          // Background
          "bg-transparent",
          // Typography
          "antialiased font-regular leading-relaxed text-[16px]",
          // Placeholder styles
          "placeholder:text-[#00000077] dark:placeholder:text-[#fffc]",
          className,
        )}
        rows={1}
      />
    );
  });

  export const AudioRecorder = CopilotChatAudioRecorder;
}

CopilotChatInput.TextArea.displayName = "CopilotChatInput.TextArea";
CopilotChatInput.SendButton.displayName = "CopilotChatInput.SendButton";
CopilotChatInput.ToolbarButton.displayName = "CopilotChatInput.ToolbarButton";
CopilotChatInput.StartTranscribeButton.displayName = "CopilotChatInput.StartTranscribeButton";
CopilotChatInput.CancelTranscribeButton.displayName = "CopilotChatInput.CancelTranscribeButton";
CopilotChatInput.FinishTranscribeButton.displayName = "CopilotChatInput.FinishTranscribeButton";
CopilotChatInput.AddMenuButton.displayName = "CopilotChatInput.AddMenuButton";

export default CopilotChatInput;

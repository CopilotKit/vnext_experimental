import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";

interface CopilotChatInputTextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxRows?: number;
}

const CopilotChatInputTextArea = forwardRef<
  HTMLTextAreaElement,
  CopilotChatInputTextAreaProps
>(({ maxRows = 1, style, ...props }, ref) => {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [maxHeight, setMaxHeight] = useState<number>(0);

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
      rows={1}
    />
  );
});

CopilotChatInputTextArea.displayName = "CopilotChatInputTextArea";

export default CopilotChatInputTextArea;

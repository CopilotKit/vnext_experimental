import React, { useState, useRef, KeyboardEvent, ChangeEvent } from "react";

// Simple utility to merge Tailwind classes
const merge = (base: string, override?: string): string => {
  return override ? `${base} ${override}` : base;
};

// Input component props interface
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

// Button component props interface
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

// Container component props interface
interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

// Default components
const DefaultInput = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => (
    <input ref={ref} type="text" placeholder="Type a message..." {...props} />
  )
);
DefaultInput.displayName = "DefaultInput";

const DefaultButton: React.FC<ButtonProps> = (props) => (
  <button type="button" {...props}>
    ➤
  </button>
);

const DefaultContainer: React.FC<React.PropsWithChildren<ContainerProps>> = ({
  children,
  ...props
}) => <div {...props}>{children}</div>;

export type CopilotChatInputProps = {
  /** Called with trimmed text when user submits. Clears input. */
  onSend: (text: string) => void;

  /**
   * Component slots — override one or many:
   * - Input:   must render <input …> or <textarea …>
   * - Button:  must render <button …>
   * - Container: wrapper around everything (default is <div>)
   */
  components?: {
    Input?: React.ComponentType<InputProps>;
    Button?: React.ComponentType<ButtonProps>;
    Container?: React.ComponentType<React.PropsWithChildren<ContainerProps>>;
  };

  /**
   * Style-only overrides (merged onto defaults).
   * Ignore if user also swaps that component.
   */
  appearance?: {
    container?: string;
    input?: string;
    button?: string;
  };

  /**
   * Full-layout override (highest priority).
   * Receives the *pre-wired* sub-components so users never touch handlers.
   */
  children?: (parts: {
    Input: JSX.Element;
    Button: JSX.Element;
  }) => React.ReactNode;
};

export const CopilotChatInput: React.FC<CopilotChatInputProps> = ({
  onSend,
  components = {},
  appearance = {},
  children,
}) => {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract component overrides with defaults
  const {
    Input = DefaultInput,
    Button = DefaultButton,
    Container = DefaultContainer,
  } = components;

  // Handlers
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
  const BoundInput = (
    <Input
      ref={inputRef}
      value={text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={merge("flex-1 outline-none", appearance.input)}
    />
  );

  const BoundButton = (
    <Button
      onClick={send}
      disabled={!text.trim()}
      className={merge(
        "px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
        appearance.button
      )}
    />
  );

  // Render algorithm
  if (children) {
    // Custom layout via render prop
    return <>{children({ Input: BoundInput, Button: BoundButton })}</>;
  }

  // Default layout
  return (
    <Container
      className={merge(
        "flex gap-2 items-center border p-2 rounded",
        appearance.container
      )}
    >
      {BoundInput}
      {BoundButton}
    </Container>
  );
};

export default CopilotChatInput;

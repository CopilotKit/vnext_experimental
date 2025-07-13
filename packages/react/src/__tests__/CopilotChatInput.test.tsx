import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CopilotChatInput } from "../components/chat/CopilotChatInput/CopilotChatInput";

// Mock onSend function to track calls
const mockOnSend = jest.fn();

// Clear mocks before each test
beforeEach(() => {
  mockOnSend.mockClear();
});

describe("CopilotChatInput", () => {
  it("renders with default components and styling", () => {
    render(<CopilotChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText("Type a message...");
    const button = screen.getByRole("button");

    expect(input).toBeInTheDocument();
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled(); // Should be disabled when input is empty
  });

  it("calls onSend with trimmed text when Enter is pressed", () => {
    render(<CopilotChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText("Type a message...");

    // Type message with whitespace
    fireEvent.change(input, { target: { value: "  hello world  " } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    expect(mockOnSend).toHaveBeenCalledWith("hello world");
    expect(input).toHaveValue(""); // Input should be cleared
  });

  it("calls onSend when button is clicked", () => {
    render(<CopilotChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText("Type a message...");
    const button = screen.getByRole("button");

    fireEvent.change(input, { target: { value: "test message" } });
    fireEvent.click(button);

    expect(mockOnSend).toHaveBeenCalledWith("test message");
    expect(input).toHaveValue(""); // Input should be cleared
  });

  it("does not send when Enter is pressed with Shift key", () => {
    render(<CopilotChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText("Type a message...");

    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    expect(mockOnSend).not.toHaveBeenCalled();
    expect(input).toHaveValue("test"); // Input should not be cleared
  });

  it("does not send empty or whitespace-only messages", () => {
    render(<CopilotChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText("Type a message...");
    const button = screen.getByRole("button");

    // Test empty string
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.click(button);
    expect(mockOnSend).not.toHaveBeenCalled();

    // Test whitespace only
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(button);
    expect(mockOnSend).not.toHaveBeenCalled();
  });

  it("enables button when text is entered", () => {
    render(<CopilotChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText("Type a message...");
    const button = screen.getByRole("button");

    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: "hello" } });
    expect(button).not.toBeDisabled();

    fireEvent.change(input, { target: { value: "" } });
    expect(button).toBeDisabled();
  });

  it("accepts custom appearance classes", () => {
    const { container } = render(
      <CopilotChatInput
        onSend={mockOnSend}
        appearance={{
          container: "custom-container",
          textarea: "custom-textarea",
          sendButton: "custom-button",
        }}
      />
    );

    const containerDiv = container.firstChild as HTMLElement;
    const input = screen.getByPlaceholderText("Type a message...");
    const button = screen.getByRole("button");

    expect(containerDiv).toHaveClass("custom-container");
    expect(input).toHaveClass("custom-textarea");
    expect(button).toHaveClass("custom-button");
  });

  it("accepts custom components via slots", () => {
    const CustomButton = (
      props: React.ButtonHTMLAttributes<HTMLButtonElement>
    ) => (
      <button {...props} data-testid="custom-button">
        Send Now
      </button>
    );

    render(
      <CopilotChatInput
        onSend={mockOnSend}
        components={{ SendButton: CustomButton }}
      />
    );

    const customButton = screen.getByTestId("custom-button");
    expect(customButton).toBeInTheDocument();
    expect(customButton).toHaveTextContent("Send Now");
  });

  it("supports custom layout via children render prop", () => {
    render(
      <CopilotChatInput onSend={mockOnSend}>
        {({ TextArea, SendButton }) => (
          <div data-testid="custom-layout">
            Custom Layout:
            {SendButton}
            {TextArea}
          </div>
        )}
      </CopilotChatInput>
    );

    const customLayout = screen.getByTestId("custom-layout");
    expect(customLayout).toBeInTheDocument();
    expect(customLayout).toHaveTextContent("Custom Layout:");
  });

  it("shows cancel and finish buttons in transcribe mode", () => {
    const { container } = render(
      <CopilotChatInput
        mode="transcribe"
        onSend={mockOnSend}
        onStartTranscribe={() => {}}
        onCancelTranscribe={() => {}}
        onFinishTranscribe={() => {}}
        onAdd={() => {}}
        onTools={() => {}}
      />
    );

    // Should show cancel button (X icon) - find by svg class
    const cancelIcon = container.querySelector("svg.lucide-x");
    expect(cancelIcon).toBeInTheDocument();

    // Should show finish button (checkmark icon) - find by svg class
    const finishIcon = container.querySelector("svg.lucide-check");
    expect(finishIcon).toBeInTheDocument();

    // Verify tooltips are present
    expect(screen.getByText("Cancel")).toBeInTheDocument();
    expect(screen.getByText("Finish")).toBeInTheDocument();

    // Should NOT show transcribe button (mic icon) in transcribe mode
    const transcribeIcon = container.querySelector("svg.lucide-mic");
    expect(transcribeIcon).not.toBeInTheDocument();

    // Should NOT show send button (arrow-up icon) in transcribe mode
    const sendIcon = container.querySelector("svg.lucide-arrow-up");
    expect(sendIcon).not.toBeInTheDocument();
  });

  it("disables add and tools buttons in transcribe mode", () => {
    const { container } = render(
      <CopilotChatInput
        mode="transcribe"
        onSend={mockOnSend}
        onStartTranscribe={() => {}}
        onCancelTranscribe={() => {}}
        onFinishTranscribe={() => {}}
        onAdd={() => {}}
        onTools={() => {}}
      />
    );

    // Add button should be disabled (find by Plus icon)
    const addIcon = container.querySelector("svg.lucide-plus");
    const addButton = addIcon?.closest("button");
    expect(addButton).toBeDisabled();

    // Tools button should be disabled (find by "Tools" text)
    const toolsButton = screen.getByRole("button", { name: /tools/i });
    expect(toolsButton).toBeDisabled();
  });

  it("shows recording indicator instead of textarea in transcribe mode", () => {
    const { container } = render(
      <CopilotChatInput
        mode="transcribe"
        onSend={mockOnSend}
        onStartTranscribe={() => {}}
        onCancelTranscribe={() => {}}
        onFinishTranscribe={() => {}}
        onAdd={() => {}}
        onTools={() => {}}
      />
    );

    // Should show recording indicator (red div)
    const recordingIndicator = container.querySelector(".bg-red-500");
    expect(recordingIndicator).toBeInTheDocument();

    // Should NOT show textarea in transcribe mode
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("shows textarea in input mode", () => {
    const { container } = render(
      <CopilotChatInput
        mode="input"
        onSend={mockOnSend}
        onStartTranscribe={() => {}}
        onCancelTranscribe={() => {}}
        onFinishTranscribe={() => {}}
        onAdd={() => {}}
        onTools={() => {}}
      />
    );

    // Should show textarea in input mode
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    // Should NOT show recording indicator (red div)
    const recordingIndicator = container.querySelector(".bg-red-500");
    expect(recordingIndicator).not.toBeInTheDocument();
  });
});

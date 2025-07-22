import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { CopilotChatInput } from "../CopilotChatInput";
import { CopilotChatContextProvider } from "../../../providers/CopilotChatContextProvider";

// Mock onSend function to track calls
const mockOnSend = vi.fn();

// Helper to render components with context provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <CopilotChatContextProvider>{component}</CopilotChatContextProvider>
  );
};

// Clear mocks before each test
beforeEach(() => {
  mockOnSend.mockClear();
});

describe("CopilotChatInput", () => {
  it("renders with default components and styling", () => {
    renderWithProvider(<CopilotChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText("Type a message...");
    const button = screen.getByRole("button");

    expect(input).toBeDefined();
    expect(button).toBeDefined();
    expect((button as HTMLButtonElement).disabled).toBe(true); // Should be disabled when input is empty
  });

  it("calls onSend with trimmed text when Enter is pressed", () => {
    renderWithProvider(<CopilotChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText("Type a message...");

    // Type message with whitespace
    fireEvent.change(input, { target: { value: "  hello world  " } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    expect(mockOnSend).toHaveBeenCalledWith("hello world");
    expect((input as HTMLInputElement).value).toBe(""); // Input should be cleared
  });

  it("calls onSend when button is clicked", () => {
    renderWithProvider(<CopilotChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText("Type a message...");
    const button = screen.getByRole("button");

    fireEvent.change(input, { target: { value: "test message" } });
    fireEvent.click(button);

    expect(mockOnSend).toHaveBeenCalledWith("test message");
    expect((input as HTMLInputElement).value).toBe(""); // Input should be cleared
  });

  it("does not send when Enter is pressed with Shift key", () => {
    renderWithProvider(<CopilotChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText("Type a message...");

    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    expect(mockOnSend).not.toHaveBeenCalled();
    expect((input as HTMLInputElement).value).toBe("test"); // Input should not be cleared
  });

  it("does not send empty or whitespace-only messages", () => {
    renderWithProvider(<CopilotChatInput onSend={mockOnSend} />);

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
    renderWithProvider(<CopilotChatInput onSend={mockOnSend} />);

    const input = screen.getByPlaceholderText("Type a message...");
    const button = screen.getByRole("button");

    expect((button as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(input, { target: { value: "hello" } });
    expect((button as HTMLButtonElement).disabled).toBe(false);

    fireEvent.change(input, { target: { value: "" } });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("accepts custom slot classes", () => {
    const { container } = renderWithProvider(
      <CopilotChatInput
        onSend={mockOnSend}
        Container="custom-container"
        TextArea="custom-textarea"
        SendButton="custom-button"
      />
    );

    const containerDiv = container.firstChild as HTMLElement;
    const input = screen.getByPlaceholderText("Type a message...");
    const button = screen.getByRole("button");

    expect(containerDiv.classList.contains("custom-container")).toBe(true);
    expect(input.classList.contains("custom-textarea")).toBe(true);
    expect(button.classList.contains("custom-button")).toBe(true);
  });

  it("accepts custom components via slots", () => {
    const CustomButton = (
      props: React.ButtonHTMLAttributes<HTMLButtonElement>
    ) => (
      <button {...props} data-testid="custom-button">
        Send Now
      </button>
    );

    renderWithProvider(
      <CopilotChatInput onSend={mockOnSend} SendButton={CustomButton} />
    );

    const customButton = screen.getByTestId("custom-button");
    expect(customButton).toBeDefined();
    expect(customButton.textContent?.includes("Send Now")).toBe(true);
  });

  it("supports custom layout via children render prop", () => {
    renderWithProvider(
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
    expect(customLayout).toBeDefined();
    expect(customLayout.textContent?.includes("Custom Layout:")).toBe(true);
  });

  it("shows cancel and finish buttons in transcribe mode", () => {
    const { container } = renderWithProvider(
      <CopilotChatInput
        mode="transcribe"
        onSend={mockOnSend}
        onStartTranscribe={() => {}}
        onCancelTranscribe={() => {}}
        onFinishTranscribe={() => {}}
        onAddFile={() => {}}
      />
    );

    // Should show cancel button (X icon) - find by svg class
    const cancelIcon = container.querySelector("svg.lucide-x");
    expect(cancelIcon).toBeDefined();

    // Should show finish button (checkmark icon) - find by svg class
    const finishIcon = container.querySelector("svg.lucide-check");
    expect(finishIcon).toBeDefined();

    // Should show cancel button (X icon) and finish button (check icon)
    const cancelButton = container.querySelector("svg.lucide-x");
    const finishButton = container.querySelector("svg.lucide-check");
    expect(cancelButton).toBeDefined();
    expect(finishButton).toBeDefined();

    // Should NOT show transcribe button (mic icon) in transcribe mode
    const transcribeIcon = container.querySelector("svg.lucide-mic");
    expect(transcribeIcon).toBeNull();

    // Should NOT show send button (arrow-up icon) in transcribe mode
    const sendIcon = container.querySelector("svg.lucide-arrow-up");
    expect(sendIcon).toBeNull();
  });

  it("disables add and tools buttons in transcribe mode", () => {
    const { container } = renderWithProvider(
      <CopilotChatInput
        mode="transcribe"
        onSend={mockOnSend}
        onStartTranscribe={() => {}}
        onCancelTranscribe={() => {}}
        onFinishTranscribe={() => {}}
        onAddFile={() => {}}
        toolsMenu={[{ label: "Test Tool", action: () => {} }]}
      />
    );

    // Add button should be disabled (find by Plus icon)
    const addIcon = container.querySelector("svg.lucide-plus");
    const addButton = addIcon?.closest("button");
    expect((addButton as HTMLButtonElement).disabled).toBe(true);

    // Tools button should be disabled (find by "Tools" text)
    const toolsButton = screen.getByRole("button", { name: /tools/i });
    expect((toolsButton as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows recording indicator instead of textarea in transcribe mode", () => {
    const { container } = renderWithProvider(
      <CopilotChatInput
        mode="transcribe"
        onSend={mockOnSend}
        onStartTranscribe={() => {}}
        onCancelTranscribe={() => {}}
        onFinishTranscribe={() => {}}
        onAddFile={() => {}}
      />
    );

    // Should show recording indicator (canvas element)
    const recordingIndicator = container.querySelector("canvas");
    expect(recordingIndicator).toBeDefined();

    // Should NOT show textarea in transcribe mode
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("shows textarea in input mode", () => {
    const { container } = renderWithProvider(
      <CopilotChatInput
        mode="input"
        onSend={mockOnSend}
        onStartTranscribe={() => {}}
        onCancelTranscribe={() => {}}
        onFinishTranscribe={() => {}}
        onAddFile={() => {}}
      />
    );

    // Should show textarea in input mode
    expect(screen.getByRole("textbox")).toBeDefined();

    // Should NOT show recording indicator (red div)
    const recordingIndicator = container.querySelector(".bg-red-500");
    expect(recordingIndicator).toBeNull();
  });
});

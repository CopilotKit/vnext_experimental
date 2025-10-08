import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { CopilotChatInput } from "../CopilotChatInput";
import { CopilotChatConfigurationProvider } from "../../../providers/CopilotChatConfigurationProvider";

// Mock onSubmitMessage function to track calls
const mockOnSubmitMessage = vi.fn();

const TEST_THREAD_ID = "test-thread";

// Helper to render components with context provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <CopilotChatConfigurationProvider threadId={TEST_THREAD_ID}>
      {component}
    </CopilotChatConfigurationProvider>
  );
};

const getSendButton = (container: HTMLElement) =>
  container.querySelector("svg.lucide-arrow-up")?.closest("button") as HTMLButtonElement | null;

const getAddMenuButton = (container: HTMLElement) =>
  container.querySelector("svg.lucide-plus")?.closest("button") as HTMLButtonElement | null;

// Clear mocks before each test
beforeEach(() => {
  mockOnSubmitMessage.mockClear();
});

describe("CopilotChatInput", () => {
  it("renders with default components and styling", () => {
    const mockOnChange = vi.fn();
    const { container } = renderWithProvider(
      <CopilotChatInput
        value=""
        onChange={mockOnChange}
        onSubmitMessage={mockOnSubmitMessage}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...");
    const sendButton = getSendButton(container);

    expect(input).toBeDefined();
    expect(sendButton).not.toBeNull();
    expect(sendButton?.disabled).toBe(true); // Should be disabled when input is empty
  });

  it("calls onSubmitMessage with trimmed text when Enter is pressed", () => {
    const mockOnChange = vi.fn();
    renderWithProvider(
      <CopilotChatInput
        value="  hello world  "
        onChange={mockOnChange}
        onSubmitMessage={mockOnSubmitMessage}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...");
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    expect(mockOnSubmitMessage).toHaveBeenCalledWith("hello world");
  });

  it("calls onSubmitMessage when button is clicked", () => {
    const mockOnChange = vi.fn();
    const { container } = renderWithProvider(
      <CopilotChatInput
        value="test message"
        onChange={mockOnChange}
        onSubmitMessage={mockOnSubmitMessage}
      />
    );

    const sendButton = getSendButton(container);
    expect(sendButton).not.toBeNull();
    fireEvent.click(sendButton!);

    expect(mockOnSubmitMessage).toHaveBeenCalledWith("test message");
  });

  it("manages text state internally when uncontrolled", () => {
    const { container } = renderWithProvider(
      <CopilotChatInput onSubmitMessage={mockOnSubmitMessage} />
    );

    const input = screen.getByPlaceholderText("Type a message...");
    const sendButton = getSendButton(container);

    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.click(sendButton!);

    expect(mockOnSubmitMessage).toHaveBeenCalledWith("hello");
    expect((input as HTMLTextAreaElement).value).toBe("");
  });

  it("does not send when Enter is pressed with Shift key", () => {
    const mockOnChange = vi.fn();
    renderWithProvider(
      <CopilotChatInput
        value="test"
        onChange={mockOnChange}
        onSubmitMessage={mockOnSubmitMessage}
      />
    );

    const input = screen.getByPlaceholderText("Type a message...");
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });

    expect(mockOnSubmitMessage).not.toHaveBeenCalled();
  });

  it("does not send empty or whitespace-only messages", () => {
    const mockOnChange = vi.fn();

    // Test empty string
    const { container, rerender } = renderWithProvider(
      <CopilotChatInput
        value=""
        onChange={mockOnChange}
        onSubmitMessage={mockOnSubmitMessage}
      />
    );

    let sendButton = getSendButton(container);
    fireEvent.click(sendButton!);
    expect(mockOnSubmitMessage).not.toHaveBeenCalled();

    // Test whitespace only
    rerender(
      <CopilotChatConfigurationProvider threadId={TEST_THREAD_ID}>
        <CopilotChatInput
          value="   "
          onChange={mockOnChange}
          onSubmitMessage={mockOnSubmitMessage}
        />
      </CopilotChatConfigurationProvider>
    );
    sendButton = getSendButton(container);
    fireEvent.click(sendButton!);
    expect(mockOnSubmitMessage).not.toHaveBeenCalled();
  });

  it("keeps input value when no submit handler is provided", () => {
    renderWithProvider(<CopilotChatInput />);

    const input = screen.getByPlaceholderText("Type a message...");

    fireEvent.change(input, { target: { value: "draft" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

    expect((input as HTMLTextAreaElement).value).toBe("draft");
  });

  it("enables button based on value prop", () => {
    const mockOnChange = vi.fn();

    // Test with empty value
    const { container, rerender } = renderWithProvider(
      <CopilotChatInput
        value=""
        onChange={mockOnChange}
        onSubmitMessage={mockOnSubmitMessage}
      />
    );

    let sendButton = getSendButton(container);
    expect(sendButton?.disabled).toBe(true);

    // Test with non-empty value
    rerender(
      <CopilotChatConfigurationProvider threadId={TEST_THREAD_ID}>
        <CopilotChatInput
          value="hello"
          onChange={mockOnChange}
          onSubmitMessage={mockOnSubmitMessage}
        />
      </CopilotChatConfigurationProvider>
    );
    sendButton = getSendButton(container);
    expect(sendButton?.disabled).toBe(false);

    // Test with empty value again
    rerender(
      <CopilotChatConfigurationProvider threadId={TEST_THREAD_ID}>
        <CopilotChatInput
          value=""
          onChange={mockOnChange}
          onSubmitMessage={mockOnSubmitMessage}
        />
      </CopilotChatConfigurationProvider>
    );
    sendButton = getSendButton(container);
    expect(sendButton?.disabled).toBe(true);
  });

  it("accepts custom slot classes", () => {
    const mockOnChange = vi.fn();
    const { container } = renderWithProvider(
      <CopilotChatInput
        value=""
        onChange={mockOnChange}
        onSubmitMessage={mockOnSubmitMessage}
        className="custom-container"
        textArea="custom-textarea"
        sendButton="custom-button"
      />
    );

    const containerDiv = container.firstChild as HTMLElement;
    const input = screen.getByPlaceholderText("Type a message...");
    const sendButton = getSendButton(container);

    expect(containerDiv.classList.contains("custom-container")).toBe(true);
    expect(input.classList.contains("custom-textarea")).toBe(true);
    expect(sendButton?.classList.contains("custom-button")).toBe(true);
  });

  it("accepts custom components via slots", () => {
    const mockOnChange = vi.fn();
    const CustomButton = (
      props: React.ButtonHTMLAttributes<HTMLButtonElement>
    ) => (
      <button {...props} data-testid="custom-button">
        Send Now
      </button>
    );

    renderWithProvider(
      <CopilotChatInput
        value=""
        onChange={mockOnChange}
        onSubmitMessage={mockOnSubmitMessage}
        sendButton={CustomButton}
      />
    );

    const customButton = screen.getByTestId("custom-button");
    expect(customButton).toBeDefined();
    expect(customButton.textContent?.includes("Send Now")).toBe(true);
  });

  it("supports custom layout via children render prop", () => {
    const mockOnChange = vi.fn();
    renderWithProvider(
      <CopilotChatInput
        value=""
        onChange={mockOnChange}
        onSubmitMessage={mockOnSubmitMessage}
      >
        {({ textArea: TextArea, sendButton: SendButton }) => (
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

  it("provides multiline state through the children render prop", async () => {
    const states: boolean[] = [];

    renderWithProvider(
      <CopilotChatInput onSubmitMessage={mockOnSubmitMessage}>
        {({ textArea: TextArea, sendButton: SendButton, isMultiline }) => {
          states.push(isMultiline);
          return (
            <div>
              {SendButton}
              {TextArea}
            </div>
          );
        }}
      </CopilotChatInput>
    );

    const textarea = screen.getByRole("textbox");
    expect(states[states.length - 1]).toBe(false);

    fireEvent.change(textarea, { target: { value: "line one\nline two" } });

    await waitFor(() => {
      expect(states[states.length - 1]).toBe(true);
    });
  });

  it("shows cancel and finish buttons in transcribe mode", () => {
    const { container } = renderWithProvider(
      <CopilotChatInput
        mode="transcribe"
        onSubmitMessage={mockOnSubmitMessage}
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

  it("disables add menu button in transcribe mode", () => {
    const { container } = renderWithProvider(
      <CopilotChatInput
        mode="transcribe"
        onSubmitMessage={mockOnSubmitMessage}
        onStartTranscribe={() => {}}
        onCancelTranscribe={() => {}}
        onFinishTranscribe={() => {}}
        onAddFile={() => {}}
        toolsMenu={[{ label: "Test Tool", action: () => {} }]}
      />
    );

    // Add button should be disabled (find by Plus icon)
    const addIcon = container.querySelector("svg.lucide-plus");
    const addButton = addIcon?.closest("button") as HTMLButtonElement | null;
    expect(addButton).not.toBeNull();
    expect(addButton?.disabled).toBe(true);
  });

  it("shows recording indicator instead of textarea in transcribe mode", () => {
    const { container } = renderWithProvider(
      <CopilotChatInput
        mode="transcribe"
        onSubmitMessage={mockOnSubmitMessage}
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
        onSubmitMessage={mockOnSubmitMessage}
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

  it("positions the textarea next to the add menu button when single line", () => {
    renderWithProvider(<CopilotChatInput onSubmitMessage={mockOnSubmitMessage} />);

    const textarea = screen.getByRole("textbox");
    const layoutCell = textarea.parentElement as HTMLElement;

    expect(layoutCell.className).toContain("col-start-2");
    expect(layoutCell.className).not.toContain("col-span-3");
  });

  it("moves the textarea above the add menu button when multiple lines", async () => {
    renderWithProvider(<CopilotChatInput onSubmitMessage={mockOnSubmitMessage} />);

    const textarea = screen.getByRole("textbox");

    fireEvent.change(textarea, { target: { value: "first line\nsecond line" } });

    await waitFor(() => {
      const layoutCell = textarea.parentElement as HTMLElement;
      expect(layoutCell.className).toContain("col-span-3");
      expect(layoutCell.className).not.toContain("col-start-2");
    });
  });

  it("disables the add menu button when no menu items are provided", () => {
    const { container } = renderWithProvider(
      <CopilotChatInput onSubmitMessage={mockOnSubmitMessage} />
    );

    const addButton = getAddMenuButton(container);

    expect(addButton).not.toBeNull();
    expect(addButton?.disabled).toBe(true);
  });

  it("opens the add menu and runs onAddFile when the default item is clicked", async () => {
    const handleAddFile = vi.fn();

    const { container } = renderWithProvider(
      <CopilotChatInput onAddFile={handleAddFile} onSubmitMessage={mockOnSubmitMessage} />
    );

    const addButton = getAddMenuButton(container);
    expect(addButton).not.toBeNull();
    expect(addButton?.disabled).toBe(false);

    fireEvent.click(addButton!);

    const menuItem = await screen.findByText("Add photos or files");
    fireEvent.click(menuItem);

    expect(handleAddFile).toHaveBeenCalledTimes(1);
  });

  it("renders additional custom menu items from the tools menu", async () => {
    const handleCustom = vi.fn();

    const { container } = renderWithProvider(
      <CopilotChatInput
        toolsMenu={[
          { label: "Custom action", action: handleCustom },
        ]}
        onSubmitMessage={mockOnSubmitMessage}
      />
    );

    const addButton = getAddMenuButton(container);
    expect(addButton).not.toBeNull();
    fireEvent.click(addButton!);

    const menuItem = await screen.findByText("Custom action");
    fireEvent.click(menuItem);

    expect(handleCustom).toHaveBeenCalledTimes(1);
  });

  // Controlled component tests
  describe("Controlled component behavior", () => {
    it("displays the provided value prop", () => {
      const mockOnChange = vi.fn();
      const mockOnSubmitMessage = vi.fn();

      renderWithProvider(
        <CopilotChatInput
          value="test value"
          onChange={mockOnChange}
          onSubmitMessage={mockOnSubmitMessage}
        />
      );

      const input = screen.getByRole("textbox");
      expect((input as HTMLTextAreaElement).value).toBe("test value");
    });

    it("calls onChange when user types", () => {
      const mockOnChange = vi.fn();
      const mockOnSubmitMessage = vi.fn();

      renderWithProvider(
        <CopilotChatInput
          value=""
          onChange={mockOnChange}
          onSubmitMessage={mockOnSubmitMessage}
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "new text" } });

      expect(mockOnChange).toHaveBeenCalledWith("new text");
    });

    it("calls onSubmitMessage when form is submitted", () => {
      const mockOnChange = vi.fn();
      const mockOnSubmitMessage = vi.fn();

      renderWithProvider(
        <CopilotChatInput
          value="hello world"
          onChange={mockOnChange}
          onSubmitMessage={mockOnSubmitMessage}
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

      expect(mockOnSubmitMessage).toHaveBeenCalledWith("hello world");
    });

    it("calls onSubmitMessage when send button is clicked", () => {
      const mockOnChange = vi.fn();
      const mockOnSubmitMessage = vi.fn();

      const { container } = renderWithProvider(
        <CopilotChatInput
          value="test message"
          onChange={mockOnChange}
          onSubmitMessage={mockOnSubmitMessage}
        />
      );

      const sendButton = getSendButton(container);
      expect(sendButton).not.toBeNull();
      fireEvent.click(sendButton!);

      expect(mockOnSubmitMessage).toHaveBeenCalledWith("test message");
    });

    it("trims whitespace when submitting", () => {
      const mockOnChange = vi.fn();
      const mockOnSubmitMessage = vi.fn();

      renderWithProvider(
        <CopilotChatInput
          value="  hello world  "
          onChange={mockOnChange}
          onSubmitMessage={mockOnSubmitMessage}
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

      expect(mockOnSubmitMessage).toHaveBeenCalledWith("hello world");
    });

    it("does not submit empty or whitespace-only messages", () => {
      const mockOnChange = vi.fn();
      const mockOnSubmitMessage = vi.fn();

      const { container } = renderWithProvider(
        <CopilotChatInput
          value="   "
          onChange={mockOnChange}
          onSubmitMessage={mockOnSubmitMessage}
        />
      );

      const sendButton = getSendButton(container);
      expect(sendButton).not.toBeNull();
      fireEvent.click(sendButton!);

      expect(mockOnSubmitMessage).not.toHaveBeenCalled();
    });

    it("disables send button when onSubmitMessage is not provided", () => {
      const mockOnChange = vi.fn();

      const { container } = renderWithProvider(
        <CopilotChatInput value="some text" onChange={mockOnChange} />
      );

      const sendButton = getSendButton(container);
      expect(sendButton?.disabled).toBe(true);
    });

    it("disables send button when value is empty", () => {
      const mockOnChange = vi.fn();
      const mockOnSubmitMessage = vi.fn();

      const { container } = renderWithProvider(
        <CopilotChatInput
          value=""
          onChange={mockOnChange}
          onSubmitMessage={mockOnSubmitMessage}
        />
      );

      const sendButton = getSendButton(container);
      expect(sendButton?.disabled).toBe(true);
    });

    it("enables send button when value has content and onSubmitMessage is provided", () => {
      const mockOnChange = vi.fn();
      const mockOnSubmitMessage = vi.fn();

      const { container } = renderWithProvider(
        <CopilotChatInput
          value="hello"
          onChange={mockOnChange}
          onSubmitMessage={mockOnSubmitMessage}
        />
      );

      const sendButton = getSendButton(container);
      expect(sendButton?.disabled).toBe(false);
    });

    it("works as a fully controlled component", () => {
      const mockOnChange = vi.fn();
      const mockOnSubmitMessage = vi.fn();

      const { rerender } = renderWithProvider(
        <CopilotChatInput
          value="initial"
          onChange={mockOnChange}
          onSubmitMessage={mockOnSubmitMessage}
        />
      );

      const input = screen.getByRole("textbox");
      expect((input as HTMLTextAreaElement).value).toBe("initial");

      // Simulate parent component updating the value
      rerender(
        <CopilotChatConfigurationProvider threadId={TEST_THREAD_ID}>
          <CopilotChatInput
            value="updated"
            onChange={mockOnChange}
            onSubmitMessage={mockOnSubmitMessage}
          />
        </CopilotChatConfigurationProvider>
      );

      expect((input as HTMLTextAreaElement).value).toBe("updated");
    });

    it("does not clear input after submission when controlled", () => {
      const mockOnChange = vi.fn();
      const mockOnSubmitMessage = vi.fn();

      const { container } = renderWithProvider(
        <CopilotChatInput
          value="test message"
          onChange={mockOnChange}
          onSubmitMessage={mockOnSubmitMessage}
        />
      );

      const input = screen.getByRole("textbox");
      const sendButton = getSendButton(container);

      fireEvent.click(sendButton!);

      // In controlled mode, the component should not clear the input
      // It's up to the parent to manage the value
      expect((input as HTMLTextAreaElement).value).toBe("test message");
      expect(mockOnSubmitMessage).toHaveBeenCalledWith("test message");
    });
  });
});

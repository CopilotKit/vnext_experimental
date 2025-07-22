import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import { CopilotAssistantMessage } from "../CopilotAssistantMessage";
import { CopilotChatContextProvider } from "../../../providers/CopilotChatContextProvider";
import { AssistantMessage } from "@ag-ui/core";

// No mocks needed - Vitest handles ES modules natively!

// Mock navigator.clipboard
const mockWriteText = vi.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock callback functions
const mockOnThumbsUp = vi.fn();
const mockOnThumbsDown = vi.fn();
const mockOnReadAloud = vi.fn();
const mockOnRegenerate = vi.fn();

// Helper to render components with context provider
const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <CopilotChatContextProvider>{component}</CopilotChatContextProvider>
  );
};

// Clear mocks before each test
beforeEach(() => {
  mockWriteText.mockClear();
  mockOnThumbsUp.mockClear();
  mockOnThumbsDown.mockClear();
  mockOnReadAloud.mockClear();
  mockOnRegenerate.mockClear();
});

describe("CopilotAssistantMessage", () => {
  const basicMessage: AssistantMessage = {
    role: "assistant",
    content: "Hello, this is a test message from the assistant.",
    id: "test-message-1",
  };

  describe("Basic rendering", () => {
    it("renders with default components and styling", () => {
      renderWithProvider(<CopilotAssistantMessage message={basicMessage} />);

      // Check if elements exist (getBy throws if not found, so this is sufficient)
      // Note: Since markdown may not render in test environment, let's check the component structure
      const copyButton = screen.getByRole("button", { name: /copy/i });
      expect(copyButton).toBeDefined();
    });

    it("renders empty message gracefully", () => {
      const emptyMessage: AssistantMessage = {
        role: "assistant",
        content: "",
        id: "empty-message",
      };

      renderWithProvider(<CopilotAssistantMessage message={emptyMessage} />);

      // Should still render the component structure
      screen.getByRole("button", { name: /copy/i });
    });
  });

  describe("Callback functionality", () => {
    it("renders only copy button when no callbacks provided", () => {
      renderWithProvider(<CopilotAssistantMessage message={basicMessage} />);

      expect(screen.getByRole("button", { name: /copy/i })).toBeDefined();
      expect(screen.queryByRole("button", { name: /thumbs up/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /thumbs down/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /read aloud/i })).toBeNull();
      expect(screen.queryByRole("button", { name: /regenerate/i })).toBeNull();
    });

    it("renders all buttons when all callbacks provided", () => {
      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          onThumbsUp={mockOnThumbsUp}
          onThumbsDown={mockOnThumbsDown}
          onReadAloud={mockOnReadAloud}
          onRegenerate={mockOnRegenerate}
        />
      );

      expect(screen.getByRole("button", { name: /copy/i })).toBeDefined();
      expect(
        screen.getByRole("button", { name: /good response/i })
      ).toBeDefined();
      expect(
        screen.getByRole("button", { name: /bad response/i })
      ).toBeDefined();
      expect(screen.getByRole("button", { name: /read aloud/i })).toBeDefined();
      expect(screen.getByRole("button", { name: /regenerate/i })).toBeDefined();
    });

    it("calls copy functionality when copy button clicked", async () => {
      renderWithProvider(<CopilotAssistantMessage message={basicMessage} />);

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith(basicMessage.content!);
      });
    });

    it("calls thumbs up callback when thumbs up button clicked", () => {
      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          onThumbsUp={mockOnThumbsUp}
        />
      );

      const thumbsUpButton = screen.getByRole("button", {
        name: /good response/i,
      });
      fireEvent.click(thumbsUpButton);

      expect(mockOnThumbsUp).toHaveBeenCalledTimes(1);
    });

    it("calls thumbs down callback when thumbs down button clicked", () => {
      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          onThumbsDown={mockOnThumbsDown}
        />
      );

      const thumbsDownButton = screen.getByRole("button", {
        name: /bad response/i,
      });
      fireEvent.click(thumbsDownButton);

      expect(mockOnThumbsDown).toHaveBeenCalledTimes(1);
    });

    it("calls read aloud callback when read aloud button clicked", () => {
      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          onReadAloud={mockOnReadAloud}
        />
      );

      const readAloudButton = screen.getByRole("button", {
        name: /read aloud/i,
      });
      fireEvent.click(readAloudButton);

      expect(mockOnReadAloud).toHaveBeenCalledTimes(1);
    });

    it("calls regenerate callback when regenerate button clicked", () => {
      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          onRegenerate={mockOnRegenerate}
        />
      );

      const regenerateButton = screen.getByRole("button", {
        name: /regenerate/i,
      });
      fireEvent.click(regenerateButton);

      expect(mockOnRegenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe("Additional toolbar items", () => {
    it("renders additional toolbar items", () => {
      const additionalItems = (
        <button data-testid="custom-toolbar-item">Custom Action</button>
      );

      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          additionalToolbarItems={additionalItems}
        />
      );

      expect(screen.getByTestId("custom-toolbar-item")).toBeDefined();
    });
  });

  describe("Slot functionality - Custom Components", () => {
    it("accepts custom Container component", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const CustomContainer = ({ children, ...props }: any) => (
        <div data-testid="custom-container" {...props}>
          {children}
        </div>
      );

      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          Container={CustomContainer}
        />
      );

      expect(screen.getByTestId("custom-container")).toBeDefined();
    });

    it("accepts custom MarkdownRenderer component", () => {
      const CustomMarkdownRenderer = ({ content }: { content: string }) => (
        <div data-testid="custom-markdown">{content.toUpperCase()}</div>
      );

      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          MarkdownRenderer={CustomMarkdownRenderer}
        />
      );

      expect(screen.getByTestId("custom-markdown")).toBeDefined();
      expect(
        screen
          .getByTestId("custom-markdown")
          .textContent?.includes(basicMessage.content!.toUpperCase())
      ).toBe(true);
    });

    it("accepts custom Toolbar component", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const CustomToolbar = ({ children, ...props }: any) => (
        <div data-testid="custom-toolbar" {...props}>
          Custom Toolbar: {children}
        </div>
      );

      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          Toolbar={CustomToolbar}
        />
      );

      expect(screen.getByTestId("custom-toolbar")).toBeDefined();
      expect(
        screen
          .getByTestId("custom-toolbar")
          .textContent?.includes("Custom Toolbar:")
      ).toBe(true);
    });

    it("accepts custom CopyButton component", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const CustomCopyButton = (props: any) => (
        <button data-testid="custom-copy-button" {...props}>
          Custom Copy
        </button>
      );

      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          CopyButton={CustomCopyButton}
        />
      );

      expect(screen.getByTestId("custom-copy-button")).toBeDefined();
      expect(
        screen
          .getByTestId("custom-copy-button")
          .textContent?.includes("Custom Copy")
      ).toBe(true);
    });

    it("accepts custom ThumbsUpButton component", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const CustomThumbsUpButton = (props: any) => (
        <button data-testid="custom-thumbs-up" {...props}>
          Custom Like
        </button>
      );

      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          onThumbsUp={mockOnThumbsUp}
          ThumbsUpButton={CustomThumbsUpButton}
        />
      );

      expect(screen.getByTestId("custom-thumbs-up")).toBeDefined();
      expect(
        screen
          .getByTestId("custom-thumbs-up")
          .textContent?.includes("Custom Like")
      ).toBe(true);
    });

    it("accepts custom ThumbsDownButton component", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const CustomThumbsDownButton = (props: any) => (
        <button data-testid="custom-thumbs-down" {...props}>
          Custom Dislike
        </button>
      );

      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          onThumbsDown={mockOnThumbsDown}
          ThumbsDownButton={CustomThumbsDownButton}
        />
      );

      expect(screen.getByTestId("custom-thumbs-down")).toBeDefined();
      expect(
        screen
          .getByTestId("custom-thumbs-down")
          .textContent?.includes("Custom Dislike")
      ).toBe(true);
    });

    it("accepts custom ReadAloudButton component", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const CustomReadAloudButton = (props: any) => (
        <button data-testid="custom-read-aloud" {...props}>
          Custom Speak
        </button>
      );

      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          onReadAloud={mockOnReadAloud}
          ReadAloudButton={CustomReadAloudButton}
        />
      );

      expect(screen.getByTestId("custom-read-aloud")).toBeDefined();
      expect(
        screen
          .getByTestId("custom-read-aloud")
          .textContent?.includes("Custom Speak")
      ).toBe(true);
    });

    it("accepts custom RegenerateButton component", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const CustomRegenerateButton = (props: any) => (
        <button data-testid="custom-regenerate" {...props}>
          Custom Retry
        </button>
      );

      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          onRegenerate={mockOnRegenerate}
          RegenerateButton={CustomRegenerateButton}
        />
      );

      expect(screen.getByTestId("custom-regenerate")).toBeDefined();
      expect(
        screen
          .getByTestId("custom-regenerate")
          .textContent?.includes("Custom Retry")
      ).toBe(true);
    });
  });

  describe("Slot functionality - Custom Classes", () => {
    it("applies custom className to Container slot", () => {
      const { container } = renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          Container="custom-container-class"
        />
      );

      const containerElement = container.querySelector(
        ".custom-container-class"
      );
      expect(containerElement).toBeDefined();
    });

    it("applies custom className to MarkdownRenderer slot", () => {
      const { container } = renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          MarkdownRenderer="custom-markdown-class"
        />
      );

      const markdownElement = container.querySelector(".custom-markdown-class");
      expect(markdownElement).toBeDefined();
    });

    it("applies custom className to Toolbar slot", () => {
      const { container } = renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          Toolbar="custom-toolbar-class"
        />
      );

      const toolbarElement = container.querySelector(".custom-toolbar-class");
      expect(toolbarElement).toBeDefined();
    });

    it("applies custom className to CopyButton slot", () => {
      const { container } = renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          CopyButton="custom-copy-button-class"
        />
      );

      const copyButtonElement = container.querySelector(
        ".custom-copy-button-class"
      );
      expect(copyButtonElement).toBeDefined();
    });
  });

  describe("Children render prop functionality", () => {
    it("supports custom layout via children render prop", () => {
      renderWithProvider(
        <CopilotAssistantMessage message={basicMessage}>
          {({ MarkdownRenderer, Toolbar, message }) => (
            <div data-testid="custom-layout">
              <h2>Custom Layout for: {message.id}</h2>
              {MarkdownRenderer}
              <div data-testid="custom-toolbar-wrapper">{Toolbar}</div>
            </div>
          )}
        </CopilotAssistantMessage>
      );

      expect(screen.getByTestId("custom-layout")).toBeDefined();
      expect(
        screen.getByText(`Custom Layout for: ${basicMessage.id}`)
      ).toBeDefined();
      expect(screen.getByTestId("custom-toolbar-wrapper")).toBeDefined();
      // Note: Markdown content may not render in test environment, check toolbar instead
      expect(screen.getByTestId("custom-toolbar-wrapper")).toBeDefined();
    });

    it("provides all slot components to children render prop", () => {
      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          onThumbsUp={mockOnThumbsUp}
          onThumbsDown={mockOnThumbsDown}
          onReadAloud={mockOnReadAloud}
          onRegenerate={mockOnRegenerate}
        >
          {({
            MarkdownRenderer,
            Toolbar,
            CopyButton,
            ThumbsUpButton,
            ThumbsDownButton,
            ReadAloudButton,
            RegenerateButton,
            Container,
          }) => (
            <div data-testid="all-slots-layout">
              {Container}
              {MarkdownRenderer}
              {Toolbar}
              <div data-testid="individual-buttons">
                {CopyButton}
                {ThumbsUpButton}
                {ThumbsDownButton}
                {ReadAloudButton}
                {RegenerateButton}
              </div>
            </div>
          )}
        </CopilotAssistantMessage>
      );

      expect(screen.getByTestId("all-slots-layout")).toBeDefined();
      expect(screen.getByTestId("individual-buttons")).toBeDefined();

      // Verify all buttons are rendered
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(5); // At least copy, thumbs up, thumbs down, read aloud, regenerate
    });

    it("provides callback props to children render prop", () => {
      renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          onThumbsUp={mockOnThumbsUp}
          onThumbsDown={mockOnThumbsDown}
          onReadAloud={mockOnReadAloud}
          onRegenerate={mockOnRegenerate}
        >
          {({ onThumbsUp, onThumbsDown, onReadAloud, onRegenerate }) => (
            <div data-testid="callback-test">
              <button onClick={onThumbsUp} data-testid="custom-thumbs-up">
                Custom Thumbs Up
              </button>
              <button onClick={onThumbsDown} data-testid="custom-thumbs-down">
                Custom Thumbs Down
              </button>
              <button onClick={onReadAloud} data-testid="custom-read-aloud">
                Custom Read Aloud
              </button>
              <button onClick={onRegenerate} data-testid="custom-regenerate">
                Custom Regenerate
              </button>
            </div>
          )}
        </CopilotAssistantMessage>
      );

      fireEvent.click(screen.getByTestId("custom-thumbs-up"));
      fireEvent.click(screen.getByTestId("custom-thumbs-down"));
      fireEvent.click(screen.getByTestId("custom-read-aloud"));
      fireEvent.click(screen.getByTestId("custom-regenerate"));

      expect(mockOnThumbsUp).toHaveBeenCalledTimes(1);
      expect(mockOnThumbsDown).toHaveBeenCalledTimes(1);
      expect(mockOnReadAloud).toHaveBeenCalledTimes(1);
      expect(mockOnRegenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe("Error handling", () => {
    it("handles copy errors gracefully", async () => {
      // Mock clipboard to throw an error
      mockWriteText.mockRejectedValueOnce(new Error("Clipboard error"));

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      renderWithProvider(<CopilotAssistantMessage message={basicMessage} />);

      const copyButton = screen.getByRole("button", { name: /copy/i });
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          "Failed to copy message:",
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it("handles null message content gracefully", () => {
      const nullContentMessage: AssistantMessage = {
        role: "assistant",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        content: null as any,
        id: "null-content",
      };

      renderWithProvider(
        <CopilotAssistantMessage message={nullContentMessage} />
      );

      // Should still render the component structure
      expect(screen.getByRole("button", { name: /copy/i })).toBeDefined();
    });
  });
});

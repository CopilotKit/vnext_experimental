import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CopilotAssistantMessage } from "../CopilotAssistantMessage";
import { CopilotChatContextProvider } from "../../../providers/CopilotChatContextProvider";
import { AssistantMessage } from "@ag-ui/core";

// Mock the problematic ES modules
jest.mock("react-markdown", () => {
  return {
    MarkdownHooks: ({ children }: { children: string }) => (
      <div data-testid="markdown-content">{children}</div>
    ),
  };
});

jest.mock("remark-gfm", () => jest.fn());
jest.mock("remark-math", () => jest.fn());
jest.mock("rehype-pretty-code", () => jest.fn());
jest.mock("rehype-katex", () => jest.fn());
jest.mock("unified", () => ({
  unified: () => ({
    use: jest.fn().mockReturnThis(),
    processSync: jest.fn((input: string) => ({ toString: () => input })),
  }),
}));
jest.mock("remark-parse", () => jest.fn());
jest.mock("remark-stringify", () => jest.fn());

// Mock navigator.clipboard
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock callback functions
const mockOnThumbsUp = jest.fn();
const mockOnThumbsDown = jest.fn();
const mockOnReadAloud = jest.fn();
const mockOnRegenerate = jest.fn();

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

      expect(screen.getByText(basicMessage.content!)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    });

    it("renders empty message gracefully", () => {
      const emptyMessage: AssistantMessage = {
        role: "assistant",
        content: "",
        id: "empty-message",
      };

      renderWithProvider(<CopilotAssistantMessage message={emptyMessage} />);

      // Should still render the component structure
      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    });
  });

  describe("Callback functionality", () => {
    it("renders only copy button when no callbacks provided", () => {
      renderWithProvider(<CopilotAssistantMessage message={basicMessage} />);

      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /thumbs up/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /thumbs down/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /read aloud/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /regenerate/i })
      ).not.toBeInTheDocument();
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

      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /thumbs up/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /thumbs down/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /read aloud/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /regenerate/i })
      ).toBeInTheDocument();
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

      const thumbsUpButton = screen.getByRole("button", { name: /thumbs up/i });
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
        name: /thumbs down/i,
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

      expect(screen.getByTestId("custom-toolbar-item")).toBeInTheDocument();
    });
  });

  describe("Slot functionality - Custom Components", () => {
    it("accepts custom Container component", () => {
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

      expect(screen.getByTestId("custom-container")).toBeInTheDocument();
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

      expect(screen.getByTestId("custom-markdown")).toBeInTheDocument();
      expect(screen.getByTestId("custom-markdown")).toHaveTextContent(
        basicMessage.content!.toUpperCase()
      );
    });

    it("accepts custom Toolbar component", () => {
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

      expect(screen.getByTestId("custom-toolbar")).toBeInTheDocument();
      expect(screen.getByTestId("custom-toolbar")).toHaveTextContent(
        "Custom Toolbar:"
      );
    });

    it("accepts custom CopyButton component", () => {
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

      expect(screen.getByTestId("custom-copy-button")).toBeInTheDocument();
      expect(screen.getByTestId("custom-copy-button")).toHaveTextContent(
        "Custom Copy"
      );
    });

    it("accepts custom ThumbsUpButton component", () => {
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

      expect(screen.getByTestId("custom-thumbs-up")).toBeInTheDocument();
      expect(screen.getByTestId("custom-thumbs-up")).toHaveTextContent(
        "Custom Like"
      );
    });

    it("accepts custom ThumbsDownButton component", () => {
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

      expect(screen.getByTestId("custom-thumbs-down")).toBeInTheDocument();
      expect(screen.getByTestId("custom-thumbs-down")).toHaveTextContent(
        "Custom Dislike"
      );
    });

    it("accepts custom ReadAloudButton component", () => {
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

      expect(screen.getByTestId("custom-read-aloud")).toBeInTheDocument();
      expect(screen.getByTestId("custom-read-aloud")).toHaveTextContent(
        "Custom Speak"
      );
    });

    it("accepts custom RegenerateButton component", () => {
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

      expect(screen.getByTestId("custom-regenerate")).toBeInTheDocument();
      expect(screen.getByTestId("custom-regenerate")).toHaveTextContent(
        "Custom Retry"
      );
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
      expect(containerElement).toBeInTheDocument();
    });

    it("applies custom className to MarkdownRenderer slot", () => {
      const { container } = renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          MarkdownRenderer="custom-markdown-class"
        />
      );

      const markdownElement = container.querySelector(".custom-markdown-class");
      expect(markdownElement).toBeInTheDocument();
    });

    it("applies custom className to Toolbar slot", () => {
      const { container } = renderWithProvider(
        <CopilotAssistantMessage
          message={basicMessage}
          Toolbar="custom-toolbar-class"
        />
      );

      const toolbarElement = container.querySelector(".custom-toolbar-class");
      expect(toolbarElement).toBeInTheDocument();
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
      expect(copyButtonElement).toBeInTheDocument();
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

      expect(screen.getByTestId("custom-layout")).toBeInTheDocument();
      expect(
        screen.getByText(`Custom Layout for: ${basicMessage.id}`)
      ).toBeInTheDocument();
      expect(screen.getByTestId("custom-toolbar-wrapper")).toBeInTheDocument();
      expect(screen.getByText(basicMessage.content!)).toBeInTheDocument();
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

      expect(screen.getByTestId("all-slots-layout")).toBeInTheDocument();
      expect(screen.getByTestId("individual-buttons")).toBeInTheDocument();

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

      const consoleSpy = jest
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
        content: null as any,
        id: "null-content",
      };

      renderWithProvider(
        <CopilotAssistantMessage message={nullContentMessage} />
      );

      // Should still render the component structure
      expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
    });
  });
});

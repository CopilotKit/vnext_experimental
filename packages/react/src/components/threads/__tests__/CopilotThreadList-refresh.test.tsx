import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { CopilotThreadList } from "../CopilotThreadList";
import { CopilotKitProvider } from "@/providers/CopilotKitProvider";
import { ReactNode } from "react";

const mockThreads = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/hooks/use-threads", () => ({
  useThreads: () => {
    const threads = mockThreads();
    return {
      threads,
      total: threads.length,
      isLoading: false,
      error: null,
      fetchThreads: vi.fn(),
      refresh: mockRefresh,
      deleteThread: vi.fn(),
      addOptimisticThread: vi.fn(),
      currentThreadId: threads.length > 0 ? threads[0].threadId : undefined,
    };
  },
}));

vi.mock("@/providers/CopilotChatConfigurationProvider", () => ({
  useCopilotChatConfiguration: () => ({
    threadId: undefined,
    setThreadId: vi.fn(),
  }),
  CopilotChatConfigurationProvider: ({ children }: { children: ReactNode }) => children,
}));

describe("CopilotThreadList - Refresh Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockThreads.mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <CopilotKitProvider runtimeUrl="https://example.com">{children}</CopilotKitProvider>
  );

  it("should render with default refresh interval", () => {
    mockThreads.mockReturnValue([
      {
        threadId: "thread-1",
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        isRunning: true,
        messageCount: 3,
        firstMessage: "Hello",
      },
    ]);

    const { container } = render(<CopilotThreadList />, { wrapper });
    expect(container).toBeTruthy();
  });

  it("should accept custom refreshInterval prop", () => {
    mockThreads.mockReturnValue([
      {
        threadId: "thread-1",
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        isRunning: true,
        messageCount: 3,
        firstMessage: "Hello",
      },
    ]);

    const { container } = render(<CopilotThreadList refreshInterval={5000} />, { wrapper });
    expect(container).toBeTruthy();
  });

  it("should accept disableAutoRefresh prop", () => {
    mockThreads.mockReturnValue([
      {
        threadId: "thread-1",
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        isRunning: true,
        messageCount: 3,
        firstMessage: "Hello",
      },
    ]);

    const { container } = render(<CopilotThreadList disableAutoRefresh={true} />, { wrapper });
    expect(container).toBeTruthy();
  });

  it("should accept both refreshInterval and disableAutoRefresh props", () => {
    mockThreads.mockReturnValue([
      {
        threadId: "thread-1",
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        isRunning: true,
        messageCount: 3,
        firstMessage: "Hello",
      },
    ]);

    const { container } = render(
      <CopilotThreadList refreshInterval={10000} disableAutoRefresh={true} />,
      { wrapper }
    );
    expect(container).toBeTruthy();
  });

  it("should render with idle threads", () => {
    mockThreads.mockReturnValue([
      {
        threadId: "thread-1",
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        isRunning: false,
        messageCount: 3,
        firstMessage: "Hello world",
      },
    ]);

    const { container } = render(<CopilotThreadList />, { wrapper });
    expect(container).toBeTruthy();
  });

  it("should render with unnamed threads", () => {
    mockThreads.mockReturnValue([
      {
        threadId: "thread-1",
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        isRunning: false,
        messageCount: 0,
        firstMessage: undefined,
      },
    ]);

    const { container } = render(<CopilotThreadList />, { wrapper });
    expect(container).toBeTruthy();
  });

  it("should render with multiple threads", () => {
    mockThreads.mockReturnValue([
      {
        threadId: "thread-1",
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        isRunning: true,
        messageCount: 3,
        firstMessage: "Running thread",
      },
      {
        threadId: "thread-2",
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        isRunning: false,
        messageCount: 0,
        firstMessage: undefined,
      },
      {
        threadId: "thread-3",
        createdAt: Date.now(),
        lastActivityAt: Date.now(),
        isRunning: false,
        messageCount: 5,
        firstMessage: "Idle thread",
      },
    ]);

    const { container } = render(<CopilotThreadList />, { wrapper });
    expect(container).toBeTruthy();
  });

  it("should render with no threads", () => {
    mockThreads.mockReturnValue([]);

    const { container } = render(<CopilotThreadList />, { wrapper });
    expect(container).toBeTruthy();
  });
});

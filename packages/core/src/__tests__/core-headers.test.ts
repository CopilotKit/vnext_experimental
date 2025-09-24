import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { CopilotKitCore } from "../core";
import { CopilotKitHttpAgent } from "../agent";
import { waitForCondition } from "./test-utils";

describe("CopilotKitCore headers", () => {
  const originalFetch = globalThis.fetch;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("applies headers to runtime fetch and remote agents", async () => {
    const headers = {
      Authorization: "Bearer 123",
      "X-Test": "1",
    };

    fetchMock.mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        version: "1.0.0",
        agents: {
          remote: {
            description: "Remote agent",
          },
        },
      }),
    });

    const core = new CopilotKitCore({
      runtimeUrl: "https://example.com",
      headers,
    });

    await waitForCondition(() => fetchMock.mock.calls.length > 0);
    expect(fetchMock).toHaveBeenCalledOnce();

    const fetchInit = fetchMock.mock.calls[0]?.[1];
    expect(fetchInit?.headers).toEqual(headers);

    await waitForCondition(() => core.getAgent("remote") !== undefined);
    expect(core.getAgent("remote")).toBeDefined();

    const remote = core.getAgent("remote") as CopilotKitHttpAgent;
    expect(remote.headers).toEqual(headers);
  });

  it("propagates header updates to existing agents", async () => {
    const initialHeaders = {
      Authorization: "Bearer start",
    };

    fetchMock.mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        version: "1.0.0",
        agents: {
          remote: {
            description: "Remote agent",
          },
        },
      }),
    });

    const core = new CopilotKitCore({
      runtimeUrl: "https://example.com",
      headers: initialHeaders,
    });

    await waitForCondition(() => core.getAgent("remote") !== undefined);
    expect(core.getAgent("remote")).toBeDefined();

    const remote = core.getAgent("remote") as CopilotKitHttpAgent;

    const localAgent = new CopilotKitHttpAgent({
      runtimeUrl: "https://example.com",
      agentId: "local",
      description: "Local agent",
      headers: {},
    });

    core.setAgents({ local: localAgent });

    expect(remote.headers).toEqual(initialHeaders);
    expect(localAgent.headers).toEqual(initialHeaders);

    const updatedHeaders = {
      Authorization: "Bearer updated",
      "X-Test": "true",
    };

    core.setHeaders(updatedHeaders);

    expect(remote.headers).toEqual(updatedHeaders);
    expect(localAgent.headers).toEqual(updatedHeaders);

    fetchMock.mockClear();
    core.setRuntimeUrl("https://example.com");

    await waitForCondition(() => fetchMock.mock.calls.length > 0);
    expect(fetchMock).toHaveBeenCalled();

    const fetchInit = fetchMock.mock.calls[0]?.[1];
    expect(fetchInit?.headers).toEqual(updatedHeaders);
  });
});

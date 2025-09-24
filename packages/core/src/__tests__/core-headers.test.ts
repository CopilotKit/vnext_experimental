import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopilotKitCore } from "../core";
import { HttpAgent } from "@ag-ui/client";
import { waitForCondition } from "./test-utils";

describe("CopilotKitCore headers", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete (global as typeof globalThis & { fetch?: typeof fetch }).fetch;
    }
  });

  it("includes provided headers when fetching runtime info", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ version: "1.0.0", agents: {} }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const headers = {
      Authorization: "Bearer test-token",
      "X-Custom-Header": "custom-value",
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const core = new CopilotKitCore({
      runtimeUrl: "https://runtime.example",
      headers,
    });

    await waitForCondition(() => fetchMock.mock.calls.length >= 1);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://runtime.example/info",
      expect.objectContaining({
        headers: expect.objectContaining(headers),
      })
    );
  });

  it("uses updated headers for subsequent runtime requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ version: "1.0.0", agents: {} }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const core = new CopilotKitCore({
      runtimeUrl: "https://runtime.example",
      headers: { Authorization: "Bearer initial" },
    });

    await waitForCondition(() => fetchMock.mock.calls.length >= 1);

    core.setHeaders({ Authorization: "Bearer updated", "X-Trace": "123" });
    core.setRuntimeUrl(undefined);
    core.setRuntimeUrl("https://runtime.example");

    await waitForCondition(() => fetchMock.mock.calls.length >= 2);

    const secondCall = fetchMock.mock.calls[1];
    expect(secondCall?.[1]?.headers).toMatchObject({
      Authorization: "Bearer updated",
      "X-Trace": "123",
    });
  });

  it("passes configured headers to HttpAgent runs", async () => {
    const recorded: Array<Record<string, string>> = [];

    class RecordingHttpAgent extends HttpAgent {
      constructor() {
        super({ url: "https://runtime.example" });
      }

      async connectAgent(...args: Parameters<HttpAgent["connectAgent"]>) {
        recorded.push({ ...this.headers });
        return Promise.resolve({ newMessages: [] }) as ReturnType<HttpAgent["connectAgent"]>;
      }

      async runAgent(...args: Parameters<HttpAgent["runAgent"]>) {
        recorded.push({ ...this.headers });
        return Promise.resolve({ newMessages: [] }) as ReturnType<HttpAgent["runAgent"]>;
      }
    }

    const agent = new RecordingHttpAgent();

    const core = new CopilotKitCore({
      runtimeUrl: undefined,
      headers: { Authorization: "Bearer cfg", "X-Team": "angular" },
      agents: { default: agent },
    });

    await agent.runAgent();
    await core.connectAgent({ agent, agentId: "default" });
    await core.runAgent({ agent, agentId: "default" });

    expect(recorded).toHaveLength(3);
    for (const headers of recorded) {
      expect(headers).toMatchObject({
        Authorization: "Bearer cfg",
        "X-Team": "angular",
      });
    }
  });
});

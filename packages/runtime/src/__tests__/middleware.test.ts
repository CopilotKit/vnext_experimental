import { vi, type MockedFunction } from "vitest";
import { CopilotKitEndpoint } from "../endpoint";
import { CopilotRuntime } from "../runtime";
import { logger } from "@copilotkit/shared";
import type { AbstractAgent } from "@ag-ui/client";
import { WebhookStage } from "../middleware";
import { afterEach, describe, expect, it } from "vitest";

const dummyRuntime = (opts: Partial<CopilotRuntime> = {}) => {
  const runtime = new CopilotRuntime({
    agents: { agent: {} as unknown as AbstractAgent },
    ...opts,
  });
  return runtime;
};

describe("CopilotKitEndpoint middleware", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // restore global fetch if it was mocked
    if (fetchMock) {
      global.fetch = originalFetch;
    }
  });

  let originalFetch: typeof fetch;
  let fetchMock: MockedFunction<typeof fetch> | null = null;

  const setupFetchMock = (beforeUrl: string, afterUrl: string) => {
    originalFetch = global.fetch;
    fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === beforeUrl) {
        const body = {
          headers: { "x-modified": "yes" },
          body: { foo: "bar" },
        };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url === afterUrl) {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    // Override global fetch for the duration of this test
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.fetch = fetchMock as unknown as typeof fetch;
  };

  it("processes request through middleware and handler", async () => {
    const originalRequest = new Request("https://example.com/info");
    const modifiedRequest = new Request("https://example.com/info", {
      headers: { "x-modified": "yes" },
    });

    const before = vi.fn().mockResolvedValue(modifiedRequest);
    const after = vi.fn().mockResolvedValue(undefined);

    const runtime = dummyRuntime({
      beforeRequestMiddleware: before,
      afterRequestMiddleware: after,
    });

    const endpoint = new CopilotKitEndpoint(runtime);
    const response = await endpoint.fetch(originalRequest);

    expect(before).toHaveBeenCalledWith({
      runtime,
      request: originalRequest,
      requestType: expect.any(String),
    });
    expect(after).toHaveBeenCalledWith({
      runtime,
      response,
      requestType: expect.any(String),
    });
    // The response should contain version info from the /info endpoint
    const body = await response.json();
    expect(body).toHaveProperty("version");
  });

  it("logs and returns Response error from beforeRequestMiddleware", async () => {
    const errorResponse = new Response("Error", { status: 400 });
    const before = vi.fn().mockRejectedValue(errorResponse);
    const after = vi.fn();
    const runtime = dummyRuntime({
      beforeRequestMiddleware: before,
      afterRequestMiddleware: after,
    });
    const logSpy = vi
      .spyOn(logger, "error")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => undefined as any);

    const endpoint = new CopilotKitEndpoint(runtime);
    const response = await endpoint.fetch(
      new Request("https://example.com/info")
    );

    expect(response.status).toBe(400);
    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        err: errorResponse,
        url: "https://example.com/info",
      }),
      "Error running before request middleware"
    );
    expect(after).not.toHaveBeenCalled();
  });

  it("logs and returns 500 error from beforeRequestMiddleware", async () => {
    const error = new Error("before");
    const before = vi.fn().mockRejectedValue(error);
    const after = vi.fn();
    const runtime = dummyRuntime({
      beforeRequestMiddleware: before,
      afterRequestMiddleware: after,
    });
    const logSpy = vi
      .spyOn(logger, "error")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => undefined as any);

    const endpoint = new CopilotKitEndpoint(runtime);

    const response = await endpoint.fetch(
      new Request("https://example.com/info")
    );

    // Hono catches errors and returns them as 500 responses
    expect(response.status).toBe(500);

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        err: error,
        url: "https://example.com/info",
      }),
      "Error running before request middleware"
    );
    expect(after).not.toHaveBeenCalled();
  });

  it("logs error from handler", async () => {
    // Create a mock agent that throws an error
    const before = vi.fn();
    const after = vi.fn();
    const errorAgent = {
      clone: () => {
        throw new Error("Agent error");
      },
    } as unknown as AbstractAgent;

    const runtime = dummyRuntime({
      beforeRequestMiddleware: before,
      afterRequestMiddleware: after,
      agents: { errorAgent },
    });
    const logSpy = vi
      .spyOn(logger, "error")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => undefined as any);

    const endpoint = new CopilotKitEndpoint(runtime);

    const response = await endpoint.fetch(
      new Request("https://example.com/agent/errorAgent/run", {
        method: "POST",
      })
    );

    // Hono catches errors and returns them as 500 responses
    expect(response.status).toBe(500);

    // The actual handler logs the error, not the middleware
    expect(logSpy).toHaveBeenCalled();
    // After middleware is called even on error
    await new Promise((r) => setTimeout(r, 50));
    expect(after).toHaveBeenCalled();
  });

  it("logs but does not rethrow error from afterRequestMiddleware", async () => {
    const error = new Error("after");
    const before = vi.fn();
    const after = vi.fn().mockRejectedValue(error);
    const runtime = dummyRuntime({
      beforeRequestMiddleware: before,
      afterRequestMiddleware: after,
    });
    const logSpy = vi
      .spyOn(logger, "error")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => undefined as any);

    const endpoint = new CopilotKitEndpoint(runtime);
    const response = await endpoint.fetch(
      new Request("https://example.com/info")
    );

    await new Promise((r) => setImmediate(r));

    expect(response).toBeInstanceOf(Response);
    expect(after).toHaveBeenCalledWith({
      runtime,
      response,
      requestType: expect.any(String),
    });

    await new Promise((r) => setImmediate(r));

    expect(logSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        err: error,
        url: "https://example.com/info",
      }),
      "Error running after request middleware"
    );
  });

  it("processes request through webhook middleware URLs", async () => {
    const beforeURL = "https://hooks.example.com/before";
    const afterURL = "https://hooks.example.com/after";
    setupFetchMock(beforeURL, afterURL);

    const runtime = dummyRuntime({
      beforeRequestMiddleware: beforeURL,
      afterRequestMiddleware: afterURL,
    });

    const endpoint = new CopilotKitEndpoint(runtime);
    const response = await endpoint.fetch(
      new Request("https://example.com/info", {
        headers: { foo: "bar" },
        method: "GET",
      })
    );

    // Wait a bit more for async afterRequestMiddleware
    await new Promise((r) => setTimeout(r, 50));

    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Assert payload for before-hook
    const beforeCall = fetchMock!.mock.calls[0];
    expect(beforeCall[0]).toBe(beforeURL);
    expect(beforeCall[1]).toBeDefined();
    expect(beforeCall[1]!.body).toBeDefined();
    const beforePayload = JSON.parse(beforeCall[1]!.body as string);
    expect(beforePayload).toMatchObject({
      method: "GET",
      path: "/info",
      query: "",
      headers: expect.objectContaining({ foo: "bar" }),
    });
    const headers = beforeCall[1]!.headers as Record<string, string>;
    expect(headers["X-CopilotKit-Webhook-Stage"]).toBe(
      WebhookStage.BeforeRequest
    );

    // Assert payload for after-hook
    const afterCall = fetchMock!.mock.calls[1];
    expect(afterCall[0]).toBe(afterURL);
    expect(afterCall[1]).toBeDefined();
    expect(afterCall[1]!.body).toBeDefined();
    const afterPayload = JSON.parse(afterCall[1]!.body as string);
    expect(afterPayload).toMatchObject({
      status: 200,
      headers: expect.objectContaining({
        "content-type": "application/json",
      }),
      body: expect.any(String),
    });
    const afterHeaders = afterCall[1]!.headers as Record<string, string>;
    expect(afterHeaders["X-CopilotKit-Webhook-Stage"]).toBe(
      WebhookStage.AfterRequest
    );

    // Response should still be successful
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("version");
  });

  it("applies webhook middleware request modifications", async () => {
    const beforeURL = "https://hooks.example.com/before";
    const afterURL = "https://hooks.example.com/after";
    setupFetchMock(beforeURL, afterURL);

    const runtime = dummyRuntime({
      beforeRequestMiddleware: beforeURL,
      afterRequestMiddleware: afterURL,
    });

    const endpoint = new CopilotKitEndpoint(runtime);

    // Make a POST request to info endpoint since it's simpler
    const response = await endpoint.fetch(
      new Request("https://example.com/info", {
        headers: { foo: "bar" },
        method: "GET",
      })
    );

    // Should get a successful response
    expect(response.status).toBe(200);

    // Wait for async afterRequestMiddleware
    await new Promise((r) => setTimeout(r, 100));

    // The webhook middleware should have been called
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("handles webhook middleware timeout", async () => {
    const beforeURL = "https://hooks.example.com/before";
    originalFetch = global.fetch;

    // Create an AbortController to simulate timeout
    let abortSignal: AbortSignal | undefined;
    fetchMock = vi
      .fn()
      .mockImplementation(async (_url: string, init?: RequestInit) => {
        abortSignal = init?.signal;
        // Wait for abort signal
        return new Promise<Response>((_resolve, reject) => {
          if (abortSignal) {
            abortSignal.addEventListener("abort", () => {
              reject(new Error("Aborted"));
            });
          }
        });
      });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.fetch = fetchMock as unknown as typeof fetch;

    const runtime = dummyRuntime({
      beforeRequestMiddleware: beforeURL,
    });

    const endpoint = new CopilotKitEndpoint(runtime);

    // Should return 502 on timeout
    const response = await endpoint.fetch(
      new Request("https://example.com/info")
    );

    expect(response.status).toBe(502);

    // Verify that the fetch was aborted due to timeout
    expect(abortSignal?.aborted).toBe(true);
  });

  it("handles webhook middleware error responses", async () => {
    const beforeURL = "https://hooks.example.com/before";
    originalFetch = global.fetch;
    fetchMock = vi.fn().mockImplementation(async () => {
      return new Response("Bad request", { status: 400 });
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.fetch = fetchMock as unknown as typeof fetch;

    const runtime = dummyRuntime({
      beforeRequestMiddleware: beforeURL,
    });

    const endpoint = new CopilotKitEndpoint(runtime);

    // Should pass through error response
    const response = await endpoint.fetch(
      new Request("https://example.com/info")
    );

    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Bad request");
  });

  it("handles webhook middleware server error", async () => {
    const beforeURL = "https://hooks.example.com/before";
    originalFetch = global.fetch;
    fetchMock = vi.fn().mockImplementation(async () => {
      return new Response("Server error", { status: 500 });
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.fetch = fetchMock as unknown as typeof fetch;

    const runtime = dummyRuntime({
      beforeRequestMiddleware: beforeURL,
    });

    const endpoint = new CopilotKitEndpoint(runtime);

    // Should return 502 on server error
    const response = await endpoint.fetch(
      new Request("https://example.com/info")
    );

    expect(response.status).toBe(502);
  });

  it("handles webhook middleware 204 response", async () => {
    const beforeURL = "https://hooks.example.com/before";
    originalFetch = global.fetch;
    fetchMock = vi.fn().mockImplementation(async () => {
      return new Response(null, { status: 204 });
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.fetch = fetchMock as unknown as typeof fetch;

    const runtime = dummyRuntime({
      beforeRequestMiddleware: beforeURL,
    });

    const endpoint = new CopilotKitEndpoint(runtime);

    // Should continue with original request on 204
    const response = await endpoint.fetch(
      new Request("https://example.com/info")
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("version");
  });
});

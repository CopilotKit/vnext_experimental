import { runHandlerWithMiddlewareAndLogging } from "../endpoint";
import { CopilotKitRuntime } from "../runtime";
import { CopilotKitRequestType } from "../handler";
import { logger } from "@copilotkit/shared";
import type { AbstractAgent } from "@ag-ui/client";
import { WebhookStage } from "../middleware";

const dummyRuntime = (opts: Partial<CopilotKitRuntime> = {}) => {
  const runtime = new CopilotKitRuntime({
    agents: { agent: {} as unknown as AbstractAgent },
    ...opts,
  });
  return runtime;
};

describe("runHandlerWithMiddlewareAndLogging", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    // restore global fetch if it was mocked
    if (fetchMock) {
      global.fetch = originalFetch;
    }
  });

  let originalFetch: typeof fetch;
  let fetchMock: jest.Mock | null = null;

  const setupFetchMock = (beforeUrl: string, afterUrl: string) => {
    originalFetch = global.fetch;
    fetchMock = jest.fn(async (url: string) => {
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
    const originalRequest = new Request("https://example.com/test");
    const modifiedRequest = new Request("https://example.com/modified");

    const before = jest.fn().mockResolvedValue(modifiedRequest);
    const after = jest.fn().mockResolvedValue(undefined);
    const handler = jest.fn(async ({ request }) => new Response(request.url));

    const runtime = dummyRuntime({
      beforeRequestMiddleware: before,
      afterRequestMiddleware: after,
    });

    const response = await runHandlerWithMiddlewareAndLogging({
      runtime,
      request: originalRequest,
      requestType: CopilotKitRequestType.GetInfo,
      handler,
    });

    expect(before).toHaveBeenCalledWith({
      runtime,
      request: originalRequest,
      requestType: CopilotKitRequestType.GetInfo,
    });
    expect(handler).toHaveBeenCalledWith({ request: modifiedRequest });
    expect(after).toHaveBeenCalledWith({
      runtime,
      response,
      requestType: CopilotKitRequestType.GetInfo,
    });
    expect(await response.text()).toBe(modifiedRequest.url);
  });

  it("logs and rethrows error from beforeRequestMiddleware", async () => {
    const error = new Error("before");
    const before = jest.fn().mockRejectedValue(error);
    const handler = jest.fn();
    const after = jest.fn();
    const runtime = dummyRuntime({
      beforeRequestMiddleware: before,
      afterRequestMiddleware: after,
    });
    const logSpy = jest
      .spyOn(logger, "error")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => undefined as any);

    await expect(
      runHandlerWithMiddlewareAndLogging({
        runtime,
        request: new Request("https://example.com/test"),
        requestType: CopilotKitRequestType.GetInfo,
        handler,
      }),
    ).rejects.toThrow(error);

    expect(logSpy).toHaveBeenCalledWith(
      {
        err: error,
        url: "https://example.com/test",
        requestType: CopilotKitRequestType.GetInfo,
      },
      "Error running before request middleware",
    );
    expect(handler).not.toHaveBeenCalled();
    expect(after).not.toHaveBeenCalled();
  });

  it("logs and rethrows error from handler", async () => {
    const error = new Error("handler");
    const before = jest.fn();
    const handler = jest.fn().mockRejectedValue(error);
    const after = jest.fn();
    const runtime = dummyRuntime({
      beforeRequestMiddleware: before,
      afterRequestMiddleware: after,
    });
    const logSpy = jest
      .spyOn(logger, "error")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => undefined as any);

    await expect(
      runHandlerWithMiddlewareAndLogging({
        runtime,
        request: new Request("https://example.com/test"),
        requestType: CopilotKitRequestType.GetInfo,
        handler,
      }),
    ).rejects.toThrow(error);

    expect(logSpy).toHaveBeenCalledWith(
      {
        err: error,
        url: "https://example.com/test",
        requestType: CopilotKitRequestType.GetInfo,
      },
      "Error running request handler",
    );
    expect(after).not.toHaveBeenCalled();
  });

  it("logs but does not rethrow error from afterRequestMiddleware", async () => {
    const error = new Error("after");
    const before = jest.fn();
    const handler = jest.fn().mockResolvedValue(new Response("ok"));
    const after = jest.fn().mockRejectedValue(error);
    const runtime = dummyRuntime({
      beforeRequestMiddleware: before,
      afterRequestMiddleware: after,
    });
    const logSpy = jest
      .spyOn(logger, "error")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation(() => undefined as any);

    const response = await runHandlerWithMiddlewareAndLogging({
      runtime,
      request: new Request("https://example.com/test"),
      requestType: CopilotKitRequestType.GetInfo,
      handler,
    });

    await new Promise((r) => setImmediate(r));

    expect(response).toBeInstanceOf(Response);
    expect(after).toHaveBeenCalledWith({
      runtime,
      response,
      requestType: CopilotKitRequestType.GetInfo,
    });

    await new Promise((r) => setImmediate(r));

    expect(logSpy).toHaveBeenCalledWith(
      {
        err: error,
        url: "https://example.com/test",
        requestType: CopilotKitRequestType.GetInfo,
      },
      "Error running after request middleware",
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

    const response = await runHandlerWithMiddlewareAndLogging({
      runtime,
      request: new Request("https://example.com/original?x=1", {
        headers: { foo: "bar" },
        body: JSON.stringify({ original: true }),
        method: "POST",
      }),
      requestType: CopilotKitRequestType.GetInfo,
      handler: async ({ request }) => {
        const body = await request.json();
        return new Response(
          JSON.stringify({
            header: request.headers.get("x-modified"),
            body,
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
    });

    await new Promise((r) => setImmediate(r));

    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Assert payload for before-hook
    const beforeCall = fetchMock!.mock.calls[0];
    expect(beforeCall[0]).toBe(beforeURL);
    const beforePayload = JSON.parse(beforeCall[1].body);
    expect(beforeCall[1].headers["X-CopilotKit-Webhook-Stage"]).toBe(
      WebhookStage.BeforeRequest,
    );
    expect(beforePayload.method).toBe("POST");
    expect(beforePayload.path).toBe("/original");
    expect(beforePayload.query).toBe("x=1");

    // Assert payload for after-hook
    const afterCall = fetchMock!.mock.calls[1];
    expect(afterCall[0]).toBe(afterURL);
    const afterPayload = JSON.parse(afterCall[1].body);
    expect(afterCall[1].headers["X-CopilotKit-Webhook-Stage"]).toBe(
      WebhookStage.AfterRequest,
    );
    expect(afterPayload.status).toBe(200);

    const output = await response.json();
    expect(output).toEqual({ header: "yes", body: { foo: "bar" } });
  });

  it("forwards original request when webhook returns 204", async () => {
    const beforeURL = "https://hooks.example.com/before-204";
    const afterURL = "https://hooks.example.com/after";
    originalFetch = global.fetch;
    fetchMock = jest.fn(async (url: string) => {
      if (url === beforeURL) {
        return new Response(null, { status: 204 });
      }
      if (url === afterURL) {
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.fetch = fetchMock as unknown as typeof fetch;

    const runtime = dummyRuntime({
      beforeRequestMiddleware: beforeURL,
      afterRequestMiddleware: afterURL,
    });

    const handler = jest.fn(async ({ request }) => new Response(request.url));

    const request = new Request("https://example.com/test");
    const response = await runHandlerWithMiddlewareAndLogging({
      runtime,
      request,
      requestType: CopilotKitRequestType.GetInfo,
      handler,
    });

    expect(handler).toHaveBeenCalledWith({ request });

    await new Promise((r) => setImmediate(r));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("https://example.com/test");
  });

  it("returns 4xx response from before webhook to client", async () => {
    const beforeURL = "https://hooks.example.com/before-4xx";
    originalFetch = global.fetch;
    fetchMock = jest.fn(async (url: string) => {
      if (url === beforeURL) {
        return new Response(JSON.stringify({ error: "nope" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.fetch = fetchMock as unknown as typeof fetch;

    const runtime = dummyRuntime({
      beforeRequestMiddleware: beforeURL,
    });

    const handler = jest.fn();
    const response = await runHandlerWithMiddlewareAndLogging({
      runtime,
      request: new Request("https://example.com/deny"),
      requestType: CopilotKitRequestType.GetInfo,
      handler,
    });

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "nope" });
  });

  it("returns 502 when before webhook fails", async () => {
    const beforeURL = "https://hooks.example.com/before-fail";
    originalFetch = global.fetch;
    fetchMock = jest.fn(async (url: string) => {
      if (url === beforeURL) {
        return new Response(null, { status: 500 });
      }
      throw new Error(`Unexpected fetch URL: ${url}`);
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.fetch = fetchMock as unknown as typeof fetch;

    const runtime = dummyRuntime({
      beforeRequestMiddleware: beforeURL,
    });

    const response = await runHandlerWithMiddlewareAndLogging({
      runtime,
      request: new Request("https://example.com/fail"),
      requestType: CopilotKitRequestType.GetInfo,
      handler: jest.fn(),
    });

    expect(response.status).toBe(502);
  });

  it("supports Response throwing from function middleware", async () => {
    const before = jest.fn(() => {
      throw new Response("blocked", { status: 401 });
    });
    const runtime = dummyRuntime({
      beforeRequestMiddleware: before,
    });

    const handler = jest.fn();
    const response = await runHandlerWithMiddlewareAndLogging({
      runtime,
      request: new Request("https://example.com/func-block"),
      requestType: CopilotKitRequestType.GetInfo,
      handler,
    });

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    expect(await response.text()).toBe("blocked");
  });

  it("keeps request unchanged when function middleware returns void", async () => {
    const before = jest.fn().mockResolvedValue(undefined);
    const runtime = dummyRuntime({ beforeRequestMiddleware: before });

    const handler = jest.fn(async ({ request }) => new Response(request.url));
    const request = new Request("https://example.com/original");
    const response = await runHandlerWithMiddlewareAndLogging({
      runtime,
      request,
      requestType: CopilotKitRequestType.GetInfo,
      handler,
    });

    expect(before).toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith({ request });
    expect(await response.text()).toBe("https://example.com/original");
  });
});

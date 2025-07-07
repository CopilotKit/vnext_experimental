import { runHandlerWithMiddlewareAndLogging } from "../endpoint";
import { CopilotKitRuntime } from "../runtime";
import { CopilotKitRequestType } from "../handler";
import { logger } from "../logger";
import type { AbstractAgent } from "@ag-ui/client";
import { CopilotKitMiddlewareEvent } from "../middleware";

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

  const setupFetchMock = (
    beforeUrl: string,
    afterUrl: string,
    modifiedReqUrl: string
  ) => {
    originalFetch = global.fetch;
    fetchMock = jest.fn(async (url: string) => {
      if (url === beforeUrl) {
        const body = {
          request: {
            url: modifiedReqUrl,
            method: "GET",
            headers: {},
            body: undefined,
          },
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
      })
    ).rejects.toThrow(error);

    expect(logSpy).toHaveBeenCalledWith(
      {
        err: error,
        url: "https://example.com/test",
        requestType: CopilotKitRequestType.GetInfo,
      },
      "Error running before request middleware"
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
      })
    ).rejects.toThrow(error);

    expect(logSpy).toHaveBeenCalledWith(
      {
        err: error,
        url: "https://example.com/test",
        requestType: CopilotKitRequestType.GetInfo,
      },
      "Error running request handler"
    );
    expect(after).not.toHaveBeenCalled();
  });

  it("logs and rethrows error from afterRequestMiddleware", async () => {
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

    await expect(
      runHandlerWithMiddlewareAndLogging({
        runtime,
        request: new Request("https://example.com/test"),
        requestType: CopilotKitRequestType.GetInfo,
        handler,
      })
    ).rejects.toThrow(error);

    expect(logSpy).toHaveBeenCalledWith(
      {
        err: error,
        url: "https://example.com/test",
        requestType: CopilotKitRequestType.GetInfo,
      },
      "Error running after request middleware"
    );
  });

  it("processes request through webhook middleware URLs", async () => {
    const beforeURL = "https://hooks.example.com/before";
    const afterURL = "https://hooks.example.com/after";
    const modifiedURL = "https://example.com/modified";

    setupFetchMock(beforeURL, afterURL, modifiedURL);

    const runtime = dummyRuntime({
      beforeRequestMiddleware: beforeURL,
      afterRequestMiddleware: afterURL,
    });

    const response = await runHandlerWithMiddlewareAndLogging({
      runtime,
      request: new Request("https://example.com/original"),
      requestType: CopilotKitRequestType.GetInfo,
      handler: async ({ request }) => new Response(request.url),
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Assert payload for before-hook
    const beforeCall = fetchMock!.mock.calls[0];
    expect(beforeCall[0]).toBe(beforeURL);
    const beforePayload = JSON.parse(beforeCall[1].body);
    expect(beforePayload.event).toBe(CopilotKitMiddlewareEvent.BeforeRequest);

    // Assert payload for after-hook
    const afterCall = fetchMock!.mock.calls[1];
    expect(afterCall[0]).toBe(afterURL);
    const afterPayload = JSON.parse(afterCall[1].body);
    expect(afterPayload.event).toBe(CopilotKitMiddlewareEvent.AfterRequest);

    expect(await response.text()).toBe(modifiedURL);
  });
});

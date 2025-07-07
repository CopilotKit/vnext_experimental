import { runHandlerWithMiddlewareAndLogging } from "../endpoint";
import { CopilotKitRuntime } from "../runtime";
import { CopilotKitRequestType } from "../handler";
import { logger } from "../logger";
import type { AbstractAgent } from "@ag-ui/client";

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
  });

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
      { err: error, url: "https://example.com/test", requestType: CopilotKitRequestType.GetInfo },
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
      { err: error, url: "https://example.com/test", requestType: CopilotKitRequestType.GetInfo },
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
      { err: error, url: "https://example.com/test", requestType: CopilotKitRequestType.GetInfo },
      "Error running after request middleware"
    );
  });
});


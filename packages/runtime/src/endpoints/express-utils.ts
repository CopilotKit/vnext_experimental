import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { Readable } from "node:stream";
import { pipeline } from "node:stream";
import { promisify } from "node:util";

const streamPipeline = promisify(pipeline);

const METHODS_WITHOUT_BODY = new Set(["GET", "HEAD"]);

export function createFetchRequestFromExpress(req: ExpressRequest): Request {
  const method = req.method?.toUpperCase() ?? "GET";
  const origin = buildOrigin(req);
  const url = `${origin}${req.originalUrl ?? req.url ?? ""}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      value.forEach((v) => headers.append(key, v));
    } else {
      headers.set(key, value);
    }
  }

  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
  };

  if (!METHODS_WITHOUT_BODY.has(method)) {
    init.body = Readable.toWeb(req) as unknown as BodyInit;
    init.duplex = "half";
  }

  const controller = new AbortController();
  req.on("close", () => controller.abort());
  init.signal = controller.signal;

  return new Request(url, init);
}

export async function sendFetchResponse(res: ExpressResponse, response: Response): Promise<void> {
  res.status(response.status);

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "content-length" && response.body !== null) {
      return;
    }
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  const nodeStream = Readable.fromWeb(response.body as unknown as ReadableStream<Uint8Array>);
  try {
    await streamPipeline(nodeStream, res);
  } catch (error) {
    res.destroy(error as Error);
    throw error;
  }
}

function buildOrigin(req: ExpressRequest): string {
  const protocol = req.protocol || (req.secure ? "https" : "http");
  const host = req.get("host") ?? "localhost";
  return `${protocol}://${host}`;
}

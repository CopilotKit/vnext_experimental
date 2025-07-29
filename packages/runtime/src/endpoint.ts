import { Hono, Context } from "hono";
import { CopilotRuntime } from "./runtime";
import { handleRunAgent } from "./handlers/handle-run";
import { handleGetRuntimeInfo } from "./handlers/get-runtime-info";
import { handleTranscribe } from "./handlers/handle-transcribe";
import { CopilotKitRequestType } from "./handler";
import { logger } from "@copilotkit/shared";
import {
  callBeforeRequestMiddleware,
  callAfterRequestMiddleware,
} from "./middleware";

interface CopilotEndpointParams {
  runtime: CopilotRuntime;
  basePath: string;
}

export function createCopilotEndpoint({
  runtime,
  basePath,
}: CopilotEndpointParams) {
  return new Hono()
    .basePath(basePath)
    .post("/agent/:agentId/run", async (c) => {
      console.log("POST /agent/:agentId/run");
      const agentId = c.req.param("agentId");
      return handleWithMiddleware(
        c,
        runtime,
        CopilotKitRequestType.RunAgent,
        async (request) => {
          return handleRunAgent({
            runtime,
            request,
            agentId,
          });
        }
      );
    })
    .get("/info", async (c) => {
      return handleWithMiddleware(
        c,
        runtime,
        CopilotKitRequestType.GetRuntimeInfo,
        async (request) => {
          return handleGetRuntimeInfo({
            runtime,
            request,
          });
        }
      );
    })
    .post("/transcribe", async (c) => {
      return handleWithMiddleware(
        c,
        runtime,
        CopilotKitRequestType.Transcribe,
        async (request) => {
          return handleTranscribe({
            runtime,
            request,
          });
        }
      );
    })
    .notFound((c) => {
      return c.json({ error: "Not found" }, 404);
    });
}

async function handleWithMiddleware(
  c: Context,
  runtime: CopilotRuntime,
  requestType: CopilotKitRequestType,
  handler: (request: Request) => Promise<Response>
): Promise<Response> {
  let request = c.req.raw;

  try {
    // Call before middleware
    const maybeModifiedRequest = await callBeforeRequestMiddleware({
      runtime,
      request,
      requestType,
    });
    if (maybeModifiedRequest) {
      request = maybeModifiedRequest;
    }
  } catch (error) {
    logger.error(
      { err: error, url: request.url, requestType },
      "Error running before request middleware"
    );
    if (error instanceof Response) {
      return error;
    }
    throw error;
  }

  let response: Response;
  try {
    // Call the actual handler
    response = await handler(request);
  } catch (error) {
    logger.error(
      { err: error, url: request.url, requestType },
      "Error running request handler"
    );
    throw error;
  }

  // Call after middleware (don't await to avoid blocking response)
  callAfterRequestMiddleware({
    runtime,
    response,
    requestType,
  }).catch((error) => {
    logger.error(
      { err: error, url: request.url, requestType },
      "Error running after request middleware"
    );
  });

  return response;
}

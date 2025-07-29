import { Hono, Context } from "hono";
import { CopilotKitRuntime } from "./runtime";
import { handleRunAgent } from "./handlers/handle-run";
import { handleGetRuntimeInfo } from "./handlers/get-runtime-info";
import { handleTranscribe } from "./handlers/handle-transcribe";
import { CopilotKitRequestType } from "./handler";
import { logger } from "@copilotkit/shared";
import {
  callBeforeRequestMiddleware,
  callAfterRequestMiddleware,
} from "./middleware";

export class CopilotKitEndpoint extends Hono {
  private runtime: CopilotKitRuntime;

  constructor(runtime: CopilotKitRuntime) {
    super();
    this.runtime = runtime;
    
    // Set up routes
    this.setupRoutes();
  }

  private setupRoutes() {
    // Agent run endpoint
    this.post("/agent/:agentId/run", async (c) => {
      const agentId = c.req.param("agentId");
      return this.handleWithMiddleware(
        c,
        CopilotKitRequestType.RunAgent,
        async (request) => {
          return handleRunAgent({
            runtime: this.runtime,
            request,
            agentId,
          });
        }
      );
    });

    // Runtime info endpoint
    this.get("/info", async (c) => {
      return this.handleWithMiddleware(
        c,
        CopilotKitRequestType.GetRuntimeInfo,
        async (request) => {
          return handleGetRuntimeInfo({
            runtime: this.runtime,
            request,
          });
        }
      );
    });

    // Transcribe endpoint
    this.post("/transcribe", async (c) => {
      return this.handleWithMiddleware(
        c,
        CopilotKitRequestType.Transcribe,
        async (request) => {
          return handleTranscribe({
            runtime: this.runtime,
            request,
          });
        }
      );
    });

    // 404 handler for unmatched routes
    this.notFound((c) => {
      return c.json({ error: "Not found" }, 404);
    });
  }

  private async handleWithMiddleware(
    c: Context,
    requestType: CopilotKitRequestType,
    handler: (request: Request) => Promise<Response>
  ): Promise<Response> {
    let request = c.req.raw;

    try {
      // Call before middleware
      const maybeModifiedRequest = await callBeforeRequestMiddleware({
        runtime: this.runtime,
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
      runtime: this.runtime, 
      response, 
      requestType 
    }).catch((error) => {
      logger.error(
        { err: error, url: request.url, requestType },
        "Error running after request middleware"
      );
    });

    return response;
  }
}

export function createEndpoint(runtime: CopilotKitRuntime) {
  const endpoint = new CopilotKitEndpoint(runtime);
  // Return the Hono app's fetch handler
  return (request: Request, ...args: unknown[]) => endpoint.fetch(request, ...args);
}

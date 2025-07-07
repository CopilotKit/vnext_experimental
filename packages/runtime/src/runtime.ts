import { MaybePromise, NonEmptyRecord } from "@copilotkit/shared";
import { AbstractAgent } from "@ag-ui/client";
import pkg from "../package.json";
import {
  CopilotKitRequestHandler,
  CopilotKitRequestHandlerType,
} from "./handler";
import { logger } from "./logger";

export const VERSION = pkg.version;

interface BeforeRequestMiddlewareParameters {
  runtime: CopilotKitRuntime;
  request: Request;
  handlerType: CopilotKitRequestHandlerType;
}
interface AfterRequestMiddlewareParameters {
  runtime: CopilotKitRuntime;
  response: Response;
  handlerType: CopilotKitRequestHandlerType;
}

type BeforeRequestMiddleware = (
  params: BeforeRequestMiddlewareParameters
) => MaybePromise<Request | void>;

type AfterRequestMiddleware = (
  params: AfterRequestMiddlewareParameters
) => MaybePromise<void>;

interface CopilotKitRuntimeOptions {
  agents: MaybePromise<NonEmptyRecord<Record<string, AbstractAgent>>>;
  beforeRequestMiddleware?: BeforeRequestMiddleware;
  afterRequestMiddleware?: AfterRequestMiddleware;
}

export class CopilotKitRuntime {
  public agents: CopilotKitRuntimeOptions["agents"];
  public beforeRequestMiddleware: CopilotKitRuntimeOptions["beforeRequestMiddleware"];
  public afterRequestMiddleware: CopilotKitRuntimeOptions["afterRequestMiddleware"];

  constructor({
    agents,
    beforeRequestMiddleware,
    afterRequestMiddleware,
  }: CopilotKitRuntimeOptions) {
    this.agents = agents;
    this.beforeRequestMiddleware = beforeRequestMiddleware;
    this.afterRequestMiddleware = afterRequestMiddleware;
  }

  async runHandlerWithMiddleware({
    request,
    handlerType,
    handler,
  }: {
    request: Request;
    handlerType: CopilotKitRequestHandlerType;
    handler: CopilotKitRequestHandler;
  }) {
    if (this.beforeRequestMiddleware) {
      try {
        const maybeModifiedRequest = await this.beforeRequestMiddleware({
          runtime: this,
          request,
          handlerType,
        });
        if (maybeModifiedRequest) {
          request = maybeModifiedRequest;
        }
      } catch (error) {
        logger.error(
          { err: error, url: request.url, handlerType },
          "Error running before request middleware"
        );
        throw error;
      }
    }

    let response: Response;
    try {
      response = await handler({ runtime: this, request });
    } catch (error) {
      logger.error(
        { err: error, url: request.url, handlerType },
        "Error running request handler"
      );
      throw error;
    }

    if (this.afterRequestMiddleware) {
      try {
        await this.afterRequestMiddleware({
          runtime: this,
          response,
          handlerType,
        });
      } catch (error) {
        logger.error(
          { err: error, url: request.url, handlerType },
          "Error running after request middleware"
        );
        throw error;
      }
    }

    return response;
  }
}

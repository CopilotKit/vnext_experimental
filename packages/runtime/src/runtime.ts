import { MaybePromise, NonEmptyRecord } from "@copilotkit/shared";
import { AbstractAgent } from "@ag-ui/client";
import pkg from "../package.json";
import { CopilotKitRequestHandler, CopilotKitRequestType } from "./handler";
import { logger } from "./logger";

export const VERSION = pkg.version;

interface BeforeRequestMiddlewareParameters {
  runtime: CopilotKitRuntime;
  request: Request;
  handlerType: CopilotKitRequestType;
}
interface AfterRequestMiddlewareParameters {
  runtime: CopilotKitRuntime;
  response: Response;
  handlerType: CopilotKitRequestType;
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
}

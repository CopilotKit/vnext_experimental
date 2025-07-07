import { MaybePromise, NonEmptyRecord } from "@copilotkit/shared";
import { AbstractAgent } from "@ag-ui/client";
import pkg from "../../package.json";
export const VERSION = pkg.version;

interface CopilotKitRuntimeOptions {
  agents: MaybePromise<NonEmptyRecord<Record<string, AbstractAgent>>>;
  beforeRequestMiddleware?: (
    runtime: CopilotKitRuntime,
    request: Request
  ) => MaybePromise<Request | void>;
  afterRequestMiddleware?: (
    runtime: CopilotKitRuntime,
    response: Response
  ) => MaybePromise<void>;
}

export default class CopilotKitRuntime {
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

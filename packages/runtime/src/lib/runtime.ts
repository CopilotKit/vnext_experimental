import { MaybePromise, NonEmptyRecord } from "@copilotkit/shared";
import { AbstractAgent } from "@ag-ui/client";

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
  private agents: MaybePromise<NonEmptyRecord<Record<string, AbstractAgent>>>;
  public beforeRequestMiddleware?: (
    runtime: CopilotKitRuntime,
    request: Request
  ) => MaybePromise<Request | void>;
  public afterRequestMiddleware?: (
    runtime: CopilotKitRuntime,
    response: Response
  ) => MaybePromise<void>;

  constructor({
    agents,
    beforeRequestMiddleware,
    afterRequestMiddleware,
  }: CopilotKitRuntimeOptions) {
    this.agents = agents;
    this.beforeRequestMiddleware = beforeRequestMiddleware;
    this.afterRequestMiddleware = afterRequestMiddleware;
  }

  getAgents(): MaybePromise<NonEmptyRecord<Record<string, AbstractAgent>>> {
    return this.agents;
  }
}

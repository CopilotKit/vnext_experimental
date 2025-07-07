import { MaybePromise, NonEmptyRecord } from "@copilotkit/shared";
import { AbstractAgent } from "@ag-ui/client";
import pkg from "../package.json";
import type {
  BeforeRequestMiddleware,
  AfterRequestMiddleware,
} from "./middleware";

export const VERSION = pkg.version;

/**
 * Options used to construct a `CopilotKitRuntime` instance.
 */
export interface CopilotKitRuntimeOptions {
  /** Map of available agents (loaded lazily is fine). */
  agents: MaybePromise<NonEmptyRecord<Record<string, AbstractAgent>>>;
  /** Optional *before* middleware – callback function or webhook URL. */
  beforeRequestMiddleware?: BeforeRequestMiddleware;
  /** Optional *after* middleware – callback function or webhook URL. */
  afterRequestMiddleware?: AfterRequestMiddleware;
}

/**
 * Central runtime object passed to all request handlers.
 */
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

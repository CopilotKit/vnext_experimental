import { MaybePromise, NonEmptyRecord } from "@copilotkit/shared";
import { AbstractAgent } from "@ag-ui/client";
import pkg from "../package.json";
import type {
  BeforeRequestMiddleware,
  AfterRequestMiddleware,
} from "./middleware";
import { TranscriptionService } from "./transcription-service/transcription-service";

export const VERSION = pkg.version;

/**
 * Options used to construct a `CopilotRuntime` instance.
 */
export interface CopilotRuntimeOptions {
  /** Map of available agents (loaded lazily is fine). */
  agents: MaybePromise<NonEmptyRecord<Record<string, AbstractAgent>>>;
  /** Optional transcription service for audio processing. */
  transcriptionService?: TranscriptionService;
  /** Optional *before* middleware – callback function or webhook URL. */
  beforeRequestMiddleware?: BeforeRequestMiddleware;
  /** Optional *after* middleware – callback function or webhook URL. */
  afterRequestMiddleware?: AfterRequestMiddleware;
}

/**
 * Central runtime object passed to all request handlers.
 */
export class CopilotRuntime {
  public agents: CopilotRuntimeOptions["agents"];
  public transcriptionService: CopilotRuntimeOptions["transcriptionService"];
  public beforeRequestMiddleware: CopilotRuntimeOptions["beforeRequestMiddleware"];
  public afterRequestMiddleware: CopilotRuntimeOptions["afterRequestMiddleware"];

  constructor({
    agents,
    transcriptionService,
    beforeRequestMiddleware,
    afterRequestMiddleware,
  }: CopilotRuntimeOptions) {
    this.agents = agents;
    this.transcriptionService = transcriptionService;
    this.beforeRequestMiddleware = beforeRequestMiddleware;
    this.afterRequestMiddleware = afterRequestMiddleware;
  }
}

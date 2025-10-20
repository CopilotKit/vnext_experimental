import { AbstractAgent, BaseEvent, RunAgentInput } from "@ag-ui/client";
import { Observable } from "rxjs";
import { ThreadMetadata } from "@copilotkitnext/shared";

// Re-export ThreadMetadata for convenience
export type { ThreadMetadata };

/**
 * Resource scope for thread access control.
 *
 * @property resourceId - Primary isolation dimension (indexed, fast queries).
 *                        Can be a single string or array of strings for multi-resource access.
 * @property properties - Optional metadata (flexible, slower JSON queries).
 */
export interface ResourceScope {
  resourceId: string | string[];
  properties?: Record<string, any>;
}

export interface AgentRunnerRunRequest {
  threadId: string;
  agent: AbstractAgent;
  input: RunAgentInput;
  scope?: ResourceScope | null;
}

export interface AgentRunnerConnectRequest {
  threadId: string;
  scope?: ResourceScope | null;
}

export interface AgentRunnerIsRunningRequest {
  threadId: string;
}

export interface AgentRunnerStopRequest {
  threadId: string;
}

export interface AgentRunnerListThreadsRequest {
  scope?: ResourceScope | null;
  limit?: number;
  offset?: number;
}

export interface AgentRunnerListThreadsResponse {
  threads: ThreadMetadata[];
  total: number;
}

export abstract class AgentRunner {
  abstract run(request: AgentRunnerRunRequest): Observable<BaseEvent>;
  abstract connect(request: AgentRunnerConnectRequest): Observable<BaseEvent>;
  abstract isRunning(request: AgentRunnerIsRunningRequest): Promise<boolean>;
  abstract stop(request: AgentRunnerStopRequest): Promise<boolean | undefined>;
  abstract listThreads(request: AgentRunnerListThreadsRequest): Promise<AgentRunnerListThreadsResponse>;
  abstract getThreadMetadata(threadId: string, scope?: ResourceScope | null): Promise<ThreadMetadata | null>;
  abstract deleteThread(threadId: string, scope?: ResourceScope | null): Promise<void>;
}

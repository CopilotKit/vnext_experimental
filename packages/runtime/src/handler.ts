import { CopilotKitRuntime } from "./runtime";

export type CopilotKitRequestHandler = (params: {
  runtime: CopilotKitRuntime;
  request: Request;
}) => Promise<Response>;

export enum CopilotKitRequestHandlerType {
  RunAgent = "RUN_AGENT",
  GetAgents = "GET_AGENTS",
  GetInfo = "GET_INFO",
}

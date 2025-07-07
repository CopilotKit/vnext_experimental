export type CopilotKitRequestHandler = (params: {
  request: Request;
}) => Promise<Response>;

export enum CopilotKitRequestType {
  RunAgent = "RUN_AGENT",
  GetAgents = "GET_AGENTS",
  GetInfo = "GET_INFO",
}

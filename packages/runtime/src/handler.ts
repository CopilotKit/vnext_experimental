export type CopilotKitRequestHandler = (params: {
  request: Request;
}) => Promise<Response>;

export enum CopilotKitRequestHandlerType {
  RunAgent = "RUN_AGENT",
  GetAgents = "GET_AGENTS",
  GetInfo = "GET_INFO",
}

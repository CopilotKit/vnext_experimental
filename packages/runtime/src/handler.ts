export type CopilotKitRequestHandler = (params: {
  request: Request;
}) => Promise<Response>;

export enum CopilotKitRequestType {
  RunAgent = "RUN_AGENT",
  GetRuntimeInfo = "GET_RUNTIME_INFO",
  Transcribe = "TRANSCRIBE",
}

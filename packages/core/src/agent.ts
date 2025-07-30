import {
  BaseEvent,
  HttpAgent,
  HttpAgentConfig,
  RunAgentInput,
  runHttpRequest,
  transformHttpEventStream,
} from "@ag-ui/client";
import { Observable } from "rxjs";

export interface CopilotKitHttpAgentConfig
  extends Omit<HttpAgentConfig, "url"> {
  runtimeUrl?: string;
}

export class CopilotKitHttpAgent extends HttpAgent {
  runtimeUrl?: string;

  constructor(config: CopilotKitHttpAgentConfig) {
    super({
      ...config,
      url: `${config.runtimeUrl}/agent/${config.agentId}/run`,
    });
    this.runtimeUrl = config.runtimeUrl;
  }

  run(input: RunAgentInput): Observable<BaseEvent> {
    const url = (input.forwardedProps.__overrideUrl ?? this.url) as string;
    const httpEvents = runHttpRequest(url, this.requestInit(input));
    return transformHttpEventStream(httpEvents);
  }
}

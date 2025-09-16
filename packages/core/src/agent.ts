import {
  BaseEvent,
  HttpAgent,
  HttpAgentConfig,
  RunAgentInput,
  runHttpRequest,
  transformHttpEventStream,
} from "@ag-ui/client";
import { Observable } from "rxjs";

export interface CopilotRuntimeAgentConfig
  extends Omit<HttpAgentConfig, "url"> {
  runtimeUrl?: string;
}

export class CopilotRuntimeAgent extends HttpAgent {
  runtimeUrl?: string;

  constructor(config: CopilotRuntimeAgentConfig) {
    super({
      ...config,
      url: `${config.runtimeUrl}/agent/${config.agentId}/run`,
    });
    this.runtimeUrl = config.runtimeUrl;
  }

  run(input: RunAgentInput): Observable<BaseEvent> {
    const url = (
      input.forwardedProps.__copilotkitConnect === true
        ? `${this.runtimeUrl}/agent/${this.agentId}/connect`
        : this.url
    ) as string;
    const httpEvents = runHttpRequest(url, this.requestInit(input));
    return transformHttpEventStream(httpEvents);
  }
}

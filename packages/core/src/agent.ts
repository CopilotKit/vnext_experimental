import {
  BaseEvent,
  HttpAgent,
  HttpAgentConfig,
  RunAgentInput,
  runHttpRequest,
  transformHttpEventStream,
} from "@ag-ui/client";
import { Observable } from "rxjs";

export interface ProxiedCopilotRuntimeAgentConfig
  extends Omit<HttpAgentConfig, "url"> {
  runtimeUrl?: string;
}

export class ProxiedCopilotRuntimeAgent extends HttpAgent {
  runtimeUrl?: string;

  constructor(config: ProxiedCopilotRuntimeAgentConfig) {
    super({
      ...config,
      url: `${config.runtimeUrl}/agent/${config.agentId}/run`,
    });
    this.runtimeUrl = config.runtimeUrl;
  }

  connect(input: RunAgentInput): Observable<BaseEvent> {
    const httpEvents = runHttpRequest(
      `${this.runtimeUrl}/agent/${this.agentId}/connect`,
      this.requestInit(input)
    );
    return transformHttpEventStream(httpEvents);
  }
}

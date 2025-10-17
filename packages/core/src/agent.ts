import {
  BaseEvent,
  HttpAgent,
  HttpAgentConfig,
  RunAgentInput,
  runHttpRequest,
  transformHttpEventStream,
} from "@ag-ui/client";
import { Observable } from "rxjs";

export interface ProxiedCopilotRuntimeAgentConfig extends Omit<HttpAgentConfig, "url"> {
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

  abortRun(): void {
    if (!this.runtimeUrl || !this.agentId || !this.threadId) {
      return;
    }

    if (typeof fetch === "undefined") {
      return;
    }

    const stopPath = `${this.runtimeUrl}/agent/${encodeURIComponent(this.agentId)}/stop/${encodeURIComponent(this.threadId)}`;
    const origin = typeof window !== "undefined" && window.location ? window.location.origin : "http://localhost";
    const base = new URL(this.runtimeUrl, origin);
    const stopUrl = new URL(stopPath, base);

    void fetch(stopUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
      },
    }).catch((error) => {
      console.error("ProxiedCopilotRuntimeAgent: stop request failed", error);
    });
  }

  connect(input: RunAgentInput): Observable<BaseEvent> {
    const httpEvents = runHttpRequest(`${this.runtimeUrl}/agent/${this.agentId}/connect`, this.requestInit(input));
    return transformHttpEventStream(httpEvents);
  }
}

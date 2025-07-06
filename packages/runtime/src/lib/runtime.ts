import { AbstractAgent } from "@ag-ui/client";

type MaybePromise<T> = T | Promise<T>;

interface CopilotKitRuntimeOptions {
  agents: MaybePromise<Record<string, AbstractAgent>>;
}

export default class CopilotKitRuntime {
  private agents: MaybePromise<Record<string, AbstractAgent>>;

  constructor({ agents }: CopilotKitRuntimeOptions) {
    this.agents = agents;
  }
}

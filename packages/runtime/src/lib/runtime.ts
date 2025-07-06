import { MaybePromise, NonEmptyRecord } from "@copilotkit/shared";
import { AbstractAgent } from "@ag-ui/client";

interface CopilotKitRuntimeOptions {
  agents: MaybePromise<NonEmptyRecord<string, AbstractAgent>>;
}

export default class CopilotKitRuntime {
  private agents: MaybePromise<NonEmptyRecord<string, AbstractAgent>>;

  constructor({ agents }: CopilotKitRuntimeOptions) {
    this.agents = agents;
  }
}

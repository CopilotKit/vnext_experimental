import { ReactToolCallRender } from "@/types";
import { CopilotKitCore, CopilotKitCoreConfig, CopilotKitCoreSubscriber } from "@copilotkitnext/core";

export interface CopilotKitCoreReactConfig extends CopilotKitCoreConfig {
  // Add any additional configuration properties specific to the React implementation
  renderToolCalls: ReactToolCallRender<any>[];
}

export interface CopilotKitCoreReactSubscriber extends CopilotKitCoreSubscriber {
  onRenderToolCallsChanged?: (event: {
    copilotkit: CopilotKitCore;
    renderToolCalls: ReactToolCallRender<any>[];
  }) => void | Promise<void>;
}

export class CopilotKitCoreReact extends CopilotKitCore {
  private _renderToolCalls: ReactToolCallRender<any>[] = [];
  private _staticRenderToolCalls: ReactToolCallRender<any>[] = [];
  private reactSubscribers: Set<CopilotKitCoreReactSubscriber> = new Set();

  get renderToolCalls(): Readonly<ReactToolCallRender<any>>[] {
    return [...this._staticRenderToolCalls, ...this._renderToolCalls];
  }

  setRenderToolCalls(renderToolCalls: ReactToolCallRender<any>[]): void {
    this._renderToolCalls = renderToolCalls;

    this.reactSubscribers.forEach((subscriber) => {
      if (subscriber.onRenderToolCallsChanged) {
        subscriber.onRenderToolCallsChanged({
          copilotkit: this,
          renderToolCalls: this.renderToolCalls,
        });
      }
    });
  }

  subscribe(subscriber: CopilotKitCoreReactSubscriber): () => void {
    this.reactSubscribers.add(subscriber);
    super.subscribe(subscriber);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriber);
    };
  }

  unsubscribe(subscriber: CopilotKitCoreReactSubscriber): void {
    this.reactSubscribers.delete(subscriber);
    super.unsubscribe(subscriber);
  }

  constructor(config: CopilotKitCoreReactConfig) {
    super(config);
    this._staticRenderToolCalls = config.renderToolCalls;
  }
}

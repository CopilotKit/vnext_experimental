import { ReactToolCallRenderer } from "@/types";
import { ReactCustomMessageRenderer } from "@/types/react-custom-message-renderer";
import { CopilotKitCore, CopilotKitCoreConfig, CopilotKitCoreSubscriber } from "@copilotkitnext/core";

export interface CopilotKitCoreReactConfig extends CopilotKitCoreConfig {
  // Add any additional configuration properties specific to the React implementation
  renderToolCalls?: ReactToolCallRenderer<any>[];

  // Add custom message renderers
  renderCustomMessages?: ReactCustomMessageRenderer[];
}

export interface CopilotKitCoreReactSubscriber extends CopilotKitCoreSubscriber {
  onRenderToolCallsChanged?: (event: {
    copilotkit: CopilotKitCore;
    renderToolCalls: ReactToolCallRenderer<any>[];
  }) => void | Promise<void>;
}

export class CopilotKitCoreReact extends CopilotKitCore {
  private _renderToolCalls: ReactToolCallRenderer<any>[] = [];
  private _renderCustomMessages: ReactCustomMessageRenderer[] = [];
  private reactSubscribers: Set<CopilotKitCoreReactSubscriber> = new Set();

  constructor(config: CopilotKitCoreReactConfig) {
    super(config);
    this._renderToolCalls = config.renderToolCalls ?? [];
    this._renderCustomMessages = config.renderCustomMessages ?? [];
  }

  get renderCustomMessages(): Readonly<ReactCustomMessageRenderer[]> {
    return this._renderCustomMessages;
  }

  get renderToolCalls(): Readonly<ReactToolCallRenderer<any>>[] {
    return this._renderToolCalls;
  }

  setRenderToolCalls(renderToolCalls: ReactToolCallRenderer<any>[]): void {
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
    // reactSubscribers might not be initialized if called from parent constructor
    if (this.reactSubscribers) {
      this.reactSubscribers.add(subscriber);
    }
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
}

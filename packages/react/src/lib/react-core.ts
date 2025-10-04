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

    // Use parent's notifySubscribers to notify React subscribers
    void (this as unknown as { notifySubscribers: (handler: (subscriber: CopilotKitCoreReactSubscriber) => void | Promise<void>, errorMessage: string) => Promise<void> }).notifySubscribers(
      (subscriber) => {
        if ('onRenderToolCallsChanged' in subscriber && subscriber.onRenderToolCallsChanged) {
          subscriber.onRenderToolCallsChanged({
            copilotkit: this,
            renderToolCalls: this.renderToolCalls,
          });
        }
      },
      "Subscriber onRenderToolCallsChanged error:"
    );
  }

  // Override to accept React-specific subscriber type
  subscribe(subscriber: CopilotKitCoreReactSubscriber): () => void {
    return super.subscribe(subscriber);
  }

  unsubscribe(subscriber: CopilotKitCoreReactSubscriber): void {
    super.unsubscribe(subscriber);
  }
}

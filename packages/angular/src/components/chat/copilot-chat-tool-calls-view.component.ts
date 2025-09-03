import {
  Component,
  Input,
  ViewContainerRef,
  ComponentRef,
  inject,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  Type,
  ChangeDetectionStrategy,
  signal,
  computed,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import type { AssistantMessage, Message, ToolCall, ToolMessage } from '@ag-ui/core';
import { ToolCallStatus } from '@copilotkit/core';
import { CopilotKitService } from '../../core/copilotkit.service';
import { partialJSONParse } from '@copilotkit/shared';
import type { ToolCallProps, ToolCallRender } from '../../core/copilotkit.types';

/**
 * Component for rendering all tool calls for an assistant message.
 * This component iterates through the message's tool calls and renders each one
 * using the registered render functions in CopilotKitService.
 */
@Component({
  selector: 'copilot-chat-tool-calls-view',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (toolCall of message?.toolCalls ?? []; track toolCall.id) {
      <ng-container>
        <ng-container #dynamicContainer></ng-container>
        <ng-container *ngIf="getTemplateForToolCall(toolCall) as templateData">
          <ng-container *ngTemplateOutlet="templateData.template; context: templateData.context"></ng-container>
        </ng-container>
      </ng-container>
    }
  `,
})
export class CopilotChatToolCallsViewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) message!: AssistantMessage;
  @Input() messages: Message[] = [];
  @Input() isLoading = false;

  @ViewChild('dynamicContainer', { read: ViewContainerRef })
  private container?: ViewContainerRef;

  private copilotkit: CopilotKitService | null = inject(CopilotKitService, { optional: true });
  private componentRefs: Map<string, ComponentRef<any>> = new Map();
  private templateCache: Map<string, { template: TemplateRef<any>; context: any }> = new Map();

  // Signals for reactive state
  private messageSignal = signal<AssistantMessage | null>(null);
  private messagesSignal = signal<Message[]>([]);
  private isLoadingSignal = signal(false);

  ngAfterViewInit(): void {
    this.renderAllToolCalls();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['message']) {
      this.messageSignal.set(this.message);
    }
    if (changes['messages']) {
      this.messagesSignal.set(this.messages);
    }
    if (changes['isLoading']) {
      this.isLoadingSignal.set(this.isLoading);
    }

    this.renderAllToolCalls();
  }

  ngOnDestroy(): void {
    // Clean up all component refs
    this.componentRefs.forEach(ref => ref.destroy());
    this.componentRefs.clear();
    this.templateCache.clear();
  }

  getTemplateForToolCall(toolCall: ToolCall): { template: TemplateRef<any>; context: any } | null {
    return this.templateCache.get(toolCall.id) || null;
  }

  private renderAllToolCalls(): void {
    const message = this.messageSignal();
    if (!message || !message.toolCalls || message.toolCalls.length === 0) {
      return;
    }

    // Clear existing renders
    this.componentRefs.forEach(ref => ref.destroy());
    this.componentRefs.clear();
    this.templateCache.clear();

    if (!this.copilotkit || !this.container) {
      return;
    }

    const messages = this.messagesSignal();
    const isLoading = this.isLoadingSignal();

    // Render each tool call
    message.toolCalls.forEach(toolCall => {
      const toolMessage = messages.find(
        m => m.role === 'tool' && (m as ToolMessage).toolCallId === toolCall.id
      ) as ToolMessage | undefined;

      this.renderSingleToolCall(toolCall, toolMessage, isLoading);
    });
  }

  private renderSingleToolCall(toolCall: ToolCall, toolMessage: ToolMessage | undefined, isLoading: boolean): void {
    if (!this.copilotkit) {
      return;
    }

    // Get current render tool calls
    const currentRenderToolCalls = this.copilotkit.currentRenderToolCalls();
    
    // Find the render config for this tool call by name
    // Also check for wildcard (*) renders if no exact match
    const renderConfig = currentRenderToolCalls.find(
      (rc: ToolCallRender) => rc.name === toolCall.function.name
    ) || currentRenderToolCalls.find((rc: ToolCallRender) => rc.name === '*');

    if (!renderConfig) {
      return;
    }

    // Parse the arguments if they're a string
    const args = partialJSONParse(toolCall.function.arguments);

    // Determine status
    let status: ToolCallStatus;
    if (toolMessage) {
      status = ToolCallStatus.Complete;
    } else if (isLoading) {
      status = ToolCallStatus.InProgress;
    } else {
      status = ToolCallStatus.Complete;
    }

    // Create props based on status - use discriminated union properly
    let props: ToolCallProps;
    if (status === ToolCallStatus.InProgress) {
      props = {
        name: toolCall.function.name,
        description: '',
        args: args, // Partial args for InProgress
        status: ToolCallStatus.InProgress,
        result: undefined,
      };
    } else {
      // Complete status
      props = {
        name: toolCall.function.name,
        description: '',
        args: args, // Full args for Complete
        status: ToolCallStatus.Complete,
        result: toolMessage?.content || '',
      };
    }

    // Check if render is a Component class or TemplateRef
    if (this.isComponentClass(renderConfig.render)) {
      // Create component dynamically
      this.renderComponent(toolCall.id, renderConfig.render, props);
    } else if (this.isTemplateRef(renderConfig.render)) {
      // Use template
      this.renderTemplate(toolCall.id, renderConfig.render, props);
    }
  }

  private renderComponent(toolCallId: string, componentClass: Type<any>, props: ToolCallProps): void {
    if (!this.container) {
      return;
    }

    // Create the component
    const componentRef = this.container.createComponent(componentClass);
    this.componentRefs.set(toolCallId, componentRef);

    // Set inputs on the component
    for (const [key, value] of Object.entries(props)) {
      try {
        componentRef.setInput(key, value);
      } catch (e) {
        // Input might not exist on the component, which is fine
      }
    }

    // Trigger change detection
    componentRef.changeDetectorRef.detectChanges();
  }

  private renderTemplate(toolCallId: string, template: TemplateRef<any>, props: ToolCallProps): void {
    this.templateCache.set(toolCallId, {
      template,
      context: {
        $implicit: props,
        name: props.name,
        description: props.description,
        args: props.args,
        status: props.status,
        result: props.result,
      }
    });
  }

  private isComponentClass(value: any): value is Type<any> {
    return typeof value === 'function' && value.prototype;
  }

  private isTemplateRef(value: any): value is TemplateRef<any> {
    return value instanceof TemplateRef;
  }
}
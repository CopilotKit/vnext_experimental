import { NgComponentOutlet } from "@angular/common";
import { Component, inject, input } from "@angular/core";
import { AssistantMessage, ToolCall } from "@ag-ui/client";
import { ToolCallStatus } from "@copilotkitnext/core";
import { CopilotKit } from "./copilotkit";
import { ClientToolCall, ToolCallRendererConfig } from "./client-tool";

@Component({
  selector: "copilot-render-tool-calls",
  standalone: true,
  imports: [NgComponentOutlet],
  template: `
    @for (toolCall of message().toolCalls ?? []; track toolCall.id) {
      @let renderConfig = pickRenderer(toolCall.function.name);
      @if (renderConfig) {
        <ng-container
          *ngComponentOutlet="
            renderConfig.component;
            inputs: { toolCall: buildToolCall(toolCall, renderConfig) }
          "
        />
      }
    }
  `,
})
export class RenderToolCalls {
  private readonly copilotKit = inject(CopilotKit);
  readonly message = input.required<AssistantMessage>();

  pickRenderer(name: string): ToolCallRendererConfig | undefined {
    type AssistantMessageWithAgent = AssistantMessage & {
      agentId?: string;
    };
    const messageAgentId = (this.message() as AssistantMessageWithAgent)
      .agentId;
    const renderers = this.copilotKit.renderToolCalls();

    return (
      renderers.find(
        (candidate) =>
          candidate.name === name &&
          (candidate.agentId === undefined ||
            candidate.agentId === messageAgentId)
      ) ?? renderers.find((candidate) => candidate.name === "*")
    );
  }

  buildToolCall<Args extends Record<string, unknown>>(
    toolCall: ToolCall,
    renderConfig: ToolCallRendererConfig<Args>
  ): ClientToolCall<Args> {
    let parsedArgs: unknown = {};

    try {
      parsedArgs = JSON.parse(toolCall.function.arguments ?? "{}");
    } catch {
      parsedArgs = {};
    }

    const validatedArgs = renderConfig.args.safeParse(parsedArgs);
    const args = validatedArgs.success
      ? (validatedArgs.data as Partial<Args>)
      : (parsedArgs as Partial<Args>);

    return {
      args,
      status: ToolCallStatus.InProgress,
      result: undefined,
    };
  }
}

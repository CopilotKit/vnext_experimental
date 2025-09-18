import { DestroyRef, Injector, Signal, Type, inject } from "@angular/core";
import { ToolCallStatus, FrontendTool } from "@copilotkitnext/core";
import { z } from "zod";
import { CopilotKit } from "./copilotkit";

export type ClientToolCall<
  Args extends Record<string, unknown> = Record<string, unknown>,
> =
  | {
      args: Partial<Args>;
      status: ToolCallStatus.InProgress;
      result: undefined;
    }
  | {
      args: Args;
      status: ToolCallStatus.Executing;
      result: undefined;
    }
  | {
      args: Args;
      status: ToolCallStatus.Complete;
      result: string;
    };

export interface ClientToolRenderer<
  Args extends Record<string, unknown> = Record<string, unknown>,
> {
  toolCall: Signal<ClientToolCall<Args>>;
}

type ClientToolBase<
  Args extends Record<string, unknown> = Record<string, unknown>,
> = FrontendTool<Args> & {
  renderer?: Type<ClientToolRenderer<Args>>;
};

export type ClientTool<
  Args extends Record<string, unknown> = Record<string, unknown>,
> = ClientToolBase<Args>;

export interface ToolCallRendererConfig<
  Args extends Record<string, unknown> = Record<string, unknown>,
> {
  name: string;
  args: z.ZodType<Args>;
  component: Type<ClientToolRenderer<Args>>;
  agentId?: string;
}

export function registerClientTool<
  Args extends Record<string, unknown> = Record<string, unknown>,
>(clientTool: ClientTool<Args>): void {
  // Arrange dependencies through Angular's DI
  const injector = inject(Injector);
  const destroyRef = inject(DestroyRef);
  const copilotKit = inject(CopilotKit);

  copilotKit.addTool({
    ...clientTool,
    injector,
  });

  destroyRef.onDestroy(() => {
    copilotKit.removeTool(clientTool.name, clientTool.agentId);
  });
}

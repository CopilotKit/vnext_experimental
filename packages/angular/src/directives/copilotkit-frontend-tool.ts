import {
  Directive,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  TemplateRef,
  Type,
  isDevMode,
  Inject,
} from "@angular/core";
import { CopilotKit } from "../core/copilotkit";
import type {
  AngularFrontendTool,
  AngularToolCallRender,
  ToolCallRender,
} from "../core/copilotkit.types";
import type { z } from "zod";

@Directive({
  selector: "[copilotkitFrontendTool]",
  standalone: true,
})
export class CopilotKitFrontendTool<
    T extends Record<string, any> = Record<string, any>,
  >
  implements OnInit, OnChanges, OnDestroy
{
  private isRegistered = false;

  constructor(@Inject(CopilotKit) private readonly copilotkit: CopilotKit) {}

  @Input() name!: string;
  @Input() description?: string;
  @Input() parameters?: z.ZodSchema<T>;
  @Input() handler?: (args: T) => Promise<any>;
  @Input() render?: Type<any> | TemplateRef<any>;
  @Input() followUp?: boolean;

  // Alternative: Accept a full tool object
  @Input("copilotkitFrontendTool") tool?: AngularFrontendTool<T>;

  ngOnInit(): void {
    this.registerTool();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.isRegistered) {
      // Re-register the tool if any properties change
      this.unregisterTool();
      this.registerTool();
    }
  }

  ngOnDestroy(): void {
    this.unregisterTool();
  }

  private registerTool(): void {
    const tool = this.getTool();

    if (!tool.name) {
      if (isDevMode()) {
        console.warn(
          'CopilotKitFrontendTool: "name" is required. ' +
            'Please provide a name via [name]="toolName" or ' +
            "[copilotkitFrontendTool]=\"{ name: 'toolName', ... }\""
        );
      }
      return; // Don't register if no name
    }

    // Register the tool with CopilotKit
    this.copilotkit.copilotkit.addTool(tool);

    // Register the render if provided
    if (tool.render) {
      const currentRenders = this.copilotkit.currentRenderToolCalls();
      const renderEntry: AngularToolCallRender = {
        name: tool.name,
        render: tool.render,
      };

      // Check for duplicate
      const existingIndex = currentRenders.findIndex(
        (r: ToolCallRender) => r.name === tool.name
      );
      if (existingIndex !== -1) {
        if (isDevMode()) {
          console.warn(
            `[CopilotKit] Tool "${tool.name}" already has a render. ` +
              `The previous render will be replaced. ` +
              `This may indicate a duplicate tool registration.`
          );
        }
        const updated = [...currentRenders];
        updated[existingIndex] = renderEntry;
        this.copilotkit.setCurrentRenderToolCalls(updated);
      } else {
        this.copilotkit.setCurrentRenderToolCalls([
          ...currentRenders,
          renderEntry,
        ]);
      }
    }

    this.isRegistered = true;
  }

  private unregisterTool(): void {
    if (!this.isRegistered) return;

    const tool = this.getTool();

    if (tool.name) {
      // Remove the tool
      this.copilotkit.copilotkit.removeTool(tool.name);

      // Remove the render if it exists
      const currentRenders = this.copilotkit.currentRenderToolCalls();
      const filtered = currentRenders.filter(
        (r: ToolCallRender) => r.name !== tool.name
      );
      if (filtered.length !== currentRenders.length) {
        this.copilotkit.setCurrentRenderToolCalls(filtered);
      }
    }

    this.isRegistered = false;
  }

  private getTool(): AngularFrontendTool<T> {
    // If full tool object is provided, use it
    if (this.tool) {
      return this.tool;
    }

    // Otherwise, construct from individual inputs
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      handler: this.handler,
      render: this.render,
      followUp: this.followUp,
    };
  }
}

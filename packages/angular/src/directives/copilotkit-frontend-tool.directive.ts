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
import { CopilotKitService } from "../core/copilotkit.service";
import type {
  AngularFrontendTool,
  AngularToolCallRender,
} from "../core/copilotkit.types";
import { z } from "zod";

@Directive({
  selector: "[copilotkitFrontendTool]",
  standalone: true,
})
export class CopilotKitFrontendToolDirective<
    T extends Record<string, any> = Record<string, any>,
  >
  implements OnInit, OnChanges, OnDestroy
{
  private isRegistered = false;

  constructor(
    @Inject(CopilotKitService) private readonly copilotkit: CopilotKitService
  ) {}

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
          'CopilotKitFrontendToolDirective: "name" is required. ' +
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
        args: tool.parameters || z.object({}),
        render: tool.render,
      };

      // Check for duplicate
      if (tool.name in currentRenders) {
        if (isDevMode()) {
          console.warn(
            `[CopilotKit] Tool "${tool.name}" already has a render. ` +
              `The previous render will be replaced. ` +
              `This may indicate a duplicate tool registration.`
          );
        }
      }
      this.copilotkit.setCurrentRenderToolCalls({
        ...currentRenders,
        [tool.name]: renderEntry,
      });
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
      if (tool.name in currentRenders) {
        const { [tool.name]: _, ...remainingRenders } = currentRenders;
        this.copilotkit.setCurrentRenderToolCalls(remainingRenders);
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

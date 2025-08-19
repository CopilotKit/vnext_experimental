import {
  Directive,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  TemplateRef,
  Type,
  inject
} from '@angular/core';
import { CopilotKitService } from '../core/copilotkit.service';
import type { AngularFrontendTool, AngularToolCallRender } from '../core/copilotkit.types';
import { z } from 'zod';

@Directive({
  selector: '[copilotkitFrontendTool]',
  standalone: true
})
export class CopilotkitFrontendToolDirective implements OnInit, OnChanges, OnDestroy {
  @Input() name!: string;
  @Input() description?: string;
  @Input() parameters?: z.ZodSchema<any>;
  @Input() handler?: (args: any) => Promise<any>;
  @Input() render?: Type<any> | TemplateRef<any>;
  @Input() followUp?: boolean;
  
  // Alternative: Accept a full tool object
  @Input('copilotkitFrontendTool') tool?: AngularFrontendTool;
  
  private copilotkit = inject(CopilotKitService);
  private isRegistered = false;
  
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
      console.warn('CopilotkitFrontendToolDirective: name is required');
      return;
    }
    
    // Register the tool with CopilotKit
    this.copilotkit.copilotkit.addTool(tool);
    
    // Register the render if provided
    if (tool.render) {
      const currentRenders = this.copilotkit.currentRenderToolCalls();
      const renderEntry: AngularToolCallRender = {
        args: tool.parameters || z.object({}),
        render: tool.render
      };
      
      // Check for duplicate
      if (tool.name in currentRenders) {
        console.error(`Tool with name '${tool.name}' already has a render. Skipping.`);
      } else {
        this.copilotkit.setCurrentRenderToolCalls({
          ...currentRenders,
          [tool.name]: renderEntry
        });
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
      if (tool.name in currentRenders) {
        const { [tool.name]: _, ...remainingRenders } = currentRenders;
        this.copilotkit.setCurrentRenderToolCalls(remainingRenders);
      }
    }
    
    this.isRegistered = false;
  }
  
  private getTool(): AngularFrontendTool {
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
      followUp: this.followUp
    };
  }
}
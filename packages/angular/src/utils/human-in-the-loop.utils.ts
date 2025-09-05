import { 
  DestroyRef, 
  inject, 
  signal, 
  Signal,
  Type,
  TemplateRef
} from '@angular/core';
import { CopilotKitService } from '../core/copilotkit.service';
import { 
  AngularHumanInTheLoop, 
  ToolCallStatus,
  HumanInTheLoopState,
  HumanInTheLoopProps,
  AngularFrontendTool
} from '../core/copilotkit.types';

/**
 * Registers a human-in-the-loop tool that requires user interaction.
 * Must be called within an injection context.
 * Automatically cleans up when the component/service is destroyed.
 * 
 * @param tool - The human-in-the-loop tool configuration
 * @returns The tool ID
 * 
 * @example
 * ```typescript
 * export class ApprovalComponent {
 *   toolId = registerHumanInTheLoop({
 *     name: 'requireApproval',
 *     description: 'Requires user approval',
 *     args: z.object({ action: z.string() }),
 *     render: ApprovalDialogComponent
 *   });
 * }
 * ```
 */
export function registerHumanInTheLoop<T extends Record<string, any> = Record<string, any>>(
  tool: AngularHumanInTheLoop<T>
): string {
  const service = inject(CopilotKitService);
  const destroyRef = inject(DestroyRef);
  
  // Create state management
  const statusSignal = signal<ToolCallStatus>(ToolCallStatus.InProgress);
  let resolvePromise: ((result: unknown) => void) | null = null;
  
  // Create respond function
  const respond = async (result: unknown): Promise<void> => {
    if (resolvePromise) {
      resolvePromise(result);
      statusSignal.set(ToolCallStatus.Complete);
      resolvePromise = null;
    }
  };
  
  // Create handler that returns a Promise
  const handler = async (_args: T): Promise<unknown> => {
    return new Promise((resolve) => {
      statusSignal.set(ToolCallStatus.Executing);
      resolvePromise = resolve;
    });
  };
  
  // Create enhanced render function
  const enhancedRender = createEnhancedRender(tool.render, statusSignal, respond);
  
  // Create the frontend tool
  const frontendTool: AngularFrontendTool<T> = {
    ...tool,
    handler,
    render: enhancedRender
  };
  
  // Add the tool (returns void, so we use the tool name as ID)
  service.copilotkit.addTool(frontendTool);
  const toolId = frontendTool.name;
  
  // Register tool render if provided
  if (frontendTool.render) {
    service.registerToolRender(frontendTool.name, {
      name: frontendTool.name,
      render: frontendTool.render
    });
  }
  
  // Cleanup on destroy
  destroyRef.onDestroy(() => {
    service.copilotkit.removeTool(toolId);
    if (frontendTool.render) {
      service.unregisterToolRender(frontendTool.name);
    }
  });
  
  return toolId;
}

/**
 * Adds a human-in-the-loop tool with explicit service parameter.
 * Returns a cleanup function.
 * 
 * @param service - The CopilotKitService instance
 * @param tool - The human-in-the-loop tool configuration
 * @returns Cleanup function to remove the tool
 * 
 * @example
 * ```typescript
 * export class MyComponent implements OnInit, OnDestroy {
 *   private cleanup?: () => void;
 *   
 *   constructor(private copilotkit: CopilotKitService) {}
 *   
 *   ngOnInit() {
 *     this.cleanup = addHumanInTheLoop(this.copilotkit, {
 *       name: 'requireApproval',
 *       description: 'Requires user approval',
 *       args: z.object({ action: z.string() }),
 *       render: ApprovalDialogComponent
 *     });
 *   }
 *   
 *   ngOnDestroy() {
 *     this.cleanup?.();
 *   }
 * }
 * ```
 */
export function addHumanInTheLoop<T extends Record<string, any> = Record<string, any>>(
  service: CopilotKitService,
  tool: AngularHumanInTheLoop<T>
): () => void {
  // Create state management
  const statusSignal = signal<ToolCallStatus>(ToolCallStatus.InProgress);
  let resolvePromise: ((result: unknown) => void) | null = null;
  
  // Create respond function
  const respond = async (result: unknown): Promise<void> => {
    if (resolvePromise) {
      resolvePromise(result);
      statusSignal.set(ToolCallStatus.Complete);
      resolvePromise = null;
    }
  };
  
  // Create handler that returns a Promise
  const handler = async (_args: T): Promise<unknown> => {
    return new Promise((resolve) => {
      statusSignal.set(ToolCallStatus.Executing);
      resolvePromise = resolve;
    });
  };
  
  // Create enhanced render function
  const enhancedRender = createEnhancedRender(tool.render, statusSignal, respond);
  
  // Create the frontend tool
  const frontendTool: AngularFrontendTool<T> = {
    ...tool,
    handler,
    render: enhancedRender
  };
  
  // Add the tool (returns void, so we use the tool name as ID)
  service.copilotkit.addTool(frontendTool);
  const toolId = frontendTool.name;
  
  // Register tool render if provided
  if (frontendTool.render) {
    service.registerToolRender(frontendTool.name, {
      name: frontendTool.name,
      render: frontendTool.render
    });
  }
  
  // Return cleanup function
  return () => {
    service.copilotkit.removeTool(toolId);
    if (frontendTool.render) {
      service.unregisterToolRender(frontendTool.name);
    }
  };
}

/**
 * Creates a human-in-the-loop tool with dynamic update capabilities.
 * 
 * @param service - The CopilotKitService instance
 * @param tool - The human-in-the-loop tool configuration
 * @returns Object with status signal, update and destroy methods
 * 
 * @example
 * ```typescript
 * export class MyComponent {
 *   humanInTheLoop = createHumanInTheLoop(this.copilotkit, {
 *     name: 'requireApproval',
 *     description: 'Requires user approval',
 *     args: z.object({ action: z.string() }),
 *     render: ApprovalDialogComponent
 *   });
 *   
 *   updateDescription(newDesc: string) {
 *     this.humanInTheLoop.update({ description: newDesc });
 *   }
 *   
 *   ngOnDestroy() {
 *     this.humanInTheLoop.destroy();
 *   }
 * }
 * ```
 */
export function createHumanInTheLoop<T extends Record<string, any> = Record<string, any>>(
  service: CopilotKitService,
  tool: AngularHumanInTheLoop<T>
): HumanInTheLoopState & { update: (updates: Partial<AngularHumanInTheLoop<T>>) => void } {
  // Create state management
  const statusSignal = signal<ToolCallStatus>(ToolCallStatus.InProgress);
  let currentTool = { ...tool };
  let toolId: string = '';
  let resolvePromise: ((result: unknown) => void) | null = null;
  
  // Create respond function
  const respond = async (result: unknown): Promise<void> => {
    if (resolvePromise) {
      resolvePromise(result);
      statusSignal.set(ToolCallStatus.Complete);
      resolvePromise = null;
    }
  };
  
  // Create handler that returns a Promise
  const handler = async (_args: T): Promise<unknown> => {
    return new Promise((resolve) => {
      statusSignal.set(ToolCallStatus.Executing);
      resolvePromise = resolve;
    });
  };
  
  // Function to add the tool
  const addTool = () => {
    // Create enhanced render function
    const enhancedRender = createEnhancedRender(currentTool.render, statusSignal, respond);
    
    // Create the frontend tool
    const frontendTool: AngularFrontendTool<T> = {
      ...currentTool,
      handler,
      render: enhancedRender
    };
    
    // Add tool (returns void, so we use the tool name as ID)
    service.copilotkit.addTool(frontendTool);
    toolId = frontendTool.name;
    
    // Register tool render if provided
    if (frontendTool.render) {
      service.registerToolRender(frontendTool.name, {
        name: frontendTool.name,
        render: frontendTool.render
      });
    }
  };
  
  // Initialize the tool
  addTool();
  
  return {
    status: statusSignal.asReadonly(),
    toolId,
    update: (updates: Partial<AngularHumanInTheLoop<T>>) => {
      // Remove old tool
      service.copilotkit.removeTool(toolId);
      if (currentTool.render) {
        service.unregisterToolRender(currentTool.name);
      }
      
      // Update tool configuration
      currentTool = { ...currentTool, ...updates };
      
      // Re-add with new configuration
      addTool();
    },
    destroy: () => {
      service.copilotkit.removeTool(toolId);
      if (currentTool.render) {
        service.unregisterToolRender(currentTool.name);
      }
    }
  };
}

/**
 * Creates an enhanced render function that injects the respond function
 * when the status is 'executing'.
 */
function createEnhancedRender<T extends Record<string, any>>(
  originalRender: Type<any> | TemplateRef<HumanInTheLoopProps<T>>,
  _statusSignal: Signal<ToolCallStatus>,
  _respond: (result: unknown) => Promise<void>
): Type<any> | TemplateRef<any> {
  // For component classes, we need to create a wrapper
  if (isComponentClass(originalRender)) {
    // Return a wrapper component factory
    // This is complex in Angular and would require dynamic component creation
    // For now, we'll return the original and rely on prop injection
    return originalRender;
  }
  
  // For templates, we can't easily wrap them
  // The template context will be enhanced in the render component
  return originalRender;
}

/**
 * Helper function to check if a value is a component class
 */
function isComponentClass(value: any): value is Type<any> {
  return typeof value === 'function' && value.prototype;
}

/**
 * Enhanced component wrapper for human-in-the-loop.
 * This would be used internally by the tool render component to inject
 * the respond function based on status.
 * 
 * @internal
 */
export function enhancePropsForHumanInTheLoop<T>(
  props: HumanInTheLoopProps<T>,
  status: ToolCallStatus,
  respond?: (result: unknown) => Promise<void>
): HumanInTheLoopProps<T> {
  if (status === ToolCallStatus.Executing && respond) {
    return {
      ...props,
      status: ToolCallStatus.Executing,
      respond
    } as HumanInTheLoopProps<T>;
  }
  
  if (status === ToolCallStatus.Complete) {
    return {
      ...props,
      status: ToolCallStatus.Complete,
      result: typeof props.result === 'string' ? props.result : '',
      respond: undefined
    } as HumanInTheLoopProps<T>;
  }
  
  // InProgress
  return {
    ...props,
    status: ToolCallStatus.InProgress,
    result: undefined,
    respond: undefined
  } as HumanInTheLoopProps<T>;
}
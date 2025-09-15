import { DestroyRef, inject } from "@angular/core";
import { CopilotKit } from "../core/copilotkit";
import {
  AngularFrontendTool,
  AngularToolCallRender,
  ToolCallRender,
} from "../core/copilotkit.types";
import type { z } from "zod";

/**
 * Explicitly adds a frontend tool to CopilotKit.
 * Requires CopilotKit to be passed as a parameter.
 *
 * @param service - The CopilotKit instance
 * @param tool - The tool to add
 * @returns A cleanup function that removes the tool
 *
 * @example
 * ```typescript
 * export class MyComponent implements OnInit, OnDestroy {
 *   private cleanupFns: Array<() => void> = [];
 *
 *   constructor(private copilotkit: CopilotKit) {}
 *
 *   ngOnInit() {
 *     const cleanup = addFrontendTool(this.copilotkit, {
 *       name: 'calculator',
 *       description: 'Performs calculations',
 *       parameters: z.object({
 *         expression: z.string()
 *       }),
 *       handler: async (args) => {
 *         return eval(args.expression);
 *       }
 *     });
 *
 *     this.cleanupFns.push(cleanup);
 *   }
 *
 *   ngOnDestroy() {
 *     this.cleanupFns.forEach(fn => fn());
 *   }
 * }
 * ```
 */
export function addFrontendTool<
  T extends Record<string, any> = Record<string, any>,
>(service: CopilotKit, tool: AngularFrontendTool<T>): () => void {
  // Add the tool to CopilotKit
  service.copilotkit.addTool(tool);

  // Register the render if provided
  if (tool.render) {
    const currentRenders = service.currentRenderToolCalls();
    const existingIndex = currentRenders.findIndex(
      (r: ToolCallRender) => r.name === tool.name
    );

    if (existingIndex !== -1) {
      console.error(
        `Tool with name '${tool.name}' already has a render. Skipping.`
      );
    } else {
      const renderEntry: AngularToolCallRender = {
        name: tool.name,
        render: tool.render,
      };

      service.setCurrentRenderToolCalls([...currentRenders, renderEntry]);
    }
  }

  // Return cleanup function
  return () => {
    removeFrontendTool(service, tool.name);
  };
}

/**
 * Registers a frontend tool with CopilotKit and automatically removes it when the component/service is destroyed.
 * Must be called within an injection context.
 *
 * @param tool - The tool to register
 * @returns The tool name
 *
 * @example
 * ```typescript
 * export class MyComponent implements OnInit {
 *   ngOnInit() {
 *     // Automatically cleaned up on component destroy
 *     registerFrontendTool({
 *       name: 'search',
 *       description: 'Search for items',
 *       parameters: z.object({
 *         query: z.string()
 *       }),
 *       handler: async (args) => {
 *         return this.searchService.search(args.query);
 *       },
 *       render: SearchResultsComponent
 *     });
 *   }
 * }
 * ```
 */
export function registerFrontendTool<
  T extends Record<string, any> = Record<string, any>,
>(tool: AngularFrontendTool<T>): string {
  const service = inject(CopilotKit);
  const destroyRef = inject(DestroyRef);

  // Add the tool
  service.copilotkit.addTool(tool);

  // Register the render if provided
  if (tool.render) {
    const currentRenders = service.currentRenderToolCalls();
    const existingIndex = currentRenders.findIndex(
      (r: ToolCallRender) => r.name === tool.name
    );

    if (existingIndex !== -1) {
      console.error(
        `Tool with name '${tool.name}' already has a render. Skipping.`
      );
    } else {
      const renderEntry: AngularToolCallRender = {
        name: tool.name,
        render: tool.render,
      };

      service.setCurrentRenderToolCalls([...currentRenders, renderEntry]);
    }
  }

  // Register cleanup with Angular's DestroyRef
  destroyRef.onDestroy(() => {
    removeFrontendTool(service, tool.name);
  });

  return tool.name;
}

/**
 * Explicitly removes a frontend tool from CopilotKit.
 *
 * @param service - The CopilotKit instance
 * @param toolName - The name of the tool to remove
 *
 * @example
 * ```typescript
 * removeFrontendTool(this.copilotkit, 'calculator');
 * ```
 */
export function removeFrontendTool(
  service: CopilotKit,
  toolName: string
): void {
  // Remove the tool
  service.copilotkit.removeTool(toolName);

  // Remove the render if it exists
  const currentRenders = service.currentRenderToolCalls();
  const filtered = currentRenders.filter(
    (r: ToolCallRender) => r.name !== toolName
  );
  if (filtered.length !== currentRenders.length) {
    service.setCurrentRenderToolCalls(filtered);
  }
}

/**
 * Creates a frontend tool with dynamic parameters that can change over time.
 * Uses Angular signals for reactivity.
 *
 * @param name - Tool name
 * @param description - Tool description
 * @param parameters - Zod schema for parameters
 * @param handler - Signal or function that provides the handler
 * @param render - Optional render component or template
 * @returns Object with update and destroy methods
 *
 * @example
 * ```typescript
 * export class MyComponent {
 *   private toolConfig = signal({
 *     handler: async (args: any) => this.processDefault(args)
 *   });
 *
 *   ngOnInit() {
 *     const tool = createDynamicFrontendTool(
 *       'processor',
 *       'Processes data',
 *       z.object({ data: z.string() }),
 *       () => this.toolConfig().handler
 *     );
 *
 *     // Later, update the handler
 *     this.toolConfig.set({
 *       handler: async (args: any) => this.processAdvanced(args)
 *     });
 *     tool.update();
 *   }
 * }
 * ```
 */
export function createDynamicFrontendTool<
  T extends Record<string, any> = Record<string, any>,
>(
  name: string,
  description: string | (() => string),
  parameters: z.ZodSchema<T>,
  handler: () => (args: T) => Promise<any>,
  render?: () => any
): { update: () => void; destroy: () => void } {
  const service = inject(CopilotKit);
  const destroyRef = inject(DestroyRef);

  let isRegistered = false;

  const update = () => {
    // Remove old tool if registered
    if (isRegistered) {
      service.copilotkit.removeTool(name);
    }

    // Create new tool configuration
    const desc =
      typeof description === "function" ? description() : description;
    const currentHandler = handler();
    const currentRender = render ? render() : undefined;

    const tool: AngularFrontendTool<T> = {
      name,
      description: desc,
      parameters,
      handler: currentHandler,
      render: currentRender,
    };

    // Add the tool
    service.copilotkit.addTool(tool);

    // Update render if provided
    if (currentRender) {
      const currentRenders = service.currentRenderToolCalls();
      const renderEntry: AngularToolCallRender = {
        name: name,
        render: currentRender,
      };

      const existingIndex = currentRenders.findIndex(
        (r: ToolCallRender) => r.name === name
      );
      if (existingIndex !== -1) {
        const updated = [...currentRenders];
        updated[existingIndex] = renderEntry;
        service.setCurrentRenderToolCalls(updated);
      } else {
        service.setCurrentRenderToolCalls([...currentRenders, renderEntry]);
      }
    }

    isRegistered = true;
  };

  const destroy = () => {
    if (isRegistered) {
      removeFrontendTool(service, name);
      isRegistered = false;
    }
  };

  // Initial setup
  update();

  // Register cleanup
  destroyRef.onDestroy(destroy);

  return { update, destroy };
}

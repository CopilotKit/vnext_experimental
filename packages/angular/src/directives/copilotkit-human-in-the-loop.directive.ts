import {
  Directive,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  TemplateRef,
  Type,
  signal,
  isDevMode,
  Inject
} from '@angular/core';
import { CopilotKitService } from '../core/copilotkit.service';
import type { 
  AngularHumanInTheLoop,
  HumanInTheLoopProps,
  AngularFrontendTool
} from '../core/copilotkit.types';

// Define the status type locally to avoid decorator issues
type HumanInTheLoopStatus = 'inProgress' | 'executing' | 'complete';
import * as z from 'zod';

/**
 * Directive for declaratively creating human-in-the-loop tools.
 * Provides reactive outputs for status changes and response events.
 * 
 * @example
 * ```html
 * <!-- Basic usage -->
 * <div copilotkitHumanInTheLoop
 *      [name]="'requireApproval'"
 *      [description]="'Requires user approval'"
 *      [args]="argsSchema"
 *      [render]="approvalComponent"
 *      (statusChange)="onStatusChange($event)"
 *      (responseProvided)="onResponse($event)">
 * </div>
 * 
 * <!-- With template -->
 * <div copilotkitHumanInTheLoop
 *      [name]="'requireApproval'"
 *      [description]="'Requires user approval'"
 *      [args]="argsSchema"
 *      [render]="approvalTemplate"
 *      [(status)]="approvalStatus">
 * </div>
 * 
 * <ng-template #approvalTemplate let-props>
 *   <div *ngIf="props.status === 'executing'">
 *     <p>{{ props.args.action }}</p>
 *     <button (click)="props.respond('approved')">Approve</button>
 *     <button (click)="props.respond('rejected')">Reject</button>
 *   </div>
 * </ng-template>
 * ```
 */
@Directive({
  selector: '[copilotkitHumanInTheLoop]',
  standalone: true
})
export class CopilotkitHumanInTheLoopDirective<T extends Record<string, any> = Record<string, any>> implements OnInit, OnChanges, OnDestroy {
  private toolId?: string;
  private statusSignal = signal<HumanInTheLoopStatus>('inProgress');
  private resolvePromise: ((result: unknown) => void) | null = null;
  private _status: HumanInTheLoopStatus = 'inProgress';

  constructor(@Inject(CopilotKitService) private readonly copilotkit: CopilotKitService) {}

  /**
   * The name of the human-in-the-loop tool.
   */
  @Input() name!: string;

  /**
   * Description of what the tool does.
   */
  @Input() description!: string;

  /**
   * Zod schema for the tool parameters.
   */
  @Input() parameters!: z.ZodSchema<T>;

  /**
   * Component class or template to render for user interaction.
   */
  @Input() render!: Type<any> | TemplateRef<HumanInTheLoopProps<T>>;

  /**
   * Whether the tool should be registered (default: true).
   */
  @Input() enabled = true;

  /**
   * Alternative input using the directive selector.
   * Allows: [copilotkitHumanInTheLoop]="config"
   */
  @Input('copilotkitHumanInTheLoop')
  set config(value: Partial<AngularHumanInTheLoop<T>> | undefined) {
    if (value) {
      if (value.name) this.name = value.name;
      if (value.description) this.description = value.description;
      if ('parameters' in value && value.parameters) this.parameters = value.parameters as z.ZodSchema<T>;
      if ('render' in value && value.render) this.render = value.render;
    }
  }

  /**
   * Emits when the status changes.
   */
  @Output() statusChange = new EventEmitter<HumanInTheLoopStatus>();

  /**
   * Two-way binding for status.
   */
  @Input()
  get status(): HumanInTheLoopStatus {
    return this._status;
  }
  set status(value: HumanInTheLoopStatus) {
    // Input setter for two-way binding (though typically read-only)
    this._status = value;
  }

  /**
   * Emits when a response is provided by the user.
   */
  @Output() responseProvided = new EventEmitter<unknown>();

  /**
   * Emits when the tool execution starts.
   */
  @Output() executionStarted = new EventEmitter<any>();

  /**
   * Emits when the tool execution completes.
   */
  @Output() executionCompleted = new EventEmitter<unknown>();

  ngOnInit(): void {
    if (this.enabled) {
      this.registerTool();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const relevantChanges = changes['name'] || 
                          changes['description'] || 
                          changes['args'] || 
                          changes['render'] ||
                          changes['enabled'];
    
    if (relevantChanges && !relevantChanges.firstChange) {
      // Re-register the tool with new configuration
      this.unregisterTool();
      if (this.enabled) {
        this.registerTool();
      }
    }
  }

  ngOnDestroy(): void {
    this.unregisterTool();
  }

  /**
   * Programmatically trigger a response.
   * Useful when the directive is used as a controller.
   */
  respond(result: unknown): void {
    this.handleResponse(result);
  }

  private registerTool(): void {
    if (!this.name || !this.description || !this.parameters || !this.render) {
      if (isDevMode()) {
        throw new Error(
          'CopilotkitHumanInTheLoopDirective: Missing required inputs. ' +
          'Required: name, description, parameters, and render.'
        );
      }
      return;
    }

    // Create handler that returns a Promise
    const handler = async (args: T): Promise<unknown> => {
      return new Promise((resolve) => {
        this.updateStatus('executing');
        this.resolvePromise = resolve;
        this.executionStarted.emit(args);
      });
    };

    // Create the frontend tool with enhanced render
    const frontendTool: AngularFrontendTool<T> = {
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      handler,
      render: this.render  // Will be enhanced by the render component
    };

    // Add the tool (returns void, so we use the tool name as ID)
    this.copilotkit.copilotkit.addTool(frontendTool);
    this.toolId = this.name;

    // Register the render with respond capability
    this.copilotkit.registerToolRender(this.name, {
      args: this.parameters,
      render: this.createEnhancedRender()
    });
  }

  private unregisterTool(): void {
    if (this.toolId) {
      this.copilotkit.copilotkit.removeTool(this.toolId);
      this.copilotkit.unregisterToolRender(this.name);
      this.toolId = undefined;
    }
  }

  private createEnhancedRender(): Type<any> | TemplateRef<any> {
    // If it's a template, we need to wrap it with our respond function
    // This is handled by returning a special marker that the render component
    // will recognize and enhance with the respond function
    
    // Store reference to this directive instance for the render component
    (this.render as any).__humanInTheLoopDirective = this;
    (this.render as any).__humanInTheLoopStatus = this.statusSignal;
    
    return this.render;
  }

  private handleResponse(result: unknown): void {
    if (this.resolvePromise) {
      this.resolvePromise(result);
      this.updateStatus('complete');
      this.resolvePromise = null;
      this.responseProvided.emit(result);
      this.executionCompleted.emit(result);
    }
  }

  private updateStatus(status: HumanInTheLoopStatus): void {
    this._status = status;
    this.statusSignal.set(status);
    this.statusChange.emit(status);
  }
}

/**
 * Helper directive to provide respond function in templates.
 * This would be used internally by the tool render component.
 * 
 * @internal
 */
@Directive({
  selector: '[copilotkitHumanInTheLoopRespond]',
  standalone: true
})
export class CopilotkitHumanInTheLoopRespondDirective {
  @Input() copilotkitHumanInTheLoopRespond?: (result: unknown) => Promise<void>;
  
  /**
   * Convenience method for templates to call respond.
   */
  respond(result: unknown): void {
    this.copilotkitHumanInTheLoopRespond?.(result);
  }
}
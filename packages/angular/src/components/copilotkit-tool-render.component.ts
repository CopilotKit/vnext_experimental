import {
  Component,
  Input,
  ViewContainerRef,
  TemplateRef,
  Type,
  OnChanges,
  SimpleChanges,
  ComponentRef,
  inject,
  ViewChild,
  AfterViewInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { CopilotKitService } from "../core/copilotkit.service";
import type {
  ToolCallProps,
  AngularToolCallRender,
} from "../core/copilotkit.types";
import { ToolCallStatus } from "../core/copilotkit.types";

@Component({
  selector: "copilotkit-tool-render",
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-container #dynamicContainer></ng-container>
    <ng-container *ngIf="templateRef && templateContext">
      <ng-container
        *ngTemplateOutlet="templateRef; context: templateContext"
      ></ng-container>
    </ng-container>
  `,
})
export class CopilotKitToolRenderComponent implements OnChanges, AfterViewInit {
  @Input() toolName!: string;
  @Input() args: any;
  @Input() status: ToolCallStatus = ToolCallStatus.InProgress;
  @Input() result?: any;
  @Input() description?: string;

  @ViewChild("dynamicContainer", { read: ViewContainerRef, static: true })
  private container!: ViewContainerRef;

  private copilotkit = inject(CopilotKitService);
  private componentRef?: ComponentRef<any>;

  templateRef?: TemplateRef<any>;
  templateContext?: any;

  ngAfterViewInit(): void {
    this.renderTool();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes["toolName"] ||
      changes["args"] ||
      changes["status"] ||
      changes["result"]
    ) {
      this.renderTool();
    }
  }

  private renderTool(): void {
    // Clear existing component
    if (this.componentRef) {
      this.componentRef.destroy();
      this.componentRef = undefined;
    }

    // Clear template
    this.templateRef = undefined;
    this.templateContext = undefined;

    if (!this.toolName) {
      return;
    }

    // Get the tool render configuration
    const toolRender = this.copilotkit.getToolRender(this.toolName) as
      | AngularToolCallRender
      | undefined;

    if (!toolRender) {
      console.warn(`No render found for tool: ${this.toolName}`);
      return;
    }

    // Prepare props to pass to the component
    const props: ToolCallProps<any> = {
      name: this.toolName,
      description: this.description || "",
      args: this.args,
      status: this.status,
      result: this.result,
    };

    // Check if render is a Component class or TemplateRef
    if (this.isComponentClass(toolRender.render)) {
      // Create component dynamically
      this.renderComponent(toolRender.render, props);
    } else if (this.isTemplateRef(toolRender.render)) {
      // Use template
      this.renderTemplate(toolRender.render, props);
    } else {
      console.error(`Invalid render type for tool: ${this.toolName}`);
    }
  }

  private renderComponent(
    componentClass: Type<any>,
    props: ToolCallProps
  ): void {
    // Clear the container
    this.container.clear();

    // Create the component
    this.componentRef = this.container.createComponent(componentClass);

    // Set inputs on the component using setInput
    // Try setting a single 'props' input first
    try {
      this.componentRef.setInput('props', props);
    } catch (e) {
      // If props input doesn't exist, try setting individual inputs
      for (const [key, value] of Object.entries(props)) {
        try {
          this.componentRef.setInput(key, value);
        } catch (inputError) {
          // Input might not exist on the component, skip it
        }
      }
    }

    // Trigger change detection
    this.componentRef.changeDetectorRef.detectChanges();
  }

  private renderTemplate(
    template: TemplateRef<any>,
    props: ToolCallProps
  ): void {
    this.templateRef = template;
    this.templateContext = {
      $implicit: props,
      name: props.name,
      description: props.description,
      args: props.args,
      status: props.status,
      result: props.result,
    };
  }

  private isComponentClass(value: any): value is Type<any> {
    return typeof value === "function" && value.prototype;
  }

  private isTemplateRef(value: any): value is TemplateRef<any> {
    return value instanceof TemplateRef;
  }

  ngOnDestroy(): void {
    if (this.componentRef) {
      this.componentRef.destroy();
    }
  }
}

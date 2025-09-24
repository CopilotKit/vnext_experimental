import { Directive, Input, OnChanges, SimpleChanges, Inject } from "@angular/core";
import { CopilotKitService } from "../core/copilotkit.service";
import { AbstractAgent } from "@ag-ui/client";

/**
 * Directive to configure CopilotKit runtime settings declaratively in templates.
 * 
 * @example
 * ```html
 * <div [copilotkitConfig]="{
 *   runtimeUrl: 'https://api.example.com',
 *   headers: { 'Authorization': 'Bearer token' }
 * }">
 *   <!-- Your app content -->
 * </div>
 * ```
 * 
 * Or with individual inputs:
 * ```html
 * <div copilotkitConfig
 *      [runtimeUrl]="apiUrl"
 *      [headers]="authHeaders"
 *      [agents]="myAgents">
 *   <!-- Your app content -->
 * </div>
 * ```
 */
@Directive({
  selector: "[copilotkitConfig]",
  standalone: true,
})
export class CopilotKitConfigDirective implements OnChanges {
  constructor(@Inject(CopilotKitService) private readonly copilotkit: CopilotKitService) {}

  @Input() copilotkitConfig?: {
    runtimeUrl?: string;
    headers?: Record<string, string>;
    properties?: Record<string, unknown>;
    agents?: Record<string, AbstractAgent>;
  };

  @Input() runtimeUrl?: string;
  @Input() headers?: Record<string, string>;
  @Input() properties?: Record<string, unknown>;
  @Input() agents?: Record<string, AbstractAgent>;

  ngOnChanges(changes: SimpleChanges): void {
    // Handle combined config object
    if (changes['copilotkitConfig']) {
      const config = this.copilotkitConfig;
      if (config) {
        if (config.headers) {
          this.copilotkit.setHeaders(config.headers);
        }
        if (config.properties) {
          this.copilotkit.setProperties(config.properties);
        }
        if (config.agents) {
          this.copilotkit.setAgents(config.agents);
        }
        if (config.runtimeUrl !== undefined) {
          this.copilotkit.setRuntimeUrl(config.runtimeUrl);
        }
      }
    }

    // Handle individual inputs
    if (changes['headers'] && !this.copilotkitConfig) {
      this.copilotkit.setHeaders(this.headers || {});
    }
    if (changes['properties'] && !this.copilotkitConfig) {
      this.copilotkit.setProperties(this.properties || {});
    }
    if (changes['agents'] && !this.copilotkitConfig) {
      this.copilotkit.setAgents(this.agents || {});
    }
    if (changes['runtimeUrl'] && !this.copilotkitConfig) {
      this.copilotkit.setRuntimeUrl(this.runtimeUrl);
    }
  }
}

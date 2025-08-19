import { Directive, Input, OnChanges, SimpleChanges, inject } from "@angular/core";
import { CopilotKitService } from "../core/copilotkit.service";
import { AbstractAgent } from "@ag-ui/client";

/**
 * Directive to configure CopilotKit runtime settings declaratively in templates.
 * 
 * @example
 * ```html
 * <div [copilotKitConfig]="{
 *   runtimeUrl: 'https://api.example.com',
 *   headers: { 'Authorization': 'Bearer token' }
 * }">
 *   <!-- Your app content -->
 * </div>
 * ```
 * 
 * Or with individual inputs:
 * ```html
 * <div copilotKitConfig
 *      [runtimeUrl]="apiUrl"
 *      [headers]="authHeaders"
 *      [agents]="myAgents">
 *   <!-- Your app content -->
 * </div>
 * ```
 */
@Directive({
  selector: "[copilotKitConfig]",
  standalone: true,
})
export class CopilotKitConfigDirective implements OnChanges {
  private readonly copilotKit = inject(CopilotKitService);

  @Input() copilotKitConfig?: {
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
    if (changes['copilotKitConfig']) {
      const config = this.copilotKitConfig;
      if (config) {
        if (config.runtimeUrl !== undefined) {
          this.copilotKit.setRuntimeUrl(config.runtimeUrl);
        }
        if (config.headers) {
          this.copilotKit.setHeaders(config.headers);
        }
        if (config.properties) {
          this.copilotKit.setProperties(config.properties);
        }
        if (config.agents) {
          this.copilotKit.setAgents(config.agents);
        }
      }
    }

    // Handle individual inputs
    if (changes['runtimeUrl'] && !this.copilotKitConfig) {
      this.copilotKit.setRuntimeUrl(this.runtimeUrl);
    }
    if (changes['headers'] && !this.copilotKitConfig) {
      this.copilotKit.setHeaders(this.headers || {});
    }
    if (changes['properties'] && !this.copilotKitConfig) {
      this.copilotKit.setProperties(this.properties || {});
    }
    if (changes['agents'] && !this.copilotKitConfig) {
      this.copilotKit.setAgents(this.agents || {});
    }
  }
}
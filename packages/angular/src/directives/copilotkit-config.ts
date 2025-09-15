import {
  Directive,
  OnChanges,
  SimpleChanges,
  Inject,
  input,
} from "@angular/core";
import { CopilotKit } from "../core/copilotkit";
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
  standalone: true,
  selector: "[copilotkitConfig]",
})
export class CopilotKitConfig implements OnChanges {
  constructor(@Inject(CopilotKit) private readonly copilotkit: CopilotKit) {}

  copilotkitConfig = input<
    | {
        runtimeUrl?: string;
        headers?: Record<string, string>;
        properties?: Record<string, unknown>;
        agents?: Record<string, AbstractAgent>;
      }
    | undefined
  >();

  runtimeUrl = input<string | undefined>(undefined);
  headers = input<Record<string, string> | undefined>(undefined);
  properties = input<Record<string, unknown> | undefined>(undefined);
  agents = input<Record<string, AbstractAgent> | undefined>(undefined);

  ngOnChanges(changes: SimpleChanges): void {
    // Handle combined config object
    if (changes["copilotkitConfig"]) {
      const config = this.copilotkitConfig();
      if (config) {
        if (config.runtimeUrl !== undefined) {
          this.copilotkit.setRuntimeUrl(config.runtimeUrl);
        }
        if (config.headers) {
          this.copilotkit.setHeaders(config.headers);
        }
        if (config.properties) {
          this.copilotkit.setProperties(config.properties);
        }
        if (config.agents) {
          this.copilotkit.setAgents(config.agents);
        }
      }
    }

    // Handle individual inputs
    if (changes["runtimeUrl"] && !this.copilotkitConfig()) {
      this.copilotkit.setRuntimeUrl(this.runtimeUrl());
    }
    if (changes["headers"] && !this.copilotkitConfig()) {
      this.copilotkit.setHeaders(this.headers() || {});
    }
    if (changes["properties"] && !this.copilotkitConfig()) {
      this.copilotkit.setProperties(this.properties() || {});
    }
    if (changes["agents"] && !this.copilotkitConfig()) {
      this.copilotkit.setAgents(this.agents() || {});
    }
  }
}

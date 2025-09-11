import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "wildcard-tool-render",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      style="padding: 12px; margin: 8px 0; background-color: #f5f5f5; border-radius: 8px; border: 1px solid #ddd;"
    >
      <div style="font-weight: bold; margin-bottom: 4px;">
        🔧 Tool Execution
      </div>
      <div style="font-size: 14px; color: #666;">
        <pre>{{ argsJson }}</pre>
      </div>
      <div style="margin-top: 8px; color: #333;">Output: {{ result }}</div>
    </div>
  `,
})
export class WildcardToolRenderComponent {
  @Input({ required: true }) name!: string;
  @Input({ required: true }) args!: any;
  @Input({ required: true }) status!: any;
  @Input() result?: string;

  get argsJson() {
    return JSON.stringify(this.args, null, 2);
  }
}
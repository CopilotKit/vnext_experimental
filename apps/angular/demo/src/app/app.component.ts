import { Component, Input } from "@angular/core";
import {
  CopilotKitConfigDirective,
  CopilotChatComponent,
} from "@copilotkitnext/angular";
import { HeadlessChatComponent } from "./headless-chat.component";
import { CommonModule } from "@angular/common";

// WildcardToolRender component for unmatched tools
@Component({
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

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    CopilotKitConfigDirective,
    CopilotChatComponent,
    HeadlessChatComponent,
  ],
  template: `
    <div
      [copilotkitConfig]="{ runtimeUrl: runtimeUrl }"
      style="height: 100vh; width: 100vw; margin: 0; padding: 0; overflow: hidden; display: block;"
    >
      <ng-container *ngIf="isHeadless; else fullChat">
        <headless-chat></headless-chat>
      </ng-container>
      <ng-template #fullChat>
        <copilot-chat [threadId]="'xyz'"></copilot-chat>
      </ng-template>
    </div>
  `,
})
export class AppComponent {
  runtimeUrl = "http://localhost:3001/api/copilotkit";
  isHeadless =
    typeof window !== "undefined" && window.location?.pathname === "/headless";
}

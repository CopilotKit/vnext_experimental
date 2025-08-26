import { Component } from '@angular/core';
import { CopilotKitConfigDirective, CopilotChatComponent } from '@copilotkit/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CopilotKitConfigDirective, CopilotChatComponent],
  template: `
    <div
      [copilotkitConfig]="{ runtimeUrl: runtimeUrl }"
      style="font-family: system-ui, sans-serif; padding: 24px; display: block;"
    >
      <h1>Hello, Angular Demo</h1>
      <p>If you can see this, the Angular demo shell is working.</p>
      <div style="margin-top: 16px; border-top: 1px solid #ddd; padding-top: 16px;">
        <copilot-chat [threadId]="'xyz'"></copilot-chat>
      </div>
    </div>
  `,
})
export class AppComponent {
  runtimeUrl = 'http://localhost:3001/api/copilotkit';
}

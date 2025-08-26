import { Component } from '@angular/core';
import { CopilotKitConfigDirective, CopilotChatComponent } from '@copilotkit/angular';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CopilotKitConfigDirective, CopilotChatComponent],
  template: `
    <div
      style="height: 100vh; margin: 0; padding: 0; overflow: hidden;"
      copilotkitConfig
      [runtimeUrl]="runtimeUrl"
    >
      <copilot-chat [threadId]="'xyz'"></copilot-chat>
    </div>
  `,
})
export class AppComponent {
  runtimeUrl = 'http://localhost:3001/api/copilotkit';
}


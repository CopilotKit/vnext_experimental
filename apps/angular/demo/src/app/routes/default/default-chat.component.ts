import { Component } from "@angular/core";
import { CommonModule } from "@angular/common";
import { CopilotChatComponent } from "@copilotkitnext/angular";

@Component({
  selector: "default-chat",
  standalone: true,
  imports: [CommonModule, CopilotChatComponent],
  template: `
    <copilot-chat [threadId]="'xyz'"></copilot-chat>
  `
})
export class DefaultChatComponent {}
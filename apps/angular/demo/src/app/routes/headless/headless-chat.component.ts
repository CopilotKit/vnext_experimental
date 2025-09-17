import { Component, ChangeDetectionStrategy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { CopilotKitService, watchAgent } from "@copilotkitnext/angular";
import { CopilotChatToolCallsViewComponent } from "@copilotkitnext/angular";

@Component({
  selector: "headless-chat",
  standalone: true,
  imports: [CommonModule, FormsModule, CopilotChatToolCallsViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="headless-container"
      style="display:flex;flex-direction:column;height:100vh;width:100vw;"
    >
      <div
        class="messages"
        style="flex:1;overflow:auto;padding:16px;background:#f9fafb;color:#111827;"
      >
        <div *ngFor="let m of messages()" style="margin-bottom:16px;">
          <div style="font-weight:600;color:#374151;">
            {{ m.role | titlecase }}
          </div>
          <div style="white-space:pre-wrap">{{ m.content }}</div>
          <ng-container *ngIf="m.role === 'assistant'">
            <copilot-chat-tool-calls-view
              [message]="m"
              [messages]="messages()"
              [isLoading]="isRunning()"
            ></copilot-chat-tool-calls-view>
          </ng-container>
        </div>
        <div *ngIf="isRunning()" style="opacity:0.9;color:#6b7280;">
          Thinking…
        </div>
      </div>

      <form
        (ngSubmit)="send()"
        style="display:flex;gap:8px;padding:12px;background:#ffffff;border-top:1px solid #e5e7eb;"
      >
        <input
          name="message"
          [(ngModel)]="inputValue"
          [disabled]="isRunning()"
          placeholder="Type a message…"
          style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#111827;outline:none;"
        />
        <button
          type="submit"
          [disabled]="!inputValue.trim() || isRunning()"
          style="padding:10px 14px;border-radius:8px;border:1px solid #1d4ed8;background:#2563eb;color:#ffffff;cursor:pointer;"
        >
          Send
        </button>
      </form>
    </div>
  `,
})
export class HeadlessChatComponent {
  // Signals populated from a single watcher in the constructor
  protected agent!: ReturnType<typeof watchAgent>["agent"];
  protected messages!: ReturnType<typeof watchAgent>["messages"];
  protected isRunning!: ReturnType<typeof watchAgent>["isRunning"];
  protected copilotkitService!: CopilotKitService;

  inputValue = "";

  constructor() {
    ({
      agent: this.agent,
      messages: this.messages,
      isRunning: this.isRunning,
    } = watchAgent());
    this.copilotkitService = inject(CopilotKitService);
  }

  async send() {
    const content = this.inputValue.trim();
    const agent = this.agent();
    if (!agent || !content) return;

    agent.addMessage({ id: crypto.randomUUID(), role: "user", content } as any);
    this.inputValue = "";

    try {
      await this.copilotkitService.copilotkit.runAgent({
        agent,
        agentId: agent.agentId,
      });
    } catch (e) {
      console.error("Agent run error", e);
    }
  }
}

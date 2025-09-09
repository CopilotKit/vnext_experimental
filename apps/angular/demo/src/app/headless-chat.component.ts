import { Component, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { watchAgent } from "@copilotkitnext/angular";
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
        style="flex:1;overflow:auto;padding:16px;background:#0b0f16;color:#e6edf3;"
      >
        <div *ngFor="let m of messages()" style="margin-bottom:16px;">
          <div style="font-weight:600;color:#9fb3c8;">
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
        <div *ngIf="isRunning()" style="opacity:0.8;color:#9fb3c8;">
          Thinking…
        </div>
      </div>

      <form
        (ngSubmit)="send()"
        style="display:flex;gap:8px;padding:12px;background:#0f1722;border-top:1px solid #1b2533;"
      >
        <input
          name="message"
          [(ngModel)]="inputValue"
          [disabled]="isRunning()"
          placeholder="Type a message…"
          style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid #223043;background:#0b0f16;color:#e6edf3;outline:none;"
        />
        <button
          type="submit"
          [disabled]="!inputValue.trim() || isRunning()"
          style="padding:10px 14px;border-radius:8px;border:1px solid #2a415a;background:#1a2a3c;color:#e6edf3;cursor:pointer;"
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

  inputValue = "";

  constructor() {
    ({
      agent: this.agent,
      messages: this.messages,
      isRunning: this.isRunning,
    } = watchAgent());
  }

  async send() {
    const content = this.inputValue.trim();
    const agent = this.agent();
    if (!agent || !content) return;

    agent.addMessage({ id: crypto.randomUUID(), role: "user", content } as any);
    this.inputValue = "";

    try {
      await agent.runAgent();
    } catch (e) {
      console.error("Agent run error", e);
    }
  }
}

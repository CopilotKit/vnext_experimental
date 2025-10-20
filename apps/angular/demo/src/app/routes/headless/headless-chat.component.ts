import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  ViewChild,
  computed,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { CopilotKit, injectAgentStore } from "@copilotkitnext/angular";
import { RenderToolCalls } from "@copilotkitnext/angular";
import type { BinaryInputContent, InputContent, Message, TextInputContent } from "@ag-ui/client";
import {
  getUserMessageBinaryContents,
  getUserMessageTextContent,
  isUserMessageContentEmpty,
} from "@copilotkitnext/shared";

@Component({
  selector: "headless-chat",
  standalone: true,
  imports: [CommonModule, FormsModule, RenderToolCalls],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="headless-container" style="display:flex;flex-direction:column;height:100vh;width:100vw;">
      <div class="messages" style="flex:1;overflow:auto;padding:16px;background:#f9fafb;color:#111827;">
        <div *ngFor="let m of messages()" style="margin-bottom:16px;">
          <div style="font-weight:600;color:#374151;">
            {{ m.role | titlecase }}
          </div>
          <div style="white-space:pre-wrap" *ngIf="messageText(m) as text">{{ text }}</div>
          <ng-container *ngIf="m.role === 'user'">
            <ng-container *ngIf="userAttachments(m) as attachments">
              <div
                *ngIf="attachments.length"
                style="margin-top:8px;display:flex;gap:12px;flex-wrap:wrap;"
              >
                <ng-container *ngFor="let attachment of attachments; trackBy: trackAttachment">
                  <figure
                    *ngIf="isImage(attachment); else fileAttachment"
                    style="display:flex;flex-direction:column;gap:6px;max-width:160px;"
                  >
                    <img
                      [src]="resolveSource(attachment)"
                      [alt]="attachment.filename || attachment.id || attachment.mimeType"
                      style="width:100%;border-radius:8px;border:1px solid #d1d5db;object-fit:contain;background:#fff;"
                    />
                    <figcaption style="font-size:12px;color:#4b5563;">
                      {{ attachment.filename || attachment.id || 'Attachment' }}
                    </figcaption>
                  </figure>
                  <ng-template #fileAttachment>
                    <div
                      style="padding:10px 12px;border-radius:8px;border:1px dashed #cbd5f5;background:#f8fafc;color:#1f2937;font-size:12px;"
                    >
                      <div style="font-weight:600;">{{ attachment.filename || attachment.id || 'Attachment' }}</div>
                      <div style="margin-top:4px;word-break:break-all;">{{ attachment.mimeType }}</div>
                      <a
                        *ngIf="resolveSource(attachment) as href"
                        [href]="href"
                        target="_blank"
                        rel="noreferrer"
                        style="display:inline-block;margin-top:6px;color:#2563eb;text-decoration:underline;"
                      >
                        Open
                      </a>
                    </div>
                  </ng-template>
                </ng-container>
              </div>
            </ng-container>
          </ng-container>
          <ng-container *ngIf="m.role === 'assistant'">
            <copilot-render-tool-calls
              [message]="m"
              [messages]="messages() ?? []"
              [isLoading]="isRunning()"
            ></copilot-render-tool-calls>
          </ng-container>
        </div>
        <div *ngIf="isRunning()" style="opacity:0.9;color:#6b7280;">Thinking…</div>
      </div>

      <form
        (ngSubmit)="send()"
        style="display:flex;flex-direction:column;gap:12px;padding:12px;background:#ffffff;border-top:1px solid #e5e7eb;"
      >
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <input
            #fileInput
            type="file"
            multiple
            (change)="onFilesSelected($event)"
            [disabled]="isRunning()"
            style="padding:8px;border-radius:8px;border:1px dashed #cbd5f5;background:#f8fafc;color:#1e293b;"
          />
          <button
            type="button"
            *ngIf="selectedFiles.length"
            (click)="clearSelectedFiles()"
            style="padding:8px 10px;border-radius:6px;border:1px solid #d1d5db;background:#f9fafb;color:#1f2937;cursor:pointer;"
          >
            Clear files
          </button>
        </div>

        <div *ngIf="selectedFiles.length" style="display:flex;gap:8px;flex-wrap:wrap;">
          <span
            *ngFor="let file of selectedFiles; let i = index"
            style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:9999px;background:#e0f2fe;color:#1e3a8a;font-size:12px;"
          >
            {{ file.name }}
            <button
              type="button"
              (click)="removeFile(i)"
              style="border:none;background:transparent;color:#1e3a8a;font-weight:600;cursor:pointer;"
              aria-label="Remove file"
            >
              ×
            </button>
          </span>
        </div>

        <input
          name="message"
          [(ngModel)]="inputValue"
          [disabled]="isRunning()"
          placeholder="Type a message…"
          style="flex:1;padding:10px 12px;border-radius:8px;border:1px solid #d1d5db;background:#ffffff;color:#111827;outline:none;"
        />
        <button
          type="submit"
          [disabled]="isSendButtonDisabled()"
          style="align-self:flex-end;padding:10px 14px;border-radius:8px;border:1px solid #1d4ed8;background:#2563eb;color:#ffffff;cursor:pointer;"
        >
          Send
        </button>
      </form>
    </div>
  `,
})
export class HeadlessChatComponent {
  readonly agentStore = injectAgentStore("multimodal");
  readonly agent = computed(() => this.agentStore()?.agent);
  readonly isRunning = computed(() => !!this.agentStore()?.isRunning());
  readonly messages = computed(() => this.agentStore()?.messages());
  readonly copilotkit = inject(CopilotKit);

  @ViewChild("fileInput") fileInput?: ElementRef<HTMLInputElement>;

  inputValue = "";
  selectedFiles: File[] = [];

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const files = input?.files ? Array.from(input.files) : [];
    if (files.length === 0) {
      return;
    }

    const existingKeys = new Set(this.selectedFiles.map((file) => this.#fileKey(file)));
    const merged: File[] = [...this.selectedFiles];

    for (const file of files) {
      const key = this.#fileKey(file);
      if (!existingKeys.has(key)) {
        merged.push(file);
        existingKeys.add(key);
      }
    }

    this.selectedFiles = merged;

    if (input) {
      input.value = "";
    }
  }

  removeFile(index: number) {
    if (index < 0 || index >= this.selectedFiles.length) {
      return;
    }
    this.selectedFiles = this.selectedFiles.filter((_, i) => i !== index);
    if (this.selectedFiles.length === 0 && this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = "";
    }
  }

  clearSelectedFiles() {
    this.selectedFiles = [];
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = "";
    }
  }

  isSendButtonDisabled(): boolean {
    if (this.isRunning()) {
      return true;
    }
    const hasText = this.inputValue.trim().length > 0;
    const hasFiles = this.selectedFiles.length > 0;
    return !hasText && !hasFiles;
  }

  async send() {
    const content = this.inputValue.trim();
    const agent = this.agent();
    const isRunning = this.isRunning();

    if (!agent || isRunning) return;

    const attachments = await Promise.all(this.selectedFiles.map((file) => this.#fileToBinaryContent(file)));

    const parts: InputContent[] = [];

    if (content.length > 0) {
      parts.push({
        type: "text",
        text: content,
      } satisfies TextInputContent);
    }

    parts.push(...attachments);

    if (isUserMessageContentEmpty(parts)) {
      return;
    }

    const messageContent = attachments.length === 0 && parts.length === 1 && content.length > 0 ? content : parts;

    agent.addMessage({ id: crypto.randomUUID(), role: "user", content: messageContent });
    this.inputValue = "";
    this.clearSelectedFiles();

    try {
      await this.copilotkit.core.runAgent({ agent });
    } catch (e) {
      console.error("Agent run error", e);
    }
  }

  messageText(message: Message): string | undefined {
    if (message.role === "user") {
      const text = getUserMessageTextContent(message.content ?? []);
      return text.trim().length > 0 ? text : undefined;
    }

    if (typeof message.content === "string" && message.content.length > 0) {
      return message.content;
    }

    return undefined;
  }

  userAttachments(message: Message): BinaryInputContent[] {
    if (message.role !== "user") {
      return [];
    }
    const content = (message.content ?? []) as string | InputContent[];
    return getUserMessageBinaryContents(content);
  }

  resolveSource(attachment: BinaryInputContent): string | null {
    if (attachment.url) {
      return attachment.url;
    }
    if (attachment.data) {
      return `data:${attachment.mimeType};base64,${attachment.data}`;
    }
    return null;
  }

  isImage(attachment: BinaryInputContent): boolean {
    const source = this.resolveSource(attachment);
    return !!source && attachment.mimeType.startsWith("image/");
  }

  trackAttachment(index: number, attachment: BinaryInputContent): string {
    return attachment.id ?? attachment.url ?? attachment.filename ?? `${index}`;
  }

  async #fileToBinaryContent(file: File): Promise<BinaryInputContent> {
    const data = await this.#readFileAsBase64(file);
    return {
      type: "binary",
      mimeType: file.type || "application/octet-stream",
      filename: file.name,
      data,
    } satisfies BinaryInputContent;
  }

  #fileKey(file: File): string {
    return `${file.name}:${file.size}:${file.lastModified}:${file.type}`;
  }

  #readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string") {
          const commaIndex = result.indexOf(",");
          resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
        } else {
          reject(new Error("Unexpected file reader result"));
        }
      };
      reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }
}

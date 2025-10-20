import {
  Component,
  input,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  computed,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { cn } from "../../utils";
import type { BinaryInputContent, InputContent } from "@ag-ui/client";
import {
  getUserMessageBinaryContents,
  getUserMessageTextContent,
} from "@copilotkitnext/shared";

@Component({
  selector: "copilot-chat-user-message-renderer",
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    "[class]": "computedClass()",
  },
  template: `
    @if (textContent()) {
      <span>{{ textContent() }}</span>
    }
    @if (resolvedAttachments().length) {
      <div [class]="attachmentsClass()">
        @for (attachment of resolvedAttachments(); track trackAttachment(attachment, $index)) {
          <ng-container *ngIf="isImage(attachment); else fileTemplate">
            <figure class="flex flex-col gap-1">
              <img
                [src]="resolveSource(attachment)"
                [alt]="attachment.filename || attachment.id || attachment.mimeType"
                class="max-h-64 rounded-lg border border-border object-contain"
              />
              @if (attachment.filename || attachment.id) {
                <figcaption class="text-xs text-muted-foreground">
                  {{ attachment.filename || attachment.id }}
                </figcaption>
              }
            </figure>
          </ng-container>
          <ng-template #fileTemplate>
            <div class="rounded-md border border-dashed border-border bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
              {{ attachment.filename || attachment.id || 'Attachment' }}
              <span class="block text-[10px] uppercase tracking-wide text-muted-foreground/70">
                {{ attachment.mimeType }}
              </span>
              @if (resolveSource(attachment) && !isImage(attachment)) {
                <a
                  [href]="resolveSource(attachment)"
                  target="_blank"
                  rel="noreferrer"
                  class="mt-1 block text-xs text-primary underline"
                >
                  Open
                </a>
              }
            </div>
          </ng-template>
        }
      </div>
    }
  `,
})
export class CopilotChatUserMessageRenderer {
  readonly content = input<string>("");
  readonly contents = input<InputContent[]>([]);
  readonly attachments = input<BinaryInputContent[] | undefined>(undefined);
  readonly inputClass = input<string | undefined>();

  readonly computedClass = computed(() => {
    return cn(
      "prose dark:prose-invert bg-muted relative max-w-[80%] rounded-[18px] px-4 py-1.5 data-[multiline]:py-3 inline-block whitespace-pre-wrap",
      this.inputClass()
    );
  });

  readonly textContent = computed(() => {
    const explicit = this.content();
    if (explicit && explicit.length > 0) {
      return explicit;
    }
    return getUserMessageTextContent(this.contents());
  });

  readonly resolvedAttachments = computed(() => {
    const provided = this.attachments() ?? [];
    if (provided.length > 0) {
      return provided;
    }
    return getUserMessageBinaryContents(this.contents());
  });

  readonly attachmentsClass = computed(() =>
    this.textContent().trim().length > 0
      ? "mt-3 flex flex-col gap-2"
      : "flex flex-col gap-2",
  );

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
    return attachment.mimeType.startsWith("image/") && !!this.resolveSource(attachment);
  }

  trackAttachment(attachment: BinaryInputContent, index: number): string {
    return attachment.id ?? attachment.url ?? attachment.filename ?? index.toString();
  }
}

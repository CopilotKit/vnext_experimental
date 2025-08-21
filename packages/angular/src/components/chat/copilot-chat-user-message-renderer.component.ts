import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  computed,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../lib/utils';

@Component({
  selector: 'copilot-chat-user-message-renderer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'computedClass()'
  },
  template: `{{ content }}`
})
export class CopilotChatUserMessageRendererComponent {
  @Input() content = '';
  @Input() set inputClass(value: string | undefined) {
    this.customClass.set(value);
  }
  
  private customClass = signal<string | undefined>(undefined);
  
  computedClass = computed(() => {
    return cn(
      "prose dark:prose-invert bg-muted relative max-w-[80%] rounded-[18px] px-4 py-1.5 data-[multiline]:py-3 inline-block whitespace-pre-wrap",
      this.customClass()
    );
  });
}
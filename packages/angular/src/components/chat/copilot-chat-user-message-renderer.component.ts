import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ViewEncapsulation,
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
  template: `
    <div [class]="computedClass()" [attr.data-multiline]="isMultiline() ? '' : null">
      {{ content }}
    </div>
  `
})
export class CopilotChatUserMessageRendererComponent {
  @Input() content = '';
  @Input() inputClass?: string;
  
  isMultiline = signal(false);
  
  ngOnChanges() {
    // Check if content has multiple lines
    this.isMultiline.set(this.content.includes('\n') || this.content.length > 100);
  }
  
  computedClass = signal<string>('');
  
  ngOnInit() {
    this.computedClass.set(
      cn(
        'prose dark:prose-invert bg-muted relative max-w-[80%] rounded-[18px] px-4 py-1.5',
        'data-[multiline]:py-3 inline-block whitespace-pre-wrap',
        this.inputClass
      )
    );
  }
}
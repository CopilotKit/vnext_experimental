import {
  Component,
  Input,
  signal,
  computed,
  ChangeDetectionStrategy,
  ViewEncapsulation
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../lib/utils';

@Component({
  selector: 'copilot-chat-toolbar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div [class]="computedClass()">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class CopilotChatToolbarComponent {
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  customClass = signal<string | undefined>(undefined);
  
  computedClass = computed(() => {
    const baseClasses = 'w-full h-[60px] bg-transparent flex items-center justify-between';
    return cn(baseClasses, this.customClass());
  });
}
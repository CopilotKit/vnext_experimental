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
  selector: 'div[copilotChatUserMessageToolbar]',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-content></ng-content>
  `,
  host: {
    '[class]': 'computedClass()'
  }
})
export class CopilotChatUserMessageToolbarComponent {
  @Input() inputClass?: string;
  
  computedClass = signal<string>('');
  
  ngOnInit() {
    this.computedClass.set(
      cn(
        "w-full bg-transparent flex items-center justify-end -mr-[5px] mt-[4px] invisible group-hover:visible",
        this.inputClass
      )
    );
  }
}
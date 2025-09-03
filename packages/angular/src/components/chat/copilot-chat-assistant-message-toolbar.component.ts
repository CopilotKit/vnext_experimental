import {
  Directive,
  Input,
  signal,
  computed
} from '@angular/core';
import { cn } from '../../lib/utils';

@Directive({
  selector: '[copilotChatAssistantMessageToolbar]',
  standalone: true,
  host: {
    '[class]': 'computedClass()'
  }
})
export class CopilotChatAssistantMessageToolbarComponent {
  @Input() set inputClass(value: string | undefined) {
    this.customClass.set(value);
  }
  
  private customClass = signal<string | undefined>(undefined);
  
  computedClass = computed(() => {
    return cn(
      'w-full bg-transparent flex items-center -ml-[5px] -mt-[0px]',
      this.customClass()
    );
  });
}
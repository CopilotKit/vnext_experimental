import {
  Component,
  Input,
  signal,
  computed,
  ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'copilot-chat-toolbar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="computedClass()">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    
    .toolbar {
      width: 100%;
      height: 60px;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0.5rem;
    }
    
    :host ::ng-deep .toolbar-left {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    
    :host ::ng-deep .toolbar-right {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
  `],
  host: {
    '[class.copilot-chat-toolbar]': 'true'
  }
})
export class CopilotChatToolbarComponent {
  @Input() set inputClass(val: string | undefined) {
    this.customClass.set(val);
  }
  
  customClass = signal<string | undefined>(undefined);
  
  computedClass = computed(() => {
    const baseClasses = 'toolbar';
    return this.customClass() || baseClasses;
  });
}
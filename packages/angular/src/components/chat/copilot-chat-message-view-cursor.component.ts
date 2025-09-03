import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  computed,
  signal,
  OnInit,
  OnChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { cn } from '../../lib/utils';

/**
 * Cursor component that matches the React implementation exactly.
 * Shows a pulsing dot animation to indicate activity.
 */
@Component({
  selector: 'copilot-chat-message-view-cursor',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div
      [class]="computedClass()"
    ></div>
  `
})
export class CopilotChatMessageViewCursorComponent implements OnInit, OnChanges {
  @Input() inputClass?: string;
  
  // Signal for reactive class updates
  private inputClassSignal = signal<string | undefined>(undefined);
  
  // Computed class that matches React exactly: w-[11px] h-[11px] rounded-full bg-foreground animate-pulse-cursor ml-1
  computedClass = computed(() => 
    cn(
      'w-[11px] h-[11px] rounded-full bg-foreground animate-pulse-cursor ml-1',
      this.inputClassSignal()
    )
  );
  
  ngOnInit() {
    this.inputClassSignal.set(this.inputClass);
  }
  
  ngOnChanges() {
    this.inputClassSignal.set(this.inputClass);
  }
}
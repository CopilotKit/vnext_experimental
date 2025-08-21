import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  computed,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, ChevronLeft, ChevronRight } from 'lucide-angular';
import { 
  type UserMessage,
  type CopilotChatUserMessageOnSwitchToBranchProps 
} from './copilot-chat-user-message.types';
import { cn } from '../../lib/utils';

@Component({
  selector: 'copilot-chat-user-message-branch-navigation',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (showNavigation()) {
      <div [class]="computedClass()">
        <button
          type="button"
          [class]="buttonClass"
          [disabled]="!canGoPrev()"
          (click)="handlePrevious()">
          <lucide-angular [img]="ChevronLeftIcon" [size]="20"></lucide-angular>
        </button>
        <span class="text-sm text-muted-foreground px-0 font-medium">
          {{ currentBranchSignal() + 1 }}/{{ numberOfBranchesSignal() }}
        </span>
        <button
          type="button"
          [class]="buttonClass"
          [disabled]="!canGoNext()"
          (click)="handleNext()">
          <lucide-angular [img]="ChevronRightIcon" [size]="20"></lucide-angular>
        </button>
      </div>
    }
  `
})
export class CopilotChatUserMessageBranchNavigationComponent {
  @Input() set currentBranch(val: number) {
    this.currentBranchSignal.set(val);
  }
  @Input() set numberOfBranches(val: number) {
    this.numberOfBranchesSignal.set(val);
  }
  @Input() message!: UserMessage;
  @Input() inputClass?: string;
  @Output() switchToBranch = new EventEmitter<CopilotChatUserMessageOnSwitchToBranchProps>();
  
  readonly ChevronLeftIcon = ChevronLeft;
  readonly ChevronRightIcon = ChevronRight;
  
  currentBranchSignal = signal(0);
  numberOfBranchesSignal = signal(1);
  
  readonly buttonClass = cn(
    // Flex centering
    'inline-flex items-center justify-center',
    // Cursor
    'cursor-pointer',
    // Background and text
    'p-0 text-[rgb(93,93,93)] hover:bg-[#E8E8E8]',
    // Dark mode
    'dark:text-[rgb(243,243,243)] dark:hover:bg-[#303030]',
    // Shape and sizing
    'h-6 w-6 rounded-md',
    // Interactions
    'transition-colors',
    // Disabled state
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );
  
  showNavigation = computed(() => {
    const branches = this.numberOfBranchesSignal();
    return branches > 1;
  });
  
  canGoPrev = computed(() => {
    return this.currentBranchSignal() > 0;
  });
  
  canGoNext = computed(() => {
    return this.currentBranchSignal() < this.numberOfBranchesSignal() - 1;
  });
  
  computedClass = computed(() => {
    return cn('flex items-center gap-1', this.inputClass);
  });
  
  handlePrevious(): void {
    if (this.canGoPrev()) {
      const newIndex = this.currentBranchSignal() - 1;
      this.switchToBranch.emit({
        branchIndex: newIndex,
        numberOfBranches: this.numberOfBranchesSignal(),
        message: this.message
      });
    }
  }
  
  handleNext(): void {
    if (this.canGoNext()) {
      const newIndex = this.currentBranchSignal() + 1;
      this.switchToBranch.emit({
        branchIndex: newIndex,
        numberOfBranches: this.numberOfBranchesSignal(),
        message: this.message
      });
    }
  }
}
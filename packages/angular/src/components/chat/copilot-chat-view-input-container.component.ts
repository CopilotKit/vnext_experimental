import {
  Component,
  Input,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  forwardRef,
  ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotSlotComponent } from '../../lib/slots/copilot-slot.component';
import { CopilotChatInputComponent } from './copilot-chat-input.component';
import { CopilotChatViewDisclaimerComponent } from './copilot-chat-view-disclaimer.component';
import { cn } from '../../lib/utils';

/**
 * InputContainer component for CopilotChatView
 * Container for input and disclaimer components
 * Uses ForwardRef for DOM access
 */
@Component({
  selector: 'copilot-chat-view-input-container',
  standalone: true,
  imports: [
    CommonModule,
    CopilotSlotComponent,
    CopilotChatInputComponent,
    CopilotChatViewDisclaimerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: ElementRef,
      useExisting: forwardRef(() => CopilotChatViewInputContainerComponent)
    }
  ],
  template: `
    <div [class]="computedClass">
      <!-- Input component -->
      <div class="max-w-3xl mx-auto py-0 px-4 sm:px-0">
        <copilot-slot
          [slot]="input"
          [context]="mergedInputContext"
          [defaultComponent]="defaultInputComponent">
        </copilot-slot>
      </div>
      
      <!-- Disclaimer - always rendered like in React -->
      <copilot-slot
        [slot]="disclaimer"
        [context]="disclaimerProps || {}"
        [defaultComponent]="defaultDisclaimerComponent">
      </copilot-slot>
    </div>
  `
})
export class CopilotChatViewInputContainerComponent extends ElementRef {
  @Input() inputClass?: string;
  
  // Input slot configuration
  @Input() input?: any;
  @Input() inputContext?: any;
  @Input() inputProps?: any;
  
  // Disclaimer slot configuration
  @Input() disclaimer?: any;
  @Input() disclaimerProps?: any;
  
  // Default components
  protected readonly defaultInputComponent = CopilotChatInputComponent;
  protected readonly defaultDisclaimerComponent = CopilotChatViewDisclaimerComponent;
  
  constructor(elementRef: ElementRef) {
    super(elementRef.nativeElement);
  }
  
  // Computed class matching React exactly
  get computedClass(): string {
    return cn(
      'absolute bottom-0 left-0 right-0 z-20',
      this.inputClass
    );
  }
  
  // Merged input context
  get mergedInputContext(): any {
    return { ...this.inputContext, ...this.inputProps };
  }
}
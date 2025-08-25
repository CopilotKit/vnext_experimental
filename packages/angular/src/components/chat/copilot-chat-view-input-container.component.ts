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
          [context]="{ className: inputClass }"
          [defaultComponent]="defaultInputComponent">
        </copilot-slot>
      </div>
      
      <!-- Disclaimer - always rendered like in React -->
      <copilot-slot
        [slot]="disclaimer"
        [context]="{ text: disclaimerText, inputClass: disclaimerClass }"
        [defaultComponent]="defaultDisclaimerComponent">
      </copilot-slot>
    </div>
  `
})
export class CopilotChatViewInputContainerComponent extends ElementRef {
  @Input() inputContainerClass?: string;
  
  // Input slot configuration
  @Input() input?: any;
  @Input() inputClass?: string;
  
  // Disclaimer slot configuration
  @Input() disclaimer?: any;
  @Input() disclaimerText?: string;
  @Input() disclaimerClass?: string;
  
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
      this.inputContainerClass
    );
  }
  
  // Removed mergedInputContext - no longer needed
}
import {
  Component,
  Input,
  TemplateRef,
  ViewContainerRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  Inject,
  ChangeDetectionStrategy,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { renderSlot } from './slot.utils';
import { Type } from '@angular/core';

/**
 * Simple slot component for rendering custom content or defaults.
 * Supports templates, components, CSS classes, and property overrides.
 * 
 * @example
 * ```html
 * <!-- With template -->
 * <copilot-slot [slot]="sendButtonTemplate" [context]="buttonContext">
 *   <button class="default-btn">Default</button>
 * </copilot-slot>
 * 
 * <!-- With props for tweaking default -->
 * <copilot-slot [props]="{ className: 'custom' }">
 *   <button class="default-btn">Default</button>
 * </copilot-slot>
 * ```
 */
@Component({
  selector: 'copilot-slot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- If slot template provided, render it -->
    <ng-container *ngIf="slot && isTemplate(slot)"
                  [ngTemplateOutlet]="slot"
                  [ngTemplateOutletContext]="context || {}">
    </ng-container>
    
    <!-- If not a template, we'll handle in code -->
    <ng-container #slotContainer></ng-container>
    
    <!-- Default content (only shown if no slot) -->
    <ng-content *ngIf="!slot && !defaultComponent"></ng-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CopilotSlotComponent implements OnInit, OnChanges {
  @Input() slot?: TemplateRef<any> | Type<any> | string | Record<string, any>;
  @Input() context?: any;
  @Input() props?: any;
  @Input() defaultComponent?: Type<any>;
  
  @ViewChild('slotContainer', { read: ViewContainerRef, static: true }) 
  private slotContainer!: ViewContainerRef;
  
  constructor(
    @Inject(ViewContainerRef) private viewContainer: ViewContainerRef
  ) {}
  
  ngOnInit(): void {
    this.renderSlot();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slot'] || changes['props'] || changes['context']) {
      this.renderSlot();
    }
  }
  
  isTemplate(value: any): value is TemplateRef<any> {
    return value instanceof TemplateRef;
  }
  
  private renderSlot(): void {
    // Skip if it's a template (handled by ngTemplateOutlet)
    if (this.slot && this.isTemplate(this.slot)) {
      return;
    }
    
    // Clear previous content
    this.slotContainer.clear();
    
    // Skip if no slot and no default component
    if (!this.slot && !this.defaultComponent) {
      return;
    }
    
    // Use the utility to render other slot types
    if (this.slot || this.defaultComponent) {
      renderSlot(this.slotContainer, {
        slot: this.slot,
        defaultComponent: this.defaultComponent!,
        props: { ...this.context, ...this.props }
      });
    }
  }
}
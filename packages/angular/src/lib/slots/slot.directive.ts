import {
  Directive,
  Input,
  ViewContainerRef,
  OnInit,
  OnChanges,
  SimpleChanges,
  TemplateRef,
  ComponentRef,
  EmbeddedViewRef,
  Injector,
  isDevMode,
  Inject
} from '@angular/core';
import type { Type } from '@angular/core';
import type { SlotValue, SlotContext } from './slot.types';

/**
 * Directive for rendering flexible slot content.
 * Supports components, templates, CSS classes, and property overrides.
 * 
 * @example
 * ```html
 * <!-- With component -->
 * <ng-container [copilotSlot]="CustomButton" [slotDefault]="DefaultButton"></ng-container>
 * 
 * <!-- With template -->
 * <ng-container [copilotSlot]="buttonTemplate" [slotDefault]="DefaultButton"></ng-container>
 * 
 * <!-- With CSS class -->
 * <ng-container [copilotSlot]="'custom-button'" [slotDefault]="DefaultButton"></ng-container>
 * 
 * <!-- With props -->
 * <ng-container 
 *   [copilotSlot]="buttonOverride" 
 *   [slotDefault]="DefaultButton"
 *   [slotProps]="{ text: 'Send', disabled: false }">
 * </ng-container>
 * ```
 */
@Directive({
  selector: '[copilotSlot]',
  standalone: true
})
export class CopilotSlotDirective<T = any> implements OnInit, OnChanges {
  @Input('copilotSlot') slot?: SlotValue<T>;
  @Input() slotDefault!: Type<T>;
  @Input() slotProps?: T;
  @Input() slotContext?: SlotContext<T>;
  @Input() slotInjector?: Injector;

  private currentView?: ComponentRef<T> | EmbeddedViewRef<T>;

  constructor(
    @Inject(ViewContainerRef) private readonly viewContainerRef: ViewContainerRef,
    @Inject(Injector) private readonly injector: Injector
  ) {}

  ngOnInit(): void {
    this.render();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    // Always re-render on any input change
    this.render();
  }

  private render(): void {
    this.clear();

    if (!this.slotDefault) {
      if (isDevMode()) {
        throw new Error('CopilotSlotDirective: slotDefault is required');
      }
      return;
    }

    const effectiveSlot = this.slot ?? this.slotDefault;
    const effectiveInjector = this.slotInjector ?? this.injector;

    if (typeof effectiveSlot === 'string') {
      // String: treat as CSS class for default component
      this.renderComponent(this.slotDefault, effectiveInjector, effectiveSlot);
    } else if (effectiveSlot instanceof TemplateRef) {
      // TemplateRef: render the template
      this.renderTemplate(effectiveSlot);
    } else if (this.isComponentType(effectiveSlot)) {
      // Component type: render the component
      this.renderComponent(effectiveSlot as Type<T>, effectiveInjector);
    } else if (typeof effectiveSlot === 'object') {
      // Object: treat as property overrides for default component
      this.renderComponent(this.slotDefault, effectiveInjector, undefined, effectiveSlot as Partial<T>);
    } else {
      // Default: render default component
      this.renderComponent(this.slotDefault, effectiveInjector);
    }
  }

  private renderComponent(
    component: Type<T>,
    injector: Injector,
    cssClass?: string,
    additionalProps?: Partial<T>
  ): void {
    const componentRef = this.viewContainerRef.createComponent(component, {
      injector
    });

    // Apply CSS class if provided
    if (cssClass && componentRef.location.nativeElement) {
      const element = componentRef.location.nativeElement as HTMLElement;
      element.className = cssClass;
    }

    // Apply props
    const props = { ...this.slotProps, ...additionalProps };
    if (props) {
      Object.assign(componentRef.instance as any, props);
    }

    this.currentView = componentRef;
  }

  private renderTemplate(template: TemplateRef<any>): void {
    const context = this.slotContext ?? {
      $implicit: this.slotProps ?? {},
      props: this.slotProps ?? {}
    };

    const viewRef = this.viewContainerRef.createEmbeddedView(template, context as any);
    this.currentView = viewRef;
  }

  private clear(): void {
    if (this.currentView) {
      this.currentView.destroy();
      this.currentView = undefined;
    }
    this.viewContainerRef.clear();
  }

  private isComponentType(value: any): boolean {
    return typeof value === 'function' && value.prototype && value.prototype.constructor;
  }

  ngOnDestroy(): void {
    this.clear();
  }
}

/**
 * Helper directive for simpler slot usage with content projection fallback
 */
@Directive({
  selector: '[copilotSlotContent]',
  standalone: true
})
export class CopilotSlotContentDirective implements OnInit {
  @Input() copilotSlotContent?: SlotValue<any>;
  @Input() slotContentDefault!: Type<any>;
  @Input() slotContentProps?: any;

  constructor(
    @Inject(ViewContainerRef) private readonly viewContainerRef: ViewContainerRef,
    @Inject(Injector) private readonly injector: Injector
  ) {}

  ngOnInit(): void {
    // Check if there's projected content first
    const hasProjectedContent = this.viewContainerRef.element.nativeElement.children.length > 0;
    
    if (!hasProjectedContent && (this.copilotSlotContent || this.slotContentDefault)) {
      // No projected content, render the slot content
      this.renderSlot();
    }
  }

  private renderSlot(): void {
    const effectiveSlot = this.copilotSlotContent ?? this.slotContentDefault;
    
    if (typeof effectiveSlot === 'string') {
      // String: treat as CSS class for default component
      this.renderComponent(this.slotContentDefault, effectiveSlot);
    } else if (effectiveSlot instanceof TemplateRef) {
      // TemplateRef: render the template
      this.renderTemplate(effectiveSlot);
    } else if (this.isComponentType(effectiveSlot)) {
      // Component type: render the component
      this.renderComponent(effectiveSlot as Type<any>);
    } else if (typeof effectiveSlot === 'object') {
      // Object: treat as property overrides for default component
      this.renderComponent(this.slotContentDefault, undefined, effectiveSlot);
    } else {
      // Default: render default component
      this.renderComponent(this.slotContentDefault);
    }
  }

  private renderComponent(
    component: Type<any>,
    cssClass?: string,
    additionalProps?: any
  ): void {
    const componentRef = this.viewContainerRef.createComponent(component, {
      injector: this.injector
    });

    // Apply CSS class if provided
    if (cssClass && componentRef.location.nativeElement) {
      const element = componentRef.location.nativeElement as HTMLElement;
      element.className = cssClass;
    }

    // Apply props
    const props = { ...this.slotContentProps, ...additionalProps };
    if (props) {
      Object.assign(componentRef.instance, props);
    }
  }

  private renderTemplate(template: TemplateRef<any>): void {
    const context = {
      $implicit: this.slotContentProps ?? {},
      props: this.slotContentProps ?? {}
    };

    this.viewContainerRef.createEmbeddedView(template, context);
  }

  private isComponentType(value: any): boolean {
    return typeof value === 'function' && value.prototype && value.prototype.constructor;
  }

  ngOnDestroy(): void {
    this.viewContainerRef.clear();
  }
}
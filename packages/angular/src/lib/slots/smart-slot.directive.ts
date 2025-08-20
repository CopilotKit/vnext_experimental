import {
  Directive,
  Input,
  OnInit,
  OnDestroy,
  TemplateRef,
  ViewContainerRef,
  ElementRef,
  Inject,
  Optional,
  ComponentRef,
  EmbeddedViewRef
} from '@angular/core';
import { SlotRegistryService, SlotConfig } from './slot-registry.service';

/**
 * Smart slot directive that handles multiple slot types:
 * - Templates: <ng-template slot="...">
 * - Components: <my-component slot="...">
 * - Classes: <slot name="..." class="...">
 * - Props: <slot name="..." [props]="...">
 * - Values: <slot name="..." [value]="...">
 */
@Directive({
  selector: '[slot], slot',
  standalone: true
})
export class SmartSlotDirective implements OnInit, OnDestroy {
  @Input() slot?: string;
  @Input() name?: string; // Alternative to slot
  
  // Different value types
  @Input() class?: string;
  @Input() props?: Record<string, any>;
  @Input() value?: any;
  
  // Common HTML attributes that might be passed
  @Input() style?: Record<string, any> | string;
  @Input() disabled?: boolean;
  @Input() hidden?: boolean;
  @Input('aria-label') ariaLabel?: string;
  @Input('data-testid') dataTestId?: string;
  
  private slotPath: string = '';
  
  constructor(
    @Optional() @Inject(TemplateRef) private templateRef: TemplateRef<any> | null,
    @Inject(ViewContainerRef) private viewContainer: ViewContainerRef,
    @Inject(ElementRef) private elementRef: ElementRef,
    @Inject(SlotRegistryService) private registry: SlotRegistryService
  ) {}
  
  ngOnInit(): void {
    this.slotPath = this.slot || this.name || '';
    
    if (!this.slotPath) {
      console.warn('SmartSlotDirective: slot or name attribute is required');
      return;
    }
    
    const config = this.detectSlotType();
    if (config) {
      this.registry.register(this.slotPath, config);
    }
  }
  
  ngOnDestroy(): void {
    if (this.slotPath) {
      this.registry.clear(this.slotPath);
    }
  }
  
  private detectSlotType(): SlotConfig | null {
    // 1. Check if it's a template
    if (this.templateRef) {
      return {
        type: 'template',
        value: this.templateRef
      };
    }
    
    // 2. Check if it's a props object
    if (this.props) {
      return {
        type: 'props',
        value: this.props
      };
    }
    
    // 3. Check if it's a class string
    if (this.class) {
      return {
        type: 'class',
        value: this.class
      };
    }
    
    // 4. Check if it's a generic value
    if (this.value !== undefined) {
      return {
        type: 'value',
        value: this.value
      };
    }
    
    // 5. Check if it's a component (element with slot attribute)
    const element = this.elementRef.nativeElement;
    if (element && element.tagName && element.tagName !== 'SLOT' && element.tagName !== 'NG-TEMPLATE') {
      // Collect all attributes as props
      const props = this.collectElementProps();
      
      return {
        type: 'component',
        value: {
          element: element,
          props: props,
          componentType: this.getComponentType()
        }
      };
    }
    
    // 6. If it's a <slot> element with attributes, collect them as props
    if (element.tagName === 'SLOT') {
      const props = this.collectAllAttributes();
      if (Object.keys(props).length > 0) {
        return {
          type: 'props',
          value: props
        };
      }
    }
    
    return null;
  }
  
  private collectElementProps(): Record<string, any> {
    const props: Record<string, any> = {};
    
    // Collect explicitly set inputs
    if (this.style !== undefined) props.style = this.style;
    if (this.disabled !== undefined) props.disabled = this.disabled;
    if (this.hidden !== undefined) props.hidden = this.hidden;
    if (this.ariaLabel !== undefined) props['aria-label'] = this.ariaLabel;
    if (this.dataTestId !== undefined) props['data-testid'] = this.dataTestId;
    
    return props;
  }
  
  private collectAllAttributes(): Record<string, any> {
    const props: Record<string, any> = {};
    const element = this.elementRef.nativeElement;
    const attrs = element.attributes;
    
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      // Skip directive's own attributes
      if (attr.name !== 'slot' && attr.name !== 'name' && !attr.name.startsWith('ng-')) {
        props[attr.name] = attr.value;
      }
    }
    
    // Merge with explicit inputs
    return { ...props, ...this.collectElementProps() };
  }
  
  private getComponentType(): any {
    // Try to get the component type from the element
    // This is a simplified version - in production you'd use Angular's internals
    const element = this.elementRef.nativeElement;
    return element.constructor;
  }
}
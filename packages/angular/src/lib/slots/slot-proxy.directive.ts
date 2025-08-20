import {
  Directive,
  Input,
  OnInit,
  ElementRef,
  Renderer2,
  ViewContainerRef,
  TemplateRef,
  ComponentRef,
  Inject,
  Injector,
  Type,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef
} from '@angular/core';
import { SlotRegistryService } from './slot-registry.service';

/**
 * Directive that applies slot configurations to elements.
 * It acts as a proxy, replacing or modifying the element based on the slot configuration.
 */
@Directive({
  selector: '[slotProxy]',
  standalone: true
})
export class SlotProxyDirective implements OnInit, OnChanges {
  @Input() slotProxy!: string; // The slot path to proxy
  @Input() slotDefault?: Type<any>; // Default component if no slot is registered
  @Input() slotContext?: any; // Context to pass to templates
  @Input() slotFallback?: TemplateRef<any>; // Fallback template if no slot
  
  // Default props that can be overridden
  @Input() defaultClass?: string;
  @Input() defaultStyle?: Record<string, any> | string;
  @Input() defaultProps?: Record<string, any>;
  
  // Emit events when slot actions occur
  @Output() slotClick = new EventEmitter<any>();
  @Output() slotChange = new EventEmitter<any>();
  
  private currentView?: ComponentRef<any> | any;
  private originalElement?: HTMLElement;
  private currentComponentRef?: ComponentRef<any>;
  
  constructor(
    @Inject(ElementRef) private elementRef: ElementRef,
    @Inject(Renderer2) private renderer: Renderer2,
    @Inject(ViewContainerRef) private viewContainer: ViewContainerRef,
    @Inject(Injector) private injector: Injector,
    @Inject(SlotRegistryService) private registry: SlotRegistryService,
    @Inject(ChangeDetectorRef) private cdr: ChangeDetectorRef
  ) {}
  
  ngOnInit(): void {
    this.applySlot();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['slotProxy'] && !changes['slotProxy'].firstChange) {
      this.clearCurrentView();
      this.applySlot();
    }
    
    // Update component props when defaultProps change
    if (changes['defaultProps'] && !changes['defaultProps'].firstChange && this.currentView) {
      this.updateComponentProps();
    }
  }
  
  private applySlot(): void {
    const config = this.registry.get(this.slotProxy);
    
    if (!config) {
      // No slot registered, use defaults
      this.applyDefaults();
      return;
    }
    
    switch (config.type) {
      case 'class':
        this.applyClassSlot(config.value);
        break;
      case 'props':
        this.applyPropsSlot(config.value);
        break;
      case 'template':
        this.applyTemplateSlot(config.value);
        break;
      case 'component':
        this.applyComponentSlot(config.value);
        break;
      case 'value':
        this.applyValueSlot(config.value);
        break;
      default:
        this.applyDefaults();
    }
  }
  
  private applyDefaults(): void {
    const element = this.elementRef.nativeElement;
    
    if (this.defaultClass) {
      this.renderer.setAttribute(element, 'class', this.defaultClass);
    }
    
    if (this.defaultStyle) {
      if (typeof this.defaultStyle === 'string') {
        this.renderer.setAttribute(element, 'style', this.defaultStyle);
      } else {
        Object.entries(this.defaultStyle).forEach(([prop, value]) => {
          this.renderer.setStyle(element, prop, value);
        });
      }
    }
    
    if (this.defaultProps) {
      this.applyProps(this.defaultProps);
    }
  }
  
  private applyClassSlot(className: string): void {
    const element = this.elementRef.nativeElement;
    
    // Replace existing classes with slot classes
    this.renderer.setAttribute(element, 'class', className);
    
    // Apply default props if any
    if (this.defaultProps) {
      this.applyProps(this.defaultProps);
    }
  }
  
  private applyPropsSlot(props: Record<string, any>): void {
    // Merge with default props, slot props take precedence
    const mergedProps = { ...this.defaultProps, ...props };
    this.applyProps(mergedProps);
  }
  
  private applyProps(props: Record<string, any>): void {
    const element = this.elementRef.nativeElement;
    
    Object.entries(props).forEach(([key, value]) => {
      if (key === 'class' || key === 'className') {
        this.renderer.setAttribute(element, 'class', value);
      } else if (key === 'style') {
        if (typeof value === 'string') {
          this.renderer.setAttribute(element, 'style', value);
        } else {
          Object.entries(value).forEach(([styleProp, styleValue]) => {
            this.renderer.setStyle(element, styleProp, styleValue);
          });
        }
      } else if (key.startsWith('on')) {
        // Event handler (onClick -> click)
        const eventName = key.slice(2).toLowerCase();
        this.renderer.listen(element, eventName, value);
      } else if (key.startsWith('aria-') || key.startsWith('data-')) {
        // Aria and data attributes
        this.renderer.setAttribute(element, key, value);
      } else if (key === 'disabled' || key === 'hidden' || key === 'readonly') {
        // Boolean attributes
        if (value) {
          this.renderer.setAttribute(element, key, '');
        } else {
          this.renderer.removeAttribute(element, key);
        }
      } else {
        // Regular properties
        try {
          this.renderer.setProperty(element, key, value);
        } catch {
          // If property doesn't exist, set as attribute
          this.renderer.setAttribute(element, key, value);
        }
      }
    });
  }
  
  private applyTemplateSlot(template: TemplateRef<any>): void {
    // Hide the original element
    const element = this.elementRef.nativeElement;
    this.renderer.setStyle(element, 'display', 'none');
    this.originalElement = element;
    
    // Create the template view
    const context = this.createTemplateContext();
    const viewRef = this.viewContainer.createEmbeddedView(template, context);
    this.currentView = viewRef;
  }
  
  private applyComponentSlot(config: any): void {
    if (config.componentType) {
      // Hide the original element
      const element = this.elementRef.nativeElement;
      this.renderer.setStyle(element, 'display', 'none');
      this.originalElement = element;
      
      // Create the component
      const componentRef = this.viewContainer.createComponent(config.componentType, {
        injector: this.injector
      });
      
      // Apply props - merge slot props with default props
      const mergedProps = { ...this.defaultProps, ...config.props };
      const instance = componentRef.instance as any;
      if (instance) {
        // Map click to the component's click output if it exists
        if (mergedProps.click && instance['click']) {
          const clickHandler = mergedProps.click;
          instance['click'].subscribe(() => {
            clickHandler();
            this.slotClick.emit();
          });
        }
        
        // Set other properties
        Object.entries(mergedProps).forEach(([key, value]) => {
          if (key !== 'click' && instance[key] !== undefined) {
            instance[key] = value;
          }
        });
      }
      
      this.currentView = componentRef;
      this.currentComponentRef = componentRef;
    }
  }
  
  private applyValueSlot(value: any): void {
    const element = this.elementRef.nativeElement;
    
    if (typeof value === 'string') {
      // Treat as text content
      this.renderer.setProperty(element, 'textContent', value);
    } else if (typeof value === 'object') {
      // Treat as props
      this.applyPropsSlot(value);
    }
  }
  
  private createTemplateContext(): any {
    return {
      $implicit: this.slotContext || {},
      props: this.defaultProps || {},
      click: (event?: any) => this.slotClick.emit(event),
      change: (event?: any) => this.slotChange.emit(event),
      ...this.slotContext
    };
  }
  
  private clearCurrentView(): void {
    if (this.currentView) {
      if (typeof this.currentView.destroy === 'function') {
        this.currentView.destroy();
      }
      this.currentView = undefined;
    }
    
    if (this.originalElement) {
      this.renderer.setStyle(this.originalElement, 'display', '');
      this.originalElement = undefined;
    }
    
    this.viewContainer.clear();
  }
  
  private updateComponentProps(): void {
    if (this.currentComponentRef && this.defaultProps) {
      const instance = this.currentComponentRef.instance as any;
      
      // Update properties that have changed
      Object.entries(this.defaultProps).forEach(([key, value]) => {
        if (key !== 'click' && instance[key] !== undefined) {
          instance[key] = value;
        }
      });
      
      // Trigger change detection on the component
      this.currentComponentRef.changeDetectorRef.detectChanges();
    }
  }
  
  ngOnDestroy(): void {
    this.clearCurrentView();
  }
}
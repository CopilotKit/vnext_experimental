import { 
  Type, 
  TemplateRef, 
  ViewContainerRef,
  ComponentRef,
  EmbeddedViewRef,
  Injector,
  inject
} from '@angular/core';
import { SlotValue, RenderSlotOptions, SlotRegistryEntry, SLOT_CONFIG } from './slot.types';

/**
 * Renders a slot value into a ViewContainerRef.
 * This is the core utility for slot rendering.
 * 
 * @param viewContainer - The ViewContainerRef to render into
 * @param options - Options for rendering the slot
 * @returns The created component or embedded view reference
 * 
 * @example
 * ```typescript
 * export class MyComponent {
 *   @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;
 *   
 *   renderButton() {
 *     renderSlot(this.container, {
 *       slot: this.buttonOverride,
 *       defaultComponent: DefaultButton,
 *       props: { text: 'Click me' }
 *     });
 *   }
 * }
 * ```
 */
export function renderSlot<T = any>(
  viewContainer: ViewContainerRef,
  options: RenderSlotOptions<T>
): ComponentRef<T> | EmbeddedViewRef<T> | null {
  const { slot, defaultComponent, props, injector } = options;
  
  viewContainer.clear();
  
  const effectiveSlot = slot ?? defaultComponent;
  const effectiveInjector = injector ?? viewContainer.injector;
  
  if (effectiveSlot instanceof TemplateRef) {
    // TemplateRef: render template
    return viewContainer.createEmbeddedView(effectiveSlot, {
      $implicit: props ?? {},
      props: props ?? {}
    } as any);
  } else if (isComponentType(effectiveSlot)) {
    // Component type
    return createComponent(
      viewContainer,
      effectiveSlot as Type<T>,
      props,
      effectiveInjector
    );
  } else if (isDirectiveType(effectiveSlot)) {
    // Directive type - cannot be rendered directly, use default
    return defaultComponent ? createComponent(
      viewContainer,
      defaultComponent,
      props,
      effectiveInjector
    ) : null;
  }
  
  // Default: render default component
  return createComponent(
    viewContainer,
    defaultComponent,
    props,
    effectiveInjector
  );
}

/**
 * Creates a component and applies properties.
 */
function createComponent<T>(
  viewContainer: ViewContainerRef,
  component: Type<T>,
  props?: Partial<T>,
  injector?: Injector
): ComponentRef<T> {
  const componentRef = viewContainer.createComponent(component, {
    injector
  });
  
  if (props) {
    // Apply props to component instance
    const instance = componentRef.instance as any;
    for (const key in props) {
      const value = props[key];
      // Try multiple naming conventions
      // 1. Try inputXxx format (e.g., toolsMenu -> inputToolsMenu)
      const inputKey = `input${key.charAt(0).toUpperCase()}${key.slice(1)}`;
      
      if (typeof instance[inputKey] === 'function' || inputKey in instance) {
        // Use the input setter
        instance[inputKey] = value;
      } else {
        // Always try direct property assignment for @Input() properties
        // Angular @Input() properties might not be enumerable but still settable
        try {
          instance[key] = value;
        } catch (e) {
          // Property might not exist or be readonly - silently ignore
        }
      }
    }
    // Trigger change detection
    componentRef.changeDetectorRef.detectChanges();
  }
  
  return componentRef;
}


/**
 * Checks if a value is a component type.
 */
export function isComponentType(value: any): boolean {
  if (typeof value !== 'function') {
    return false;
  }
  
  // Arrow functions don't have prototype
  if (!value.prototype) {
    return false;
  }
  
  // Check for Angular component marker
  return !!(value.ɵcmp || Object.prototype.hasOwnProperty.call(value, 'ɵcmp'));
}

/**
 * Checks if a value is a directive type.
 */
export function isDirectiveType(value: any): boolean {
  if (typeof value !== 'function') {
    return false;
  }
  
  // Check for Angular directive marker
  return !!(value.ɵdir || Object.prototype.hasOwnProperty.call(value, 'ɵdir'));
}

/**
 * Checks if a value is a valid slot value.
 */
export function isSlotValue(value: any): value is SlotValue {
  return value instanceof TemplateRef || isComponentType(value);
}

/**
 * Normalizes a slot value to a consistent format.
 */
export function normalizeSlotValue<T = any>(
  value: SlotValue<T> | undefined,
  defaultComponent: Type<T> | undefined
): SlotRegistryEntry<T> {
  if (!value) {
    return { component: defaultComponent };
  }
  
  if (value instanceof TemplateRef) {
    return { template: value };
  }
  
  if (isComponentType(value)) {
    return { component: value as Type<T> };
  }
  
  return { component: defaultComponent };
}

/**
 * Creates a slot configuration map for a component.
 * 
 * @example
 * ```typescript
 * const slots = createSlotConfig({
 *   sendButton: CustomSendButton,
 *   toolbar: 'custom-toolbar-class',
 *   footer: footerTemplate
 * }, {
 *   sendButton: DefaultSendButton,
 *   toolbar: DefaultToolbar,
 *   footer: DefaultFooter
 * });
 * ```
 */
export function createSlotConfig<T extends Record<string, Type<any>>>(
  overrides: Partial<Record<keyof T, SlotValue>>,
  defaults: T
): Map<keyof T, SlotRegistryEntry> {
  const config = new Map<keyof T, SlotRegistryEntry>();
  
  for (const key in defaults) {
    const override = overrides[key];
    const defaultComponent = defaults[key];
    config.set(key, normalizeSlotValue(override, defaultComponent));
  }
  
  return config;
}

/**
 * Provides slot configuration to child components via DI.
 * 
 * @example
 * ```typescript
 * @Component({
 *   providers: [
 *     provideSlots({
 *       sendButton: CustomSendButton,
 *       toolbar: 'custom-class'
 *     })
 *   ]
 * })
 * ```
 */
export function provideSlots(slots: Record<string, SlotValue>) {
  return {
    provide: SLOT_CONFIG,
    useValue: slots
  };
}

/**
 * Gets slot configuration from DI.
 * Must be called within an injection context.
 * 
 * @example
 * ```typescript
 * export class MyComponent {
 *   slots = getSlotConfig();
 *   
 *   ngOnInit() {
 *     const sendButton = this.slots.get('sendButton');
 *   }
 * }
 * ```
 */
export function getSlotConfig(): Map<string, SlotRegistryEntry> | null {
  return inject(SLOT_CONFIG, { optional: true });
}

/**
 * Creates a render function for a specific slot.
 * Useful for creating reusable slot renderers.
 * 
 * @example
 * ```typescript
 * const renderSendButton = createSlotRenderer(
 *   DefaultSendButton,
 *   'sendButton'
 * );
 * 
 * // Later in template
 * renderSendButton(this.viewContainer, this.sendButtonOverride);
 * ```
 */
export function createSlotRenderer<T>(
  defaultComponent: Type<T>,
  slotName?: string
) {
  // Get config in the injection context when the renderer is created
  const config = slotName ? getSlotConfig() : null;
  
  return (
    viewContainer: ViewContainerRef,
    slot?: SlotValue<T>,
    props?: Partial<T>
  ) => {
    // Check DI for overrides if slot name provided
    if (slotName && !slot && config) {
      const entry = config.get(slotName);
      if (entry) {
        if (entry.component) slot = entry.component;
        else if (entry.template) slot = entry.template;
      }
    }
    
    return renderSlot(viewContainer, {
      slot,
      defaultComponent,
      props
    });
  };
}
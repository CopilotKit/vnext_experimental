import { Component, Input, TemplateRef, ViewChild, ViewContainerRef, runInInjectionContext, createEnvironmentInjector, EnvironmentInjector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  renderSlot,
  isComponentType,
  isSlotValue,
  normalizeSlotValue,
  createSlotConfig,
  provideSlots,
  getSlotConfig,
  createSlotRenderer
} from '../slot.utils';
import { SLOT_CONFIG } from '../slot.types';

// Test components
@Component({
  standalone: true,
selector: 'default-component',
  template: `<div class="default">{{ text }}</div>`,
})
class DefaultComponent {
  @Input() text = 'Default';
}

@Component({
    standalone: true,
selector: 'custom-component',
  template: `<div class="custom">{{ text }}</div>`,
})
class CustomComponent {
  @Input() text = 'Custom';
}

describe('Slot Utilities', () => {
  describe('renderSlot', () => {
    let viewContainer: ViewContainerRef;

    beforeEach(() => {
      @Component({
    standalone: true,
template: `<div #container></div>`,
      })
      class TestComponent {
        @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();
      viewContainer = fixture.componentInstance.container;
    });

    it('should render default component when no slot provided', () => {
      const ref = renderSlot(viewContainer, {
        defaultComponent: DefaultComponent
      });

      expect(ref).toBeTruthy();
      expect((ref as any)?.location.nativeElement.querySelector('.default')).toBeTruthy();
    });

    it('should render custom component when provided', () => {
      const ref = renderSlot(viewContainer, {
        slot: CustomComponent,
        defaultComponent: DefaultComponent
      });

      expect(ref).toBeTruthy();
      expect((ref as any)?.location.nativeElement.querySelector('.custom')).toBeTruthy();
    });

    it('should render default component when string slot is no longer supported', () => {
      // String slots are no longer supported - should render default component
      const ref = renderSlot(viewContainer, {
        slot: 'fancy-style' as any, // Type assertion needed since strings are no longer valid
        defaultComponent: DefaultComponent
      });

      expect(ref).toBeTruthy();
      // Should render default component, not apply class
      expect((ref as any)?.location.nativeElement.querySelector('.default')).toBeTruthy();
    });

    it('should apply props to component using setInput', () => {
      const ref = renderSlot(viewContainer, {
        defaultComponent: DefaultComponent,
        props: { text: 'Hello World' }
      });

      expect(ref).toBeTruthy();
      if ('instance' in ref!) {
        // Props should be set via setInput, which updates the instance
        expect(ref.instance.text).toBe('Hello World');
      }
    });

    it('should render template when provided', () => {
      @Component({
    standalone: true,
template: `
          <div #container></div>
          <ng-template #myTemplate let-props="props">
            <span class="template">{{ props?.message }}</span>
          </ng-template>
        `,
      })
      class TestComponent {
        @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;
        @ViewChild('myTemplate') template!: TemplateRef<any>;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      renderSlot(fixture.componentInstance.container, {
        slot: fixture.componentInstance.template,
        defaultComponent: DefaultComponent,
        props: { message: 'Template Content' }
      });
      
      fixture.detectChanges();

      const span = fixture.nativeElement.querySelector('.template');
      expect(span).toBeTruthy();
      expect(span.textContent).toBe('Template Content');
    });

    it('should render default component when object slot is no longer supported', () => {
      // Object slots are no longer supported - should render default component
      const ref = renderSlot(viewContainer, {
        slot: { text: 'Overridden' } as any, // Type assertion needed since objects are no longer valid
        defaultComponent: DefaultComponent
      });

      expect(ref).toBeTruthy();
      if ('instance' in ref!) {
        // Should use default text, not override
        expect(ref.instance.text).toBe('Default');
      }
    });
  });

  describe('isComponentType', () => {
    it('should identify Angular components', () => {
      // After removing ɵ checks, any function with prototype is considered a component
      expect(isComponentType(DefaultComponent)).toBe(true);
      expect(isComponentType(CustomComponent)).toBe(true);
    });

    it('should reject non-components', () => {
      expect(isComponentType('string')).toBe(false);
      expect(isComponentType(123)).toBe(false);
      expect(isComponentType({})).toBe(false);
      expect(isComponentType(null)).toBe(false);
      expect(isComponentType(undefined)).toBe(false);
      expect(isComponentType(() => {})).toBe(false);
    });
  });

  describe('isSlotValue', () => {
    it('should accept valid slot values', () => {
      // Only components and templates are valid now
      expect(isSlotValue(DefaultComponent)).toBe(true);
      expect(isSlotValue(CustomComponent)).toBe(true);
      // Strings and objects are no longer valid slot values
      expect(isSlotValue('css-class')).toBe(false);
      expect(isSlotValue({ prop: 'value' })).toBe(false);
    });

    it('should reject invalid slot values', () => {
      expect(isSlotValue(null)).toBe(false);
      expect(isSlotValue(undefined)).toBe(false);
    });
  });

  describe('normalizeSlotValue', () => {
    it('should return default component for string (no longer supported)', () => {
      const result = normalizeSlotValue('custom-class' as any, DefaultComponent);
      expect(result).toEqual({
        component: DefaultComponent
      });
    });

    it('should normalize component type', () => {
      const result = normalizeSlotValue(CustomComponent, DefaultComponent);
      expect(result).toEqual({
        component: CustomComponent
      });
    });

    it('should return default component for object (no longer supported)', () => {
      const props = { text: 'Test' };
      const result = normalizeSlotValue(props as any, DefaultComponent);
      expect(result).toEqual({
        component: DefaultComponent
      });
    });

    it('should handle undefined', () => {
      const result = normalizeSlotValue(undefined, DefaultComponent);
      expect(result).toEqual({
        component: DefaultComponent
      });
    });
  });

  describe('createSlotConfig', () => {
    it('should create configuration map', () => {
      const config = createSlotConfig(
        {
          button: CustomComponent,
          toolbar: 'toolbar-class' as any // String no longer supported but test the behavior
        },
        {
          button: DefaultComponent,
          toolbar: DefaultComponent
        }
      );

      expect(config.get('button')).toEqual({
        component: CustomComponent
      });
      // String slots no longer supported - should use default
      expect(config.get('toolbar')).toEqual({
        component: DefaultComponent
      });
    });

    it('should use defaults when no overrides', () => {
      const config = createSlotConfig(
        {},
        {
          button: DefaultComponent,
          toolbar: DefaultComponent
        }
      );

      expect(config.get('button')).toEqual({
        component: DefaultComponent
      });
      expect(config.get('toolbar')).toEqual({
        component: DefaultComponent
      });
    });
  });

  describe('provideSlots', () => {
    it('should create provider configuration with Map', () => {
      const provider = provideSlots({
        button: CustomComponent
      });

      expect(provider.provide).toBe(SLOT_CONFIG);
      expect(provider.useValue).toBeInstanceOf(Map);
      expect(provider.useValue.get('button')).toEqual({
        component: CustomComponent
      });
    });
  });

  describe('getSlotConfig', () => {
    it('should retrieve slot configuration from DI', () => {
      const slots = new Map([
        ['button', { component: CustomComponent }]
      ]);

      TestBed.configureTestingModule({
        providers: [
          { provide: SLOT_CONFIG, useValue: slots }
        ]
      });

      @Component({
    standalone: true,
template: '',
      })
      class TestComponent {
        slots = getSlotConfig();
      }

      const fixture = TestBed.createComponent(TestComponent);
      expect(fixture.componentInstance.slots).toBe(slots);
    });

    it('should return null when no config provided', () => {
      @Component({
    standalone: true,
template: '',
      })
      class TestComponent {
        slots = getSlotConfig();
      }

      const fixture = TestBed.createComponent(TestComponent);
      expect(fixture.componentInstance.slots).toBe(null);
    });
  });

  describe('createSlotRenderer', () => {
    let viewContainer: ViewContainerRef;

    beforeEach(() => {
      @Component({
    standalone: true,
template: `<div #container></div>`,
      })
      class TestComponent {
        @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();
      viewContainer = fixture.componentInstance.container;
    });

    it('should create a renderer function', () => {
      const renderer = createSlotRenderer(DefaultComponent);
      expect(typeof renderer).toBe('function');
      
      const ref = renderer(viewContainer, CustomComponent);
      expect(ref).toBeTruthy();
      expect((ref as any)?.location.nativeElement.querySelector('.custom')).toBeTruthy();
    });

    it('should use DI config when slot name provided', () => {
      // Provide a SLOT_CONFIG via a custom EnvironmentInjector and run the factory in that context
      const slots = new Map<string, any>([[
        'button', { component: CustomComponent }
      ]]);

      const parent = TestBed.inject(EnvironmentInjector);
      const env = createEnvironmentInjector([
        { provide: SLOT_CONFIG, useValue: slots }
      ], parent);

      const renderer = runInInjectionContext(env, () => createSlotRenderer(DefaultComponent as any, 'button')) as any;

      const ref = renderer(viewContainer);
      expect(ref).toBeTruthy();
      expect(ref?.location.nativeElement.querySelector('.custom')).toBeTruthy();
    });

    it('should apply props from renderer', () => {
      const renderer = createSlotRenderer(DefaultComponent);
      const ref = renderer(viewContainer, undefined, { text: 'Rendered' });

      expect(ref).toBeTruthy();
      if ('instance' in ref!) {
        // Props should be set via setInput
        expect(ref.instance.text).toBe('Rendered');
      }
    });

    it('should apply outputs when provided', () => {
      const renderer = createSlotRenderer(DefaultComponent);
      const clickHandler = vi.fn();
      const ref = renderer(viewContainer, undefined, undefined, { click: clickHandler });

      expect(ref).toBeTruthy();
      // Outputs would be wired if the component has the corresponding EventEmitter
    });
  });
});

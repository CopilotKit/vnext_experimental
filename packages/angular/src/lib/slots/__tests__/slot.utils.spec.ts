import { Component, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
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
  selector: 'default-component',
  template: `<div class="default">{{ text }}</div>`,
  standalone: true
})
class DefaultComponent {
  text = 'Default';
}

@Component({
  selector: 'custom-component',
  template: `<div class="custom">{{ text }}</div>`,
  standalone: true
})
class CustomComponent {
  text = 'Custom';
}

describe('Slot Utilities', () => {
  describe('renderSlot', () => {
    let viewContainer: ViewContainerRef;

    beforeEach(() => {
      @Component({
        template: `<div #container></div>`,
        standalone: true
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
      expect(ref?.location.nativeElement.querySelector('.default')).toBeTruthy();
    });

    it('should render custom component when provided', () => {
      const ref = renderSlot(viewContainer, {
        slot: CustomComponent,
        defaultComponent: DefaultComponent
      });

      expect(ref).toBeTruthy();
      expect(ref?.location.nativeElement.querySelector('.custom')).toBeTruthy();
    });

    it('should apply CSS class when string provided', () => {
      const ref = renderSlot(viewContainer, {
        slot: 'fancy-style',
        defaultComponent: DefaultComponent
      });

      expect(ref).toBeTruthy();
      expect(ref?.location.nativeElement.className).toBe('fancy-style');
    });

    it('should apply props to component', () => {
      const ref = renderSlot(viewContainer, {
        defaultComponent: DefaultComponent,
        props: { text: 'Hello World' }
      });

      expect(ref).toBeTruthy();
      if ('instance' in ref!) {
        expect(ref.instance.text).toBe('Hello World');
      }
    });

    it('should render template when provided', () => {
      @Component({
        template: `
          <div #container></div>
          <ng-template #myTemplate let-props="props">
            <span class="template">{{ props?.message }}</span>
          </ng-template>
        `,
        standalone: true
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

    it('should treat object as prop overrides', () => {
      const ref = renderSlot(viewContainer, {
        slot: { text: 'Overridden' },
        defaultComponent: DefaultComponent
      });

      expect(ref).toBeTruthy();
      if ('instance' in ref!) {
        expect(ref.instance.text).toBe('Overridden');
      }
    });
  });

  describe('isComponentType', () => {
    it('should identify Angular components', () => {
      // In test environment, Angular components have ɵcmp property
      const defaultHasMarker = !!(DefaultComponent as any).ɵcmp;
      const customHasMarker = !!(CustomComponent as any).ɵcmp;
      
      // Components should have the Angular marker
      expect(defaultHasMarker).toBe(true);
      expect(customHasMarker).toBe(true);
      
      // isComponentType should identify them correctly
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
      expect(isSlotValue('css-class')).toBe(true);
      expect(isSlotValue({ prop: 'value' })).toBe(true);
      expect(isSlotValue(DefaultComponent)).toBe(true);
      expect(isSlotValue(CustomComponent)).toBe(true);
    });

    it('should reject invalid slot values', () => {
      expect(isSlotValue(null)).toBe(false);
      expect(isSlotValue(undefined)).toBe(false);
    });
  });

  describe('normalizeSlotValue', () => {
    it('should normalize string to class config', () => {
      const result = normalizeSlotValue('custom-class', DefaultComponent);
      expect(result).toEqual({
        component: DefaultComponent,
        class: 'custom-class'
      });
    });

    it('should normalize component type', () => {
      const result = normalizeSlotValue(CustomComponent, DefaultComponent);
      expect(result).toEqual({
        component: CustomComponent
      });
    });

    it('should normalize object to props config', () => {
      const props = { text: 'Test' };
      const result = normalizeSlotValue(props, DefaultComponent);
      expect(result).toEqual({
        component: DefaultComponent,
        props
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
          toolbar: 'toolbar-class'
        },
        {
          button: DefaultComponent,
          toolbar: DefaultComponent
        }
      );

      expect(config.get('button')).toEqual({
        component: CustomComponent
      });
      expect(config.get('toolbar')).toEqual({
        component: DefaultComponent,
        class: 'toolbar-class'
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
    it('should create provider configuration', () => {
      const provider = provideSlots({
        button: CustomComponent,
        toolbar: 'custom-toolbar'
      });

      expect(provider.provide).toBe(SLOT_CONFIG);
      expect(provider.useValue).toEqual({
        button: CustomComponent,
        toolbar: 'custom-toolbar'
      });
    });
  });

  describe('getSlotConfig', () => {
    it('should retrieve slot configuration from DI', () => {
      const slots = {
        button: CustomComponent,
        toolbar: 'custom-class'
      };

      TestBed.configureTestingModule({
        providers: [
          { provide: SLOT_CONFIG, useValue: slots }
        ]
      });

      @Component({
        template: '',
        standalone: true
      })
      class TestComponent {
        slots = getSlotConfig();
      }

      const fixture = TestBed.createComponent(TestComponent);
      expect(fixture.componentInstance.slots).toBe(slots);
    });

    it('should return null when no config provided', () => {
      @Component({
        template: '',
        standalone: true
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
        template: `<div #container></div>`,
        standalone: true
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
      expect(ref?.location.nativeElement.querySelector('.custom')).toBeTruthy();
    });

    it('should use DI config when slot name provided', () => {
      const slots = new Map([
        ['button', { component: CustomComponent }]
      ]);

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: SLOT_CONFIG, useValue: slots }
        ]
      });

      @Component({
        template: `<div #container></div>`,
        standalone: true
      })
      class TestComponent {
        @ViewChild('container', { read: ViewContainerRef }) container!: ViewContainerRef;
        renderButton = createSlotRenderer(DefaultComponent, 'button');
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const ref = fixture.componentInstance.renderButton(
        fixture.componentInstance.container
      );

      expect(ref).toBeTruthy();
      expect(ref?.location.nativeElement.querySelector('.custom')).toBeTruthy();
    });

    it('should apply props from renderer', () => {
      const renderer = createSlotRenderer(DefaultComponent);
      const ref = renderer(viewContainer, undefined, { text: 'Rendered' });

      expect(ref).toBeTruthy();
      if ('instance' in ref!) {
        expect(ref.instance.text).toBe('Rendered');
      }
    });
  });
});
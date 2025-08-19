import { Component, TemplateRef, ViewChild, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import { CopilotSlotDirective, CopilotSlotContentDirective } from '../slot.directive';
import { By } from '@angular/platform-browser';

// Test components
@Component({
  selector: 'default-button',
  template: `<button class="default">Default</button>`,
  standalone: true
})
class DefaultButtonComponent {
  text = 'Default';
  disabled = false;
}

@Component({
  selector: 'custom-button',
  template: `<button class="custom">{{ text }}</button>`,
  standalone: true
})
class CustomButtonComponent {
  text = 'Custom';
}

describe('CopilotSlotDirective', () => {
  describe('Component Slot', () => {
    it('should render default component when no slot provided', () => {
      @Component({
        template: `
          <ng-container 
            [copilotSlot]="undefined"
            [slotDefault]="defaultButton">
          </ng-container>
        `,
        standalone: true,
        imports: [CopilotSlotDirective]
      })
      class TestComponent {
        defaultButton = DefaultButtonComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
      expect(button.className).toBe('default');
      expect(button.textContent).toBe('Default');
    });

    it('should render custom component when provided', () => {
      @Component({
        template: `
          <ng-container 
            [copilotSlot]="customButton"
            [slotDefault]="defaultButton">
          </ng-container>
        `,
        standalone: true,
        imports: [CopilotSlotDirective]
      })
      class TestComponent {
        defaultButton = DefaultButtonComponent;
        customButton = CustomButtonComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
      expect(button.className).toBe('custom');
      expect(button.textContent).toBe('Custom');
    });

    it('should apply props to component', () => {
      @Component({
        template: `
          <ng-container 
            [copilotSlot]="customButton"
            [slotDefault]="defaultButton"
            [slotProps]="{ text: 'Click Me' }">
          </ng-container>
        `,
        standalone: true,
        imports: [CopilotSlotDirective]
      })
      class TestComponent {
        defaultButton = DefaultButtonComponent;
        customButton = CustomButtonComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.textContent).toBe('Click Me');
    });
  });

  describe('CSS Class Slot', () => {
    it('should apply CSS class to default component', () => {
      @Component({
        template: `
          <ng-container 
            [copilotSlot]="'fancy-button'"
            [slotDefault]="defaultButton">
          </ng-container>
        `,
        standalone: true,
        imports: [CopilotSlotDirective]
      })
      class TestComponent {
        defaultButton = DefaultButtonComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
      expect(button.parentElement?.className).toBe('fancy-button');
    });

    it('should still apply props when using CSS class', () => {
      @Component({
        template: `
          <ng-container 
            [copilotSlot]="'fancy-button'"
            [slotDefault]="defaultButton"
            [slotProps]="{ text: 'Styled' }">
          </ng-container>
        `,
        standalone: true,
        imports: [CopilotSlotDirective]
      })
      class TestComponent {
        defaultButton = DefaultButtonComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const defaultComp = fixture.debugElement.query(By.directive(DefaultButtonComponent));
      expect(defaultComp.componentInstance.text).toBe('Styled');
    });
  });

  describe('Template Slot', () => {
    it('should render template when provided', () => {
      @Component({
        template: `
          <ng-container 
            [copilotSlot]="buttonTemplate"
            [slotDefault]="defaultButton">
          </ng-container>
          
          <ng-template #buttonTemplate let-props="props">
            <button class="template-button">{{ props.text }}</button>
          </ng-template>
        `,
        standalone: true,
        imports: [CopilotSlotDirective]
      })
      class TestComponent {
        @ViewChild('buttonTemplate', { static: true }) buttonTemplate!: TemplateRef<any>;
        defaultButton = DefaultButtonComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button).toBeTruthy();
      expect(button.className).toBe('template-button');
    });

    it('should pass context to template', () => {
      @Component({
        template: `
          <ng-container 
            [copilotSlot]="buttonTemplate"
            [slotDefault]="defaultButton"
            [slotContext]="{ $implicit: 'Implicit Value', custom: 'Custom Value' }">
          </ng-container>
          
          <ng-template #buttonTemplate let-implicit let-custom="custom">
            <button>{{ implicit }} - {{ custom }}</button>
          </ng-template>
        `,
        standalone: true,
        imports: [CopilotSlotDirective]
      })
      class TestComponent {
        @ViewChild('buttonTemplate', { static: true }) buttonTemplate!: TemplateRef<any>;
        defaultButton = DefaultButtonComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const button = fixture.nativeElement.querySelector('button');
      expect(button.textContent).toBe('Implicit Value - Custom Value');
    });
  });

  describe('Object Props Slot', () => {
    it('should treat object as props override for default component', () => {
      @Component({
        template: `
          <ng-container 
            [copilotSlot]="{ text: 'Overridden', disabled: true }"
            [slotDefault]="defaultButton">
          </ng-container>
        `,
        standalone: true,
        imports: [CopilotSlotDirective]
      })
      class TestComponent {
        defaultButton = DefaultButtonComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const defaultComp = fixture.debugElement.query(By.directive(DefaultButtonComponent));
      expect(defaultComp.componentInstance.text).toBe('Overridden');
      expect(defaultComp.componentInstance.disabled).toBe(true);
    });
  });

  describe('Dynamic Updates', () => {
    it('should update when slot value changes', () => {
      @Component({
        template: `
          <ng-container 
            [copilotSlot]="currentSlot"
            [slotDefault]="defaultButton">
          </ng-container>
        `,
        standalone: true,
        imports: [CopilotSlotDirective]
      })
      class TestComponent {
        defaultButton = DefaultButtonComponent;
        customButton = CustomButtonComponent;
        currentSlot: Type<any> | undefined = undefined;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      // Initially renders default
      let button = fixture.nativeElement.querySelector('button');
      expect(button.className).toBe('default');

      // Change to custom component
      fixture.componentInstance.currentSlot = CustomButtonComponent;
      fixture.detectChanges();

      button = fixture.nativeElement.querySelector('button');
      expect(button.className).toBe('custom');
    });

    it('should update when props change', () => {
      @Component({
        template: `
          <ng-container 
            [copilotSlot]="defaultButton"
            [slotDefault]="defaultButton"
            [slotProps]="props">
          </ng-container>
        `,
        standalone: true,
        imports: [CopilotSlotDirective]
      })
      class TestComponent {
        defaultButton = DefaultButtonComponent;
        props = { text: 'Initial' };
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      let defaultComp = fixture.debugElement.query(By.directive(DefaultButtonComponent));
      expect(defaultComp.componentInstance.text).toBe('Initial');

      // Update props - the directive will re-create the component
      fixture.componentInstance.props = { text: 'Updated' };
      fixture.detectChanges();

      // Get the new component instance after re-render
      defaultComp = fixture.debugElement.query(By.directive(DefaultButtonComponent));
      expect(defaultComp.componentInstance.text).toBe('Updated');
    });
  });
});

describe('CopilotSlotContentDirective', () => {
  it('should prefer projected content over slot value', () => {
    @Component({
      template: `
        <div [copilotSlotContent]="customButton" [slotContentDefault]="defaultButton">
          <button class="projected">Projected Content</button>
        </div>
      `,
      standalone: true,
      imports: [CopilotSlotContentDirective]
    })
    class TestComponent {
      defaultButton = DefaultButtonComponent;
      customButton = CustomButtonComponent;
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();
    expect(button.className).toBe('projected');
    expect(button.textContent).toBe('Projected Content');
  });

  it('should use slot value when no projected content', () => {
    @Component({
      template: `
        <div [copilotSlotContent]="customButton" [slotContentDefault]="defaultButton">
        </div>
      `,
      standalone: true,
      imports: [CopilotSlotContentDirective]
    })
    class TestComponent {
      defaultButton = DefaultButtonComponent;
      customButton = CustomButtonComponent;
    }

    const fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();
    expect(button.className).toBe('custom');
  });
});
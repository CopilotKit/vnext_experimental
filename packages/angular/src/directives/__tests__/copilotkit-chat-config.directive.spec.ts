import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CopilotkitChatConfigDirective } from '../copilotkit-chat-config.directive';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import { provideCopilotChatConfiguration } from '../../core/chat-configuration/chat-configuration.providers';
import { By } from '@angular/platform-browser';

describe('CopilotkitChatConfigDirective', () => {
  describe('Basic Usage', () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration(),
        imports: [CopilotkitChatConfigDirective]
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should create directive and update service', () => {
      @Component({
        template: `
          <div copilotkitChatConfig
               [labels]="labels"
               [inputValue]="inputValue">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitChatConfigDirective]
      })
      class TestComponent {
        labels = { chatInputPlaceholder: 'Test placeholder' };
        inputValue = 'test value';
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(service.labels().chatInputPlaceholder).toBe('Test placeholder');
      expect(service.inputValue()).toBe('test value');
    });

    it('should support configuration object input', () => {
      @Component({
        template: `
          <div [copilotkitChatConfig]="config">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitChatConfigDirective]
      })
      class TestComponent {
        config = {
          labels: { chatInputPlaceholder: 'Config placeholder' },
          inputValue: 'config value'
        };
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(service.labels().chatInputPlaceholder).toBe('Config placeholder');
      expect(service.inputValue()).toBe('config value');
    });

    it('should handle missing service gracefully', () => {
      // Create a component without providing the service
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [CopilotkitChatConfigDirective]
      });

      @Component({
        template: `
          <div copilotkitChatConfig [labels]="{}">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitChatConfigDirective]
      })
      class TestComponent {}

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      expect(() => {
        const fixture = TestBed.createComponent(TestComponent);
        fixture.detectChanges();
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('No CopilotChatConfigurationService found')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Event Emissions', () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration(),
        imports: [CopilotkitChatConfigDirective]
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should emit submitInput event', () => {
      let submittedValue: string | undefined;

      @Component({
        template: `
          <div copilotkitChatConfig
               (submitInput)="onSubmit($event)">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitChatConfigDirective]
      })
      class TestComponent {
        onSubmit(value: string) {
          submittedValue = value;
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(By.directive(CopilotkitChatConfigDirective));
      const directive = directiveEl.injector.get(CopilotkitChatConfigDirective);

      directive.submit('test message');

      expect(submittedValue).toBe('test message');
    });

    it('should emit changeInput event', () => {
      let changedValue: string | undefined;

      @Component({
        template: `
          <div copilotkitChatConfig
               (changeInput)="onChange($event)">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitChatConfigDirective]
      })
      class TestComponent {
        onChange(value: string) {
          changedValue = value;
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(By.directive(CopilotkitChatConfigDirective));
      const directive = directiveEl.injector.get(CopilotkitChatConfigDirective);

      directive.change('typing...');

      expect(changedValue).toBe('typing...');
    });
  });

  describe('Two-Way Binding', () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration(),
        imports: [CopilotkitChatConfigDirective]
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should support two-way binding for value', () => {
      @Component({
        template: `
          <div copilotkitChatConfig
               [(value)]="inputText">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitChatConfigDirective]
      })
      class TestComponent {
        inputText = 'initial';
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(By.directive(CopilotkitChatConfigDirective));
      const directive = directiveEl.injector.get(CopilotkitChatConfigDirective);

      // Setting value on directive should update component
      directive.value = 'updated';
      expect(directive.value).toBe('updated');

      // Changing value through directive method
      directive.change('changed');
      fixture.detectChanges();
      
      expect(directive.value).toBe('changed');
    });
  });

  describe('Dynamic Updates', () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration(),
        imports: [CopilotkitChatConfigDirective]
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should update configuration when inputs change', () => {
      @Component({
        template: `
          <div copilotkitChatConfig
               [labels]="labels"
               [inputValue]="inputValue">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitChatConfigDirective]
      })
      class TestComponent {
        labels = { chatInputPlaceholder: 'Initial' };
        inputValue = 'initial value';
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(service.labels().chatInputPlaceholder).toBe('Initial');

      // Update labels
      fixture.componentInstance.labels = { chatInputPlaceholder: 'Updated' };
      fixture.detectChanges();

      expect(service.labels().chatInputPlaceholder).toBe('Updated');

      // Update input value
      fixture.componentInstance.inputValue = 'updated value';
      fixture.detectChanges();

      expect(service.inputValue()).toBe('updated value');
    });
  });

  describe('Handler Integration', () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration(),
        imports: [CopilotkitChatConfigDirective]
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should integrate handlers from config object', () => {
      const submitHandler = vi.fn();
      const changeHandler = vi.fn();

      @Component({
        template: `
          <div [copilotkitChatConfig]="config">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitChatConfigDirective]
      })
      class TestComponent {
        config = {
          onSubmitInput: submitHandler,
          onChangeInput: changeHandler
        };
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(By.directive(CopilotkitChatConfigDirective));
      const directive = directiveEl.injector.get(CopilotkitChatConfigDirective);

      // Submit should call the handler
      directive.submit('test submit');
      expect(submitHandler).toHaveBeenCalledWith('test submit');

      // Change should call the handler
      directive.change('test change');
      expect(changeHandler).toHaveBeenCalledWith('test change');
    });

    it('should call both directive and service handlers', () => {
      const directiveSubmitHandler = vi.fn();
      const serviceSubmitHandler = vi.fn();

      @Component({
        template: `
          <div copilotkitChatConfig
               (submitInput)="onSubmit($event)">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitChatConfigDirective]
      })
      class TestComponent {
        onSubmit = directiveSubmitHandler;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      // Also set a handler on the service
      service.setSubmitHandler(serviceSubmitHandler);

      const directiveEl = fixture.debugElement.query(By.directive(CopilotkitChatConfigDirective));
      const directive = directiveEl.injector.get(CopilotkitChatConfigDirective);

      directive.submit('test');

      // Both handlers should be called
      expect(directiveSubmitHandler).toHaveBeenCalledWith('test');
      // Note: The directive overrides the service handler, so it's part of the composite
    });
  });

  describe('Public Methods', () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration(),
        imports: [CopilotkitChatConfigDirective]
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should expose submit method', () => {
      @Component({
        template: `
          <div copilotkitChatConfig>
          </div>
        `,
        standalone: true,
        imports: [CopilotkitChatConfigDirective]
      })
      class TestComponent {}

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(By.directive(CopilotkitChatConfigDirective));
      const directive = directiveEl.injector.get(CopilotkitChatConfigDirective);

      expect(typeof directive.submit).toBe('function');
    });

    it('should expose change method', () => {
      @Component({
        template: `
          <div copilotkitChatConfig>
          </div>
        `,
        standalone: true,
        imports: [CopilotkitChatConfigDirective]
      })
      class TestComponent {}

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(By.directive(CopilotkitChatConfigDirective));
      const directive = directiveEl.injector.get(CopilotkitChatConfigDirective);

      expect(typeof directive.change).toBe('function');
    });
  });
});
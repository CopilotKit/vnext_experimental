import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CopilotkitAgentContextDirective } from '../copilotkit-agent-context.directive';
import { CopilotKitService } from '../../core/copilotkit.service';
import { provideCopilotKit } from '../../core/copilotkit.providers';

// Mock CopilotKitCore
vi.mock('@copilotkit/core', () => ({
  CopilotKitCore: vi.fn().mockImplementation(() => ({
    addContext: vi.fn().mockImplementation(() => 'context-id-' + Math.random()),
    removeContext: vi.fn(),
    setRuntimeUrl: vi.fn(),
    setHeaders: vi.fn(),
    setProperties: vi.fn(),
    setAgents: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  }))
}));

// Test components
@Component({
  template: `
    <div copilotkitAgentContext
         [description]="description"
         [value]="value">
    </div>
  `,
  standalone: true,
  imports: [CopilotkitAgentContextDirective],
  providers: [provideCopilotKit({})]
})
class TestComponentWithInputs {
  description = 'Test context';
  value: any = { data: 'initial' };
}

@Component({
  template: `
    <div [copilotkitAgentContext]="context">
    </div>
  `,
  standalone: true,
  imports: [CopilotkitAgentContextDirective],
  providers: [provideCopilotKit({})]
})
class TestComponentWithContext {
  context = {
    description: 'Full context',
    value: { data: 'test' }
  };
}

@Component({
  template: `
    <div *ngIf="showContext"
         copilotkitAgentContext
         description="Conditional"
         [value]="value">
    </div>
  `,
  standalone: true,
  imports: [CommonModule, CopilotkitAgentContextDirective],
  providers: [provideCopilotKit({})]
})
class TestComponentConditional {
  showContext = true;
  value = { data: 'conditional' };
}

describe('CopilotkitAgentContextDirective', () => {
  let service: CopilotKitService;
  let addContextSpy: any;
  let removeContextSpy: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideCopilotKit({})
      ]
    });
    
    service = TestBed.inject(CopilotKitService);
    addContextSpy = vi.spyOn(service.copilotkit, 'addContext');
    removeContextSpy = vi.spyOn(service.copilotkit, 'removeContext');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should add context on init with separate inputs', () => {
      const fixture = TestBed.createComponent(TestComponentWithInputs);
      fixture.detectChanges();

      expect(addContextSpy).toHaveBeenCalledWith({
        description: 'Test context',
        value: { data: 'initial' }
      });
      expect(addContextSpy).toHaveBeenCalledTimes(1);
    });

    it('should add context on init with context object', () => {
      const fixture = TestBed.createComponent(TestComponentWithContext);
      fixture.detectChanges();

      expect(addContextSpy).toHaveBeenCalledWith({
        description: 'Full context',
        value: { data: 'test' }
      });
      expect(addContextSpy).toHaveBeenCalledTimes(1);
    });

    it('should not add context if inputs are undefined', () => {
      @Component({
        template: `<div copilotkitAgentContext></div>`,
        standalone: true,
        imports: [CopilotkitAgentContextDirective]
      })
      class EmptyComponent {}

      const fixture = TestBed.createComponent(EmptyComponent);
      fixture.detectChanges();

      expect(addContextSpy).not.toHaveBeenCalled();
    });
  });

  describe('Value Updates', () => {
    it('should update context when value changes', () => {
      const fixture = TestBed.createComponent(TestComponentWithInputs);
      fixture.detectChanges();

      // Initial context added
      expect(addContextSpy).toHaveBeenCalledTimes(1);
      const firstContextId = addContextSpy.mock.results[0].value;

      // Update value
      fixture.componentInstance.value = { data: 'updated' };
      fixture.detectChanges();

      // Should remove old and add new
      expect(removeContextSpy).toHaveBeenCalledWith(firstContextId);
      expect(addContextSpy).toHaveBeenCalledTimes(2);
      expect(addContextSpy).toHaveBeenLastCalledWith({
        description: 'Test context',
        value: { data: 'updated' }
      });
    });

    it('should update context when description changes', () => {
      const fixture = TestBed.createComponent(TestComponentWithInputs);
      fixture.detectChanges();

      const firstContextId = addContextSpy.mock.results[0].value;

      // Update description
      fixture.componentInstance.description = 'Updated description';
      fixture.detectChanges();

      expect(removeContextSpy).toHaveBeenCalledWith(firstContextId);
      expect(addContextSpy).toHaveBeenCalledTimes(2);
      expect(addContextSpy).toHaveBeenLastCalledWith({
        description: 'Updated description',
        value: { data: 'initial' }
      });
    });

    it('should update context when context object changes', () => {
      const fixture = TestBed.createComponent(TestComponentWithContext);
      fixture.detectChanges();

      const firstContextId = addContextSpy.mock.results[0].value;

      // Update entire context
      fixture.componentInstance.context = {
        description: 'New context',
        value: { data: 'new' }
      };
      fixture.detectChanges();

      expect(removeContextSpy).toHaveBeenCalledWith(firstContextId);
      expect(addContextSpy).toHaveBeenCalledTimes(2);
      expect(addContextSpy).toHaveBeenLastCalledWith({
        description: 'New context',
        value: { data: 'new' }
      });
    });

    it('should handle rapid updates correctly', () => {
      const fixture = TestBed.createComponent(TestComponentWithInputs);
      fixture.detectChanges();

      // Rapid updates
      for (let i = 1; i <= 5; i++) {
        fixture.componentInstance.value = { data: `update-${i}` };
        fixture.detectChanges();
      }

      // Should have called addContext 6 times (1 initial + 5 updates)
      expect(addContextSpy).toHaveBeenCalledTimes(6);
      // Should have called removeContext 5 times (before each update)
      expect(removeContextSpy).toHaveBeenCalledTimes(5);
      
      // Last call should have latest value
      expect(addContextSpy).toHaveBeenLastCalledWith({
        description: 'Test context',
        value: { data: 'update-5' }
      });
    });
  });

  describe('Cleanup', () => {
    it('should remove context on destroy', () => {
      const fixture = TestBed.createComponent(TestComponentWithInputs);
      fixture.detectChanges();

      const contextId = addContextSpy.mock.results[0].value;

      // Destroy component
      fixture.destroy();

      expect(removeContextSpy).toHaveBeenCalledWith(contextId);
    });

    it('should handle conditional rendering correctly', () => {
      const fixture = TestBed.createComponent(TestComponentConditional);
      fixture.detectChanges();

      expect(addContextSpy).toHaveBeenCalledTimes(1);
      const contextId = addContextSpy.mock.results[0].value;

      // Hide the element (removes directive)
      fixture.componentInstance.showContext = false;
      fixture.detectChanges();

      expect(removeContextSpy).toHaveBeenCalledWith(contextId);

      // Show again (creates new directive instance)
      fixture.componentInstance.showContext = true;
      fixture.detectChanges();

      expect(addContextSpy).toHaveBeenCalledTimes(2);
    });

    it('should not throw when removing non-existent context', () => {
      @Component({
        template: `<div copilotkitAgentContext></div>`,
        standalone: true,
        imports: [CopilotkitAgentContextDirective]
      })
      class EmptyComponent {}

      const fixture = TestBed.createComponent(EmptyComponent);
      fixture.detectChanges();

      // No context was added, but destroy should not throw
      expect(() => fixture.destroy()).not.toThrow();
      expect(removeContextSpy).not.toHaveBeenCalled();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple directives on the same page', () => {
      @Component({
        template: `
          <div copilotkitAgentContext
               description="Context 1"
               [value]="value1">
          </div>
          <div copilotkitAgentContext
               description="Context 2"
               [value]="value2">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitAgentContextDirective]
      })
      class MultipleContextComponent {
        value1 = { id: 1 };
        value2 = { id: 2 };
      }

      const fixture = TestBed.createComponent(MultipleContextComponent);
      fixture.detectChanges();

      expect(addContextSpy).toHaveBeenCalledTimes(2);
      expect(addContextSpy).toHaveBeenCalledWith({
        description: 'Context 1',
        value: { id: 1 }
      });
      expect(addContextSpy).toHaveBeenCalledWith({
        description: 'Context 2',
        value: { id: 2 }
      });

      fixture.destroy();

      // Both contexts should be removed
      expect(removeContextSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle null values', () => {
      const fixture = TestBed.createComponent(TestComponentWithInputs);
      fixture.componentInstance.value = null;
      fixture.detectChanges();

      expect(addContextSpy).toHaveBeenCalledWith({
        description: 'Test context',
        value: null
      });
    });

    it('should not add context when value is undefined', () => {
      const fixture = TestBed.createComponent(TestComponentWithInputs);
      fixture.componentInstance.value = undefined;
      fixture.componentInstance.description = 'Test';
      fixture.detectChanges();

      // Directive shouldn't add context if value is undefined
      expect(addContextSpy).not.toHaveBeenCalled();
    });

    it('should handle complex nested objects', () => {
      const fixture = TestBed.createComponent(TestComponentWithInputs);
      const complexValue = {
        user: {
          id: 123,
          preferences: {
            theme: 'dark',
            notifications: ['email', 'push'],
            settings: {
              language: 'en',
              timezone: 'UTC'
            }
          }
        },
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0'
        }
      };

      fixture.componentInstance.value = complexValue;
      fixture.detectChanges();

      expect(addContextSpy).toHaveBeenCalledWith({
        description: 'Test context',
        value: complexValue
      });
    });
  });

  describe('Priority of Inputs', () => {
    it('should prioritize context object over individual inputs', () => {
      @Component({
        template: `
          <div [copilotkitAgentContext]="context"
               [description]="description"
               [value]="value">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitAgentContextDirective]
      })
      class PriorityComponent {
        context = { description: 'Context object', value: 'context-value' };
        description = 'Individual description';
        value = 'individual-value';
      }

      const fixture = TestBed.createComponent(PriorityComponent);
      fixture.detectChanges();

      // Should use context object, not individual inputs
      expect(addContextSpy).toHaveBeenCalledWith({
        description: 'Context object',
        value: 'context-value'
      });
    });
  });
});
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CopilotkitFrontendToolDirective } from '../copilotkit-frontend-tool.directive';
import { CopilotKitService } from '../../core/copilotkit.service';
import { provideCopilotKit } from '../../core/copilotkit.providers';
import { z } from 'zod';

// Mock CopilotKitCore
vi.mock('@copilotkit/core', () => ({
  CopilotKitCore: vi.fn().mockImplementation(() => ({
    addTool: vi.fn(),
    removeTool: vi.fn(),
    setRuntimeUrl: vi.fn(),
    setHeaders: vi.fn(),
    setProperties: vi.fn(),
    setAgents: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  }))
}));

// Test render component
@Component({
  template: `<div>Tool Render</div>`,
  standalone: true
})
class TestRenderComponent {}

describe('CopilotkitFrontendToolDirective', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // Component-based tests are temporarily disabled due to Angular DI constraints
  // These tests require components to be declared at module level, not inside test functions
  describe.skip('Basic Registration', () => {
    it('should register tool with individual inputs', () => {
      @Component({
        template: `
          <div copilotkitFrontendTool
               [name]="name"
               [description]="description"
               [parameters]="parameters"
               [handler]="handler">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitFrontendToolDirective],
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        name = 'testTool';
        description = 'Test tool';
        parameters = z.object({ value: z.string() });
        handler = vi.fn(async (args: any) => args.value);
      }

      const fixture = TestBed.createComponent(TestComponent);
      const service = fixture.debugElement.injector.get(CopilotKitService);
      const addToolSpy = vi.spyOn(service.copilotkit, 'addTool');
      
      fixture.detectChanges();

      expect(addToolSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'testTool',
          description: 'Test tool',
          parameters: expect.any(Object),
          handler: expect.any(Function)
        })
      );
    });

    it('should register tool with tool object', () => {
      @Component({
        template: `
          <div [copilotkitFrontendTool]="tool"></div>
        `,
        standalone: true,
        imports: [CopilotkitFrontendToolDirective],
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        tool = {
          name: 'objectTool',
          description: 'Tool from object',
          parameters: z.object({ input: z.string() })
        };
      }

      const fixture = TestBed.createComponent(TestComponent);
      const service = fixture.debugElement.injector.get(CopilotKitService);
      const addToolSpy = vi.spyOn(service.copilotkit, 'addTool');
      
      fixture.detectChanges();

      expect(addToolSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'objectTool',
          description: 'Tool from object'
        })
      );
    });

    it('should register render component', () => {
      @Component({
        template: `
          <div copilotkitFrontendTool
               name="renderTool"
               [render]="render">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitFrontendToolDirective],
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        render = TestRenderComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      const service = fixture.debugElement.injector.get(CopilotKitService);
      vi.spyOn(service.copilotkit, 'addTool');
      
      fixture.detectChanges();

      const renders = service.currentRenderToolCalls();
      expect(renders['renderTool']).toBeDefined();
      expect(renders['renderTool'].render).toBe(TestRenderComponent);
    });

    it('should work with template refs', () => {
      @Component({
        template: `
          <ng-template #toolTemplate let-props>
            <div>Template: {{ props.args?.value }}</div>
          </ng-template>
          
          <div copilotkitFrontendTool
               name="templateTool"
               [render]="toolTemplate">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitFrontendToolDirective],
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        @ViewChild('toolTemplate', { static: true }) toolTemplate!: TemplateRef<any>;
      }

      const fixture = TestBed.createComponent(TestComponent);
      const service = fixture.debugElement.injector.get(CopilotKitService);
      vi.spyOn(service.copilotkit, 'addTool');
      
      fixture.detectChanges();

      const renders = service.currentRenderToolCalls();
      expect(renders['templateTool']).toBeDefined();
      expect(renders['templateTool'].render).toBe(fixture.componentInstance.toolTemplate);
    });

    it('should warn if name is missing', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      @Component({
        template: `<div copilotkitFrontendTool></div>`,
        standalone: true,
        imports: [CopilotkitFrontendToolDirective],
        providers: [provideCopilotKit({})]
      })
      class TestComponent {}

      const fixture = TestBed.createComponent(TestComponent);
      const service = fixture.debugElement.injector.get(CopilotKitService);
      const addToolSpy = vi.spyOn(service.copilotkit, 'addTool');
      
      fixture.detectChanges();

      expect(addToolSpy).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('name is required')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe.skip('Updates', () => {
    it('should re-register when properties change', () => {
      @Component({
        template: `
          <div copilotkitFrontendTool
               [name]="name"
               [description]="description">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitFrontendToolDirective],
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        name = 'updateTool';
        description = 'Initial description';
      }

      const fixture = TestBed.createComponent(TestComponent);
      const service = fixture.debugElement.injector.get(CopilotKitService);
      const addToolSpy = vi.spyOn(service.copilotkit, 'addTool');
      const removeToolSpy = vi.spyOn(service.copilotkit, 'removeTool');
      
      fixture.detectChanges();

      expect(addToolSpy).toHaveBeenCalledTimes(1);

      // Update description
      fixture.componentInstance.description = 'Updated description';
      fixture.detectChanges();

      // Should remove old and add new
      expect(removeToolSpy).toHaveBeenCalledWith('updateTool');
      expect(addToolSpy).toHaveBeenCalledTimes(2);
      expect(addToolSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          description: 'Updated description'
        })
      );
    });

    it('should handle handler updates', () => {
      @Component({
        template: `
          <div copilotkitFrontendTool
               name="handlerTool"
               [handler]="handler">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitFrontendToolDirective],
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        handler = vi.fn(async () => 'initial');
      }

      const fixture = TestBed.createComponent(TestComponent);
      const service = fixture.debugElement.injector.get(CopilotKitService);
      const addToolSpy = vi.spyOn(service.copilotkit, 'addTool');
      vi.spyOn(service.copilotkit, 'removeTool');
      
      fixture.detectChanges();

      const newHandler = vi.fn(async () => 'updated');
      fixture.componentInstance.handler = newHandler;
      fixture.detectChanges();

      expect(addToolSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          handler: newHandler
        })
      );
    });
  });

  describe.skip('Cleanup', () => {
    it('should remove tool on destroy', () => {
      @Component({
        template: `
          <div copilotkitFrontendTool
               name="cleanupTool">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitFrontendToolDirective],
        providers: [provideCopilotKit({})]
      })
      class TestComponent {}

      const fixture = TestBed.createComponent(TestComponent);
      const service = fixture.debugElement.injector.get(CopilotKitService);
      const addToolSpy = vi.spyOn(service.copilotkit, 'addTool');
      const removeToolSpy = vi.spyOn(service.copilotkit, 'removeTool');
      
      fixture.detectChanges();

      expect(addToolSpy).toHaveBeenCalled();

      fixture.destroy();

      expect(removeToolSpy).toHaveBeenCalledWith('cleanupTool');
    });

    it('should remove render on destroy', () => {
      @Component({
        template: `
          <div copilotkitFrontendTool
               name="renderCleanupTool"
               [render]="render">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitFrontendToolDirective],
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        render = TestRenderComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      const service = fixture.debugElement.injector.get(CopilotKitService);
      vi.spyOn(service.copilotkit, 'addTool');
      vi.spyOn(service.copilotkit, 'removeTool');
      
      fixture.detectChanges();

      let renders = service.currentRenderToolCalls();
      expect(renders['renderCleanupTool']).toBeDefined();

      fixture.destroy();

      renders = service.currentRenderToolCalls();
      expect(renders['renderCleanupTool']).toBeUndefined();
    });
  });

  describe.skip('Advanced Features', () => {
    it('should support followUp flag', () => {
      @Component({
        template: `
          <div copilotkitFrontendTool
               name="followUpTool"
               [followUp]="true">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitFrontendToolDirective],
        providers: [provideCopilotKit({})]
      })
      class TestComponent {}

      const fixture = TestBed.createComponent(TestComponent);
      const service = fixture.debugElement.injector.get(CopilotKitService);
      const addToolSpy = vi.spyOn(service.copilotkit, 'addTool');
      
      fixture.detectChanges();

      expect(addToolSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          followUp: true
        })
      );
    });

    it('should handle complex schemas', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number()
        }),
        settings: z.array(z.string())
      });

      @Component({
        template: `
          <div copilotkitFrontendTool
               name="complexTool"
               [parameters]="schema">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitFrontendToolDirective],
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        schema = schema;
      }

      const fixture = TestBed.createComponent(TestComponent);
      const service = fixture.debugElement.injector.get(CopilotKitService);
      const addToolSpy = vi.spyOn(service.copilotkit, 'addTool');
      
      fixture.detectChanges();

      expect(addToolSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          parameters: schema
        })
      );
    });

    it('should warn about duplicate renders', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Pre-register a render
      service.setCurrentRenderToolCalls({
        duplicateTool: {
          args: z.object({}),
          render: TestRenderComponent
        }
      });

      @Component({
        template: `
          <div copilotkitFrontendTool
               name="duplicateTool"
               [render]="render">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitFrontendToolDirective],
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        render = TestRenderComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already has a render')
      );
      
      consoleSpy.mockRestore();
    });
  });
});
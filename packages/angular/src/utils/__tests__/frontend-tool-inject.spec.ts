import { TestBed } from '@angular/core/testing';
import { Component, OnInit } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  registerFrontendTool,
  createDynamicFrontendTool 
} from '../frontend-tool.utils';
import { CopilotKitService } from '../../core/copilotkit.service';
import { provideCopilotKit } from '../../core/copilotkit.providers';
import { z } from 'zod';
import { signal } from '@angular/core';

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

// Mock component for testing
@Component({
  template: `<div>Mock Render</div>`,
  standalone: true
})
class MockRenderComponent {}

describe('Frontend Tool Inject Functions', () => {
  let service: CopilotKitService;
  let addToolSpy: any;
  let removeToolSpy: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideCopilotKit({})
      ]
    });
    
    service = TestBed.inject(CopilotKitService);
    addToolSpy = vi.spyOn(service.copilotkit, 'addTool');
    removeToolSpy = vi.spyOn(service.copilotkit, 'removeTool');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerFrontendTool', () => {
    it('should register tool within component context', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent implements OnInit {
        // Move the registration to constructor or field initializer
        // where injection context is available
        toolName = registerFrontendTool({
          name: 'testTool',
          description: 'Test tool',
          parameters: z.object({ value: z.string() })
        });

        ngOnInit() {
          expect(this.toolName).toBe('testTool');
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      // Tool should be added
      expect(addToolSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'testTool',
          description: 'Test tool'
        })
      );
    });

    it('should register render when provided', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        // Call in field initializer where injection context is available
        toolName = registerFrontendTool({
          name: 'renderTool',
          render: MockRenderComponent
        });
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const renders = service.currentRenderToolCalls();
      expect(renders['renderTool']).toBeDefined();
      expect(renders['renderTool'].render).toBe(MockRenderComponent);
    });

    it('should cleanup on component destroy', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        toolName = registerFrontendTool({
          name: 'cleanupTool',
          description: 'Tool with auto cleanup'
        });
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(addToolSpy).toHaveBeenCalled();

      // Destroy the component
      fixture.destroy();

      // Tool should be removed
      expect(removeToolSpy).toHaveBeenCalledWith('cleanupTool');
    });

    it('should handle complex tool configuration', () => {
      const schema = z.object({
        query: z.string(),
        limit: z.number().optional()
      });

      const handler = vi.fn(async (args: any) => {
        return { results: [] };
      });

      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        toolName = registerFrontendTool({
          name: 'searchTool',
          description: 'Search tool',
          parameters: schema,
          handler: handler,
          render: MockRenderComponent,
          followUp: true
        });
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(addToolSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'searchTool',
          description: 'Search tool',
          followUp: true
        })
      );
    });
  });

  describe('createDynamicFrontendTool', () => {
    it('should create tool with initial configuration', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent implements OnInit {
        // Create in field initializer
        tool = createDynamicFrontendTool(
          'dynamicTool',
          'Dynamic tool',
          z.object({ value: z.string() }),
          () => vi.fn(async () => 'result')
        );

        ngOnInit() {
          expect(this.tool).toBeDefined();
          expect(this.tool.update).toBeDefined();
          expect(this.tool.destroy).toBeDefined();
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(addToolSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'dynamicTool',
          description: 'Dynamic tool'
        })
      );
    });

    it('should handle dynamic updates', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent implements OnInit {
        handlerSignal = signal(vi.fn(async () => 'initial'));
        
        tool = createDynamicFrontendTool(
          'updateableTool',
          'Updateable tool',
          z.object({ value: z.string() }),
          () => this.handlerSignal()
        );

        ngOnInit() {
          // Initial registration
          expect(addToolSpy).toHaveBeenCalledTimes(1);

          // Update handler
          this.handlerSignal.set(vi.fn(async () => 'updated'));
          this.tool.update();

          // Should remove old and add new
          expect(removeToolSpy).toHaveBeenCalledWith('updateableTool');
          expect(addToolSpy).toHaveBeenCalledTimes(2);
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();
    });

    it('should support dynamic description', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent implements OnInit {
        descSignal = signal('Initial description');
        
        tool = createDynamicFrontendTool(
          'descTool',
          () => this.descSignal(),
          z.object({}),
          () => vi.fn(async () => null)
        );

        ngOnInit() {
          this.descSignal.set('Updated description');
          this.tool.update();
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(addToolSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          description: 'Updated description'
        })
      );
    });

    it('should cleanup on manual destroy', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent implements OnInit {
        tool = createDynamicFrontendTool(
          'manualCleanupTool',
          'Manual cleanup',
          z.object({}),
          () => vi.fn(async () => null)
        );

        ngOnInit() {
          // Manual destroy
          this.tool.destroy();
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(removeToolSpy).toHaveBeenCalledWith('manualCleanupTool');
    });

    it('should auto-cleanup on component destroy', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        tool = createDynamicFrontendTool(
          'autoCleanupTool',
          'Auto cleanup',
          z.object({}),
          () => vi.fn(async () => null)
        );
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(addToolSpy).toHaveBeenCalled();

      fixture.destroy();

      expect(removeToolSpy).toHaveBeenCalledWith('autoCleanupTool');
    });

    it('should support dynamic render', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        renderSignal = signal<any>(MockRenderComponent);
        
        tool = createDynamicFrontendTool(
          'renderDynamicTool',
          'Dynamic render',
          z.object({}),
          () => vi.fn(async () => null),
          () => this.renderSignal()
        );
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const renders = service.currentRenderToolCalls();
      expect(renders['renderDynamicTool']).toBeDefined();
      expect(renders['renderDynamicTool'].render).toBe(MockRenderComponent);
    });
  });
});
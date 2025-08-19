import { Component, TemplateRef, ViewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CopilotkitHumanInTheLoopDirective } from '../copilotkit-human-in-the-loop.directive';
import { CopilotKitService } from '../../core/copilotkit.service';
import { provideCopilotKit } from '../../core/copilotkit.providers';
import { z } from 'zod';
import { By } from '@angular/platform-browser';

// Mock CopilotKitCore
const mockCopilotKitCore = {
  addTool: vi.fn(() => 'tool-id-123'),
  removeTool: vi.fn(),
  setRuntimeUrl: vi.fn(),
  setHeaders: vi.fn(),
  setProperties: vi.fn(),
  setAgents: vi.fn(),
  getAgent: vi.fn(),
  subscribe: vi.fn(() => vi.fn()),
};

vi.mock('@copilotkit/core', () => ({
  CopilotKitCore: vi.fn().mockImplementation(() => mockCopilotKitCore)
}));

// Test approval component
@Component({
  selector: 'test-approval',
  template: `
    <div class="approval-dialog">
      <p>{{ action }}</p>
      <button class="approve-btn">Approve</button>
      <button class="reject-btn">Reject</button>
    </div>
  `,
  standalone: true
})
class TestApprovalComponent {
  action = '';
  respond?: (result: unknown) => Promise<void>;
}

describe('CopilotkitHumanInTheLoopDirective', () => {
  let service: CopilotKitService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideCopilotKit({})],
      imports: [CopilotkitHumanInTheLoopDirective]
    });
    
    service = TestBed.inject(CopilotKitService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Usage', () => {
    it('should register tool when directive is applied', () => {
      @Component({
        template: `
          <div copilotkitHumanInTheLoop
               [name]="'requireApproval'"
               [description]="'Requires user approval'"
               [parameters]="parametersSchema"
               [render]="approvalComponent">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitHumanInTheLoopDirective]
      })
      class TestComponent {
        parametersSchema = z.object({ action: z.string() });
        approvalComponent = TestApprovalComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(mockCopilotKitCore.addTool).toHaveBeenCalled();
      const addToolCall = mockCopilotKitCore.addTool.mock.calls[0][0];
      expect(addToolCall.name).toBe('requireApproval');
      expect(addToolCall.description).toBe('Requires user approval');
      expect(typeof addToolCall.handler).toBe('function');
    });

    it('should support config object input', () => {
      @Component({
        template: `
          <div [copilotkitHumanInTheLoop]="config">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitHumanInTheLoopDirective]
      })
      class TestComponent {
        config = {
          name: 'requireApproval',
          description: 'Requires user approval',
          parameters: z.object({ action: z.string() }),
          render: TestApprovalComponent
        };
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(mockCopilotKitCore.addTool).toHaveBeenCalled();
      const addToolCall = mockCopilotKitCore.addTool.mock.calls[0][0];
      expect(addToolCall.name).toBe('requireApproval');
    });

    it('should not register when enabled is false', () => {
      @Component({
        template: `
          <div copilotkitHumanInTheLoop
               [name]="'requireApproval'"
               [description]="'Requires user approval'"
               [parameters]="parametersSchema"
               [render]="approvalComponent"
               [enabled]="false">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitHumanInTheLoopDirective]
      })
      class TestComponent {
        parametersSchema = z.object({ action: z.string() });
        approvalComponent = TestApprovalComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(mockCopilotKitCore.addTool).not.toHaveBeenCalled();
    });
  });

  describe('Event Emissions', () => {
    it('should emit statusChange events', () => {
      let statusChanges: string[] = [];
      
      @Component({
        template: `
          <div copilotkitHumanInTheLoop
               [name]="'requireApproval'"
               [description]="'Requires user approval'"
               [parameters]="parametersSchema"
               [render]="approvalComponent"
               (statusChange)="onStatusChange($event)">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitHumanInTheLoopDirective]
      })
      class TestComponent {
        parametersSchema = z.object({ action: z.string() });
        approvalComponent = TestApprovalComponent;
        
        onStatusChange(status: string) {
          statusChanges.push(status);
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      // Get the directive instance
      const directiveEl = fixture.debugElement.query(By.directive(CopilotkitHumanInTheLoopDirective));
      const directive = directiveEl.injector.get(CopilotkitHumanInTheLoopDirective);

      // Initial status should be 'inProgress'
      expect(directive.status).toBe('inProgress');

      // Get the handler and call it to trigger status change
      const addToolCall = mockCopilotKitCore.addTool.mock.calls[0][0];
      const handler = addToolCall.handler;
      
      // This should change status to 'executing'
      handler({ action: 'delete' });
      
      // Note: We can't easily test the async behavior without more complex setup
    });

    it('should emit executionStarted when handler is called', () => {
      let executionArgs: any;
      
      @Component({
        template: `
          <div copilotkitHumanInTheLoop
               [name]="'requireApproval'"
               [description]="'Requires user approval'"
               [parameters]="parametersSchema"
               [render]="approvalComponent"
               (executionStarted)="onExecutionStarted($event)">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitHumanInTheLoopDirective]
      })
      class TestComponent {
        parametersSchema = z.object({ action: z.string() });
        approvalComponent = TestApprovalComponent;
        
        onExecutionStarted(args: any) {
          executionArgs = args;
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      // Get the handler and call it
      const addToolCall = mockCopilotKitCore.addTool.mock.calls[0][0];
      const handler = addToolCall.handler;
      
      handler({ action: 'delete' });
      
      expect(executionArgs).toEqual({ action: 'delete' });
    });

    it('should support two-way binding for status', () => {
      @Component({
        template: `
          <div copilotkitHumanInTheLoop
               [name]="'requireApproval'"
               [description]="'Requires user approval'"
               [parameters]="parametersSchema"
               [render]="approvalComponent"
               [(status)]="currentStatus">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitHumanInTheLoopDirective]
      })
      class TestComponent {
        parametersSchema = z.object({ action: z.string() });
        approvalComponent = TestApprovalComponent;
        currentStatus = 'inProgress';
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.currentStatus).toBe('inProgress');
      
      // Note: Testing two-way binding fully would require triggering status changes
    });
  });

  describe('Template Support', () => {
    it('should work with template ref', () => {
      @Component({
        template: `
          <div copilotkitHumanInTheLoop
               [name]="'requireApproval'"
               [description]="'Requires user approval'"
               [parameters]="parametersSchema"
               [render]="approvalTemplate">
          </div>
          
          <ng-template #approvalTemplate let-props>
            <div class="template-approval">
              <p>{{ props.args.action }}</p>
              <button *ngIf="props.respond">Approve</button>
            </div>
          </ng-template>
        `,
        standalone: true,
        imports: [CopilotkitHumanInTheLoopDirective]
      })
      class TestComponent {
        @ViewChild('approvalTemplate', { static: true }) approvalTemplate!: TemplateRef<any>;
        parametersSchema = z.object({ action: z.string() });
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(mockCopilotKitCore.addTool).toHaveBeenCalled();
      const addToolCall = mockCopilotKitCore.addTool.mock.calls[0][0];
      expect(addToolCall.name).toBe('requireApproval');
    });
  });

  describe('Dynamic Updates', () => {
    it('should re-register tool when inputs change', () => {
      @Component({
        template: `
          <div copilotkitHumanInTheLoop
               [name]="toolName"
               [description]="description"
               [parameters]="parametersSchema"
               [render]="approvalComponent">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitHumanInTheLoopDirective]
      })
      class TestComponent {
        toolName = 'requireApproval';
        description = 'Requires user approval';
        parametersSchema = z.object({ action: z.string() });
        approvalComponent = TestApprovalComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(mockCopilotKitCore.addTool).toHaveBeenCalledTimes(1);

      // Change the name
      fixture.componentInstance.toolName = 'requireConfirmation';
      fixture.detectChanges();

      // Should remove old tool and add new one
      expect(mockCopilotKitCore.removeTool).toHaveBeenCalledWith('requireApproval');
      expect(mockCopilotKitCore.addTool).toHaveBeenCalledTimes(2);
      
      const secondCall = mockCopilotKitCore.addTool.mock.calls[1][0];
      expect(secondCall.name).toBe('requireConfirmation');
    });

    it('should handle enabling/disabling', () => {
      @Component({
        template: `
          <div copilotkitHumanInTheLoop
               [name]="'requireApproval'"
               [description]="'Requires user approval'"
               [parameters]="parametersSchema"
               [render]="approvalComponent"
               [enabled]="isEnabled">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitHumanInTheLoopDirective]
      })
      class TestComponent {
        parametersSchema = z.object({ action: z.string() });
        approvalComponent = TestApprovalComponent;
        isEnabled = true;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(mockCopilotKitCore.addTool).toHaveBeenCalledTimes(1);

      // Disable the tool
      fixture.componentInstance.isEnabled = false;
      fixture.detectChanges();

      expect(mockCopilotKitCore.removeTool).toHaveBeenCalledWith('requireApproval');

      // Re-enable the tool
      fixture.componentInstance.isEnabled = true;
      fixture.detectChanges();

      expect(mockCopilotKitCore.addTool).toHaveBeenCalledTimes(2);
    });
  });

  describe('Cleanup', () => {
    it('should unregister tool on destroy', () => {
      @Component({
        template: `
          <div copilotkitHumanInTheLoop
               [name]="'requireApproval'"
               [description]="'Requires user approval'"
               [parameters]="parametersSchema"
               [render]="approvalComponent">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitHumanInTheLoopDirective]
      })
      class TestComponent {
        parametersSchema = z.object({ action: z.string() });
        approvalComponent = TestApprovalComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const unregisterSpy = vi.spyOn(service, 'unregisterToolRender');

      fixture.destroy();

      expect(mockCopilotKitCore.removeTool).toHaveBeenCalledWith('requireApproval');
      expect(unregisterSpy).toHaveBeenCalledWith('requireApproval');
    });
  });

  describe('Respond Method', () => {
    it('should provide respond method on directive', () => {
      @Component({
        template: `
          <div copilotkitHumanInTheLoop
               [name]="'requireApproval'"
               [description]="'Requires user approval'"
               [parameters]="parametersSchema"
               [render]="approvalComponent">
          </div>
        `,
        standalone: true,
        imports: [CopilotkitHumanInTheLoopDirective]
      })
      class TestComponent {
        parametersSchema = z.object({ action: z.string() });
        approvalComponent = TestApprovalComponent;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(By.directive(CopilotkitHumanInTheLoopDirective));
      const directive = directiveEl.injector.get(CopilotkitHumanInTheLoopDirective);

      expect(typeof directive.respond).toBe('function');
      
      // Note: Testing the actual response would require more complex async setup
    });
  });
});
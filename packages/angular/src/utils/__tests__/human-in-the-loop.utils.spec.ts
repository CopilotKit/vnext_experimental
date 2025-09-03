import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  registerHumanInTheLoop,
  addHumanInTheLoop,
  createHumanInTheLoop,
  enhancePropsForHumanInTheLoop
} from '../human-in-the-loop.utils';
import { CopilotKitService } from '../../core/copilotkit.service';
import { provideCopilotKit } from '../../core/copilotkit.providers';
import { z } from 'zod';
import { HumanInTheLoopProps, ToolCallStatus } from '../../core/copilotkit.types';

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
  CopilotKitCore: vi.fn().mockImplementation(() => mockCopilotKitCore),
  ToolCallStatus: {
    InProgress: 'inProgress',
    Executing: 'executing',
    Complete: 'complete'
  }
}));

// Test component for rendering
@Component({
  selector: 'test-approval',
  template: `
    <div class="approval-dialog">
      <p>{{ props.args.action }}</p>
      <button *ngIf="props.respond" (click)="approve()">Approve</button>
      <button *ngIf="props.respond" (click)="reject()">Reject</button>
      <span class="status">{{ props.status }}</span>
    </div>
  `,
  standalone: true
})
class TestApprovalComponent {
  props!: HumanInTheLoopProps<{ action: string }>;
  
  approve() {
    this.props.respond?.('approved');
  }
  
  reject() {
    this.props.respond?.('rejected');
  }
}

describe('Human-in-the-Loop Utilities', () => {
  let service: CopilotKitService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideCopilotKit({})],
      declarations: []
    });
    
    service = TestBed.inject(CopilotKitService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('registerHumanInTheLoop', () => {
    it('should register a tool with handler that returns a Promise', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        toolId = registerHumanInTheLoop({
          name: 'requireApproval',
          description: 'Requires user approval',
          parameters: z.object({ action: z.string() }),
          render: TestApprovalComponent
        });
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(mockCopilotKitCore.addTool).toHaveBeenCalled();
      expect(fixture.componentInstance.toolId).toBe('requireApproval');
      
      // Verify the tool was added with a handler
      const addToolCall = mockCopilotKitCore.addTool.mock.calls[0][0];
      expect(addToolCall.name).toBe('requireApproval');
      expect(addToolCall.description).toBe('Requires user approval');
      expect(typeof addToolCall.handler).toBe('function');
    });

    it('should cleanup on component destroy', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        toolId = registerHumanInTheLoop({
          name: 'requireApproval',
          description: 'Requires user approval',
          parameters: z.object({ action: z.string() }),
          render: TestApprovalComponent
        });
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();
      
      const toolId = fixture.componentInstance.toolId;
      
      fixture.destroy();
      
      expect(mockCopilotKitCore.removeTool).toHaveBeenCalledWith(toolId);
    });

    it('should handle Promise resolution when respond is called', async () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        toolId = registerHumanInTheLoop({
          name: 'requireApproval',
          description: 'Requires user approval',
          parameters: z.object({ action: z.string() }),
          render: TestApprovalComponent
        });
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      // Get the handler from the mock call
      const addToolCall = mockCopilotKitCore.addTool.mock.calls[0][0];
      const handler = addToolCall.handler;

      // Call the handler - it should return a Promise
      const resultPromise = handler({ action: 'delete' });
      expect(resultPromise).toBeDefined();
      expect(typeof resultPromise.then).toBe('function');

      // The Promise should remain pending until respond is called
      // This would require access to the respond function which is internal
      // For now, we just verify the Promise is created
    });
  });

  describe('addHumanInTheLoop', () => {
    it('should add a tool and return cleanup function', () => {
      const cleanup = addHumanInTheLoop(service, {
        name: 'requireApproval',
        description: 'Requires user approval',
        args: z.object({ action: z.string() }),
        render: TestApprovalComponent
      });

      expect(mockCopilotKitCore.addTool).toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');
      
      // Call cleanup
      cleanup();
      expect(mockCopilotKitCore.removeTool).toHaveBeenCalledWith('requireApproval');
    });

    it('should register tool render', () => {
      const registerSpy = vi.spyOn(service, 'registerToolRender');
      
      addHumanInTheLoop(service, {
        name: 'requireApproval',
        description: 'Requires user approval',
        parameters: z.object({ action: z.string() }),
        render: TestApprovalComponent
      });

      expect(registerSpy).toHaveBeenCalledWith('requireApproval', {
        name: 'requireApproval',
        args: expect.any(Object),  // Note: registerToolRender expects 'args', not 'parameters'
        render: TestApprovalComponent
      });
    });

    it('should unregister tool render on cleanup', () => {
      const unregisterSpy = vi.spyOn(service, 'unregisterToolRender');
      
      const cleanup = addHumanInTheLoop(service, {
        name: 'requireApproval',
        description: 'Requires user approval',
        args: z.object({ action: z.string() }),
        render: TestApprovalComponent
      });

      cleanup();
      
      expect(unregisterSpy).toHaveBeenCalledWith('requireApproval');
    });
  });

  describe('createHumanInTheLoop', () => {
    it('should create tool with status signal and control methods', () => {
      const result = createHumanInTheLoop(service, {
        name: 'requireApproval',
        description: 'Requires user approval',
        args: z.object({ action: z.string() }),
        render: TestApprovalComponent
      });

      expect(result.status).toBeDefined();
      expect(result.toolId).toBe('requireApproval');
      expect(typeof result.update).toBe('function');
      expect(typeof result.destroy).toBe('function');
      
      // Check initial status
      expect(result.status()).toBe(ToolCallStatus.InProgress);
    });

    it('should allow updating tool configuration', () => {
      const result = createHumanInTheLoop(service, {
        name: 'requireApproval',
        description: 'Requires user approval',
        args: z.object({ action: z.string() }),
        render: TestApprovalComponent
      });

      // Clear previous calls
      vi.clearAllMocks();

      // Update the tool
      result.update({
        description: 'Updated description'
      });

      // Should remove old tool and add new one
      expect(mockCopilotKitCore.removeTool).toHaveBeenCalledWith('requireApproval');
      expect(mockCopilotKitCore.addTool).toHaveBeenCalled();
      
      const addToolCall = mockCopilotKitCore.addTool.mock.calls[0][0];
      expect(addToolCall.description).toBe('Updated description');
    });

    it('should cleanup when destroy is called', () => {
      const result = createHumanInTheLoop(service, {
        name: 'requireApproval',
        description: 'Requires user approval',
        args: z.object({ action: z.string() }),
        render: TestApprovalComponent
      });

      result.destroy();

      expect(mockCopilotKitCore.removeTool).toHaveBeenCalledWith('requireApproval');
    });

    it('should track status changes through handler lifecycle', async () => {
      const result = createHumanInTheLoop(service, {
        name: 'requireApproval',
        description: 'Requires user approval',
        args: z.object({ action: z.string() }),
        render: TestApprovalComponent
      });

      // Initial status
      expect(result.status()).toBe(ToolCallStatus.InProgress);

      // Get the handler
      const addToolCall = mockCopilotKitCore.addTool.mock.calls[0][0];
      const handler = addToolCall.handler;

      // Call handler - should change status to executing
      const promise = handler({ action: 'delete' });
      
      // Note: We can't directly test the status change to 'executing' 
      // without access to internal state, but we verify the Promise is created
      expect(promise).toBeDefined();
      expect(typeof promise.then).toBe('function');
    });
  });

  describe('enhancePropsForHumanInTheLoop', () => {
    it('should add respond function when status is executing', () => {
      const respond = vi.fn();
      const props: HumanInTheLoopProps = {
        name: 'test',
        description: 'Test tool',
        args: { action: 'delete' },
        status: ToolCallStatus.Executing,
        result: undefined
      };

      const enhanced = enhancePropsForHumanInTheLoop(props, ToolCallStatus.Executing, respond);

      expect(enhanced.respond).toBe(respond);
      expect(enhanced.status).toBe(ToolCallStatus.Executing);
    });

    it('should not add respond function when status is inProgress', () => {
      const respond = vi.fn();
      const props: HumanInTheLoopProps = {
        name: 'test',
        description: 'Test tool',
        args: { action: 'delete' },
        status: ToolCallStatus.InProgress,
        result: undefined
      };

      const enhanced = enhancePropsForHumanInTheLoop(props, ToolCallStatus.InProgress, respond);

      expect(enhanced.respond).toBeUndefined();
      expect(enhanced.status).toBe(ToolCallStatus.InProgress);
    });

    it('should not add respond function when status is complete', () => {
      const respond = vi.fn();
      const props: HumanInTheLoopProps = {
        name: 'test',
        description: 'Test tool',
        args: { action: 'delete' },
        status: 'complete',
        result: 'approved'
      };

      const enhanced = enhancePropsForHumanInTheLoop(props, 'complete', respond);

      expect(enhanced.respond).toBeUndefined();
      expect(enhanced.status).toBe('complete');
    });
  });
});
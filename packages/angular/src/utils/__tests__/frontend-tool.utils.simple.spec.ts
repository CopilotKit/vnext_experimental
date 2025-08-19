import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  addFrontendTool, 
  removeFrontendTool
} from '../frontend-tool.utils';
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

describe('Frontend Tool Utils - Simple', () => {
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

  describe('addFrontendTool', () => {
    it('should add tool and return cleanup function', () => {
      const tool = {
        name: 'testTool',
        description: 'Test tool',
        parameters: z.object({ value: z.string() })
      };

      const cleanup = addFrontendTool(service, tool);

      expect(addToolSpy).toHaveBeenCalledWith(tool);
      expect(typeof cleanup).toBe('function');
      
      cleanup();
      expect(removeToolSpy).toHaveBeenCalledWith('testTool');
    });

    it('should register render when provided', () => {
      const tool = {
        name: 'renderTool',
        render: {} as any // Mock component
      };

      addFrontendTool(service, tool);

      const renders = service.currentRenderToolCalls();
      expect(renders['renderTool']).toBeDefined();
    });
  });

  describe('removeFrontendTool', () => {
    it('should remove tool and render', () => {
      // Setup a tool with render
      service.setCurrentRenderToolCalls({
        testTool: {
          args: z.object({}),
          render: {} as any
        }
      });

      removeFrontendTool(service, 'testTool');

      expect(removeToolSpy).toHaveBeenCalledWith('testTool');
      const renders = service.currentRenderToolCalls();
      expect(renders['testTool']).toBeUndefined();
    });
  });
});
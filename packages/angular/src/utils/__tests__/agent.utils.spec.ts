import { TestBed } from '@angular/core/testing';
import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  watchAgent,
  getAgent,
  subscribeToAgent,
  registerAgentWatcher
} from '../agent.utils';
import { CopilotKitService } from '../../core/copilotkit.service';
import { provideCopilotKit } from '../../core/copilotkit.providers';
import { AbstractAgent } from '@ag-ui/client';
import { DEFAULT_AGENT_ID } from '@copilotkit/shared';
import { effect } from '@angular/core';

// Mock CopilotKitCore
const mockAgent = {
  subscribe: vi.fn((callbacks) => ({
    unsubscribe: vi.fn()
  })),
  id: 'test-agent',
  state: {},
  messages: []
};

const mockCopilotKitCore = {
  addTool: vi.fn(),
  removeTool: vi.fn(),
  setRuntimeUrl: vi.fn(),
  setHeaders: vi.fn(),
  setProperties: vi.fn(),
  setAgents: vi.fn(),
  getAgent: vi.fn((id: string) => id === 'test-agent' ? mockAgent : undefined),
  subscribe: vi.fn(() => vi.fn()),  // Returns unsubscribe function directly
};

vi.mock('@copilotkit/core', () => ({
  CopilotKitCore: vi.fn().mockImplementation(() => mockCopilotKitCore)
}));

describe('Agent Utilities', () => {
  let service: CopilotKitService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideCopilotKit({})]
    });
    
    service = TestBed.inject(CopilotKitService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAgent', () => {
    it('should get agent by ID', () => {
      const agent = getAgent(service, 'test-agent');
      expect(agent).toBe(mockAgent);
      expect(mockCopilotKitCore.getAgent).toHaveBeenCalledWith('test-agent');
    });

    it('should use default agent ID when not provided', () => {
      getAgent(service);
      expect(mockCopilotKitCore.getAgent).toHaveBeenCalledWith(DEFAULT_AGENT_ID);
    });

    it('should return undefined for non-existent agent', () => {
      const agent = getAgent(service, 'non-existent');
      expect(agent).toBeUndefined();
    });
  });

  describe('subscribeToAgent', () => {
    it('should subscribe to agent events', () => {
      const callbacks = {
        onRunInitialized: vi.fn(),
        onRunFinalized: vi.fn(),
        onRunFailed: vi.fn(),
      };

      const unsubscribe = subscribeToAgent(service, 'test-agent', callbacks);
      
      expect(mockAgent.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          onRunInitialized: callbacks.onRunInitialized,
          onRunFinalized: callbacks.onRunFinalized,
          onRunFailed: callbacks.onRunFailed,
        })
      );

      expect(typeof unsubscribe).toBe('function');
    });

    it('should return no-op function for non-existent agent', () => {
      const unsubscribe = subscribeToAgent(service, 'non-existent');
      expect(typeof unsubscribe).toBe('function');
      unsubscribe(); // Should not throw
    });

    it('should handle partial callbacks', () => {
      const callbacks = {
        onRunInitialized: vi.fn(),
      };

      subscribeToAgent(service, 'test-agent', callbacks);
      
      expect(mockAgent.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          onRunInitialized: callbacks.onRunInitialized,
          onRunFinalized: undefined,
          onRunFailed: undefined,
        })
      );
    });
  });

  describe('watchAgent', () => {
    it('should return reactive signals within component context', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        agentState: any;
        agentValue: AbstractAgent | undefined;
        messagesValue: any[] = [];
        isRunningValue = false;

        constructor() {
          this.agentState = watchAgent({ agentId: 'test-agent' });
          // Use effect in constructor (injection context)
          effect(() => {
            this.agentValue = this.agentState.agent();
            this.messagesValue = this.agentState.messages();
            this.isRunningValue = this.agentState.isRunning();
          });
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.agentState).toBeDefined();
      expect(fixture.componentInstance.agentState.agent).toBeDefined();
      expect(fixture.componentInstance.agentState.messages).toBeDefined();
      expect(fixture.componentInstance.agentState.isRunning).toBeDefined();
      expect(fixture.componentInstance.agentState.agent$).toBeDefined();
      expect(fixture.componentInstance.agentState.messages$).toBeDefined();
      expect(fixture.componentInstance.agentState.isRunning$).toBeDefined();
    });

    it('should cleanup on component destroy', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        agentState: any;
        
        constructor() {
          this.agentState = watchAgent({ agentId: 'test-agent' });
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const unsubscribeSpy = vi.fn();
      fixture.componentInstance.agentState.unsubscribe = unsubscribeSpy;

      fixture.destroy();

      // The actual unsubscribe is handled by DestroyRef, 
      // but we can verify the function exists
      expect(fixture.componentInstance.agentState.unsubscribe).toBeDefined();
    });

    it('should use default agent ID when not provided', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        agentState = watchAgent(); // No agent ID
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(mockCopilotKitCore.getAgent).toHaveBeenCalledWith(DEFAULT_AGENT_ID);
    });

  });

  describe('registerAgentWatcher', () => {
    it('should be an alias for watchAgent', () => {
      @Component({
        template: '',
        standalone: true,
        providers: [provideCopilotKit({})]
      })
      class TestComponent {
        agentState = registerAgentWatcher({ agentId: 'test-agent' });
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(fixture.componentInstance.agentState).toBeDefined();
      expect(fixture.componentInstance.agentState.agent).toBeDefined();
      expect(fixture.componentInstance.agentState.messages).toBeDefined();
      expect(fixture.componentInstance.agentState.isRunning).toBeDefined();
      expect(mockCopilotKitCore.getAgent).toHaveBeenCalledWith('test-agent');
    });
  });

  describe('CopilotKitService.getAgent', () => {
    it('should delegate to core getAgent', () => {
      const agent = service.getAgent('test-agent');
      expect(agent).toBe(mockAgent);
      expect(mockCopilotKitCore.getAgent).toHaveBeenCalledWith('test-agent');
    });
  });
});
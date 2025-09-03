import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CopilotKitCore } from '../core';
import { FrontendTool } from '../types';
import { MockAgent, createAssistantMessage } from './test-utils';

describe('CopilotKitCore - Agent Constraints', () => {
  it('should add tool with agentId', () => {
    const core = new CopilotKitCore({
      headers: {},
      properties: {},
    });
    
    const tool: FrontendTool = {
      name: 'testTool',
      handler: vi.fn(),
      agentId: 'agent1',
    };
    
    core.addTool(tool);
    expect(core.tools['testTool']).toBeDefined();
    expect(core.tools['testTool']?.agentId).toBe('agent1');
  });

  it('should add multiple tools with different agentIds', () => {
    const core = new CopilotKitCore({
      headers: {},
      properties: {},
    });
    
    const globalTool: FrontendTool = {
      name: 'globalTool',
      handler: vi.fn(),
    };
    
    const agent1Tool: FrontendTool = {
      name: 'agent1Tool',
      handler: vi.fn(),
      agentId: 'agent1',
    };
    
    const agent2Tool: FrontendTool = {
      name: 'agent2Tool',
      handler: vi.fn(),
      agentId: 'agent2',
    };
    
    core.addTool(globalTool);
    core.addTool(agent1Tool);
    core.addTool(agent2Tool);
    
    expect(core.tools['globalTool']).toBeDefined();
    expect(core.tools['globalTool']?.agentId).toBeUndefined();
    
    expect(core.tools['agent1Tool']).toBeDefined();
    expect(core.tools['agent1Tool']?.agentId).toBe('agent1');
    
    expect(core.tools['agent2Tool']).toBeDefined();
    expect(core.tools['agent2Tool']?.agentId).toBe('agent2');
  });

  it('should preserve all FrontendTool properties including agentId', () => {
    const core = new CopilotKitCore({
      headers: {},
      properties: {},
    });
    
    const handler = vi.fn(async () => 'result');
    const tool: FrontendTool = {
      name: 'fullTool',
      description: 'A complete tool',
      handler,
      followUp: false,
      agentId: 'specificAgent',
    };
    
    core.addTool(tool);
    
    const addedTool = core.tools['fullTool'];
    expect(addedTool).toBeDefined();
    expect(addedTool?.name).toBe('fullTool');
    expect(addedTool?.description).toBe('A complete tool');
    expect(addedTool?.handler).toBe(handler);
    expect(addedTool?.followUp).toBe(false);
    expect(addedTool?.agentId).toBe('specificAgent');
  });
});
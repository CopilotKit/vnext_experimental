import { TestBed } from '@angular/core/testing';
import { CopilotKit } from '../copilotkit';
import { Component } from '@angular/core';
import { provideCopilotKit } from '../copilotkit.providers';
import { createCopilotKitTestingModule } from '../../testing/testing.utils';
import { AngularFrontendTool } from '../../types/frontend-tool';
import { AngularHumanInTheLoop } from '../../types/human-in-the-loop';
import { z } from 'zod';

describe('CopilotKit - Wildcard Tool - Frontend', () => {
  it('should register wildcard frontend tool', () => {
    const wildcardHandler = vi.fn(async ({ toolName, args }: any) => 
      `Handled ${toolName}`
    );
    
    const wildcardTool: AngularFrontendTool = {
      name: '*',
      description: 'Fallback for undefined tools',
      handler: wildcardHandler,
    };

    createCopilotKitTestingModule({
      frontendTools: [wildcardTool],
    }, undefined, [CopilotKit]);
    
    const service = TestBed.inject(CopilotKit);
    
    expect(service.copilotkit.tools['*']).toBeDefined();
    expect(service.copilotkit.tools['*'].name).toBe('*');
    expect(service.copilotkit.tools['*'].handler).toBe(wildcardHandler);
  });
});

describe('CopilotKit - Wildcard Tool - With Specific', () => {
  it('should register wildcard alongside specific tools', () => {
    const specificHandler = vi.fn();
    const wildcardHandler = vi.fn();
    
    const specificTool: AngularFrontendTool = {
      name: 'specific',
      handler: specificHandler,
    };
    
    const wildcardTool: AngularFrontendTool = {
      name: '*',
      handler: wildcardHandler,
    };

    createCopilotKitTestingModule({
      frontendTools: [specificTool, wildcardTool],
    }, undefined, [CopilotKit]);
    
    const service = TestBed.inject(CopilotKit);
    
    expect(service.copilotkit.tools['specific']).toBeDefined();
    expect(service.copilotkit.tools['*']).toBeDefined();
  });
});

describe('CopilotKit - Wildcard Tool - With Render', () => {
  it('should register wildcard with render component', () => {
    @Component({
  standalone: true,
selector: 'app-wildcard-render',
      template: '<div>Unknown tool: {{ args.toolName }}</div>',
    })
    class WildcardRenderComponent {
      args: any;
    }
    
    const wildcardTool: AngularFrontendTool = {
      name: '*',
      description: 'Fallback with render',
      parameters: z.object({
        toolName: z.string(),
        args: z.unknown(),
      }),
      render: WildcardRenderComponent,
    };

    createCopilotKitTestingModule({
      frontendTools: [wildcardTool],
    }, undefined, [CopilotKit]);
    
    const service = TestBed.inject(CopilotKit);
    
    const renderToolCalls = service.renderToolCalls();
    const wildcardRender = renderToolCalls.find(r => r.name === '*');
    expect(wildcardRender).toBeDefined();
    expect(wildcardRender?.render).toBe(WildcardRenderComponent);
  });
});

describe('CopilotKit - Wildcard Tool - With AgentId', () => {
  it('should support wildcard with agentId', () => {
    const wildcardHandler = vi.fn();
    const wildcardTool: AngularFrontendTool = {
      name: '*',
      handler: wildcardHandler,
      agentId: 'specificAgent',
    };

    createCopilotKitTestingModule({
      frontendTools: [wildcardTool],
    }, undefined, [CopilotKit]);
    
    const service = TestBed.inject(CopilotKit);
    
    expect(service.copilotkit.tools['*'].agentId).toBe('specificAgent');
  });
});

describe('CopilotKit - Wildcard Human-in-the-Loop', () => {
  it('should register wildcard human-in-the-loop tool', () => {
    @Component({
    standalone: true,
selector: 'app-wildcard-interaction',
      template: '<div>Unknown interaction: {{ args.toolName }}</div>',
    })
    class WildcardInteractionComponent {
      args: any;
    }
    
    const wildcardHitl: AngularHumanInTheLoop = {
      name: '*',
      description: 'Fallback interaction',
      parameters: z.object({
        toolName: z.string(),
        args: z.unknown(),
      }),
      render: WildcardInteractionComponent as any,
    } as any;

    createCopilotKitTestingModule({
      humanInTheLoop: [wildcardHitl],
    }, undefined, [CopilotKit]);
    
    const service = TestBed.inject(CopilotKit);
    
    expect(service.copilotkit.tools['*']).toBeDefined();
    const renderToolCalls = service.renderToolCalls();
    const wildcardRender = renderToolCalls.find(r => r.name === '*');
    expect(wildcardRender).toBeDefined();
    expect(wildcardRender?.render).toBe(WildcardInteractionComponent);
  });
});

describe('CopilotKit - Wildcard HITL With AgentId', () => {
  it('should support wildcard human-in-the-loop with agentId', () => {
    @Component({
    standalone: true,
selector: 'app-wildcard',
      template: '<div>Wildcard</div>',
    })
    class WildcardComponent {}
    
    const wildcardHitl: AngularHumanInTheLoop = {
      name: '*',
      parameters: z.object({
        toolName: z.string(),
        args: z.unknown(),
      }),
      render: WildcardComponent as any,
      agentId: 'agent1',
    } as any;

    createCopilotKitTestingModule({
      humanInTheLoop: [wildcardHitl],
    }, undefined, [CopilotKit]);
    
    const service = TestBed.inject(CopilotKit);
    
    expect(service.copilotkit.tools['*'].agentId).toBe('agent1');
    const renderToolCalls = service.renderToolCalls();
    const wildcardRender = renderToolCalls.find(r => r.name === '*');
    expect(wildcardRender?.agentId).toBe('agent1');
  });
});

describe('CopilotKit - Wildcard Render Tool Calls', () => {
  it('should register wildcard in renderToolCalls', () => {
    @Component({
    standalone: true,
selector: 'app-wildcard-render',
      template: '<div>Fallback render</div>',
    })
    class WildcardRenderComponent {}
    
    const renderToolCalls = [{
      name: '*',
      args: z.object({
        toolName: z.string(),
        args: z.unknown(),
      }),
      render: WildcardRenderComponent,
    }];

    createCopilotKitTestingModule({
      renderToolCalls: renderToolCalls as any,
    }, undefined, [CopilotKit]);
    
    const service = TestBed.inject(CopilotKit);
    
    const currentRenderToolCalls = service.renderToolCalls();
    const wildcardRender = currentRenderToolCalls.find(r => r.name === '*');
    expect(wildcardRender).toBeDefined();
    expect(wildcardRender?.render).toBe(WildcardRenderComponent);
  });
});

describe('CopilotKit - Wildcard Render With AgentId', () => {
  it('should support wildcard render with agentId', () => {
    @Component({
    standalone: true,
selector: 'app-agent-wildcard',
      template: '<div>Agent wildcard</div>',
    })
    class AgentWildcardComponent {}
    
    const renderToolCalls = [{
      name: '*',
      args: z.object({
        toolName: z.string(),
        args: z.unknown(),
      }),
      render: AgentWildcardComponent,
      agentId: 'agent1',
    }];

    createCopilotKitTestingModule({
      renderToolCalls: renderToolCalls as any,
    }, undefined, [CopilotKit]);
    
    const service = TestBed.inject(CopilotKit);
    
    const currentRenderToolCalls = service.renderToolCalls();
    const wildcardRender = currentRenderToolCalls.find(r => r.name === '*');
    expect(wildcardRender?.agentId).toBe('agent1');
  });
});

describe('CopilotKit - Combined wildcard and specific', () => {
  it('should handle both wildcard and specific tools together', () => {
    @Component({
    standalone: true,
selector: 'app-specific',
      template: '<div>Specific</div>',
    })
    class SpecificRenderComponent {}
    
    @Component({
    standalone: true,
selector: 'app-wildcard',
      template: '<div>Wildcard</div>',
    })
    class WildcardRenderComponent {}
    
    const frontendTools: AngularFrontendTool[] = [
      {
        name: 'specificTool',
        handler: vi.fn(),
        parameters: z.object({ value: z.string() }),
        render: SpecificRenderComponent,
      },
      {
        name: '*',
        handler: vi.fn(),
        parameters: z.object({
          toolName: z.string(),
          args: z.unknown(),
        }),
        render: WildcardRenderComponent,
      },
    ];

    createCopilotKitTestingModule({
      frontendTools,
    }, undefined, [CopilotKit]);
    
    const service = TestBed.inject(CopilotKit);
    
    // Both tools should be registered
    expect(service.copilotkit.tools['specificTool']).toBeDefined();
    expect(service.copilotkit.tools['*']).toBeDefined();
    
    // Both renders should be registered
    const renderToolCalls = service.renderToolCalls();
    const specificRender = renderToolCalls.find(r => r.name === 'specificTool');
    const wildcardRender = renderToolCalls.find(r => r.name === '*');
    expect(specificRender).toBeDefined();
    expect(wildcardRender).toBeDefined();
  });
});

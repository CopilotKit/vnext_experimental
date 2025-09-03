import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CopilotKitService } from '../copilotkit.service';
import { Component } from '@angular/core';
import { provideCopilotKit } from '../copilotkit.providers';
import { AngularFrontendTool } from '../../types/frontend-tool';
import { AngularHumanInTheLoop } from '../../types/human-in-the-loop';
import { z } from 'zod';

describe('CopilotKitService - Wildcard Tool', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
  });

  describe('Wildcard Frontend Tool', () => {
    it('should register wildcard frontend tool', () => {
      const wildcardHandler = vi.fn(async ({ toolName, args }) => 
        `Handled ${toolName}`
      );
      
      const wildcardTool: AngularFrontendTool = {
        name: '*',
        description: 'Fallback for undefined tools',
        handler: wildcardHandler,
      };

      TestBed.configureTestingModule({
        providers: [
          provideCopilotKit({
            frontendTools: [wildcardTool],
          }),
        ],
      });
      const service = TestBed.inject(CopilotKitService);
      
      expect(service.copilotkit.tools['*']).toBeDefined();
      expect(service.copilotkit.tools['*'].name).toBe('*');
      expect(service.copilotkit.tools['*'].handler).toBe(wildcardHandler);
    });

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

      TestBed.configureTestingModule({
        providers: [
          provideCopilotKit({
            frontendTools: [specificTool, wildcardTool],
          }),
        ],
      });
      const service = TestBed.inject(CopilotKitService);
      
      expect(service.copilotkit.tools['specific']).toBeDefined();
      expect(service.copilotkit.tools['*']).toBeDefined();
    });

    it('should register wildcard with render component', () => {
      @Component({
        selector: 'app-wildcard-render',
        template: '<div>Unknown tool: {{ args.toolName }}</div>',
        standalone: true,
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

      TestBed.configureTestingModule({
        providers: [
          provideCopilotKit({
            frontendTools: [wildcardTool],
          }),
        ],
      });
      const service = TestBed.inject(CopilotKitService);
      
      const renderToolCalls = service.renderToolCalls();
      const wildcardRender = renderToolCalls.find(r => r.name === '*');
      expect(wildcardRender).toBeDefined();
      expect(wildcardRender?.render).toBe(WildcardRenderComponent);
    });

    it('should support wildcard with agentId', () => {
      const wildcardHandler = vi.fn();
      const wildcardTool: AngularFrontendTool = {
        name: '*',
        handler: wildcardHandler,
        agentId: 'specificAgent',
      };

      TestBed.configureTestingModule({
        providers: [
          provideCopilotKit({
            frontendTools: [wildcardTool],
          }),
        ],
      });
      const service = TestBed.inject(CopilotKitService);
      
      expect(service.copilotkit.tools['*'].agentId).toBe('specificAgent');
    });
  });

  describe('Wildcard Human-in-the-Loop', () => {
    it('should register wildcard human-in-the-loop tool', () => {
      @Component({
        selector: 'app-wildcard-interaction',
        template: '<div>Unknown interaction: {{ args.toolName }}</div>',
        standalone: true,
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
        render: WildcardInteractionComponent,
      };

      TestBed.configureTestingModule({
        providers: [
          provideCopilotKit({
            humanInTheLoop: [wildcardHitl],
          }),
        ],
      });
      const service = TestBed.inject(CopilotKitService);
      
      expect(service.copilotkit.tools['*']).toBeDefined();
      const renderToolCalls = service.renderToolCalls();
      const wildcardRender = renderToolCalls.find(r => r.name === '*');
      expect(wildcardRender).toBeDefined();
      expect(wildcardRender?.render).toBe(WildcardInteractionComponent);
    });

    it('should support wildcard human-in-the-loop with agentId', () => {
      @Component({
        selector: 'app-wildcard',
        template: '<div>Wildcard</div>',
        standalone: true,
      })
      class WildcardComponent {}
      
      const wildcardHitl: AngularHumanInTheLoop = {
        name: '*',
        parameters: z.object({
          toolName: z.string(),
          args: z.unknown(),
        }),
        render: WildcardComponent,
        agentId: 'agent1',
      };

      TestBed.configureTestingModule({
        providers: [
          provideCopilotKit({
            humanInTheLoop: [wildcardHitl],
          }),
        ],
      });
      const service = TestBed.inject(CopilotKitService);
      
      expect(service.copilotkit.tools['*'].agentId).toBe('agent1');
      const renderToolCalls = service.renderToolCalls();
      const wildcardRender = renderToolCalls.find(r => r.name === '*');
      expect(wildcardRender?.agentId).toBe('agent1');
    });
  });

  describe('Wildcard Render Tool Calls', () => {
    it('should register wildcard in renderToolCalls', () => {
      @Component({
        selector: 'app-wildcard-render',
        template: '<div>Fallback render</div>',
        standalone: true,
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

      TestBed.configureTestingModule({
        providers: [
          provideCopilotKit({
            renderToolCalls,
          }),
        ],
      });
      const service = TestBed.inject(CopilotKitService);
      
      const currentRenderToolCalls = service.renderToolCalls();
      const wildcardRender = currentRenderToolCalls.find(r => r.name === '*');
      expect(wildcardRender).toBeDefined();
      expect(wildcardRender?.render).toBe(WildcardRenderComponent);
    });

    it('should support wildcard render with agentId', () => {
      @Component({
        selector: 'app-agent-wildcard',
        template: '<div>Agent wildcard</div>',
        standalone: true,
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

      TestBed.configureTestingModule({
        providers: [
          provideCopilotKit({
            renderToolCalls,
          }),
        ],
      });
      const service = TestBed.inject(CopilotKitService);
      
      const currentRenderToolCalls = service.renderToolCalls();
      const wildcardRender = currentRenderToolCalls.find(r => r.name === '*');
      expect(wildcardRender?.agentId).toBe('agent1');
    });
  });

  describe('Combined wildcard and specific tools', () => {
    it('should handle both wildcard and specific tools together', () => {
      @Component({
        selector: 'app-specific',
        template: '<div>Specific</div>',
        standalone: true,
      })
      class SpecificRenderComponent {}
      
      @Component({
        selector: 'app-wildcard',
        template: '<div>Wildcard</div>',
        standalone: true,
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

      TestBed.configureTestingModule({
        providers: [
          provideCopilotKit({
            frontendTools,
          }),
        ],
      });
      const service = TestBed.inject(CopilotKitService);
      
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
});
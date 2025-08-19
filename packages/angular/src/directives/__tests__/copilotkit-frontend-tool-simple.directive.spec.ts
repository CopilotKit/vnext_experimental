import { Component } from '@angular/core';
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

describe('CopilotkitFrontendToolDirective - Simple', () => {
  let service: CopilotKitService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideCopilotKit({})]
    });
    service = TestBed.inject(CopilotKitService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create directive instance', () => {
    const directive = new CopilotkitFrontendToolDirective(service);
    expect(directive).toBeDefined();
  });

  it('should have required inputs', () => {
    const directive = new CopilotkitFrontendToolDirective(service);
    expect(directive.name).toBeUndefined();
    expect(directive.description).toBeUndefined();
    expect(directive.parameters).toBeUndefined();
    expect(directive.handler).toBeUndefined();
    expect(directive.render).toBeUndefined();
  });

  it('should register tool on init', () => {
    const addToolSpy = vi.spyOn(service.copilotkit, 'addTool');
    
    const directive = new CopilotkitFrontendToolDirective(service);
    directive.name = 'testTool';
    directive.description = 'Test tool';
    
    directive.ngOnInit();
    
    expect(addToolSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'testTool',
        description: 'Test tool'
      })
    );
  });

  it('should unregister tool on destroy', () => {
    const removeToolSpy = vi.spyOn(service.copilotkit, 'removeTool');
    
    const directive = new CopilotkitFrontendToolDirective(service);
    directive.name = 'cleanupTool';
    
    directive.ngOnInit();
    directive.ngOnDestroy();
    
    expect(removeToolSpy).toHaveBeenCalledWith('cleanupTool');
  });

  it('should warn if name is missing', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    const directive = new CopilotkitFrontendToolDirective(service);
    directive.ngOnInit();
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('name is required')
    );
    
    consoleSpy.mockRestore();
  });
});
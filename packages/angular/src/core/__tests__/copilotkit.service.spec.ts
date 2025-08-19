import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CopilotKitService } from '../copilotkit.service';
import { provideCopilotKit } from '../copilotkit.providers';

describe('CopilotKitService', () => {
  let service: CopilotKitService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideCopilotKit({
          initialConfig: {},
          renderToolCalls: {}
        })
      ]
    });
    service = TestBed.inject(CopilotKitService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have a CopilotKitCore instance', () => {
    expect(service.copilotkit).toBeTruthy();
  });

  it('should update runtime URL', async () => {
    const spy = vi.spyOn(service.copilotkit, 'setRuntimeUrl');
    const testUrl = 'https://api.example.com';
    
    service.setRuntimeUrl(testUrl);
    
    expect(service.runtimeUrl()).toBe(testUrl);
    
    // Wait for effect to run
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(spy).toHaveBeenCalledWith(testUrl);
  });

  it('should update headers', () => {
    const testHeaders = { 'Authorization': 'Bearer token' };
    
    service.setHeaders(testHeaders);
    
    expect(service.headers()).toEqual(testHeaders);
  });

  it('should update properties', () => {
    const testProps = { key: 'value' };
    
    service.setProperties(testProps);
    
    expect(service.properties()).toEqual(testProps);
  });

  it('should warn when renderToolCalls object reference changes', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const newRenderTools = { tool: () => {} };
    
    service.setRenderToolCalls(newRenderTools);
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('renderToolCalls must be a stable object')
    );
    consoleSpy.mockRestore();
  });

  it('should provide observable APIs', () => {
    expect(service.runtimeUrl$).toBeTruthy();
    expect(service.headers$).toBeTruthy();
    expect(service.properties$).toBeTruthy();
    expect(service.agents$).toBeTruthy();
  });

  it('should compute context value', () => {
    const context = service.context();
    
    expect(context).toHaveProperty('copilotkit');
    expect(context).toHaveProperty('renderToolCalls');
    expect(context).toHaveProperty('currentRenderToolCalls');
    expect(context).toHaveProperty('setCurrentRenderToolCalls');
    expect(typeof context.setCurrentRenderToolCalls).toBe('function');
  });
});
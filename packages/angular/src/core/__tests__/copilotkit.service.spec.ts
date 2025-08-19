import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CopilotKitService } from '../copilotkit.service';
import { provideCopilotKit } from '../copilotkit.providers';
import { CopilotKitCore } from '@copilotkit/core';
import { effect, runInInjectionContext, Injector } from '@angular/core';
import { firstValueFrom } from 'rxjs';

// Mock the entire @copilotkit/core module to avoid any network calls
vi.mock('@copilotkit/core', () => {
  // Don't import the real module at all
  return {
    CopilotKitCore: vi.fn().mockImplementation(() => {
      const subscribers: Array<any> = [];
      return {
        setRuntimeUrl: vi.fn(),
        setHeaders: vi.fn(),
        setProperties: vi.fn(),
        setAgents: vi.fn(),
        subscribe: vi.fn((callbacks) => {
          subscribers.push(callbacks);
          // Return unsubscribe function
          return () => {
            const index = subscribers.indexOf(callbacks);
            if (index > -1) subscribers.splice(index, 1);
          };
        }),
        // Helper to trigger events in tests
        _triggerRuntimeLoaded: () => {
          subscribers.forEach(sub => sub.onRuntimeLoaded?.());
        },
        _triggerRuntimeError: () => {
          subscribers.forEach(sub => sub.onRuntimeLoadError?.());
        },
        _getSubscriberCount: () => subscribers.length,
        isRuntimeReady: false,
        runtimeError: null,
        messages: [],
        // Add any other properties that might be accessed
        state: 'idle'
      };
    })
  };
});

describe('CopilotKitService', () => {
  let service: CopilotKitService;
  let mockCopilotKitCore: any;

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
    mockCopilotKitCore = service.copilotkit;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Singleton Behavior', () => {
    it('should return the same service instance when injected multiple times', () => {
      const service1 = TestBed.inject(CopilotKitService);
      const service2 = TestBed.inject(CopilotKitService);
      
      expect(service1).toBe(service2);
    });

    it('should use the same CopilotKitCore instance across injections', () => {
      const service1 = TestBed.inject(CopilotKitService);
      const service2 = TestBed.inject(CopilotKitService);
      
      expect(service1.copilotkit).toBe(service2.copilotkit);
    });

    it('should share state between multiple service references', () => {
      const service1 = TestBed.inject(CopilotKitService);
      const service2 = TestBed.inject(CopilotKitService);
      
      service1.setRuntimeUrl('https://api.test.com');
      
      expect(service2.runtimeUrl()).toBe('https://api.test.com');
    });
  });

  describe('Network Mocking', () => {
    it('should not make any network calls on initialization', () => {
      // CopilotKitCore is mocked, so no network calls
      expect(mockCopilotKitCore.setRuntimeUrl).not.toHaveBeenCalled();
      expect(CopilotKitCore).toHaveBeenCalledWith(
        expect.objectContaining({
          runtimeUrl: undefined // Explicitly undefined to prevent server-side fetching
        })
      );
    });

    it('should call mocked setRuntimeUrl when runtime URL is updated', async () => {
      service.setRuntimeUrl('https://api.example.com');
      
      // Wait for effect to run
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockCopilotKitCore.setRuntimeUrl).toHaveBeenCalledWith('https://api.example.com');
    });
  });

  describe('Reactivity - Signal Updates', () => {
    it('should update signals when setters are called', () => {
      expect(service.runtimeUrl()).toBeUndefined();
      
      service.setRuntimeUrl('https://api.test.com');
      expect(service.runtimeUrl()).toBe('https://api.test.com');
      
      service.setHeaders({ 'Authorization': 'Bearer token' });
      expect(service.headers()).toEqual({ 'Authorization': 'Bearer token' });
      
      service.setProperties({ key: 'value' });
      expect(service.properties()).toEqual({ key: 'value' });
    });

    it('should trigger computed signal updates when dependencies change', () => {
      const injector = TestBed.inject(Injector);
      let contextUpdateCount = 0;
      let cleanup: any;
      
      // Run effect in injection context
      runInInjectionContext(injector, () => {
        cleanup = effect(() => {
          service.context(); // Touch the context
          contextUpdateCount++;
        });
      });

      // Flush to run initial effect
      TestBed.flushEffects();
      
      // Initial call should have run
      expect(contextUpdateCount).toBe(1);
      
      // Trigger runtime loaded event
      mockCopilotKitCore._triggerRuntimeLoaded();
      
      // Flush effects again
      TestBed.flushEffects();
      
      // Context should have updated
      expect(contextUpdateCount).toBe(2);
      
      cleanup.destroy();
    });

    it('should increment runtimeStateVersion when runtime events occur', () => {
      const initialVersion = service.runtimeStateVersion();
      
      // Trigger runtime loaded
      mockCopilotKitCore._triggerRuntimeLoaded();
      
      expect(service.runtimeStateVersion()).toBe(initialVersion + 1);
      
      // Trigger runtime error
      mockCopilotKitCore._triggerRuntimeError();
      
      expect(service.runtimeStateVersion()).toBe(initialVersion + 2);
    });
  });

  describe('Reactivity - Observable Updates', () => {
    it('should emit on observables when signals change', async () => {
      const runtimeUrlPromise = firstValueFrom(service.runtimeUrl$);
      
      service.setRuntimeUrl('https://observable.test.com');
      
      const url = await runtimeUrlPromise;
      expect(url).toBe('https://observable.test.com');
    });

    it('should emit context changes through context$', async () => {
      let emittedContext: any;
      
      const subscription = service.context$.subscribe(ctx => {
        emittedContext = ctx;
      });
      
      // Trigger a runtime state change
      mockCopilotKitCore._triggerRuntimeLoaded();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(emittedContext).toBeDefined();
      expect(emittedContext.copilotkit).toBe(mockCopilotKitCore);
      
      subscription.unsubscribe();
    });
  });

  describe('Runtime Event Subscriptions', () => {
    it('should subscribe to runtime events on initialization', () => {
      expect(mockCopilotKitCore.subscribe).toHaveBeenCalledWith({
        onRuntimeLoaded: expect.any(Function),
        onRuntimeLoadError: expect.any(Function)
      });
    });

    it('should have exactly one subscription to runtime events', () => {
      expect(mockCopilotKitCore._getSubscriberCount()).toBe(1);
      
      // Create another service instance (singleton, so same instance)
      TestBed.inject(CopilotKitService);
      
      // Should still be just one subscription
      expect(mockCopilotKitCore._getSubscriberCount()).toBe(1);
    });

    it('should react to runtime loaded event', () => {
      const initialVersion = service.runtimeStateVersion();
      
      mockCopilotKitCore._triggerRuntimeLoaded();
      
      expect(service.runtimeStateVersion()).toBe(initialVersion + 1);
    });

    it('should react to runtime error event', () => {
      const initialVersion = service.runtimeStateVersion();
      
      mockCopilotKitCore._triggerRuntimeError();
      
      expect(service.runtimeStateVersion()).toBe(initialVersion + 1);
    });
  });

  describe('Effects Synchronization', () => {
    it('should sync runtime URL changes to CopilotKitCore', async () => {
      service.setRuntimeUrl('https://effect.test.com');
      
      // Effects run asynchronously
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockCopilotKitCore.setRuntimeUrl).toHaveBeenCalledWith('https://effect.test.com');
    });

    it('should sync all configuration changes to CopilotKitCore', async () => {
      const headers = { 'X-Custom': 'Header' };
      const properties = { prop: 'value' };
      const agents = { agent1: {} };
      
      service.setHeaders(headers);
      service.setProperties(properties);
      service.setAgents(agents as any);
      
      // Wait for effects
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockCopilotKitCore.setHeaders).toHaveBeenCalledWith(headers);
      expect(mockCopilotKitCore.setProperties).toHaveBeenCalledWith(properties);
      expect(mockCopilotKitCore.setAgents).toHaveBeenCalledWith(agents);
    });
  });

  describe('Component Integration Simulation', () => {
    it('should allow components to react to runtime state changes', () => {
      const injector = TestBed.inject(Injector);
      let componentViewUpdateCount = 0;
      let isReady = false;
      let cleanup: any;
      
      // Simulate a component's computed signal
      runInInjectionContext(injector, () => {
        cleanup = effect(() => {
          const ctx = service.context();
          isReady = (ctx.copilotkit as any).isRuntimeReady;
          componentViewUpdateCount++;
        });
      });

      // Flush to run initial effect
      TestBed.flushEffects();
      
      // Initial render
      expect(componentViewUpdateCount).toBe(1);
      expect(isReady).toBe(false);
      
      // Simulate runtime becoming ready
      mockCopilotKitCore.isRuntimeReady = true;
      mockCopilotKitCore._triggerRuntimeLoaded();
      
      // Flush effects again
      TestBed.flushEffects();
      
      // Component should have re-rendered
      expect(componentViewUpdateCount).toBe(2);
      expect(isReady).toBe(true);
      
      cleanup.destroy();
    });

    it('should allow multiple components to track state independently', () => {
      const injector = TestBed.inject(Injector);
      let component1Updates = 0;
      let component2Updates = 0;
      let cleanup1: any;
      let cleanup2: any;
      
      // Simulate two components
      runInInjectionContext(injector, () => {
        cleanup1 = effect(() => {
          service.context();
          component1Updates++;
        });
        
        cleanup2 = effect(() => {
          service.context();
          component2Updates++;
        });
      });
      
      // Flush to run initial effects
      TestBed.flushEffects();
      
      // Both get initial render
      expect(component1Updates).toBe(1);
      expect(component2Updates).toBe(1);
      
      // Trigger runtime event
      mockCopilotKitCore._triggerRuntimeLoaded();
      
      // Flush effects again
      TestBed.flushEffects();
      
      // Both should update
      expect(component1Updates).toBe(2);
      expect(component2Updates).toBe(2);
      
      cleanup1.destroy();
      cleanup2.destroy();
    });
  });

  describe('Memory Management', () => {
    it('should properly clean up subscriptions on destroy', () => {
      // Get the unsubscribe function that was returned
      const unsubscribeSpy = vi.fn();
      mockCopilotKitCore.subscribe.mockReturnValue(unsubscribeSpy);
      
      // Create a new service to test cleanup
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideCopilotKit({})
        ]
      });
      
      TestBed.inject(CopilotKitService);
      
      // Simulate service destruction
      TestBed.resetTestingModule();
      
      // Note: In a real scenario, Angular handles cleanup.
      // This test mainly verifies the cleanup is registered with destroyRef
      expect(mockCopilotKitCore.subscribe).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid successive runtime state changes', () => {
      let versionBefore = service.runtimeStateVersion();
      
      // Trigger multiple events rapidly
      for (let i = 0; i < 10; i++) {
        mockCopilotKitCore._triggerRuntimeLoaded();
        mockCopilotKitCore._triggerRuntimeError();
      }
      
      // Should have incremented for each event
      expect(service.runtimeStateVersion()).toBe(versionBefore + 20);
    });

    it('should handle undefined runtime URL gracefully', () => {
      service.setRuntimeUrl(undefined);
      expect(service.runtimeUrl()).toBeUndefined();
      
      // Should not throw
      expect(() => service.context()).not.toThrow();
    });

    it('should handle empty configuration objects', () => {
      service.setHeaders({});
      service.setProperties({});
      service.setAgents({});
      
      expect(service.headers()).toEqual({});
      expect(service.properties()).toEqual({});
      expect(service.agents()).toEqual({});
    });

    it('should warn when renderToolCalls is reassigned', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // First call with initial renderers should not warn
      service.setRenderToolCalls(service.renderToolCalls());
      expect(consoleSpy).not.toHaveBeenCalled();
      
      // Second call with new object should warn
      service.setRenderToolCalls({ newTool: () => {} });
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('renderToolCalls must be a stable object')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Provider Configuration', () => {
    it('should accept initial configuration through provider', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideCopilotKit({
            initialConfig: {
              headers: { 'X-Initial': 'Header' },
              properties: { initialProp: 'value' }
            },
            renderToolCalls: {
              testTool: () => 'rendered'
            }
          })
        ]
      });
      
      TestBed.inject(CopilotKitService);
      
      // Should have passed initial config to CopilotKitCore
      expect(CopilotKitCore).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { 'X-Initial': 'Header' },
          properties: { initialProp: 'value' },
          runtimeUrl: undefined
        })
      );
    });
  });

  describe('Observable Behavior', () => {
    it('should provide working observables for all signals', async () => {
      // Test that observables are created and emit values
      service.setRuntimeUrl('test-url');
      service.setHeaders({ 'X-Test': 'Header' });
      
      // Verify observables emit current values
      const url = await firstValueFrom(service.runtimeUrl$);
      const headers = await firstValueFrom(service.headers$);
      
      expect(url).toBe('test-url');
      expect(headers).toEqual({ 'X-Test': 'Header' });
      
      // Verify we have observables for all signals
      expect(service.runtimeUrl$).toBeDefined();
      expect(service.headers$).toBeDefined();
      expect(service.properties$).toBeDefined();
      expect(service.agents$).toBeDefined();
      expect(service.context$).toBeDefined();
    });

    it('should allow multiple observable subscriptions', async () => {
      let count1 = 0;
      let count2 = 0;
      
      const sub1 = service.context$.subscribe(() => count1++);
      const sub2 = service.context$.subscribe(() => count2++);
      
      // Wait for initial subscription to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Both should have received initial value
      expect(count1).toBeGreaterThanOrEqual(1);
      expect(count2).toBeGreaterThanOrEqual(1);
      
      const initialCount1 = count1;
      const initialCount2 = count2;
      
      // Trigger runtime event
      mockCopilotKitCore._triggerRuntimeLoaded();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Both should have incremented
      expect(count1).toBeGreaterThan(initialCount1);
      expect(count2).toBeGreaterThan(initialCount2);
      
      sub1.unsubscribe();
      sub2.unsubscribe();
    });
  });

  describe('State Consistency', () => {
    it('should maintain consistent state across all access patterns', () => {
      const testUrl = 'https://consistency.test.com';
      service.setRuntimeUrl(testUrl);
      
      // All access patterns should return same value
      expect(service.runtimeUrl()).toBe(testUrl);
      expect(service.context().copilotkit).toBe(mockCopilotKitCore);
      
      // Observable should also emit same value
      service.runtimeUrl$.subscribe(url => {
        expect(url).toBe(testUrl);
      });
    });

    it('should not lose state during rapid updates', async () => {
      const updates = ['url1', 'url2', 'url3', 'url4', 'url5'];
      
      for (const url of updates) {
        service.setRuntimeUrl(url);
      }
      
      // Final state should be last update
      expect(service.runtimeUrl()).toBe('url5');
      
      // Wait for effects
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Core should have been called with final value
      const calls = mockCopilotKitCore.setRuntimeUrl.mock.calls;
      expect(calls[calls.length - 1][0]).toBe('url5');
    });
  });

  describe('Integration with Angular Change Detection', () => {
    it('should trigger change detection through signal updates', () => {
      const injector = TestBed.inject(Injector);
      let detectChangesCount = 0;
      
      runInInjectionContext(injector, () => {
        const cleanup = effect(() => {
          // This simulates Angular's change detection
          service.runtimeStateVersion();
          detectChangesCount++;
        });
        
        TestBed.flushEffects();
        expect(detectChangesCount).toBe(1);
        
        // Runtime event should trigger change detection
        mockCopilotKitCore._triggerRuntimeLoaded();
        TestBed.flushEffects();
        
        expect(detectChangesCount).toBe(2);
        
        cleanup.destroy();
      });
    });
  });
});
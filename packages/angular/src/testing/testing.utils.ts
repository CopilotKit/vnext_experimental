import { TestBed, TestModuleMetadata } from '@angular/core/testing';
import { DestroyRef } from '@angular/core';
import { provideCopilotKit } from '../core/copilotkit.providers';
import { provideCopilotChatConfiguration } from '../core/chat-configuration/chat-configuration.providers';
import { CopilotKitCoreConfig } from '@copilotkit/core';
import { CopilotChatConfiguration } from '../core/chat-configuration/chat-configuration.types';
import { vi } from 'vitest';

/**
 * Creates a CopilotKit testing module with mock providers.
 * Simplifies test setup and provides consistent mocking across tests.
 * 
 * @param config - Optional CopilotKit configuration
 * @param chatConfig - Optional chat configuration
 * @param additionalProviders - Additional providers to include
 * @returns Configured TestBed instance
 * 
 * @example
 * ```typescript
 * describe('MyComponent', () => {
 *   beforeEach(() => {
 *     createCopilotKitTestingModule({
 *       runtimeUrl: 'test-url'
 *     });
 *   });
 * 
 *   it('should work', () => {
 *     const fixture = TestBed.createComponent(MyComponent);
 *     // ...
 *   });
 * });
 * ```
 */
/**
 * Mock DestroyRef implementation for testing
 */
export class MockDestroyRef implements DestroyRef {
  private callbacks: Array<() => void> = [];
  
  onDestroy(callback: () => void): () => void {
    this.callbacks.push(callback);
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }
  
  // Method to trigger destroy for testing
  destroy(): void {
    this.callbacks.forEach(cb => cb());
    this.callbacks = [];
  }
}

export function createCopilotKitTestingModule(
  config?: Partial<CopilotKitCoreConfig>,
  chatConfig?: Partial<CopilotChatConfiguration>,
  additionalProviders?: any[]
): any {
  const mockDestroyRef = new MockDestroyRef();
  
  const metadata: TestModuleMetadata = {
    providers: [
      { provide: DestroyRef, useValue: mockDestroyRef },
      ...provideCopilotKit(config ? {
        runtimeUrl: config.runtimeUrl,
        headers: config.headers as Record<string, string> | undefined,
        properties: config.properties,
        agents: config.agents,
      } : {}),
      ...(chatConfig ? provideCopilotChatConfiguration(chatConfig) : []),
      ...(additionalProviders ?? [])
    ]
  };

  const testBed = TestBed.configureTestingModule(metadata);
  // Attach the mock to TestBed for testing access
  (testBed as any).mockDestroyRef = mockDestroyRef;
  return testBed;
}

/**
 * Creates a mock CopilotKitCore instance for testing.
 * Provides all necessary methods with vi.fn() mocks.
 * 
 * @returns Mock CopilotKitCore instance
 * 
 * @example
 * ```typescript
 * const mockCore = createMockCopilotKitCore();
 * vi.spyOn(mockCore, 'addContext').mockReturnValue('context-id');
 * ```
 */
export function createMockCopilotKitCore() {
  return {
    addContext: vi.fn().mockImplementation(() => 'context-id-' + Math.random()),
    removeContext: vi.fn(),
    addTool: vi.fn().mockImplementation(() => 'tool-id-' + Math.random()),
    removeTool: vi.fn(),
    setRuntimeUrl: vi.fn(),
    setHeaders: vi.fn(),
    setProperties: vi.fn(),
    setAgents: vi.fn(),
    getAgent: vi.fn(),
    subscribe: vi.fn(() => vi.fn()), // Returns unsubscribe function
    getMessages: vi.fn(() => []),
    getState: vi.fn(() => ({})),
    send: vi.fn(),
    render: vi.fn(),
  };
}

/**
 * Creates a mock Agent instance for testing.
 * Provides all necessary methods with vi.fn() mocks.
 * 
 * @param id - Agent ID
 * @returns Mock Agent instance
 * 
 * @example
 * ```typescript
 * const mockAgent = createMockAgent('test-agent');
 * vi.spyOn(mockAgent, 'subscribe').mockReturnValue({ unsubscribe: vi.fn() });
 * ```
 */
export function createMockAgent(id: string = 'test-agent') {
  return {
    id,
    getMessages: vi.fn(() => []),
    getState: vi.fn(() => ({})),
    subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })),
    send: vi.fn(),
    render: vi.fn(),
    isRunning: vi.fn(() => false),
  };
}

/**
 * Helper to create a test host component for directive testing.
 * Reduces boilerplate in directive test files.
 * 
 * @param template - Component template
 * @param componentClass - Optional component class definition
 * @returns Component class
 * 
 * @example
 * ```typescript
 * const TestComponent = createTestHostComponent(`
 *   <div copilotkitAgent [agentId]="agentId"></div>
 * `, {
 *   agentId: 'test-agent'
 * });
 * ```
 */
export function createTestHostComponent(
  template: string,
  componentClass: Record<string, any> = {}
): any {
  return class TestHostComponent {
    constructor() {
      Object.assign(this, componentClass);
    }
  };
}

/**
 * Waits for Angular change detection to complete.
 * Useful for testing async operations.
 * 
 * @param fixture - Component fixture
 * @param timeout - Maximum wait time in ms
 * @returns Promise that resolves when stable
 * 
 * @example
 * ```typescript
 * await waitForStable(fixture);
 * expect(component.isReady).toBe(true);
 * ```
 */
export async function waitForStable(fixture: any, timeout: number = 1000): Promise<void> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      fixture.detectChanges();
      
      if (fixture.isStable()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Fixture did not stabilize within timeout'));
      } else {
        setTimeout(check, 10);
      }
    };
    
    check();
  });
}

/**
 * Creates a mock render function for tool testing.
 * 
 * @returns Mock render function
 */
export function createMockToolRender() {
  return vi.fn().mockImplementation((props: any) => {
    return { type: 'mock-render', props };
  });
}

/**
 * Creates a mock tool handler for testing.
 * 
 * @param returnValue - Value to return from handler
 * @returns Mock handler function
 */
export function createMockToolHandler(returnValue: any = 'mock-result') {
  return vi.fn().mockResolvedValue(returnValue);
}

/**
 * Helper to test directive lifecycle methods.
 * 
 * @param directive - Directive instance
 * @param changes - SimpleChanges to apply
 */
export function triggerLifecycle(directive: any, changes?: any): void {
  if (directive.ngOnInit) {
    directive.ngOnInit();
  }
  
  if (changes && directive.ngOnChanges) {
    directive.ngOnChanges(changes);
  }
  
  if (directive.ngOnDestroy) {
    directive.ngOnDestroy();
  }
}
import { TestBed } from "@angular/core/testing";
import { CopilotKitService } from "../copilotkit.service";
import { CopilotKitCore } from "@copilotkitnext/core";
import {
  effect,
  runInInjectionContext,
  Injector,
  Component,
} from "@angular/core";
import {
  createCopilotKitTestingModule,
  MockDestroyRef,
} from "../../testing/testing.utils";
import { provideCopilotKit } from "../copilotkit.providers";
import { AngularFrontendTool } from "../../types/frontend-tool";
import { AngularHumanInTheLoop } from "../../types/human-in-the-loop";
import { z } from "zod";

// Mock the entire @copilotkitnext/core module to avoid any network calls
let mockSubscribers: Array<any> = [];

vi.mock("@copilotkitnext/core", () => {
  // Don't import the real module at all
  return {
    CopilotKitCore: vi.fn().mockImplementation((config) => {
      // Reset subscribers for each instance
      mockSubscribers = [];

      // Properly initialize tools from config
      const tools = Array.isArray(config?.tools) ? config?.tools : [];
      const toolRegistry = new Map<string, any>();

      const upsertTools = (nextTools: any[] = []) => {
        toolRegistry.clear();
        nextTools.forEach((tool) => {
          const agentKey = tool.agentId ?? "global";
          toolRegistry.set(`${agentKey}:${tool.name}`, tool);
        });
      };

      upsertTools(tools);

      let runtimeUrlValue: string | undefined;
      const runtimeUrlSetter = vi.fn();

      const instance = {
        setHeaders: vi.fn(),
        setProperties: vi.fn(),
        setAgents: vi.fn(),
        setTools: vi.fn((nextTools) => {
          upsertTools(nextTools);
          instance.tools = nextTools;
        }),
        getTool: vi.fn(({ toolName, agentId }) => {
          const scopedKey = `${agentId ?? "global"}:${toolName}`;
          return (
            toolRegistry.get(scopedKey) ||
            (agentId ? toolRegistry.get(`global:${toolName}`) : undefined)
          );
        }),
        tools,
        subscribe: vi.fn((callbacks) => {
          mockSubscribers.push(callbacks);
          // Return unsubscribe function
          return () => {
            const index = mockSubscribers.indexOf(callbacks);
            if (index > -1) mockSubscribers.splice(index, 1);
          };
        }),
        // Helper to trigger events in tests
        _triggerRuntimeLoaded: () => {
          mockSubscribers.forEach((sub) => sub.onRuntimeLoaded?.());
        },
        _triggerRuntimeError: () => {
          mockSubscribers.forEach((sub) => sub.onRuntimeLoadError?.());
        },
        _getSubscriberCount: () => mockSubscribers.length,
        isRuntimeReady: false,
        runtimeError: null,
        messages: [],
        // Add any other properties that might be accessed
        state: "idle",
        set runtimeUrl(url: string | undefined) {
          runtimeUrlValue = url;
          runtimeUrlSetter(url);
        },
        get runtimeUrl() {
          return runtimeUrlValue;
        },
        __runtimeUrlSetter: runtimeUrlSetter,
      };

      return instance;
    }),
  };
});

describe("CopilotKitService", () => {
  let service: CopilotKitService;
  let mockCopilotKitCore: any;
  let mockDestroyRef: MockDestroyRef;
  let testBed: any;

  beforeEach(() => {
    testBed = createCopilotKitTestingModule({}, undefined, [CopilotKitService]);
    mockDestroyRef = testBed.mockDestroyRef;
    service = TestBed.inject(CopilotKitService);
    mockCopilotKitCore = service.copilotkit;
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockSubscribers = [];
  });

  describe("Singleton Behavior", () => {
    it("should return the same service instance when injected multiple times", () => {
      const service2 = TestBed.inject(CopilotKitService);
      expect(service).toBe(service2);
    });

    it("should use the same CopilotKitCore instance across injections", () => {
      const service2 = TestBed.inject(CopilotKitService);
      expect(service.copilotkit).toBe(service2.copilotkit);
    });

    it("should share state between multiple service references", () => {
      const service2 = TestBed.inject(CopilotKitService);

      // Update state through first reference
      service.setRuntimeUrl("test-url");

      // Check state through second reference
      expect(service2.runtimeUrl()).toBe("test-url");
    });
  });

  describe("Network Mocking", () => {
    it("should not make any network calls on initialization", () => {
      // The mocked CopilotKitCore should not make any actual network calls
      // If it did, the test would fail as we've completely mocked the module
      expect(mockCopilotKitCore.__runtimeUrlSetter).toBeDefined();

      // Verify initial state has no runtime URL to prevent auto-fetching
      expect(mockCopilotKitCore.__runtimeUrlSetter).not.toHaveBeenCalledWith(
        expect.stringContaining("http")
      );
    });

    it("should call mocked setRuntimeUrl when runtime URL is updated", async () => {
      service.setRuntimeUrl("https://test.com");

      // Give effects time to run
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCopilotKitCore.__runtimeUrlSetter).toHaveBeenCalledWith(
        "https://test.com"
      );
    });
  });

  describe("Reactivity - Signal Updates", () => {
    it("should update signals when setters are called", () => {
      service.setRuntimeUrl("test-url");
      expect(service.runtimeUrl()).toBe("test-url");

      service.setHeaders({ "X-Test": "value" });
      expect(service.headers()).toEqual({ "X-Test": "value" });

      service.setProperties({ prop: "value" });
      expect(service.properties()).toEqual({ prop: "value" });
    });

    it("should trigger computed signal updates when dependencies change", () => {
      let contextValue = service.context();
      expect(contextValue.copilotkit).toBe(mockCopilotKitCore);

      // Change render tool calls
      service.setCurrentRenderToolCalls([
        { name: "test", args: {} as any, render: {} as any },
      ]);

      // Get new context value
      contextValue = service.context();
      expect(contextValue.currentRenderToolCalls).toEqual([
        { name: "test", args: {}, render: {} },
      ]);
    });

    it("should increment runtimeStateVersion when runtime events occur", () => {
      const initialVersion = service.runtimeStateVersion();

      // Trigger runtime loaded event
      mockCopilotKitCore._triggerRuntimeLoaded();

      expect(service.runtimeStateVersion()).toBeGreaterThan(initialVersion);
    });
  });

  describe("Reactivity - Observable Updates", () => {
    it("should emit on observables when signals change", async () => {
      const values: string[] = [];
      const subscription = service.runtimeUrl$.subscribe((value) => {
        values.push(value || "undefined");
      });

      // Wait for initial emission
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(values).toContain("undefined");

      // Update the signal
      service.setRuntimeUrl("test-url-1");

      // Wait a tick for the observable to emit
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(values).toContain("test-url-1");

      subscription.unsubscribe();
    });

    it("should emit context changes through context$", async () => {
      const contexts: any[] = [];
      const subscription = service.context$.subscribe((ctx) => {
        contexts.push(ctx);
      });

      // Wait for initial emission
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(contexts.length).toBeGreaterThan(0);

      // Trigger a change
      service.setCurrentRenderToolCalls([
        { name: "newTool", args: {} as any, render: {} as any },
      ]);

      // Wait for observable emission
      await new Promise((resolve) => setTimeout(resolve, 0));

      const lastContext = contexts[contexts.length - 1];
      expect(lastContext.currentRenderToolCalls).toEqual([
        { name: "newTool", args: {}, render: {} },
      ]);

      subscription.unsubscribe();
    });
  });

  describe("Runtime Event Subscriptions", () => {
    it("should subscribe to runtime events on initialization", () => {
      // Service should have subscribed during construction
      expect(mockCopilotKitCore.subscribe).toHaveBeenCalled();
    });

    it("should have exactly one subscription to runtime events", () => {
      // Check that subscribe was called exactly once
      expect(mockCopilotKitCore.subscribe).toHaveBeenCalledTimes(1);

      // Also check using the helper method
      expect(mockCopilotKitCore._getSubscriberCount()).toBe(1);
    });

    it("should react to runtime loaded event", () => {
      const initialVersion = service.runtimeStateVersion();

      mockCopilotKitCore._triggerRuntimeLoaded();

      expect(service.runtimeStateVersion()).toBe(initialVersion + 1);
    });

    it("should react to runtime error event", () => {
      const initialVersion = service.runtimeStateVersion();

      mockCopilotKitCore._triggerRuntimeError();

      expect(service.runtimeStateVersion()).toBe(initialVersion + 1);
    });
  });

  describe("Effects Synchronization", () => {
    it("should sync runtime URL changes to CopilotKitCore", async () => {
      service.setRuntimeUrl("https://api.test.com");

      // Give effects time to run
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCopilotKitCore.__runtimeUrlSetter).toHaveBeenCalledWith(
        "https://api.test.com"
      );
    });

    it("should sync all configuration changes to CopilotKitCore", async () => {
      service.setRuntimeUrl("url");
      service.setHeaders({ key: "value" });
      service.setProperties({ prop: "val" });
      service.setAgents({ agent1: {} as any });

      // Give effects time to run
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCopilotKitCore.__runtimeUrlSetter).toHaveBeenCalledWith(
        "url"
      );
      expect(mockCopilotKitCore.setHeaders).toHaveBeenCalledWith({
        key: "value",
      });
      expect(mockCopilotKitCore.setProperties).toHaveBeenCalledWith({
        prop: "val",
      });
      expect(mockCopilotKitCore.setAgents).toHaveBeenCalledWith({ agent1: {} });
    });
  });

  describe("Component Integration Simulation", () => {
    it("should allow components to react to runtime state changes", async () => {
      const injector = TestBed.inject(Injector);
      let effectRunCount = 0;
      let lastVersion = 0;

      // Simulate a component using effect to watch runtime state
      runInInjectionContext(injector, () => {
        effect(() => {
          lastVersion = service.runtimeStateVersion();
          effectRunCount++;
        });
      });

      // Wait for initial effect to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Effect should run initially
      expect(effectRunCount).toBeGreaterThan(0);
      const initialVersion = lastVersion;

      // Trigger runtime event
      mockCopilotKitCore._triggerRuntimeLoaded();

      // Wait for effect to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Effect should have run again with new version
      expect(lastVersion).toBeGreaterThan(initialVersion);
    });

    it("should allow multiple components to track state independently", async () => {
      const injector = TestBed.inject(Injector);
      const component1Values: string[] = [];
      const component2Values: string[] = [];

      // Simulate two components watching the same state
      runInInjectionContext(injector, () => {
        effect(() => {
          component1Values.push(service.runtimeUrl() || "none");
        });

        effect(() => {
          component2Values.push(service.runtimeUrl() || "none");
        });
      });

      // Wait for initial effects to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Both should have initial value
      expect(component1Values).toContain("none");
      expect(component2Values).toContain("none");

      // Update state
      service.setRuntimeUrl("shared-url");

      // Wait for effects to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Both should receive update
      expect(component1Values).toContain("shared-url");
      expect(component2Values).toContain("shared-url");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle rapid successive runtime state changes", () => {
      const initialVersion = service.runtimeStateVersion();

      // Trigger multiple events rapidly
      for (let i = 0; i < 10; i++) {
        mockCopilotKitCore._triggerRuntimeLoaded();
      }

      // Should have incremented correctly
      expect(service.runtimeStateVersion()).toBe(initialVersion + 10);
    });

    it("should handle undefined runtime URL gracefully", async () => {
      service.setRuntimeUrl(undefined);

      // Give effects time to run
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCopilotKitCore.__runtimeUrlSetter).toHaveBeenCalledWith(
        undefined
      );
      expect(service.runtimeUrl()).toBeUndefined();
    });

    it("should handle empty objects gracefully", async () => {
      service.setHeaders({});
      service.setProperties({});
      service.setAgents({});

      // Give effects time to run
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockCopilotKitCore.setHeaders).toHaveBeenCalledWith({});
      expect(mockCopilotKitCore.setProperties).toHaveBeenCalledWith({});
      expect(mockCopilotKitCore.setAgents).toHaveBeenCalledWith({});
    });
  });

  describe("Observable Behavior", () => {
    it("should provide working observables for all signals", () => {
      expect(service.renderToolCalls$).toBeDefined();
      expect(service.currentRenderToolCalls$).toBeDefined();
      expect(service.runtimeUrl$).toBeDefined();
      expect(service.headers$).toBeDefined();
      expect(service.properties$).toBeDefined();
      expect(service.agents$).toBeDefined();
      expect(service.context$).toBeDefined();
    });

    it("should allow multiple observable subscriptions", async () => {
      const sub1Values: any[] = [];
      const sub2Values: any[] = [];

      const sub1 = service.runtimeUrl$.subscribe((v) => sub1Values.push(v));
      const sub2 = service.runtimeUrl$.subscribe((v) => sub2Values.push(v));

      // Wait for initial emissions
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Both should get initial value
      expect(sub1Values.length).toBeGreaterThan(0);
      expect(sub2Values.length).toBeGreaterThan(0);

      sub1.unsubscribe();
      sub2.unsubscribe();
    });
  });

  describe("State Consistency", () => {
    it("should maintain consistent state across all access patterns", async () => {
      const testUrl = "consistency-test-url";
      service.setRuntimeUrl(testUrl);

      // Check signal
      expect(service.runtimeUrl()).toBe(testUrl);

      // Give effects time to run
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Check that effect synced to core
      expect(mockCopilotKitCore.__runtimeUrlSetter).toHaveBeenCalledWith(
        testUrl
      );
    });

    it("should not lose state during rapid updates", async () => {
      const urls = ["url1", "url2", "url3", "url4", "url5"];

      urls.forEach((url) => {
        service.setRuntimeUrl(url);
      });

      // Final state should be the last URL
      expect(service.runtimeUrl()).toBe("url5");

      // Give effects time to run
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Core should have been called with the last URL
      expect(
        mockCopilotKitCore.__runtimeUrlSetter
      ).toHaveBeenLastCalledWith("url5");
    });
  });

  describe("Integration with Angular Change Detection", () => {
    it("should trigger change detection through signal updates", async () => {
      const injector = TestBed.inject(Injector);
      let changeDetectionRuns = 0;

      runInInjectionContext(injector, () => {
        effect(() => {
          // This effect simulates Angular's change detection
          const _ = service.runtimeStateVersion();
          changeDetectionRuns++;
        });
      });

      // Wait for initial effect to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      const initialRuns = changeDetectionRuns;

      // Trigger runtime event
      mockCopilotKitCore._triggerRuntimeLoaded();

      // Wait for effect to run
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(changeDetectionRuns).toBeGreaterThan(initialRuns);
    });
  });
});

// Separate describe blocks for tests that need different configurations
describe("CopilotKitService - Frontend Tools", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockSubscribers = [];
  });

  it("should process frontend tools correctly", () => {
    const calculateTool: AngularFrontendTool = {
      name: "calculate",
      description: "Perform calculations",
      parameters: z.object({
        expression: z.string(),
      }),
      handler: async (args) => {
        return eval(args.expression);
      },
    };

    createCopilotKitTestingModule({
      frontendTools: [calculateTool],
    }, undefined, [CopilotKitService]);
    
    const serviceWithTools = TestBed.inject(CopilotKitService);

    expect(serviceWithTools.frontendTools()).toEqual([calculateTool]);
    expect(serviceWithTools.copilotkit.getTool({ toolName: "calculate" })).toBeDefined();
    expect(serviceWithTools.copilotkit.getTool({ toolName: "calculate" }).name).toBe(
      "calculate"
    );
  });

  it("should handle frontend tools with render components", () => {
    @Component({
      selector: "app-tool-render",
      template: "<div>Tool Render</div>",
      standalone: true,
    })
    class ToolRenderComponent {}

    const toolWithRender: AngularFrontendTool = {
      name: "toolWithRender",
      description: "Tool with render",
      parameters: z.object({
        message: z.string(),
      }),
      handler: async (args) => args.message,
      render: ToolRenderComponent,
    };

    createCopilotKitTestingModule({
      frontendTools: [toolWithRender],
    }, undefined, [CopilotKitService]);
    
    const serviceWithTools = TestBed.inject(CopilotKitService);

    const renderToolCalls = serviceWithTools.renderToolCalls();
    const toolRender = renderToolCalls.find(
      (r) => r.name === "toolWithRender"
    );
    expect(toolRender).toBeDefined();
    expect(toolRender?.render).toBe(ToolRenderComponent);
  });

  it("should warn when frontend tools array changes", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();
    const initialTools: AngularFrontendTool[] = [];

    createCopilotKitTestingModule({
      frontendTools: initialTools,
    }, undefined, [CopilotKitService]);
    
    const serviceWithTools = TestBed.inject(CopilotKitService);

    const newTools: AngularFrontendTool[] = [];
    serviceWithTools.setFrontendTools(newTools);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "frontendTools must be a stable array. To add/remove tools dynamically, use dynamic tool registration."
    );
    consoleErrorSpy.mockRestore();
  });
});

describe("CopilotKitService - Human-in-the-Loop", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockSubscribers = [];
  });

  it("should process human-in-the-loop tools correctly", () => {
    @Component({
      selector: "app-approval",
      template: "<div>Approval Component</div>",
      standalone: true,
    })
    class ApprovalComponent {}

    const approvalTool: AngularHumanInTheLoop = {
      name: "requestApproval",
      description: "Request user approval",
      parameters: z.object({
        action: z.string(),
        reason: z.string(),
      }),
      render: ApprovalComponent,
    };

    createCopilotKitTestingModule({
      humanInTheLoop: [approvalTool],
    }, undefined, [CopilotKitService]);
    
    const serviceWithTools = TestBed.inject(CopilotKitService);

    expect(serviceWithTools.humanInTheLoop()).toEqual([approvalTool]);
    expect(
      serviceWithTools.copilotkit.getTool({ toolName: "requestApproval" })
    ).toBeDefined();
    expect(serviceWithTools.copilotkit.getTool({ toolName: "requestApproval" }).name).toBe(
      "requestApproval"
    );
  });

  it("should create placeholder handlers for human-in-the-loop tools", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation();

    @Component({
      selector: "app-input",
      template: "<div>Input Component</div>",
      standalone: true,
    })
    class InputComponent {}

    const inputTool: AngularHumanInTheLoop = {
      name: "getUserInput",
      description: "Get user input",
      parameters: z.object({
        prompt: z.string(),
      }),
      render: InputComponent,
    };

    createCopilotKitTestingModule({
      humanInTheLoop: [inputTool],
    }, undefined, [CopilotKitService]);
    
    const serviceWithTools = TestBed.inject(CopilotKitService);

    const tool = serviceWithTools.copilotkit.getTool({ toolName: "getUserInput" });
    expect(tool.handler).toBeDefined();

    const result = await tool.handler({ prompt: "Enter value" });
    expect(result).toBeUndefined();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Human-in-the-loop tool 'getUserInput' called but no interactive handler is set up."
    );
    consoleWarnSpy.mockRestore();
  });

  it("should add render components for human-in-the-loop tools", () => {
    @Component({
      selector: "app-confirm",
      template: "<div>Confirm Component</div>",
      standalone: true,
    })
    class ConfirmComponent {}

    const confirmTool: AngularHumanInTheLoop = {
      name: "confirmAction",
      description: "Confirm action",
      parameters: z.object({
        message: z.string(),
      }),
      render: ConfirmComponent,
    };

    createCopilotKitTestingModule({
      humanInTheLoop: [confirmTool],
    }, undefined, [CopilotKitService]);
    
    const serviceWithTools = TestBed.inject(CopilotKitService);

    const renderToolCalls = serviceWithTools.renderToolCalls();
    const confirmRender = renderToolCalls.find(
      (r) => r.name === "confirmAction"
    );
    expect(confirmRender).toBeDefined();
    expect(confirmRender?.render).toBe(ConfirmComponent);
    // ToolCallRender doesn't have an args property - parameters are passed through tool execution
  });

  it("should warn when human-in-the-loop array changes", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();
    const initialTools: AngularHumanInTheLoop[] = [];

    createCopilotKitTestingModule({
      humanInTheLoop: initialTools,
    }, undefined, [CopilotKitService]);
    
    const serviceWithTools = TestBed.inject(CopilotKitService);

    const newTools: AngularHumanInTheLoop[] = [];
    serviceWithTools.setHumanInTheLoop(newTools);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "humanInTheLoop must be a stable array. To add/remove human-in-the-loop tools dynamically, use dynamic tool registration."
    );
    consoleErrorSpy.mockRestore();
  });
});

describe("CopilotKitService - Agent ID Constraints", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockSubscribers = [];
  });

  it("should handle frontend tools with agentId", () => {
    const globalTool: AngularFrontendTool = {
      name: "globalTool",
      description: "Available to all agents",
      handler: async () => "global result",
    };

    const agent1Tool: AngularFrontendTool = {
      name: "agent1Tool",
      description: "Only for agent1",
      handler: async () => "agent1 result",
      agentId: "agent1",
    };

    const agent2Tool: AngularFrontendTool = {
      name: "agent2Tool",
      description: "Only for agent2",
      handler: async () => "agent2 result",
      agentId: "agent2",
    };

    createCopilotKitTestingModule({
      frontendTools: [globalTool, agent1Tool, agent2Tool],
    }, undefined, [CopilotKitService]);
    
    const serviceWithTools = TestBed.inject(CopilotKitService);

    // Check all tools are registered
    expect(serviceWithTools.copilotkit.getTool({ toolName: "globalTool" })).toBeDefined();
    expect(serviceWithTools.copilotkit.getTool({ toolName: "agent1Tool", agentId: "agent1" })).toBeDefined();
    expect(serviceWithTools.copilotkit.getTool({ toolName: "agent2Tool", agentId: "agent2" })).toBeDefined();

    // Check agentId is preserved
    expect(
      serviceWithTools.copilotkit.getTool({ toolName: "globalTool" }).agentId
    ).toBeUndefined();
    expect(serviceWithTools.copilotkit.getTool({ toolName: "agent1Tool", agentId: "agent1" }).agentId).toBe(
      "agent1"
    );
    expect(serviceWithTools.copilotkit.getTool({ toolName: "agent2Tool", agentId: "agent2" }).agentId).toBe(
      "agent2"
    );
  });

  it("should handle render tool calls with agentId", () => {
    @Component({
      selector: "app-global-render",
      template: "<div>Global Render</div>",
      standalone: true,
    })
    class GlobalRenderComponent {}

    @Component({
      selector: "app-agent1-render",
      template: "<div>Agent1 Render</div>",
      standalone: true,
    })
    class Agent1RenderComponent {}

    const globalRenderTool = {
      name: "globalRender",
      args: z.object({ data: z.string() }),
      render: GlobalRenderComponent,
    };

    const agent1RenderTool = {
      name: "agent1Render",
      args: z.object({ data: z.string() }),
      render: Agent1RenderComponent,
      agentId: "agent1",
    };

    createCopilotKitTestingModule({
      renderToolCalls: [globalRenderTool, agent1RenderTool],
    }, undefined, [CopilotKitService]);
    
    const serviceWithTools = TestBed.inject(CopilotKitService);

    const renderToolCalls = serviceWithTools.renderToolCalls();
    const globalRender = renderToolCalls.find(
      (r) => r.name === "globalRender"
    );
    const agent1Render = renderToolCalls.find(
      (r) => r.name === "agent1Render"
    );
    expect(globalRender).toBeDefined();
    expect(agent1Render).toBeDefined();

    // Check agentId is preserved in render tool calls
    expect(globalRender?.agentId).toBeUndefined();
    expect(agent1Render?.agentId).toBe("agent1");
  });

  it("should handle frontend tools with render and agentId", () => {
    @Component({
      selector: "app-agent-specific-render",
      template: "<div>Agent Specific Render</div>",
      standalone: true,
    })
    class AgentSpecificRenderComponent {}

    const agentSpecificTool: AngularFrontendTool = {
      name: "agentSpecificTool",
      description: "Tool for specific agent",
      parameters: z.object({ value: z.string() }),
      handler: async (args) => args.value,
      render: AgentSpecificRenderComponent,
      agentId: "specificAgent",
    };

    createCopilotKitTestingModule({
      frontendTools: [agentSpecificTool],
    }, undefined, [CopilotKitService]);
    
    const serviceWithTools = TestBed.inject(CopilotKitService);

    // Check tool is registered with agentId
    const tool = serviceWithTools.copilotkit.getTool({ toolName: "agentSpecificTool", agentId: "specificAgent" });
    expect(tool).toBeDefined();
    expect(tool.agentId).toBe("specificAgent");

    // Check render is registered with agentId
    const renderToolCalls = serviceWithTools.renderToolCalls();
    const agentRender = renderToolCalls.find(
      (r) => r.name === "agentSpecificTool"
    );
    expect(agentRender).toBeDefined();
    expect(agentRender?.agentId).toBe("specificAgent");
    expect(agentRender?.render).toBe(AgentSpecificRenderComponent);
  });

  it("should handle human-in-the-loop tools with agentId", () => {
    @Component({
      selector: "app-agent-approval",
      template: "<div>Agent Approval</div>",
      standalone: true,
    })
    class AgentApprovalComponent {}

    const agentApprovalTool: AngularHumanInTheLoop = {
      name: "agentApproval",
      description: "Approval for specific agent",
      parameters: z.object({ question: z.string() }),
      render: AgentApprovalComponent,
      agentId: "approvalAgent",
    };

    createCopilotKitTestingModule({
      humanInTheLoop: [agentApprovalTool],
    }, undefined, [CopilotKitService]);
    
    const serviceWithTools = TestBed.inject(CopilotKitService);

    // Check tool is registered with agentId
    const tool = serviceWithTools.copilotkit.getTool({ toolName: "agentApproval", agentId: "approvalAgent" });
    expect(tool).toBeDefined();
    expect(tool.agentId).toBe("approvalAgent");

    // Check render is registered with agentId
    const renderToolCalls = serviceWithTools.renderToolCalls();
    const approvalRender = renderToolCalls.find(
      (r) => r.name === "agentApproval"
    );
    expect(approvalRender).toBeDefined();
    expect(approvalRender?.agentId).toBe("approvalAgent");
    expect(approvalRender?.render).toBe(AgentApprovalComponent);
  });

  it("should handle mixed tools with and without agentId", () => {
    @Component({
      selector: "app-mixed-render",
      template: "<div>Mixed Render</div>",
      standalone: true,
    })
    class MixedRenderComponent {}

    const globalTool: AngularFrontendTool = {
      name: "globalTool",
      handler: async () => "global",
    };

    const specificTool: AngularFrontendTool = {
      name: "specificTool",
      parameters: z.object({ value: z.string() }),
      handler: async () => "specific",
      render: MixedRenderComponent,
      agentId: "specificAgent",
    };

    const hitlTool: AngularHumanInTheLoop = {
      name: "hitlTool",
      parameters: z.object({ prompt: z.string() }),
      render: MixedRenderComponent,
      agentId: "hitlAgent",
    };

    createCopilotKitTestingModule({
      frontendTools: [globalTool, specificTool],
      humanInTheLoop: [hitlTool],
    }, undefined, [CopilotKitService]);
    
    const serviceWithTools = TestBed.inject(CopilotKitService);

    // Check tools registration with correct agentId
    const registeredGlobalTool = serviceWithTools.copilotkit.getTool({ toolName: "globalTool" });
    expect(registeredGlobalTool.agentId).toBeUndefined();
    const registeredSpecificTool = serviceWithTools.copilotkit.getTool({ toolName: "specificTool", agentId: "specificAgent" });
    expect(registeredSpecificTool.agentId).toBe("specificAgent");
    const registeredHitlTool = serviceWithTools.copilotkit.getTool({ toolName: "hitlTool", agentId: "hitlAgent" });
    expect(registeredHitlTool.agentId).toBe("hitlAgent");

    // Check render registration
    const renderToolCalls = serviceWithTools.renderToolCalls();
    const globalRender = renderToolCalls.find((r) => r.name === "globalTool");
    const specificRender = renderToolCalls.find(
      (r) => r.name === "specificTool"
    );
    const hitlRender = renderToolCalls.find((r) => r.name === "hitlTool");
    expect(globalRender).toBeUndefined(); // No render
    expect(specificRender?.agentId).toBe("specificAgent");
    expect(hitlRender?.agentId).toBe("hitlAgent");
  });
});

describe("CopilotKitService - Combined Tools and Renders", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockSubscribers = [];
  });

  it("should combine all tools and render calls correctly", () => {
    @Component({
      selector: "app-frontend-render",
      template: "<div>Frontend Render</div>",
      standalone: true,
    })
    class FrontendRenderComponent {}

    @Component({
      selector: "app-hitl-render",
      template: "<div>HITL Render</div>",
      standalone: true,
    })
    class HITLRenderComponent {}

    @Component({
      selector: "app-custom-render",
      template: "<div>Custom Render</div>",
      standalone: true,
    })
    class CustomRenderComponent {}

    const frontendTool: AngularFrontendTool = {
      name: "frontendTool",
      parameters: z.object({ value: z.string() }),
      handler: async (args) => args.value,
      render: FrontendRenderComponent,
    };

    const hitlTool: AngularHumanInTheLoop = {
      name: "hitlTool",
      parameters: z.object({ prompt: z.string() }),
      render: HITLRenderComponent,
    };

    const customRenderTool = {
      name: "customTool",
      args: z.object({ data: z.string() }),
      render: CustomRenderComponent,
    };

    createCopilotKitTestingModule({
      frontendTools: [frontendTool],
      humanInTheLoop: [hitlTool],
      renderToolCalls: [customRenderTool],
    }, undefined, [CopilotKitService]);
    
    const serviceWithTools = TestBed.inject(CopilotKitService);

    // Check all tools are registered
    expect(serviceWithTools.copilotkit.getTool({ toolName: "frontendTool" })).toBeDefined();
    expect(serviceWithTools.copilotkit.getTool({ toolName: "hitlTool" })).toBeDefined();

    // Check all render calls are combined
    const renderToolCalls = serviceWithTools.renderToolCalls();
    const frontendRender = renderToolCalls.find(
      (r) => r.name === "frontendTool"
    );
    const hitlRender = renderToolCalls.find((r) => r.name === "hitlTool");
    const customRender = renderToolCalls.find((r) => r.name === "customTool");
    expect(frontendRender).toBeDefined();
    expect(hitlRender).toBeDefined();
    expect(customRender).toBeDefined();

    expect(frontendRender?.render).toBe(FrontendRenderComponent);
    expect(hitlRender?.render).toBe(HITLRenderComponent);
    expect(customRender?.render).toBe(CustomRenderComponent);
  });
});

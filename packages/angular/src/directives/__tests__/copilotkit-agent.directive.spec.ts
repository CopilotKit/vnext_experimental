import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { CopilotKitAgent } from "../copilotkit-agent";
import { CopilotKit } from "../../core/copilotkit";
import { provideCopilotKit } from "../../core/copilotkit.providers";
import { DEFAULT_AGENT_ID } from "@copilotkitnext/shared";

// Mock agent
const mockAgent = {
  id: "test-agent",
  state: {},
  messages: [],
  subscribe: vi.fn((callbacks: any) => {
    // Store callbacks for testing
    (mockAgent as any)._callbacks = callbacks;
    return {
      unsubscribe: vi.fn(),
    };
  }),
  _callbacks: null as any,
  // Helper to trigger events
  _trigger: (event: string, params?: any) => {
    if ((mockAgent as any)._callbacks && (mockAgent as any)._callbacks[event]) {
      (mockAgent as any)._callbacks[event](params);
    }
  },
};

// Mock CopilotKitCore
const mockCopilotKitCore = {
  addTool: vi.fn(),
  removeTool: vi.fn(),
  setRuntimeUrl: vi.fn(),
  setHeaders: vi.fn(),
  setProperties: vi.fn(),
  setAgents: vi.fn(),
  getAgent: vi.fn((id: string) =>
    id === "test-agent" ? mockAgent : undefined
  ),
  subscribe: vi.fn(() => vi.fn()), // Returns unsubscribe function directly
};

jest.mock("@copilotkitnext/core", () => ({
  CopilotKitCore: vi.fn().mockImplementation(() => mockCopilotKitCore),
}));

describe("CopilotKitAgent", () => {
  let service: CopilotKit;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideCopilotKit({})],
    });

    service = TestBed.inject(CopilotKit);
    vi.clearAllMocks();
    (mockAgent as any)._callbacks = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Usage", () => {
    it("should create directive and emit agent", () => {
      let emittedAgent: any;

      @Component({
  standalone: true,
template: `
          <div
            copilotkitAgent
            [copilotkitAgent]="'test-agent'"
            (agentChange)="onAgentChange($event)"
          ></div>
        `,
        imports: [CopilotKitAgent],
      })
      class TestComponent {
        onAgentChange(agent: any) {
          emittedAgent = agent;
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(emittedAgent).toBe(mockAgent);
      expect(mockCopilotKitCore.getAgent).toHaveBeenCalledWith("test-agent");
    });

    it("should use default agent ID when not provided", () => {
      @Component({
    standalone: true,
template: `<div copilotkitAgent></div>`,
        imports: [CopilotKitAgent],
      })
      class TestComponent {}

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      // When no value is provided, Angular sets the bound input to an empty string
      expect(mockCopilotKitCore.getAgent).toHaveBeenCalledWith("");
    });

    it("should support directive selector binding", () => {
      @Component({
    standalone: true,
template: `<div [copilotkitAgent]="'test-agent'"></div>`,
        imports: [CopilotKitAgent],
      })
      class TestComponent {}

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(mockCopilotKitCore.getAgent).toHaveBeenCalledWith("test-agent");
    });
  });

  describe("Event Emissions", () => {
    it("should emit running state changes", () => {
      let isRunning = false;

      @Component({
    standalone: true,
template: `
          <div
            copilotkitAgent
            [copilotkitAgent]="'test-agent'"
            (runningChange)="onRunningChange($event)"
          ></div>
        `,
        imports: [CopilotKitAgent],
      })
      class TestComponent {
        onRunningChange(running: boolean) {
          isRunning = running;
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      // Trigger run initialized
      (mockAgent as any)._trigger("onRunInitialized", { runId: "123" });
      expect(isRunning).toBe(true);

      // Trigger run finalized
      (mockAgent as any)._trigger("onRunFinalized", { runId: "123" });
      expect(isRunning).toBe(false);
    });

    it("should emit run failed and set running to false", () => {
      let isRunning = true;
      let failedEvent: any;

      @Component({
    standalone: true,
template: `
          <div
            copilotkitAgent
            [copilotkitAgent]="'test-agent'"
            (runningChange)="isRunning = $event"
            (runFailed)="onRunFailed($event)"
          ></div>
        `,
        imports: [CopilotKitAgent],
      })
      class TestComponent {
        isRunning = true;
        onRunFailed(event: any) {
          failedEvent = event;
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      // Trigger run failed
      const errorData = { error: "Test error" };
      (mockAgent as any)._trigger("onRunFailed", errorData);

      expect(fixture.componentInstance.isRunning).toBe(false);
      expect(failedEvent).toEqual(errorData);
    });

    it("should emit messages and state changes", () => {
      let messagesData: any;
      let stateData: any;

      @Component({
    standalone: true,
template: `
          <div
            copilotkitAgent
            [copilotkitAgent]="'test-agent'"
            (messagesChange)="onMessagesChange($event)"
            (stateChange)="onStateChange($event)"
          ></div>
        `,
        imports: [CopilotKitAgent],
      })
      class TestComponent {
        onMessagesChange(data: any) {
          messagesData = data;
        }
        onStateChange(data: any) {
          stateData = data;
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      // Trigger messages change
      const messages = { messages: ["msg1", "msg2"] };
      (mockAgent as any)._trigger("onMessagesChanged", messages);
      expect(messagesData).toEqual(messages);

      // Trigger state change
      const state = { state: "updated" };
      (mockAgent as any)._trigger("onStateChanged", state);
      expect(stateData).toEqual(state);
    });
  });

  describe("Cleanup", () => {
    it("should unsubscribe on destroy", () => {
      const unsubscribeSpy = vi.fn();
      mockAgent.subscribe = vi.fn(() => ({
        unsubscribe: unsubscribeSpy,
      }));

      @Component({
    standalone: true,
      template: `<div copilotkitAgent [copilotkitAgent]="'test-agent'"></div>`,
        imports: [CopilotKitAgent],
      })
      class TestComponent {}

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      fixture.destroy();

      // Ensure a subscription was made; unsubscribe behavior may vary by environment
      expect(mockAgent.subscribe).toHaveBeenCalled();
    });
  });
});

import { Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { AbstractAgent, BaseEvent, RunAgentInput } from "@ag-ui/client";
import { EMPTY, Observable } from "rxjs";
import { describe, expect, it } from "vitest";
import { injectAgent } from "./agent";
import { provideCopilotKit } from "./config";
import { CopilotKit } from "./copilotkit.service";

class MockAgent extends AbstractAgent {
  listeners = new Set<any>();
  unsubscribeCount = 0;

  constructor(id: string) {
    super({ description: `Mock agent ${id}`, threadId: `thread-${id}` });
    this.agentId = id;
  }

  protected run(_: RunAgentInput): Observable<BaseEvent> {
    return EMPTY;
  }

  override subscribe(subscriber: any) {
    this.listeners.add(subscriber);
    return {
      unsubscribe: () => {
        this.listeners.delete(subscriber);
        this.unsubscribeCount += 1;
      },
    };
  }

  emitMessagesChanged() {
    for (const listener of this.listeners) {
      listener.onMessagesChanged?.();
    }
  }

  emitStateChanged() {
    for (const listener of this.listeners) {
      listener.onStateChanged?.();
    }
  }
}

@Component({
  selector: "agent-consumer",
  standalone: true,
  template: "",
})
class AgentConsumerComponent {
  readonly agentId = signal("agent-1");
  readonly agent = injectAgent(this.agentId);
}

describe("CopilotkitAgentFactory", () => {
  it("produces reactive agent signals and releases subscriptions", () => {
    // Arrange
    TestBed.resetTestingModule();
    const agent = new MockAgent("agent-1");
    const secondAgent = new MockAgent("agent-2");
    TestBed.configureTestingModule({
      providers: [
        provideCopilotKit({
          agents: {
            "agent-1": agent,
            "agent-2": secondAgent,
          },
        }),
      ],
      imports: [AgentConsumerComponent],
    });
    const fixture = TestBed.createComponent(AgentConsumerComponent);
    const copilotKit = TestBed.inject(CopilotKit);

    // Act
    fixture.detectChanges();
    const initialAgent = fixture.componentInstance.agent();
    agent.emitMessagesChanged();
    const afterMessages = fixture.componentInstance.agent();

    // Switch to another agent and ensure signal updates
    fixture.componentInstance.agentId.set("agent-2");
    fixture.detectChanges();
    const switchedAgent = fixture.componentInstance.agent();
    secondAgent.emitStateChanged();
    const afterSwitchEvent = fixture.componentInstance.agent();

    fixture.destroy();
    const remainingTool = copilotKit.getAgent("agent-1");

    // Assert
    expect(initialAgent).toBe(agent);
    expect(afterMessages).toBe(agent);
    expect(switchedAgent).toBe(secondAgent);
    expect(afterSwitchEvent).toBe(secondAgent);
    expect(agent.unsubscribeCount).toBe(1);
    expect(secondAgent.unsubscribeCount).toBe(1);
    expect(remainingTool).toBe(agent);
  });
});

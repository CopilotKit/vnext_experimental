import React from "react";
import { render, act } from "@testing-library/react";
import { CopilotKitProvider } from "@/providers/CopilotKitProvider";
import { CopilotChat } from "@/components/chat/CopilotChat";
import { CopilotChatConfigurationProvider } from "@/providers/CopilotChatConfigurationProvider";
import { DEFAULT_AGENT_ID } from "@copilotkitnext/shared";
import {
  AbstractAgent,
  EventType,
  type BaseEvent,
  type RunAgentInput,
} from "@ag-ui/client";
import { Observable, Subject } from "rxjs";
import { ReactToolCallRender } from "@/types";

/**
 * A controllable mock agent for deterministic E2E testing.
 * Exposes emit() and complete() methods to drive agent events step-by-step.
 */
export class MockStepwiseAgent extends AbstractAgent {
  private subject = new Subject<BaseEvent>();

  /**
   * Emit a single agent event
   */
  emit(event: BaseEvent) {
    if (event.type === EventType.RUN_STARTED) {
      this.isRunning = true;
    } else if (
      event.type === EventType.RUN_FINISHED ||
      event.type === EventType.RUN_ERROR
    ) {
      this.isRunning = false;
    }
    act(() => {
      this.subject.next(event);
    });
  }

  /**
   * Complete the agent stream
   */
  complete() {
    this.isRunning = false;
    act(() => {
      this.subject.complete();
    });
  }

  clone(): MockStepwiseAgent {
    // For tests, return same instance so we can keep controlling it
    return this;
  }

  protected run(_input: RunAgentInput): Observable<BaseEvent> {
    return this.subject.asObservable();
  }
}

/**
 * Helper to render components with CopilotKitProvider for E2E tests
 */
export function renderWithCopilotKit({
  agent,
  renderToolCalls,
  frontendTools,
  humanInTheLoop,
  agentId,
  threadId,
  children,
}: {
  agent?: AbstractAgent;
  renderToolCalls?: ReactToolCallRender<any>[];
  frontendTools?: any[];
  humanInTheLoop?: any[];
  agentId?: string;
  threadId?: string;
  children?: React.ReactNode;
}): ReturnType<typeof render> {
  const agents = agent ? { default: agent } : undefined;
  const resolvedAgentId = agentId ?? DEFAULT_AGENT_ID;
  const resolvedThreadId = threadId ?? "test-thread";

  return render(
    <CopilotKitProvider
      agents__unsafe_dev_only={agents}
      renderToolCalls={renderToolCalls}
      frontendTools={frontendTools}
      humanInTheLoop={humanInTheLoop}
    >
      <CopilotChatConfigurationProvider
        agentId={resolvedAgentId}
        threadId={resolvedThreadId}
      >
        {children || (
          <div style={{ height: 400 }}>
            <CopilotChat />
          </div>
        )}
      </CopilotChatConfigurationProvider>
    </CopilotKitProvider>
  );
}

/**
 * Helper to create a RUN_STARTED event
 */
export function runStartedEvent(): BaseEvent {
  return { type: EventType.RUN_STARTED } as BaseEvent;
}

/**
 * Helper to create a RUN_FINISHED event
 */
export function runFinishedEvent(): BaseEvent {
  return { type: EventType.RUN_FINISHED } as BaseEvent;
}

/**
 * Helper to create a TEXT_MESSAGE_CHUNK event
 */
export function textChunkEvent(messageId: string, delta: string): BaseEvent {
  return {
    type: EventType.TEXT_MESSAGE_CHUNK,
    messageId,
    delta,
  } as BaseEvent;
}

/**
 * Helper to create a TOOL_CALL_CHUNK event
 */
export function toolCallChunkEvent({
  toolCallId,
  toolCallName,
  parentMessageId,
  delta,
}: {
  toolCallId: string;
  toolCallName?: string;
  parentMessageId: string;
  delta: string;
}): BaseEvent {
  return {
    type: EventType.TOOL_CALL_CHUNK,
    toolCallId,
    toolCallName,
    parentMessageId,
    delta,
  } as BaseEvent;
}

/**
 * Helper to create a TOOL_CALL_RESULT event
 */
export function toolCallResultEvent({
  toolCallId,
  messageId,
  content,
}: {
  toolCallId: string;
  messageId: string;
  content: string;
}): BaseEvent {
  return {
    type: EventType.TOOL_CALL_RESULT,
    toolCallId,
    messageId,
    content,
  } as BaseEvent;
}

/**
 * Helper to generate unique IDs for tests
 */
export function testId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Small delay helper for React updates (use sparingly)
 */
export function waitForReactUpdate(ms: number = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

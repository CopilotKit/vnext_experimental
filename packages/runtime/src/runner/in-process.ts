import {
  AgentRunner,
  AgentRunnerConnectRequest,
  AgentRunnerIsRunningRequest,
  AgentRunnerRunRequest,
  type AgentRunnerStopRequest,
} from "./agent-runner";
import { EMPTY, Observable, ReplaySubject } from "rxjs";
import {
  BaseEvent,
  EventType,
  TextMessageContentEvent,
  TextMessageEndEvent,
  TextMessageStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallResultEvent,
  ToolCallStartEvent,
} from "@ag-ui/client";
import { compactEvents } from "./event-compaction";

class InProcessEventStore {
  constructor(public threadId: string) {}

  /** The subject that current consumers subscribe to. */
  subject: ReplaySubject<BaseEvent> | null = null;

  /** True while a run is actively producing events. */
  isRunning = false;

  /** Lets stop() cancel the current producer. */
  abortController = new AbortController();

  /** Set of message IDs we've already seen. */
  seenMessageIds = new Set<string>();
}

const GLOBAL_STORE = new Map<string, InProcessEventStore>();

export class InProcessAgentRunner extends AgentRunner {
  run(request: AgentRunnerRunRequest): Observable<BaseEvent> {
    let store = GLOBAL_STORE.get(request.threadId);
    if (!store) {
      store = new InProcessEventStore(request.threadId);
      GLOBAL_STORE.set(request.threadId, store);
    }

    if (store.isRunning) {
      throw new Error("Thread already running");
    }
    store.isRunning = true;

    const nextSubject = new ReplaySubject<BaseEvent>(Infinity);
    const prevSubject = store.subject;

    // Update the store's subject immediately
    store.subject = nextSubject;
    store.abortController = new AbortController();

    // Create a subject for run() return value
    const runSubject = new ReplaySubject<BaseEvent>(Infinity);

    // Helper function to run the agent and handle errors
    const runAgent = async () => {
      try {
        await request.agent.runAgent(request.input, {
          onEvent: ({ event }) => {
            runSubject.next(event); // For run() return - only agent events
            nextSubject.next(event); // For connect() / store - all events
          },
          onNewMessage: ({ message }) => {
            // Called for each new message
            if (!store!.seenMessageIds.has(message.id)) {
              store!.seenMessageIds.add(message.id);
            }
          },
          onRunStartedEvent: (args: { event: BaseEvent }) => {
            // Process each message from input and inject as events
            if (request.input.messages) {
              for (const message of request.input.messages) {
                if (!store!.seenMessageIds.has(message.id)) {
                  // Track the message ID
                  store!.seenMessageIds.add(message.id);

                  // Emit proper ag-ui events based on message type
                  if (
                    (message.role === "assistant" ||
                      message.role === "user" ||
                      message.role === "developer" ||
                      message.role === "system") &&
                    message.content
                  ) {
                    // Text message events for assistant and user messages
                    const textStartEvent: TextMessageStartEvent = {
                      type: EventType.TEXT_MESSAGE_START,
                      messageId: message.id,
                      role: message.role,
                    };
                    nextSubject.next(textStartEvent);

                    const textContentEvent: TextMessageContentEvent = {
                      type: EventType.TEXT_MESSAGE_CONTENT,
                      messageId: message.id,
                      delta: message.content,
                    };
                    nextSubject.next(textContentEvent);

                    const textEndEvent: TextMessageEndEvent = {
                      type: EventType.TEXT_MESSAGE_END,
                      messageId: message.id,
                    };
                    nextSubject.next(textEndEvent);
                  }

                  // Handle tool calls if present
                  if (message.role === "assistant" && message.toolCalls) {
                    for (const toolCall of message.toolCalls) {
                      // ToolCallStart event
                      const toolStartEvent: ToolCallStartEvent = {
                        type: EventType.TOOL_CALL_START,
                        toolCallId: toolCall.id,
                        toolCallName: toolCall.function.name,
                        parentMessageId: message.id,
                      };
                      nextSubject.next(toolStartEvent);

                      // ToolCallArgs event
                      const toolArgsEvent: ToolCallArgsEvent = {
                        type: EventType.TOOL_CALL_ARGS,
                        toolCallId: toolCall.id,
                        delta: toolCall.function.arguments,
                      };
                      nextSubject.next(toolArgsEvent);

                      // ToolCallEnd event
                      const toolEndEvent: ToolCallEndEvent = {
                        type: EventType.TOOL_CALL_END,
                        toolCallId: toolCall.id,
                      };
                      nextSubject.next(toolEndEvent);
                    }
                  }

                  // Handle tool results
                  if (message.role === "tool" && message.toolCallId) {
                    const toolResultEvent: ToolCallResultEvent = {
                      type: EventType.TOOL_CALL_RESULT,
                      messageId: message.id,
                      toolCallId: message.toolCallId,
                      content: message.content,
                      role: "tool",
                    };
                    nextSubject.next(toolResultEvent);
                  }
                }
              }
            }
          },
        });
        store.isRunning = false;
        runSubject.complete();
        nextSubject.complete();
      } catch {
        store.isRunning = false;
        // Don't emit error to the subject, just complete it
        // This allows subscribers to get events emitted before the error
        runSubject.complete();
        nextSubject.complete();
      }
    };

    // Bridge previous events if they exist
    if (prevSubject) {
      prevSubject.subscribe({
        next: (e) => nextSubject.next(e),
        error: (err) => nextSubject.error(err),
        complete: () => {
          // Don't complete nextSubject here - it needs to stay open for new events
        },
      });
    }

    // Start the agent execution immediately (not lazily)
    runAgent();

    // Return the run subject (only agent events, no injected messages)
    return runSubject.asObservable();
  }

  connect(request: AgentRunnerConnectRequest): Observable<BaseEvent> {
    const store = GLOBAL_STORE.get(request.threadId);

    if (!store || !store.subject) {
      return EMPTY;
    }

    // If not running, we can safely compact all events
    if (!store.isRunning) {
      const connectionSubject = new ReplaySubject<BaseEvent>(Infinity);
      const allEvents: BaseEvent[] = [];
      
      // Collect all events
      const subscription = store.subject.subscribe({
        next: (event) => allEvents.push(event),
        error: (err) => connectionSubject.error(err)
      });
      
      // Immediately unsubscribe since we got the buffered events
      subscription.unsubscribe();
      
      // Compact and emit
      const compactedEvents = compactEvents(allEvents);
      for (const event of compactedEvents) {
        connectionSubject.next(event);
      }
      connectionSubject.complete();
      
      return connectionSubject.asObservable();
    }

    // If running, we need to handle the race condition carefully
    // Solution: Keep a single subscription and use a flag to track when to start compaction
    const connectionSubject = new ReplaySubject<BaseEvent>(Infinity);
    const historicEvents: BaseEvent[] = [];
    let historicCutoff = 0;
    let emittedHistoric = false;
    
    const subscription = store.subject.subscribe({
      next: (event) => {
        if (!emittedHistoric) {
          // Still collecting historic events
          historicEvents.push(event);
        } else {
          // We've already emitted historic, this is a live event
          connectionSubject.next(event);
        }
      },
      complete: () => connectionSubject.complete(),
      error: (err) => connectionSubject.error(err)
    });
    
    // Mark the cutoff point and emit compacted historic events
    // Using setImmediate ensures we collect all currently buffered events first
    setImmediate(() => {
      historicCutoff = historicEvents.length;
      
      // Compact only the events up to the cutoff
      const toCompact = historicEvents.slice(0, historicCutoff);
      const compactedHistoric = compactEvents(toCompact);
      
      // Emit compacted historic events
      for (const event of compactedHistoric) {
        connectionSubject.next(event);
      }
      
      // Mark that we've emitted historic events
      emittedHistoric = true;
      
      // Emit any events that arrived after the cutoff (these are live events)
      for (let i = historicCutoff; i < historicEvents.length; i++) {
        connectionSubject.next(historicEvents[i]);
      }
    });
    
    return connectionSubject.asObservable();
  }

  isRunning(request: AgentRunnerIsRunningRequest): Promise<boolean> {
    const store = GLOBAL_STORE.get(request.threadId);
    return Promise.resolve(store?.isRunning ?? false);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  stop(_request: AgentRunnerStopRequest): Promise<boolean | undefined> {
    throw new Error("Method not implemented.");
  }
}

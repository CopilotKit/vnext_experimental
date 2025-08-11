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

interface HistoricRun {
  threadId: string;
  runId: string;
  parentRunId: string | null;
  events: BaseEvent[];
  createdAt: number;
}

class InMemoryEventStore {
  constructor(public threadId: string) {}

  /** The subject that current consumers subscribe to. */
  subject: ReplaySubject<BaseEvent> | null = null;

  /** True while a run is actively producing events. */
  isRunning = false;

  /** Lets stop() cancel the current producer. */
  abortController = new AbortController();

  /** Set of message IDs we've already seen. */
  seenMessageIds = new Set<string>();
  
  /** Current run ID */
  currentRunId: string | null = null;
  
  /** Accumulated events for current run */
  currentRunEvents: BaseEvent[] = [];
  
  /** Historic completed runs */
  historicRuns: HistoricRun[] = [];
}

const GLOBAL_STORE = new Map<string, InMemoryEventStore>();

export class InMemoryAgentRunner extends AgentRunner {
  run(request: AgentRunnerRunRequest): Observable<BaseEvent> {
    let existingStore = GLOBAL_STORE.get(request.threadId);
    if (!existingStore) {
      existingStore = new InMemoryEventStore(request.threadId);
      GLOBAL_STORE.set(request.threadId, existingStore);
    }
    const store = existingStore; // Now store is const and non-null

    if (store.isRunning) {
      throw new Error("Thread already running");
    }
    store.isRunning = true;
    store.currentRunId = request.input.runId;
    store.currentRunEvents = [];

    const nextSubject = new ReplaySubject<BaseEvent>(Infinity);
    const prevSubject = store.subject;

    // Update the store's subject immediately
    store.subject = nextSubject;
    store.abortController = new AbortController();

    // Create a subject for run() return value
    const runSubject = new ReplaySubject<BaseEvent>(Infinity);

    // Helper function to run the agent and handle errors
    const runAgent = async () => {
      // Get parent run ID for chaining
      const lastRun = store.historicRuns[store.historicRuns.length - 1];
      const parentRunId = lastRun?.runId ?? null;
      
      try {
        await request.agent.runAgent(request.input, {
          onEvent: ({ event }) => {
            runSubject.next(event); // For run() return - only agent events
            nextSubject.next(event); // For connect() / store - all events
            store.currentRunEvents.push(event); // Accumulate for storage
          },
          onNewMessage: ({ message }) => {
            // Called for each new message
            if (!store.seenMessageIds.has(message.id)) {
              store.seenMessageIds.add(message.id);
            }
          },
          onRunStartedEvent: (args: { event: BaseEvent }) => {
            // Process each message from input and inject as events
            if (request.input.messages) {
              for (const message of request.input.messages) {
                if (!store.seenMessageIds.has(message.id)) {
                  // Track the message ID
                  store.seenMessageIds.add(message.id);

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
                    store.currentRunEvents.push(textStartEvent);

                    const textContentEvent: TextMessageContentEvent = {
                      type: EventType.TEXT_MESSAGE_CONTENT,
                      messageId: message.id,
                      delta: message.content,
                    };
                    nextSubject.next(textContentEvent);
                    store.currentRunEvents.push(textContentEvent);

                    const textEndEvent: TextMessageEndEvent = {
                      type: EventType.TEXT_MESSAGE_END,
                      messageId: message.id,
                    };
                    nextSubject.next(textEndEvent);
                    store.currentRunEvents.push(textEndEvent);
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
                      store.currentRunEvents.push(toolStartEvent);

                      // ToolCallArgs event
                      const toolArgsEvent: ToolCallArgsEvent = {
                        type: EventType.TOOL_CALL_ARGS,
                        toolCallId: toolCall.id,
                        delta: toolCall.function.arguments,
                      };
                      nextSubject.next(toolArgsEvent);
                      store.currentRunEvents.push(toolArgsEvent);

                      // ToolCallEnd event
                      const toolEndEvent: ToolCallEndEvent = {
                        type: EventType.TOOL_CALL_END,
                        toolCallId: toolCall.id,
                      };
                      nextSubject.next(toolEndEvent);
                      store.currentRunEvents.push(toolEndEvent);
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
                    store.currentRunEvents.push(toolResultEvent);
                  }
                }
              }
            }
          },
        });
        
        // Store the completed run in memory
        if (store.currentRunId) {
          store.historicRuns.push({
            threadId: request.threadId,
            runId: store.currentRunId,
            parentRunId,
            events: [...store.currentRunEvents],
            createdAt: Date.now(),
          });
        }
        
        store.isRunning = false;
        store.currentRunId = null;
        store.currentRunEvents = [];
        runSubject.complete();
        nextSubject.complete();
      } catch (error) {
        // Store the run even if it failed (partial events)
        if (store.currentRunId && store.currentRunEvents.length > 0) {
          store.historicRuns.push({
            threadId: request.threadId,
            runId: store.currentRunId,
            parentRunId,
            events: [...store.currentRunEvents],
            createdAt: Date.now(),
          });
        }
        
        store.isRunning = false;
        store.currentRunId = null;
        store.currentRunEvents = [];
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
    const connectionSubject = new ReplaySubject<BaseEvent>(Infinity);

    if (!store) {
      // No store means no events
      connectionSubject.complete();
      return connectionSubject.asObservable();
    }

    // Collect all historic events from memory
    const allHistoricEvents: BaseEvent[] = [];
    for (const run of store.historicRuns) {
      allHistoricEvents.push(...run.events);
    }
    
    // Apply compaction to historic events
    const compactedHistoric = compactEvents(allHistoricEvents);
    
    // Emit compacted historic events
    for (const event of compactedHistoric) {
      connectionSubject.next(event);
    }
    
    // If there's an active run, stream all events from it
    if (store.subject && store.isRunning) {
      // Track which message IDs we've already emitted from historic events
      const emittedMessageIds = new Set<string>();
      for (const event of compactedHistoric) {
        if ('messageId' in event && typeof event.messageId === 'string') {
          emittedMessageIds.add(event.messageId);
        }
      }
      
      // The subject is a ReplaySubject that will replay all events from the current run
      // We subscribe to it and forward all events to the connection, but skip duplicate message events
      store.subject.subscribe({
        next: (event) => {
          // Skip message events that we've already emitted from historic
          if ('messageId' in event && typeof event.messageId === 'string' && emittedMessageIds.has(event.messageId)) {
            return;
          }
          connectionSubject.next(event);
        },
        complete: () => connectionSubject.complete(),
        error: (err) => connectionSubject.error(err)
      });
    } else {
      // No active run, complete after historic events
      connectionSubject.complete();
    }
    
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
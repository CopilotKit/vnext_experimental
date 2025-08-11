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
import { AgentRunDatabase } from "./database";

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
  
  /** Current run ID */
  currentRunId: string | null = null;
  
  /** Accumulated events for current run */
  currentRunEvents: BaseEvent[] = [];
}

const GLOBAL_STORE = new Map<string, InProcessEventStore>();

export class InProcessAgentRunner extends AgentRunner {
  private db: AgentRunDatabase;

  constructor(dbPath: string = ":memory:") {
    super();
    this.db = new AgentRunDatabase(dbPath);
  }
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
    store.currentRunId = request.input.runId;
    store.currentRunEvents = [];

    const nextSubject = new ReplaySubject<BaseEvent>(Infinity);
    const prevSubject = store.subject;

    // Update the store's subject immediately
    store.subject = nextSubject;
    store.abortController = new AbortController();

    // Create a subject for run() return value
    const runSubject = new ReplaySubject<BaseEvent>(Infinity);
    
    // Get parent run ID for chaining
    const parentRunId = this.db.getLatestRunId(request.threadId);

    // Helper function to run the agent and handle errors
    const runAgent = async () => {
      try {
        await request.agent.runAgent(request.input, {
          onEvent: ({ event }) => {
            runSubject.next(event); // For run() return - only agent events
            nextSubject.next(event); // For connect() / store - all events
            store!.currentRunEvents.push(event); // Accumulate for database storage
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
                    store!.currentRunEvents.push(textStartEvent);

                    const textContentEvent: TextMessageContentEvent = {
                      type: EventType.TEXT_MESSAGE_CONTENT,
                      messageId: message.id,
                      delta: message.content,
                    };
                    nextSubject.next(textContentEvent);
                    store!.currentRunEvents.push(textContentEvent);

                    const textEndEvent: TextMessageEndEvent = {
                      type: EventType.TEXT_MESSAGE_END,
                      messageId: message.id,
                    };
                    nextSubject.next(textEndEvent);
                    store!.currentRunEvents.push(textEndEvent);
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
                      store!.currentRunEvents.push(toolStartEvent);

                      // ToolCallArgs event
                      const toolArgsEvent: ToolCallArgsEvent = {
                        type: EventType.TOOL_CALL_ARGS,
                        toolCallId: toolCall.id,
                        delta: toolCall.function.arguments,
                      };
                      nextSubject.next(toolArgsEvent);
                      store!.currentRunEvents.push(toolArgsEvent);

                      // ToolCallEnd event
                      const toolEndEvent: ToolCallEndEvent = {
                        type: EventType.TOOL_CALL_END,
                        toolCallId: toolCall.id,
                      };
                      nextSubject.next(toolEndEvent);
                      store!.currentRunEvents.push(toolEndEvent);
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
                    store!.currentRunEvents.push(toolResultEvent);
                  }
                }
              }
            }
          },
        });
        
        // Store the run in database
        if (store.currentRunId) {
          this.db.storeRun(
            request.threadId,
            store.currentRunId,
            store.currentRunEvents,
            request.input,
            parentRunId
          );
        }
        
        store.isRunning = false;
        store.currentRunId = null;
        store.currentRunEvents = [];
        runSubject.complete();
        nextSubject.complete();
      } catch (error) {
        // Store the run even if it failed (partial events)
        if (store!.currentRunId && store!.currentRunEvents.length > 0) {
          this.db.storeRun(
            request.threadId,
            store!.currentRunId,
            store!.currentRunEvents,
            request.input,
            parentRunId
          );
        }
        
        store!.isRunning = false;
        store!.currentRunId = null;
        store!.currentRunEvents = [];
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

    // Load historic runs from database
    const historicRuns = this.db.getHistoricRuns(request.threadId);
    
    // Collect all historic events from database
    const allHistoricEvents: BaseEvent[] = [];
    for (const run of historicRuns) {
      allHistoricEvents.push(...run.events);
    }
    
    // If there's an active run, also include its current events in the historic events
    // (since they haven't been persisted to DB yet)
    if (store && store.isRunning && store.currentRunEvents.length > 0) {
      allHistoricEvents.push(...store.currentRunEvents);
    }
    
    // Apply compaction to all historic events (including current run if active)
    const compactedHistoric = compactEvents(allHistoricEvents);
    
    // Emit compacted historic events
    for (const event of compactedHistoric) {
      connectionSubject.next(event);
    }
    
    // If there's an active run, stream future live events
    if (store && store.subject && store.isRunning) {
      const currentEventCount = store.currentRunEvents.length;
      
      // Subscribe to live events
      store.subject.subscribe({
        next: (event) => {
          // Only emit new events (those added after connect was called)
          const eventIndex = store.currentRunEvents.indexOf(event);
          if (eventIndex >= currentEventCount) {
            connectionSubject.next(event);
          }
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

  /**
   * Close the database connection (for cleanup)
   */
  close(): void {
    this.db.close();
  }
}

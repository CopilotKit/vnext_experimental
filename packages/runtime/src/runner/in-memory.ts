import {
  AgentRunner,
  AgentRunnerConnectRequest,
  AgentRunnerIsRunningRequest,
  AgentRunnerRunRequest,
  type AgentRunnerStopRequest,
} from "./agent-runner";
import { Observable, ReplaySubject } from "rxjs";
import { BaseEvent } from "@ag-ui/client";
import { compactEvents } from "./event-compaction";
import {
  EventStore,
  processInputMessages,
  completeRun,
  emitHistoricEventsToConnection,
  bridgeActiveRunToConnection,
} from "./agent-runner-helpers";

interface HistoricRun {
  threadId: string;
  runId: string;
  parentRunId: string | null;
  events: BaseEvent[];
  createdAt: number;
}

class InMemoryEventStore implements EventStore {
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
          onRunStartedEvent: () => {
            processInputMessages(
              request.input.messages,
              nextSubject,
              store.currentRunEvents,
              store.seenMessageIds
            );
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
        
        completeRun(store, runSubject, nextSubject);
      } catch {
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
        
        // Don't emit error to the subject, just complete it
        // This allows subscribers to get events emitted before the error
        completeRun(store, runSubject, nextSubject);
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
    
    // Emit compacted historic events and get emitted message IDs
    const emittedMessageIds = emitHistoricEventsToConnection(
      compactedHistoric,
      connectionSubject
    );
    
    // Bridge active run to connection if exists
    bridgeActiveRunToConnection(store, emittedMessageIds, connectionSubject);
    
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
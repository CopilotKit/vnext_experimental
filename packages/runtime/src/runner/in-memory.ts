import {
  AgentRunner,
  AgentRunnerConnectRequest,
  AgentRunnerIsRunningRequest,
  AgentRunnerRunRequest,
  type AgentRunnerStopRequest,
  type AgentRunnerListThreadsRequest,
  type AgentRunnerListThreadsResponse,
} from "./agent-runner";
import { ThreadMetadata } from "@copilotkitnext/shared";
import { Observable, ReplaySubject } from "rxjs";
import {
  AbstractAgent,
  BaseEvent,
  EventType,
  MessagesSnapshotEvent,
  RunStartedEvent,
  TextMessageContentEvent,
  compactEvents,
} from "@ag-ui/client";
import { finalizeRunEvents } from "@copilotkitnext/shared";

interface HistoricRun {
  threadId: string;
  runId: string;
  parentRunId: string | null;
  events: BaseEvent[];
  createdAt: number;
}

class InMemoryEventStore {
  constructor(
    public threadId: string,
    public resourceIds: string[],
    public properties?: Record<string, any>,
  ) {}

  /** The subject that current consumers subscribe to. */
  subject: ReplaySubject<BaseEvent> | null = null;

  /** True while a run is actively producing events. */
  isRunning = false;

  /** Current run ID */
  currentRunId: string | null = null;

  /** Historic completed runs */
  historicRuns: HistoricRun[] = [];

  /** Currently running agent instance (if any). */
  agent: AbstractAgent | null = null;

  /** Subject returned from run() while the run is active. */
  runSubject: ReplaySubject<BaseEvent> | null = null;

  /** True once stop() has been requested but the run has not yet finalized. */
  stopRequested = false;

  /** Reference to the events emitted in the current run. */
  currentEvents: BaseEvent[] | null = null;
}

const GLOBAL_STORE = new Map<string, InMemoryEventStore>();

/**
 * Check if a store's resourceIds match the given scope.
 * Returns true if scope is undefined (global), null (admin bypass), or if ANY store resourceId matches ANY scope resourceId.
 */
function matchesScope(store: InMemoryEventStore, scope: { resourceId: string | string[] } | null | undefined): boolean {
  if (scope === undefined || scope === null) {
    return true; // Undefined (global) or null (admin) - see all threads
  }

  const scopeIds = Array.isArray(scope.resourceId) ? scope.resourceId : [scope.resourceId];
  // Check if ANY scope ID matches ANY of the thread's resource IDs
  return scopeIds.some((scopeId) => store.resourceIds.includes(scopeId));
}

export class InMemoryAgentRunner extends AgentRunner {
  run(request: AgentRunnerRunRequest): Observable<BaseEvent> {
    // Check if thread exists first
    let existingStore = GLOBAL_STORE.get(request.threadId);

    // SECURITY: Prevent null scope on NEW thread creation (admin must specify explicit owner)
    // BUT allow null scope for existing threads (admin bypass)
    if (!existingStore && request.scope === null) {
      throw new Error(
        "Cannot create thread with null scope. Admin users must specify an explicit resourceId for the thread owner.",
      );
    }

    // Handle scope: undefined (not provided) defaults to global, or explicit value(s)
    let resourceIds: string[];
    if (request.scope === undefined) {
      // No scope provided - default to global
      resourceIds = ["global"];
    } else if (request.scope === null) {
      // Null scope on existing thread (admin bypass) - use existing resource IDs
      resourceIds = [];
    } else if (Array.isArray(request.scope.resourceId)) {
      // Reject empty arrays - unclear intent
      if (request.scope.resourceId.length === 0) {
        throw new Error("Invalid scope: resourceId array cannot be empty");
      }
      // Store ALL resource IDs for multi-resource threads
      resourceIds = request.scope.resourceId;
    } else {
      resourceIds = [request.scope.resourceId];
    }

    // SECURITY: Validate scope before allowing operations on existing threads
    if (existingStore) {
      // Thread exists - validate scope matches (null scope bypasses this check)
      if (request.scope !== null && !matchesScope(existingStore, request.scope)) {
        throw new Error("Unauthorized: Cannot run on thread owned by different resource");
      }
      // For existing threads, use existing resource IDs (don't add new ones)
      resourceIds = existingStore.resourceIds;
    } else {
      // Create new thread store with validated scope - store ALL resource IDs
      existingStore = new InMemoryEventStore(request.threadId, resourceIds, request.scope?.properties);
      GLOBAL_STORE.set(request.threadId, existingStore);
    }
    const store = existingStore; // Now store is const and non-null

    if (store.isRunning) {
      throw new Error("Thread already running");
    }
    store.isRunning = true;
    store.currentRunId = request.input.runId;
    store.agent = request.agent;
    store.stopRequested = false;

    // Track seen message IDs and current run events for this run
    const seenMessageIds = new Set<string>();
    const currentRunEvents: BaseEvent[] = [];
    store.currentEvents = currentRunEvents;

    // Get all previously seen message IDs from historic runs
    const historicMessageIds = new Set<string>();
    for (const run of store.historicRuns) {
      for (const event of run.events) {
        if ("messageId" in event && typeof event.messageId === "string") {
          historicMessageIds.add(event.messageId);
        }
        if (event.type === EventType.RUN_STARTED) {
          const runStarted = event as RunStartedEvent;
          const messages = runStarted.input?.messages ?? [];
          for (const message of messages) {
            historicMessageIds.add(message.id);
          }
        }
      }
    }

    const nextSubject = new ReplaySubject<BaseEvent>(Infinity);
    const prevSubject = store.subject;

    // Update the store's subject immediately
    store.subject = nextSubject;

    // Create a subject for run() return value
    const runSubject = new ReplaySubject<BaseEvent>(Infinity);
    store.runSubject = runSubject;

    // Helper function to run the agent and handle errors
    const runAgent = async () => {
      // Get parent run ID for chaining
      const lastRun = store.historicRuns[store.historicRuns.length - 1];
      const parentRunId = lastRun?.runId ?? null;

      try {
        await request.agent.runAgent(request.input, {
          onEvent: ({ event }) => {
            let processedEvent: BaseEvent = event;
            if (event.type === EventType.RUN_STARTED) {
              const runStartedEvent = event as RunStartedEvent;
              if (!runStartedEvent.input) {
                const sanitizedMessages = request.input.messages
                  ? request.input.messages.filter((message) => !historicMessageIds.has(message.id))
                  : undefined;
                const updatedInput = {
                  ...request.input,
                  ...(sanitizedMessages !== undefined ? { messages: sanitizedMessages } : {}),
                };
                processedEvent = {
                  ...runStartedEvent,
                  input: updatedInput,
                } as RunStartedEvent;
              }
            }

            runSubject.next(processedEvent); // For run() return - only agent events
            nextSubject.next(processedEvent); // For connect() / store - all events
            currentRunEvents.push(processedEvent); // Accumulate for storage
          },
          onNewMessage: ({ message }) => {
            // Called for each new message
            if (!seenMessageIds.has(message.id)) {
              seenMessageIds.add(message.id);
            }
          },
          onRunStartedEvent: () => {
            // Mark any messages from the input as seen so they aren't emitted twice
            if (request.input.messages) {
              for (const message of request.input.messages) {
                if (!seenMessageIds.has(message.id)) {
                  seenMessageIds.add(message.id);
                }
              }
            }
          },
        });

        const appendedEvents = finalizeRunEvents(currentRunEvents, {
          stopRequested: store.stopRequested,
        });
        for (const event of appendedEvents) {
          runSubject.next(event);
          nextSubject.next(event);
        }

        // Store the completed run in memory with ONLY its events
        if (store.currentRunId) {
          // Compact the events before storing (like SQLite does)
          const compactedEvents = compactEvents(currentRunEvents);

          store.historicRuns.push({
            threadId: request.threadId,
            runId: store.currentRunId,
            parentRunId,
            events: compactedEvents,
            createdAt: Date.now(),
          });
        }

        // Complete the run
        store.currentEvents = null;
        store.currentRunId = null;
        store.agent = null;
        store.runSubject = null;
        store.stopRequested = false;
        store.isRunning = false;
        runSubject.complete();
        nextSubject.complete();
      } catch {
        const appendedEvents = finalizeRunEvents(currentRunEvents, {
          stopRequested: store.stopRequested,
        });
        for (const event of appendedEvents) {
          runSubject.next(event);
          nextSubject.next(event);
        }

        // Store the run even if it failed (partial events)
        if (store.currentRunId && currentRunEvents.length > 0) {
          // Compact the events before storing (like SQLite does)
          const compactedEvents = compactEvents(currentRunEvents);
          store.historicRuns.push({
            threadId: request.threadId,
            runId: store.currentRunId,
            parentRunId,
            events: compactedEvents,
            createdAt: Date.now(),
          });
        }

        // Complete the run
        store.currentEvents = null;
        store.currentRunId = null;
        store.agent = null;
        store.runSubject = null;
        store.stopRequested = false;
        store.isRunning = false;
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

    if (!store || !matchesScope(store, request.scope)) {
      // No store or scope mismatch - return empty (404)
      connectionSubject.complete();
      return connectionSubject.asObservable();
    }

    // Collect all historic events from memory
    const allHistoricEvents: BaseEvent[] = [];
    for (const run of store.historicRuns) {
      allHistoricEvents.push(...run.events);
    }

    // Apply compaction to all historic events together (like SQLite)
    const compactedEvents = compactEvents(allHistoricEvents);

    // Emit compacted events and track message IDs
    const emittedMessageIds = new Set<string>();
    for (const event of compactedEvents) {
      connectionSubject.next(event);
      if ("messageId" in event && typeof event.messageId === "string") {
        emittedMessageIds.add(event.messageId);
      }
    }

    // Bridge active run to connection if exists
    if (store.subject && (store.isRunning || store.stopRequested)) {
      store.subject.subscribe({
        next: (event) => {
          // Skip message events that we've already emitted from historic
          if ("messageId" in event && typeof event.messageId === "string" && emittedMessageIds.has(event.messageId)) {
            return;
          }
          connectionSubject.next(event);
        },
        complete: () => connectionSubject.complete(),
        error: (err) => connectionSubject.error(err),
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

  async stop(request: AgentRunnerStopRequest): Promise<boolean | undefined> {
    const store = GLOBAL_STORE.get(request.threadId);
    if (!store) {
      return false;
    }

    if (store.isRunning) {
      store.stopRequested = true;
      store.isRunning = false;

      const agent = store.agent;

      try {
        // Use agent.abortRun() to stop the run
        if (agent) {
          agent.abortRun();
          return true;
        }
        return false;
      } catch (error) {
        console.warn("Failed to abort in-memory runner:", error);
        store.stopRequested = false;
        store.isRunning = true;
        return false;
      }
    }

    return false;
  }

  async listThreads(request: AgentRunnerListThreadsRequest): Promise<AgentRunnerListThreadsResponse> {
    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    // Short-circuit: empty array means no access to any threads
    if (request.scope !== undefined && request.scope !== null) {
      const scopeIds = Array.isArray(request.scope.resourceId) ? request.scope.resourceId : [request.scope.resourceId];

      if (scopeIds.length === 0) {
        return { threads: [], total: 0 };
      }
    }

    // Get all thread IDs and sort by last activity
    const threadInfos: Array<{
      threadId: string;
      createdAt: number;
      lastActivityAt: number;
      store: InMemoryEventStore;
    }> = [];

    for (const [threadId, store] of GLOBAL_STORE.entries()) {
      // Skip suggestion threads
      if (threadId.includes("-suggestions-")) {
        continue;
      }

      // Filter by scope
      if (!matchesScope(store, request.scope)) {
        continue;
      }

      if (store.historicRuns.length === 0) {
        continue; // Skip threads with no runs
      }

      const firstRun = store.historicRuns[0];
      const lastRun = store.historicRuns[store.historicRuns.length - 1];

      if (!firstRun || !lastRun) {
        continue; // Skip if no runs
      }

      threadInfos.push({
        threadId,
        createdAt: firstRun.createdAt,
        lastActivityAt: lastRun.createdAt,
        store,
      });
    }

    // Sort by last activity (most recent first)
    threadInfos.sort((a, b) => b.lastActivityAt - a.lastActivityAt);

    const total = threadInfos.length;
    const paginatedInfos = threadInfos.slice(offset, offset + limit);

    const threads: ThreadMetadata[] = paginatedInfos.map((info) => {
      // Extract first message from first run
      let firstMessage: string | undefined;
      const firstRun = info.store.historicRuns[0];
      if (firstRun) {
        const textContent = firstRun.events.find((e) => e.type === EventType.TEXT_MESSAGE_CONTENT) as
          | TextMessageContentEvent
          | undefined;
        if (textContent?.delta) {
          firstMessage = textContent.delta.substring(0, 100);
        }
      }

      // Count unique messages across all runs
      const messageIds = new Set<string>();
      for (const run of info.store.historicRuns) {
        for (const event of run.events) {
          if ("messageId" in event && typeof event.messageId === "string") {
            messageIds.add(event.messageId);
          }
        }
      }

      return {
        threadId: info.threadId,
        createdAt: info.createdAt,
        lastActivityAt: info.lastActivityAt,
        isRunning: info.store.isRunning,
        messageCount: messageIds.size,
        firstMessage,
        resourceId: info.store.resourceIds[0] || "unknown", // Return first for backward compatibility
        properties: info.store.properties,
      };
    });

    return { threads, total };
  }

  async getThreadMetadata(
    threadId: string,
    scope?: { resourceId: string | string[] } | null,
  ): Promise<ThreadMetadata | null> {
    const store = GLOBAL_STORE.get(threadId);
    if (!store || !matchesScope(store, scope) || store.historicRuns.length === 0) {
      return null;
    }

    const firstRun = store.historicRuns[0];
    const lastRun = store.historicRuns[store.historicRuns.length - 1];

    if (!firstRun || !lastRun) {
      return null;
    }

    // Extract first message
    let firstMessage: string | undefined;
    const textContent = firstRun.events.find((e) => e.type === EventType.TEXT_MESSAGE_CONTENT) as
      | TextMessageContentEvent
      | undefined;
    if (textContent?.delta) {
      firstMessage = textContent.delta.substring(0, 100);
    }

    // Count unique messages
    const messageIds = new Set<string>();
    for (const run of store.historicRuns) {
      for (const event of run.events) {
        if ("messageId" in event && typeof event.messageId === "string") {
          messageIds.add(event.messageId);
        }
      }
    }

    return {
      threadId,
      createdAt: firstRun.createdAt,
      lastActivityAt: lastRun.createdAt,
      isRunning: store.isRunning,
      messageCount: messageIds.size,
      firstMessage,
      resourceId: store.resourceIds[0] || "unknown", // Return first for backward compatibility
      properties: store.properties,
    };
  }

  async deleteThread(threadId: string, scope?: { resourceId: string | string[] } | null): Promise<void> {
    const store = GLOBAL_STORE.get(threadId);
    if (!store || !matchesScope(store, scope)) {
      return;
    }

    // Abort the agent if running
    if (store.agent) {
      try {
        store.agent.abortRun();
      } catch (error) {
        console.warn("Failed to abort agent during thread deletion:", error);
      }
    }
    store.subject?.complete();
    GLOBAL_STORE.delete(threadId);
  }

  /**
   * Clear all threads from the global store (for testing purposes only)
   * @internal
   */
  clearAllThreads(): void {
    for (const [threadId, store] of GLOBAL_STORE.entries()) {
      // Abort the agent if running
      if (store.agent) {
        try {
          store.agent.abortRun();
        } catch (error) {
          console.warn("Failed to abort agent during clearAllThreads:", error);
        }
      }
      store.subject?.complete();
      GLOBAL_STORE.delete(threadId);
    }
  }
}

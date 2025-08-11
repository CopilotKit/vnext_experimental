import {
  AgentRunner,
  AgentRunnerConnectRequest,
  AgentRunnerIsRunningRequest,
  AgentRunnerRunRequest,
  type AgentRunnerStopRequest,
} from "./agent-runner";
import { Observable, ReplaySubject } from "rxjs";
import {
  BaseEvent,
  RunAgentInput,
} from "@ag-ui/client";
import { compactEvents } from "./event-compaction";
import {
  EventStore,
  processInputMessages,
  completeRun,
  emitHistoricEventsToConnection,
  bridgeActiveRunToConnection,
} from "./agent-runner-helpers";
import Database from "better-sqlite3";

const SCHEMA_VERSION = 1;

interface AgentRunRecord {
  id: number;
  thread_id: string;
  run_id: string;
  parent_run_id: string | null;
  events: BaseEvent[];
  input: RunAgentInput;
  created_at: number;
  version: number;
}

export interface SqliteAgentRunnerOptions {
  dbPath?: string;
}

class SqliteEventStore implements EventStore {
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

const GLOBAL_STORE = new Map<string, SqliteEventStore>();

export class SqliteAgentRunner extends AgentRunner {
  private db: any;

  constructor(options: SqliteAgentRunnerOptions = {}) {
    super();
    const dbPath = options.dbPath ?? ":memory:";
    
    if (!Database) {
      throw new Error(
        'better-sqlite3 is required for SqliteAgentRunner but was not found.\n' +
        'Please install it in your project:\n' +
        '  npm install better-sqlite3\n' +
        '  or\n' +
        '  pnpm add better-sqlite3\n' +
        '  or\n' +
        '  yarn add better-sqlite3\n\n' +
        'If you don\'t need persistence, use InMemoryAgentRunner instead.'
      );
    }
    
    this.db = new Database(dbPath);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    // Create the agent_runs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agent_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id TEXT NOT NULL,
        run_id TEXT NOT NULL UNIQUE,
        parent_run_id TEXT,
        events TEXT NOT NULL,
        input TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        version INTEGER NOT NULL
      )
    `);

    // Create indexes for efficient queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_thread_id ON agent_runs(thread_id);
      CREATE INDEX IF NOT EXISTS idx_parent_run_id ON agent_runs(parent_run_id);
    `);

    // Create schema version table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )
    `);

    // Check and set schema version
    const currentVersion = this.db
      .prepare("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1")
      .get() as { version: number } | undefined;

    if (!currentVersion || currentVersion.version < SCHEMA_VERSION) {
      this.db
        .prepare("INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (?, ?)")
        .run(SCHEMA_VERSION, Date.now());
    }
  }

  private storeRun(
    threadId: string,
    runId: string,
    events: BaseEvent[],
    input: RunAgentInput,
    parentRunId?: string | null
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO agent_runs (thread_id, run_id, parent_run_id, events, input, created_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      threadId,
      runId,
      parentRunId ?? null,
      JSON.stringify(events),
      JSON.stringify(input),
      Date.now(),
      SCHEMA_VERSION
    );
  }

  private getHistoricRuns(threadId: string): AgentRunRecord[] {
    const stmt = this.db.prepare(`
      WITH RECURSIVE run_chain AS (
        -- Base case: find the root runs (those without parent)
        SELECT * FROM agent_runs 
        WHERE thread_id = ? AND parent_run_id IS NULL
        
        UNION ALL
        
        -- Recursive case: find children of current level
        SELECT ar.* FROM agent_runs ar
        INNER JOIN run_chain rc ON ar.parent_run_id = rc.run_id
        WHERE ar.thread_id = ?
      )
      SELECT * FROM run_chain
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(threadId, threadId) as any[];
    
    return rows.map(row => ({
      id: row.id,
      thread_id: row.thread_id,
      run_id: row.run_id,
      parent_run_id: row.parent_run_id,
      events: JSON.parse(row.events),
      input: JSON.parse(row.input),
      created_at: row.created_at,
      version: row.version
    }));
  }

  private getLatestRunId(threadId: string): string | null {
    const stmt = this.db.prepare(`
      SELECT run_id FROM agent_runs 
      WHERE thread_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    const result = stmt.get(threadId) as { run_id: string } | undefined;
    return result?.run_id ?? null;
  }

  run(request: AgentRunnerRunRequest): Observable<BaseEvent> {
    let store = GLOBAL_STORE.get(request.threadId);
    if (!store) {
      store = new SqliteEventStore(request.threadId);
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

    // Helper function to run the agent and handle errors
    const runAgent = async () => {
      // Get parent run ID for chaining
      const parentRunId = this.getLatestRunId(request.threadId);
      
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
          onRunStartedEvent: () => {
            processInputMessages(
              request.input.messages,
              nextSubject,
              store!.currentRunEvents,
              store!.seenMessageIds
            );
          },
        });
        
        // Store the run in database
        if (store.currentRunId) {
          this.storeRun(
            request.threadId,
            store.currentRunId,
            store.currentRunEvents,
            request.input,
            parentRunId
          );
        }
        
        completeRun(store, runSubject, nextSubject);
      } catch {
        // Store the run even if it failed (partial events)
        if (store!.currentRunId && store!.currentRunEvents.length > 0) {
          this.storeRun(
            request.threadId,
            store!.currentRunId,
            store!.currentRunEvents,
            request.input,
            parentRunId
          );
        }
        
        // Don't emit error to the subject, just complete it
        // This allows subscribers to get events emitted before the error
        completeRun(store!, runSubject, nextSubject);
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

    // Load historic runs from database synchronously
    const historicRuns = this.getHistoricRuns(request.threadId);
    
    // Collect all historic events from database
    const allHistoricEvents: BaseEvent[] = [];
    for (const run of historicRuns) {
      allHistoricEvents.push(...run.events);
    }
    
    // Apply compaction to historic events from database only
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

  /**
   * Close the database connection (for cleanup)
   */
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}
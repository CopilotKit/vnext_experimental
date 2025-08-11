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
  processInputMessages,
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

// Active connections for streaming events
// This is the only in-memory state we need - just for active streaming
const ACTIVE_CONNECTIONS = new Map<string, ReplaySubject<BaseEvent>>();

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

    // Create run_state table to track active runs
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS run_state (
        thread_id TEXT PRIMARY KEY,
        is_running INTEGER DEFAULT 0,
        current_run_id TEXT,
        updated_at INTEGER NOT NULL
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
    // Get all previous events for this thread to compact together with new events
    const historicRuns = this.getHistoricRuns(threadId);
    const allPreviousEvents: BaseEvent[] = [];
    for (const run of historicRuns) {
      allPreviousEvents.push(...run.events);
    }
    
    // Compact just the new events with context of previous events
    // This ensures proper compaction while storing only the delta
    const allEventsForCompaction = [...allPreviousEvents, ...events];
    const compactedAll = compactEvents(allEventsForCompaction);
    
    // Now compact just the previous events to see what they become
    const compactedPrevious = allPreviousEvents.length > 0 ? compactEvents(allPreviousEvents) : [];
    
    // The new events to store are the difference between the two compacted sets
    // This represents what the new events contribute after compaction
    const newEventsToStore = compactedAll.slice(compactedPrevious.length);
    
    const stmt = this.db.prepare(`
      INSERT INTO agent_runs (thread_id, run_id, parent_run_id, events, input, created_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      threadId,
      runId,
      parentRunId ?? null,
      JSON.stringify(newEventsToStore), // Store only the new compacted events for this run
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

  private setRunState(threadId: string, isRunning: boolean, runId?: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO run_state (thread_id, is_running, current_run_id, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(threadId, isRunning ? 1 : 0, runId ?? null, Date.now());
  }

  private getRunState(threadId: string): { isRunning: boolean; currentRunId: string | null } {
    const stmt = this.db.prepare(`
      SELECT is_running, current_run_id FROM run_state WHERE thread_id = ?
    `);
    const result = stmt.get(threadId) as { is_running: number; current_run_id: string | null } | undefined;
    
    return {
      isRunning: result?.is_running === 1,
      currentRunId: result?.current_run_id ?? null
    };
  }

  run(request: AgentRunnerRunRequest): Observable<BaseEvent> {
    // Check if thread is already running in database
    const runState = this.getRunState(request.threadId);
    if (runState.isRunning) {
      throw new Error("Thread already running");
    }

    // Mark thread as running in database
    this.setRunState(request.threadId, true, request.input.runId);

    // Track seen message IDs and current run events in memory for this run
    const seenMessageIds = new Set<string>();
    const currentRunEvents: BaseEvent[] = [];

    // Get or create subject for this thread's connections
    const nextSubject = new ReplaySubject<BaseEvent>(Infinity);
    const prevSubject = ACTIVE_CONNECTIONS.get(request.threadId);
    
    // Update the active connection for this thread
    ACTIVE_CONNECTIONS.set(request.threadId, nextSubject);

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
            currentRunEvents.push(event); // Accumulate for database storage
          },
          onNewMessage: ({ message }) => {
            // Called for each new message
            if (!seenMessageIds.has(message.id)) {
              seenMessageIds.add(message.id);
            }
          },
          onRunStartedEvent: () => {
            processInputMessages(
              request.input.messages,
              nextSubject,
              currentRunEvents,
              seenMessageIds
            );
          },
        });
        
        // Store the run in database
        this.storeRun(
          request.threadId,
          request.input.runId,
          currentRunEvents,
          request.input,
          parentRunId
        );
        
        // Mark run as complete in database
        this.setRunState(request.threadId, false);
        
        // Complete the subjects
        runSubject.complete();
        nextSubject.complete();
      } catch {
        // Store the run even if it failed (partial events)
        if (currentRunEvents.length > 0) {
          this.storeRun(
            request.threadId,
            request.input.runId,
            currentRunEvents,
            request.input,
            parentRunId
          );
        }
        
        // Mark run as complete in database
        this.setRunState(request.threadId, false);
        
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
    const connectionSubject = new ReplaySubject<BaseEvent>(Infinity);

    // Load historic runs from database - they're already compacted!
    const historicRuns = this.getHistoricRuns(request.threadId);
    
    // Collect all historic events from database (already compacted)
    const allHistoricEvents: BaseEvent[] = [];
    for (const run of historicRuns) {
      allHistoricEvents.push(...run.events);
    }
    
    // No need to compact - events are already compacted in storage
    // Just emit them and track message IDs
    const emittedMessageIds = new Set<string>();
    for (const event of allHistoricEvents) {
      connectionSubject.next(event);
      if ('messageId' in event && typeof event.messageId === 'string') {
        emittedMessageIds.add(event.messageId);
      }
    }
    
    // Bridge active run to connection if exists
    const activeSubject = ACTIVE_CONNECTIONS.get(request.threadId);
    const runState = this.getRunState(request.threadId);
    
    if (activeSubject && runState.isRunning) {
      activeSubject.subscribe({
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
    const runState = this.getRunState(request.threadId);
    return Promise.resolve(runState.isRunning);
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
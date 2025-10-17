import {
  AgentRunner,
  finalizeRunEvents,
  type AgentRunnerConnectRequest,
  type AgentRunnerIsRunningRequest,
  type AgentRunnerRunRequest,
  type AgentRunnerStopRequest,
  type AgentRunnerListThreadsRequest,
  type AgentRunnerListThreadsResponse,
  type ThreadMetadata,
} from "@copilotkitnext/runtime";
import { Observable, ReplaySubject } from "rxjs";
import {
  AbstractAgent,
  BaseEvent,
  RunAgentInput,
  EventType,
  RunStartedEvent,
  TextMessageContentEvent,
  compactEvents,
} from "@ag-ui/client";
import Database from "better-sqlite3";

const SCHEMA_VERSION = 3;

interface AgentRunRecord {
  id: number;
  thread_id: string;
  run_id: string;
  parent_run_id: string | null;
  resource_id: string;
  properties: Record<string, any> | null;
  events: BaseEvent[];
  input: RunAgentInput;
  created_at: number;
  version: number;
}

export interface SqliteAgentRunnerOptions {
  dbPath?: string;
}

interface ActiveConnectionContext {
  subject: ReplaySubject<BaseEvent>;
  agent?: AbstractAgent;
  runSubject?: ReplaySubject<BaseEvent>;
  currentEvents?: BaseEvent[];
  stopRequested?: boolean;
}

// Active connections for streaming events and stop support
const ACTIVE_CONNECTIONS = new Map<string, ActiveConnectionContext>();

export class SqliteAgentRunner extends AgentRunner {
  private db: any;

  constructor(options: SqliteAgentRunnerOptions = {}) {
    super();
    const dbPath = options.dbPath ?? ":memory:";

    if (!Database) {
      throw new Error(
        "better-sqlite3 is required for SqliteAgentRunner but was not found.\n" +
          "Please install it in your project:\n" +
          "  npm install better-sqlite3\n" +
          "  or\n" +
          "  pnpm add better-sqlite3\n" +
          "  or\n" +
          "  yarn add better-sqlite3\n\n" +
          "If you don't need persistence, use InMemoryAgentRunner instead.",
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
        resource_id TEXT NOT NULL DEFAULT 'global',
        properties TEXT,
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

    // Create thread_resources table for multi-resource support
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS thread_resources (
        thread_id TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        PRIMARY KEY (thread_id, resource_id)
      )
    `);

    // Create indexes for efficient queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_thread_id ON agent_runs(thread_id);
      CREATE INDEX IF NOT EXISTS idx_parent_run_id ON agent_runs(parent_run_id);
      CREATE INDEX IF NOT EXISTS idx_resource_threads ON agent_runs(resource_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_thread_resources_lookup ON thread_resources(resource_id, thread_id);
    `);

    // Create schema version table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )
    `);

    // Check and migrate schema if needed
    const currentVersion = this.db.prepare("SELECT version FROM schema_version ORDER BY version DESC LIMIT 1").get() as
      | { version: number }
      | undefined;

    if (!currentVersion || currentVersion.version < 2) {
      // Migration from v1 to v2: Add resource_id and properties columns
      try {
        this.db.exec(`ALTER TABLE agent_runs ADD COLUMN resource_id TEXT NOT NULL DEFAULT 'global'`);
        this.db.exec(`ALTER TABLE agent_runs ADD COLUMN properties TEXT`);
        this.db.exec(`CREATE INDEX IF NOT EXISTS idx_resource_threads ON agent_runs(resource_id, created_at DESC)`);
      } catch (e) {
        // Columns may already exist if created with new schema
      }
    }

    if (!currentVersion || currentVersion.version < 3) {
      // Migration from v2 to v3: Create thread_resources table for multi-resource support
      try {
        this.db.exec(`
          CREATE TABLE IF NOT EXISTS thread_resources (
            thread_id TEXT NOT NULL,
            resource_id TEXT NOT NULL,
            PRIMARY KEY (thread_id, resource_id)
          )
        `);
        this.db.exec(
          `CREATE INDEX IF NOT EXISTS idx_thread_resources_lookup ON thread_resources(resource_id, thread_id)`,
        );

        // Migrate existing data: copy resource_id from agent_runs to thread_resources
        this.db.exec(`
          INSERT OR IGNORE INTO thread_resources (thread_id, resource_id)
          SELECT DISTINCT thread_id, resource_id FROM agent_runs
        `);
      } catch (e) {
        // Table may already exist
      }
    }

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
    resourceIds: string[],
    properties: Record<string, any> | undefined,
    parentRunId?: string | null,
  ): void {
    // Compact ONLY the events from this run
    const compactedEvents = compactEvents(events);

    // Use first resourceId for backward compatibility in agent_runs table
    const primaryResourceId = resourceIds[0] || "unknown";

    const stmt = this.db.prepare(`
      INSERT INTO agent_runs (thread_id, run_id, parent_run_id, resource_id, properties, events, input, created_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      threadId,
      runId,
      parentRunId ?? null,
      primaryResourceId,
      properties ? JSON.stringify(properties) : null,
      JSON.stringify(compactedEvents), // Store only this run's compacted events
      JSON.stringify(input),
      Date.now(),
      SCHEMA_VERSION,
    );

    // Insert all resource IDs into thread_resources table
    const resourceStmt = this.db.prepare(`
      INSERT OR IGNORE INTO thread_resources (thread_id, resource_id)
      VALUES (?, ?)
    `);

    for (const resourceId of resourceIds) {
      resourceStmt.run(threadId, resourceId);
    }
  }

  /**
   * Check if a thread's resourceIds match the given scope.
   * Returns true if scope is null (admin bypass) or if ANY scope resourceId matches ANY thread resourceId.
   */
  private matchesScope(threadId: string, scope: { resourceId: string | string[] } | null | undefined): boolean {
    if (scope === undefined || scope === null) {
      return true; // Undefined (global) or null (admin) - see all threads
    }

    const scopeIds = Array.isArray(scope.resourceId) ? scope.resourceId : [scope.resourceId];

    // Check if ANY scope ID matches ANY of the thread's resource IDs
    const placeholders = scopeIds.map(() => "?").join(", ");
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM thread_resources
      WHERE thread_id = ? AND resource_id IN (${placeholders})
    `);
    const result = stmt.get(threadId, ...scopeIds) as { count: number } | undefined;

    return (result?.count ?? 0) > 0;
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

    return rows.map((row) => ({
      id: row.id,
      thread_id: row.thread_id,
      run_id: row.run_id,
      parent_run_id: row.parent_run_id,
      resource_id: row.resource_id,
      properties: row.properties ? JSON.parse(row.properties) : null,
      events: JSON.parse(row.events),
      input: JSON.parse(row.input),
      created_at: row.created_at,
      version: row.version,
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
      currentRunId: result?.current_run_id ?? null,
    };
  }

  run(request: AgentRunnerRunRequest): Observable<BaseEvent> {
    // Check if thread exists first
    const existingThreadStmt = this.db.prepare(`
      SELECT resource_id FROM thread_resources WHERE thread_id = ? LIMIT 1
    `);
    const existingThread = existingThreadStmt.get(request.threadId) as { resource_id: string } | undefined;

    // SECURITY: Prevent null scope on NEW thread creation (admin must specify explicit owner)
    // BUT allow null scope for existing threads (admin bypass)
    if (!existingThread && request.scope === null) {
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
    if (existingThread) {
      // Thread exists - validate scope matches (null scope bypasses this check)
      if (request.scope !== null && !this.matchesScope(request.threadId, request.scope)) {
        throw new Error("Unauthorized: Cannot run on thread owned by different resource");
      }
      // For existing threads, get all existing resource IDs (don't add new ones)
      const existingResourcesStmt = this.db.prepare(`
        SELECT resource_id FROM thread_resources WHERE thread_id = ?
      `);
      const existingResources = existingResourcesStmt.all(request.threadId) as Array<{ resource_id: string }>;
      resourceIds = existingResources.map((r) => r.resource_id);
    }

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

    // Get all previously seen message IDs from historic runs
    const historicRuns = this.getHistoricRuns(request.threadId);
    const historicMessageIds = new Set<string>();
    for (const run of historicRuns) {
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

    // Create a fresh subject for this thread's connections
    // Note: We must create a new ReplaySubject for each run because we call .complete()
    // at the end of the run. Reusing a completed subject would cause all subsequent
    // events to become no-ops and any connect() subscribers would receive immediate completion.
    const nextSubject = new ReplaySubject<BaseEvent>(Infinity);
    const prevConnection = ACTIVE_CONNECTIONS.get(request.threadId);
    const prevSubject = prevConnection?.subject;

    // Create a subject for run() return value
    const runSubject = new ReplaySubject<BaseEvent>(Infinity);

    // Update the active connection for this thread
    ACTIVE_CONNECTIONS.set(request.threadId, {
      subject: nextSubject,
      agent: request.agent,
      runSubject,
      currentEvents: currentRunEvents,
      stopRequested: false,
    });

    // Helper function to run the agent and handle errors
    const runAgent = async () => {
      // Get parent run ID for chaining
      const parentRunId = this.getLatestRunId(request.threadId);

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
            currentRunEvents.push(processedEvent); // Accumulate for database storage
          },
          onNewMessage: ({ message }) => {
            // Called for each new message
            if (!seenMessageIds.has(message.id)) {
              seenMessageIds.add(message.id);
            }
          },
          onRunStartedEvent: () => {
            // Mark input messages as seen without emitting duplicates
            if (request.input.messages) {
              for (const message of request.input.messages) {
                if (!seenMessageIds.has(message.id)) {
                  seenMessageIds.add(message.id);
                }
              }
            }
          },
        });

        const connection = ACTIVE_CONNECTIONS.get(request.threadId);
        const appendedEvents = finalizeRunEvents(currentRunEvents, {
          stopRequested: connection?.stopRequested ?? false,
        });
        for (const event of appendedEvents) {
          runSubject.next(event);
          nextSubject.next(event);
        }

        // Store the run in database
        this.storeRun(
          request.threadId,
          request.input.runId,
          currentRunEvents,
          request.input,
          resourceIds,
          request.scope?.properties,
          parentRunId,
        );

        // Mark run as complete in database
        this.setRunState(request.threadId, false);

        if (connection) {
          connection.agent = undefined;
          connection.runSubject = undefined;
          connection.currentEvents = undefined;
          connection.stopRequested = false;
        }

        // Complete the subjects
        runSubject.complete();
        nextSubject.complete();

        ACTIVE_CONNECTIONS.delete(request.threadId);
      } catch {
        const connection = ACTIVE_CONNECTIONS.get(request.threadId);
        const appendedEvents = finalizeRunEvents(currentRunEvents, {
          stopRequested: connection?.stopRequested ?? false,
        });
        for (const event of appendedEvents) {
          runSubject.next(event);
          nextSubject.next(event);
        }

        // Store the run even if it failed (partial events)
        if (currentRunEvents.length > 0) {
          this.storeRun(
            request.threadId,
            request.input.runId,
            currentRunEvents,
            request.input,
            resourceIds,
            request.scope?.properties,
            parentRunId,
          );
        }

        // Mark run as complete in database
        this.setRunState(request.threadId, false);

        if (connection) {
          connection.agent = undefined;
          connection.runSubject = undefined;
          connection.currentEvents = undefined;
          connection.stopRequested = false;
        }

        // Don't emit error to the subject, just complete it
        // This allows subscribers to get events emitted before the error
        runSubject.complete();
        nextSubject.complete();

        ACTIVE_CONNECTIONS.delete(request.threadId);
      }
    };

    // No need to bridge - we reuse the same subject for reconnections

    // Start the agent execution immediately (not lazily)
    runAgent();

    // Return the run subject (only agent events, no injected messages)
    return runSubject.asObservable();
  }

  connect(request: AgentRunnerConnectRequest): Observable<BaseEvent> {
    const connectionSubject = new ReplaySubject<BaseEvent>(Infinity);

    // Check if thread exists and matches scope
    if (!this.matchesScope(request.threadId, request.scope)) {
      // No thread or scope mismatch - return empty (404)
      connectionSubject.complete();
      return connectionSubject.asObservable();
    }

    // Load historic runs from database
    const historicRuns = this.getHistoricRuns(request.threadId);

    // Collect all historic events from database
    const allHistoricEvents: BaseEvent[] = [];
    for (const run of historicRuns) {
      allHistoricEvents.push(...run.events);
    }

    // Compact all events together before emitting
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
    const activeConnection = ACTIVE_CONNECTIONS.get(request.threadId);
    const runState = this.getRunState(request.threadId);
    const activeSubject = activeConnection?.subject;

    if (activeConnection && activeSubject && (runState.isRunning || activeConnection.stopRequested)) {
      activeSubject.subscribe({
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
    const runState = this.getRunState(request.threadId);
    return Promise.resolve(runState.isRunning);
  }

  stop(request: AgentRunnerStopRequest): Promise<boolean | undefined> {
    const runState = this.getRunState(request.threadId);
    if (!runState.isRunning) {
      return Promise.resolve(false);
    }

    const connection = ACTIVE_CONNECTIONS.get(request.threadId);
    const agent = connection?.agent;

    if (!connection || !agent) {
      return Promise.resolve(false);
    }

    if (connection.stopRequested) {
      return Promise.resolve(false);
    }

    connection.stopRequested = true;
    this.setRunState(request.threadId, false);

    try {
      agent.abortRun();
      return Promise.resolve(true);
    } catch (error) {
      console.error("Failed to abort sqlite agent run", error);
      connection.stopRequested = false;
      this.setRunState(request.threadId, true);
      return Promise.resolve(false);
    }
  }

  async listThreads(request: AgentRunnerListThreadsRequest): Promise<AgentRunnerListThreadsResponse> {
    const limit = request.limit ?? 50;
    const offset = request.offset ?? 0;

    // Build WHERE clause for scope filtering using thread_resources
    let scopeJoin = "";
    let scopeCondition = "";
    let scopeParams: string[] = [];

    if (request.scope !== undefined && request.scope !== null) {
      const scopeIds = Array.isArray(request.scope.resourceId) ? request.scope.resourceId : [request.scope.resourceId];

      // Short-circuit: empty array means no access to any threads
      if (scopeIds.length === 0) {
        return { threads: [], total: 0 };
      }

      scopeJoin = " INNER JOIN thread_resources tr ON ar.thread_id = tr.thread_id";

      if (scopeIds.length === 1) {
        scopeCondition = " AND tr.resource_id = ?";
        scopeParams = [scopeIds[0] ?? ""];
      } else {
        // Filter out any undefined values
        const validIds = scopeIds.filter((id): id is string => id !== undefined);
        // If all values were undefined, return empty
        if (validIds.length === 0) {
          return { threads: [], total: 0 };
        }
        const placeholders = validIds.map(() => "?").join(", ");
        scopeCondition = ` AND tr.resource_id IN (${placeholders})`;
        scopeParams = validIds;
      }
    }

    // Get total count of threads (excluding suggestion threads)
    const countStmt = this.db.prepare(`
      SELECT COUNT(DISTINCT ar.thread_id) as total
      FROM agent_runs ar${scopeJoin}
      WHERE ar.thread_id NOT LIKE '%-suggestions-%'${scopeCondition}
    `);
    const countResult = countStmt.get(...scopeParams) as { total: number };
    const total = countResult.total;

    // Get thread metadata with pagination
    // Exclude suggestion threads (those with '-suggestions-' in the ID)
    const stmt = this.db.prepare(`
      SELECT
        ar.thread_id,
        ar.resource_id,
        MIN(ar.created_at) as first_created_at,
        MAX(ar.created_at) as last_activity_at,
        (SELECT events FROM agent_runs WHERE thread_id = ar.thread_id ORDER BY created_at ASC LIMIT 1) as first_run_events,
        (SELECT properties FROM agent_runs WHERE thread_id = ar.thread_id LIMIT 1) as properties
      FROM agent_runs ar${scopeJoin}
      WHERE ar.thread_id NOT LIKE '%-suggestions-%'${scopeCondition}
      GROUP BY ar.thread_id
      ORDER BY last_activity_at DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(...scopeParams, limit, offset) as Array<{
      thread_id: string;
      resource_id: string;
      first_created_at: number;
      last_activity_at: number;
      first_run_events: string;
      properties: string | null;
    }>;

    const threads: ThreadMetadata[] = [];

    for (const row of rows) {
      const runState = this.getRunState(row.thread_id);

      // Parse first run events to extract first message
      let firstMessage: string | undefined;
      try {
        const events = JSON.parse(row.first_run_events) as BaseEvent[];
        const textContent = events.find((e) => e.type === EventType.TEXT_MESSAGE_CONTENT) as
          | TextMessageContentEvent
          | undefined;
        if (textContent?.delta) {
          firstMessage = textContent.delta.substring(0, 100); // Truncate to 100 chars
        }
      } catch {
        // Ignore parse errors
      }

      // Count messages in this thread
      const messageCountStmt = this.db.prepare(`
        SELECT events FROM agent_runs WHERE thread_id = ?
      `);
      const allRuns = messageCountStmt.all(row.thread_id) as Array<{ events: string }>;

      const messageIds = new Set<string>();
      for (const run of allRuns) {
        try {
          const events = JSON.parse(run.events) as BaseEvent[];
          for (const event of events) {
            if ("messageId" in event && typeof event.messageId === "string") {
              messageIds.add(event.messageId);
            }
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Parse properties from JSON
      let properties: Record<string, any> | undefined;
      if (row.properties) {
        try {
          properties = JSON.parse(row.properties);
        } catch {
          // Ignore parse errors
        }
      }

      threads.push({
        threadId: row.thread_id,
        createdAt: row.first_created_at,
        lastActivityAt: row.last_activity_at,
        isRunning: runState.isRunning,
        messageCount: messageIds.size,
        firstMessage,
        resourceId: row.resource_id,
        properties,
      });
    }

    return { threads, total };
  }

  async getThreadMetadata(
    threadId: string,
    scope?: { resourceId: string | string[] } | null,
  ): Promise<ThreadMetadata | null> {
    // Check if thread exists and matches scope
    if (!this.matchesScope(threadId, scope)) {
      return null; // Thread doesn't exist or scope mismatch (404)
    }

    const stmt = this.db.prepare(`
      SELECT
        thread_id,
        resource_id,
        MIN(created_at) as first_created_at,
        MAX(created_at) as last_activity_at,
        (SELECT events FROM agent_runs WHERE thread_id = ? ORDER BY created_at ASC LIMIT 1) as first_run_events,
        (SELECT properties FROM agent_runs WHERE thread_id = ? LIMIT 1) as properties
      FROM agent_runs
      WHERE thread_id = ?
      GROUP BY thread_id
    `);

    const row = stmt.get(threadId, threadId, threadId) as
      | {
          thread_id: string;
          resource_id: string;
          first_created_at: number;
          last_activity_at: number;
          first_run_events: string;
          properties: string | null;
        }
      | undefined;

    if (!row) {
      return null;
    }

    const runState = this.getRunState(row.thread_id);

    // Parse first run events to extract first message
    let firstMessage: string | undefined;
    try {
      const events = JSON.parse(row.first_run_events) as BaseEvent[];
      const textContent = events.find((e) => e.type === EventType.TEXT_MESSAGE_CONTENT) as
        | TextMessageContentEvent
        | undefined;
      if (textContent?.delta) {
        firstMessage = textContent.delta.substring(0, 100);
      }
    } catch {
      // Ignore parse errors
    }

    // Count messages in this thread
    const messageCountStmt = this.db.prepare(`
      SELECT events FROM agent_runs WHERE thread_id = ?
    `);
    const allRuns = messageCountStmt.all(threadId) as Array<{ events: string }>;

    const messageIds = new Set<string>();
    for (const run of allRuns) {
      try {
        const events = JSON.parse(run.events) as BaseEvent[];
        for (const event of events) {
          if ("messageId" in event && typeof event.messageId === "string") {
            messageIds.add(event.messageId);
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Parse properties from JSON
    let properties: Record<string, any> | undefined;
    if (row.properties) {
      try {
        properties = JSON.parse(row.properties);
      } catch {
        // Ignore parse errors
      }
    }

    return {
      threadId: row.thread_id,
      createdAt: row.first_created_at,
      lastActivityAt: row.last_activity_at,
      isRunning: runState.isRunning,
      messageCount: messageIds.size,
      firstMessage,
      resourceId: row.resource_id,
      properties,
    };
  }

  async deleteThread(threadId: string, scope?: { resourceId: string | string[] } | null): Promise<void> {
    // Check if thread exists and matches scope
    if (!this.matchesScope(threadId, scope)) {
      return; // Silently succeed (idempotent)
    }

    const deleteRunsStmt = this.db.prepare(`
      DELETE FROM agent_runs WHERE thread_id = ?
    `);
    deleteRunsStmt.run(threadId);

    const deleteResourcesStmt = this.db.prepare(`
      DELETE FROM thread_resources WHERE thread_id = ?
    `);
    deleteResourcesStmt.run(threadId);

    const deleteRunStateStmt = this.db.prepare(`
      DELETE FROM run_state WHERE thread_id = ?
    `);
    deleteRunStateStmt.run(threadId);

    // Complete and remove the active connection for this thread
    const activeConnection = ACTIVE_CONNECTIONS.get(threadId);
    if (activeConnection) {
      activeConnection.subject.complete();
      ACTIVE_CONNECTIONS.delete(threadId);
    }
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

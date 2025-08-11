import Database from "better-sqlite3";
import { BaseEvent, RunAgentInput } from "@ag-ui/client";

const SCHEMA_VERSION = 1;

export interface AgentRunRecord {
  id: number;
  thread_id: string;
  run_id: string;
  parent_run_id: string | null;
  events: BaseEvent[];
  input: RunAgentInput;
  created_at: number;
  version: number;
}

export class AgentRunDatabase {
  private db: Database.Database;

  constructor(dbPath: string = ":memory:") {
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

  /**
   * Store a completed agent run
   */
  storeRun(
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

  /**
   * Get all historic runs for a thread, ordered by parent chain
   */
  getHistoricRuns(threadId: string): AgentRunRecord[] {
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

  /**
   * Get the latest run ID for a thread (to set as parentRunId for next run)
   */
  getLatestRunId(threadId: string): string | null {
    const stmt = this.db.prepare(`
      SELECT run_id FROM agent_runs 
      WHERE thread_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    const result = stmt.get(threadId) as { run_id: string } | undefined;
    return result?.run_id ?? null;
  }

  /**
   * Delete all runs for a thread (useful for cleanup in tests)
   */
  deleteThreadRuns(threadId: string): void {
    const stmt = this.db.prepare("DELETE FROM agent_runs WHERE thread_id = ?");
    stmt.run(threadId);
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Get database instance for advanced operations
   */
  getDb(): Database.Database {
    return this.db;
  }
}
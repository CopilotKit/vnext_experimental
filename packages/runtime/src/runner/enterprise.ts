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
  Message,
  EventType,
  TextMessageStartEvent,
  TextMessageContentEvent,
  TextMessageEndEvent,
  ToolCallStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallResultEvent,
} from "@ag-ui/client";
import { compactEvents } from "./event-compaction";
import { Kysely, Generated } from "kysely";
import { Redis } from "ioredis";

const SCHEMA_VERSION = 1;

interface AgentDatabase {
  agent_runs: {
    id: Generated<number>;
    thread_id: string;
    run_id: string;
    parent_run_id: string | null;
    events: string;
    input: string;
    created_at: number;
    version: number;
  };
  
  run_state: {
    thread_id: string;
    is_running: number;
    current_run_id: string | null;
    server_id: string | null;
    updated_at: number;
  };
  
  schema_version: {
    version: number;
    applied_at: number;
  };
}

interface AgentRunRecord {
  id: number;
  thread_id: string;
  run_id: string;
  parent_run_id: string | null;
  events: string;
  input: string;
  created_at: number;
  version: number;
}

const redisKeys = {
  stream: (threadId: string, runId: string) => `stream:${threadId}:${runId}`,
  active: (threadId: string) => `active:${threadId}`,
  lock: (threadId: string) => `lock:${threadId}`,
};

export interface EnterpriseAgentRunnerOptions {
  kysely: Kysely<AgentDatabase>;
  redis: Redis;
  redisSub?: Redis;
  streamRetentionMs?: number;
  streamActiveTTLMs?: number;
  lockTTLMs?: number;
  serverId?: string;
}

export class EnterpriseAgentRunner extends AgentRunner {
  private db: Kysely<AgentDatabase>;
  public redis: Redis;
  public redisSub: Redis;
  private serverId: string;
  private streamRetentionMs: number;
  private streamActiveTTLMs: number;
  private lockTTLMs: number;
  
  constructor(options: EnterpriseAgentRunnerOptions) {
    super();
    this.db = options.kysely;
    this.redis = options.redis;
    this.redisSub = options.redisSub || options.redis.duplicate();
    this.serverId = options.serverId || this.generateServerId();
    this.streamRetentionMs = options.streamRetentionMs ?? 3600000; // 1 hour
    this.streamActiveTTLMs = options.streamActiveTTLMs ?? 300000; // 5 minutes
    this.lockTTLMs = options.lockTTLMs ?? 300000; // 5 minutes
    
    this.initializeSchema();
  }
  
  run(request: AgentRunnerRunRequest): Observable<BaseEvent> {
    const runSubject = new ReplaySubject<BaseEvent>(Infinity);
    
    const executeRun = async () => {
      const { threadId, input, agent } = request;
      const runId = input.runId;
      const streamKey = redisKeys.stream(threadId, runId);
      
      // Check if thread already running (do this check synchronously for consistency with SQLite)
      // For now we'll just check after, but in production you might want a sync check
      const activeRunId = await this.redis.get(redisKeys.active(threadId));
      if (activeRunId) {
        throw new Error("Thread already running");
      }
      
      // Acquire distributed lock
      const lockAcquired = await this.redis.set(
        redisKeys.lock(threadId),
        this.serverId,
        'PX', this.lockTTLMs,
        'NX'
      );
      
      if (!lockAcquired) {
        throw new Error("Thread already running");
      }
      
      // Mark as active
      await this.redis.setex(
        redisKeys.active(threadId),
        Math.floor(this.lockTTLMs / 1000),
        runId
      );
      
      // Update database state
      await this.setRunState(threadId, true, runId);
      
      // Track events and message IDs
      const currentRunEvents: BaseEvent[] = [];
      const seenMessageIds = new Set<string>();
      
      // Get historic message IDs
      const historicRuns = await this.getHistoricRuns(threadId);
      const historicMessageIds = new Set<string>();
      for (const run of historicRuns) {
        const events = JSON.parse(run.events) as BaseEvent[];
        for (const event of events) {
          if ('messageId' in event && typeof event.messageId === 'string') {
            historicMessageIds.add(event.messageId);
          }
        }
      }
      
      const parentRunId = historicRuns[historicRuns.length - 1]?.run_id ?? null;
      
      try {
        await agent.runAgent(input, {
          onEvent: async ({ event }) => {
            // Emit to run() caller
            runSubject.next(event);
            
            // Collect for database
            currentRunEvents.push(event);
            
            // Stream to Redis for connect() subscribers
            await this.redis.xadd(
              streamKey,
              'MAXLEN', '~', '10000',
              '*',
              'type', event.type,
              'data', JSON.stringify(event)
            );
            
            // Refresh TTL with sliding window during active writes
            await this.redis.pexpire(streamKey, this.streamActiveTTLMs);
            
            // Check for completion events
            if (event.type === EventType.RUN_FINISHED || 
                event.type === EventType.RUN_ERROR) {
              // Switch to retention TTL for late readers
              await this.redis.pexpire(streamKey, this.streamRetentionMs);
            }
          },
          
          onNewMessage: ({ message }) => {
            if (!seenMessageIds.has(message.id)) {
              seenMessageIds.add(message.id);
            }
          },
          
          onRunStartedEvent: async () => {
            // Process input messages
            if (input.messages) {
              for (const message of input.messages) {
                if (!seenMessageIds.has(message.id)) {
                  seenMessageIds.add(message.id);
                  const events = this.convertMessageToEvents(message);
                  const isNewMessage = !historicMessageIds.has(message.id);
                  
                  for (const event of events) {
                    // Stream to Redis for context
                    await this.redis.xadd(
                      streamKey,
                      'MAXLEN', '~', '10000',
                      '*',
                      'type', event.type,
                      'data', JSON.stringify(event)
                    );
                    
                    if (isNewMessage) {
                      currentRunEvents.push(event);
                    }
                  }
                }
              }
            }
            
            // Refresh TTL
            await this.redis.pexpire(streamKey, this.streamActiveTTLMs);
          },
        });
        
        // Store to database
        const compactedEvents = compactEvents(currentRunEvents);
        await this.storeRun(threadId, runId, compactedEvents, input, parentRunId);
        
      } finally {
        // Clean up (even on error)
        await this.setRunState(threadId, false);
        await this.redis.del(redisKeys.active(threadId));
        await this.redis.del(redisKeys.lock(threadId));
        
        // Ensure stream has retention TTL for late readers
        const exists = await this.redis.exists(streamKey);
        if (exists) {
          await this.redis.pexpire(streamKey, this.streamRetentionMs);
        }
        
        runSubject.complete();
      }
    };
    
    executeRun().catch((error) => {
      runSubject.error(error);
    });
    
    return runSubject.asObservable();
  }
  
  connect(request: AgentRunnerConnectRequest): Observable<BaseEvent> {
    const connectionSubject = new ReplaySubject<BaseEvent>(Infinity);
    
    const streamConnection = async () => {
      const { threadId } = request;
      
      // Load and emit historic runs from database
      const historicRuns = await this.getHistoricRuns(threadId);
      const allHistoricEvents: BaseEvent[] = [];
      
      for (const run of historicRuns) {
        const events = JSON.parse(run.events) as BaseEvent[];
        allHistoricEvents.push(...events);
      }
      
      // Compact and emit historic events
      const compactedEvents = compactEvents(allHistoricEvents);
      const emittedMessageIds = new Set<string>();
      
      for (const event of compactedEvents) {
        connectionSubject.next(event);
        if ('messageId' in event && typeof event.messageId === 'string') {
          emittedMessageIds.add(event.messageId);
        }
      }
      
      // Check for active run
      const activeRunId = await this.redis.get(redisKeys.active(threadId));
      
      if (activeRunId) {
        // Tail the run-specific Redis stream
        const streamKey = redisKeys.stream(threadId, activeRunId);
        let lastId = '0-0';
        let consecutiveEmptyReads = 0;
        
        while (true) {
          try {
            // Read with blocking using call method for better compatibility
            const result = await this.redis.call(
              'XREAD',
              'BLOCK', '5000',
              'COUNT', '100',
              'STREAMS', streamKey, lastId
            ) as [string, [string, string[]][]][] | null;
            
            if (!result || result.length === 0) {
              consecutiveEmptyReads++;
              
              // Check if stream still exists
              const exists = await this.redis.exists(streamKey);
              if (!exists) {
                // Stream expired, we're done
                break;
              }
              
              // Check if thread still active
              const stillActive = await this.redis.get(redisKeys.active(threadId));
              if (stillActive !== activeRunId) {
                // Different run started or thread stopped
                break;
              }
              
              // After multiple empty reads, assume completion
              if (consecutiveEmptyReads > 3) {
                break;
              }
              
              continue;
            }
            
            consecutiveEmptyReads = 0;
            const [, messages] = result[0] || [null, []];
            
            for (const [id, fields] of messages || []) {
              lastId = id;
              
              // Extract event data (fields is array: [key, value, key, value, ...])
              let eventData: string | null = null;
              let eventType: string | null = null;
              
              for (let i = 0; i < fields.length; i += 2) {
                if (fields[i] === 'data') {
                  eventData = fields[i + 1] ?? null;
                } else if (fields[i] === 'type') {
                  eventType = fields[i + 1] ?? null;
                }
              }
              
              if (eventData) {
                const event = JSON.parse(eventData) as BaseEvent;
                
                // Skip already emitted messages
                if ('messageId' in event && 
                    typeof event.messageId === 'string' && 
                    emittedMessageIds.has(event.messageId)) {
                  continue;
                }
                
                connectionSubject.next(event);
                
                // Check for completion events
                if (eventType === EventType.RUN_FINISHED || 
                    eventType === EventType.RUN_ERROR) {
                  connectionSubject.complete();
                  return;
                }
              }
            }
          } catch {
            // Redis error, complete the stream
            break;
          }
        }
      }
      
      connectionSubject.complete();
    };
    
    streamConnection().catch(() => connectionSubject.complete());
    return connectionSubject.asObservable();
  }
  
  async isRunning(request: AgentRunnerIsRunningRequest): Promise<boolean> {
    const { threadId } = request;
    
    // Check Redis first for speed
    const activeRunId = await this.redis.get(redisKeys.active(threadId));
    if (activeRunId) return true;
    
    // Check lock
    const lockExists = await this.redis.exists(redisKeys.lock(threadId));
    if (lockExists) return true;
    
    // Fallback to database
    const state = await this.db
      .selectFrom('run_state')
      .where('thread_id', '=', threadId)
      .selectAll()
      .executeTakeFirst();
    
    return state?.is_running === 1;
  }
  
  async stop(request: AgentRunnerStopRequest): Promise<boolean> {
    const { threadId } = request;
    
    // Get active run ID
    const activeRunId = await this.redis.get(redisKeys.active(threadId));
    if (!activeRunId) {
      return false;
    }
    
    // Add RUN_ERROR event to stream
    const streamKey = redisKeys.stream(threadId, activeRunId);
    await this.redis.xadd(
      streamKey,
      '*',
      'type', EventType.RUN_ERROR,
      'data', JSON.stringify({
        type: EventType.RUN_ERROR,
        error: 'Run stopped by user'
      })
    );
    
    // Set retention TTL
    await this.redis.pexpire(streamKey, this.streamRetentionMs);
    
    // Clean up
    await this.setRunState(threadId, false);
    await this.redis.del(redisKeys.active(threadId));
    await this.redis.del(redisKeys.lock(threadId));
    
    return true;
  }
  
  // Helper methods
  private convertMessageToEvents(message: Message): BaseEvent[] {
    const events: BaseEvent[] = [];

    if (
      (message.role === "assistant" ||
        message.role === "user" ||
        message.role === "developer" ||
        message.role === "system") &&
      message.content
    ) {
      const textStartEvent: TextMessageStartEvent = {
        type: EventType.TEXT_MESSAGE_START,
        messageId: message.id,
        role: message.role,
      };
      events.push(textStartEvent);

      const textContentEvent: TextMessageContentEvent = {
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: message.id,
        delta: message.content,
      };
      events.push(textContentEvent);

      const textEndEvent: TextMessageEndEvent = {
        type: EventType.TEXT_MESSAGE_END,
        messageId: message.id,
      };
      events.push(textEndEvent);
    }

    if (message.role === "assistant" && message.toolCalls) {
      for (const toolCall of message.toolCalls) {
        const toolStartEvent: ToolCallStartEvent = {
          type: EventType.TOOL_CALL_START,
          toolCallId: toolCall.id,
          toolCallName: toolCall.function.name,
          parentMessageId: message.id,
        };
        events.push(toolStartEvent);

        const toolArgsEvent: ToolCallArgsEvent = {
          type: EventType.TOOL_CALL_ARGS,
          toolCallId: toolCall.id,
          delta: toolCall.function.arguments,
        };
        events.push(toolArgsEvent);

        const toolEndEvent: ToolCallEndEvent = {
          type: EventType.TOOL_CALL_END,
          toolCallId: toolCall.id,
        };
        events.push(toolEndEvent);
      }
    }

    if (message.role === "tool" && message.toolCallId) {
      const toolResultEvent: ToolCallResultEvent = {
        type: EventType.TOOL_CALL_RESULT,
        messageId: message.id,
        toolCallId: message.toolCallId,
        content: message.content,
        role: "tool",
      };
      events.push(toolResultEvent);
    }

    return events;
  }
  
  private async initializeSchema(): Promise<void> {
    try {
    // Create agent_runs table
    await this.db.schema
      .createTable('agent_runs')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
      .addColumn('thread_id', 'text', (col) => col.notNull())
      .addColumn('run_id', 'text', (col) => col.notNull().unique())
      .addColumn('parent_run_id', 'text')
      .addColumn('events', 'text', (col) => col.notNull())
      .addColumn('input', 'text', (col) => col.notNull())
      .addColumn('created_at', 'integer', (col) => col.notNull())
      .addColumn('version', 'integer', (col) => col.notNull())
      .execute()
      .catch(() => {}); // Ignore if already exists
    
    // Create run_state table
    await this.db.schema
      .createTable('run_state')
      .ifNotExists()
      .addColumn('thread_id', 'text', (col) => col.primaryKey())
      .addColumn('is_running', 'integer', (col) => col.defaultTo(0))
      .addColumn('current_run_id', 'text')
      .addColumn('server_id', 'text')
      .addColumn('updated_at', 'integer', (col) => col.notNull())
      .execute()
      .catch(() => {}); // Ignore if already exists
    
    // Create schema_version table
    await this.db.schema
      .createTable('schema_version')
      .ifNotExists()
      .addColumn('version', 'integer', (col) => col.primaryKey())
      .addColumn('applied_at', 'integer', (col) => col.notNull())
      .execute()
      .catch(() => {}); // Ignore if already exists
    
    // Create indexes
    await this.db.schema
      .createIndex('idx_thread_id')
      .ifNotExists()
      .on('agent_runs')
      .column('thread_id')
      .execute()
      .catch(() => {});
    
    await this.db.schema
      .createIndex('idx_parent_run_id')
      .ifNotExists()
      .on('agent_runs')
      .column('parent_run_id')
      .execute()
      .catch(() => {});
    
    // Check and set schema version
    const currentVersion = await this.db
      .selectFrom('schema_version')
      .orderBy('version', 'desc')
      .limit(1)
      .selectAll()
      .executeTakeFirst();
    
    if (!currentVersion || currentVersion.version < SCHEMA_VERSION) {
      await this.db
        .insertInto('schema_version')
        .values({
          version: SCHEMA_VERSION,
          applied_at: Date.now()
        })
        .onConflict((oc) => oc
          .column('version')
          .doUpdateSet({ applied_at: Date.now() })
        )
        .execute();
    }
    } catch {
      // Schema initialization might fail if DB is closed, ignore
    }
  }
  
  private async storeRun(
    threadId: string,
    runId: string,
    events: BaseEvent[],
    input: RunAgentInput,
    parentRunId: string | null
  ): Promise<void> {
    await this.db.insertInto('agent_runs')
      .values({
        thread_id: threadId,
        run_id: runId,
        parent_run_id: parentRunId,
        events: JSON.stringify(events),
        input: JSON.stringify(input),
        created_at: Date.now(),
        version: SCHEMA_VERSION
      })
      .execute();
  }
  
  private async getHistoricRuns(threadId: string): Promise<AgentRunRecord[]> {
    const rows = await this.db
      .selectFrom('agent_runs')
      .where('thread_id', '=', threadId)
      .orderBy('created_at', 'asc')
      .selectAll()
      .execute();
    
    return rows.map(row => ({
      id: Number(row.id),
      thread_id: row.thread_id,
      run_id: row.run_id,
      parent_run_id: row.parent_run_id,
      events: row.events,
      input: row.input,
      created_at: row.created_at,
      version: row.version
    }));
  }
  
  private async setRunState(
    threadId: string,
    isRunning: boolean,
    runId?: string
  ): Promise<void> {
    await this.db.insertInto('run_state')
      .values({
        thread_id: threadId,
        is_running: isRunning ? 1 : 0,
        current_run_id: runId ?? null,
        server_id: this.serverId,
        updated_at: Date.now()
      })
      .onConflict((oc) => oc
        .column('thread_id')
        .doUpdateSet({
          is_running: isRunning ? 1 : 0,
          current_run_id: runId ?? null,
          server_id: this.serverId,
          updated_at: Date.now()
        })
      )
      .execute();
  }
  
  async close(): Promise<void> {
    await this.db.destroy();
    this.redis.disconnect();
    this.redisSub.disconnect();
  }
  
  private generateServerId(): string {
    return `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
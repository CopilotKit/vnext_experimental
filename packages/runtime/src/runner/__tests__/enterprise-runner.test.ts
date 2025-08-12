import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import IORedisMock from 'ioredis-mock';
import { EnterpriseAgentRunner } from '../enterprise';
import { EventType } from '@ag-ui/client';
import type { AbstractAgent, RunAgentInput, BaseEvent, Message } from '@ag-ui/client';
import { firstValueFrom, toArray } from 'rxjs';

// Mock agent that takes custom events
class CustomEventAgent implements AbstractAgent {
  private events: BaseEvent[];

  constructor(events: BaseEvent[] = []) {
    this.events = events;
  }

  async runAgent(
    input: RunAgentInput,
    callbacks: {
      onEvent: (params: { event: any }) => void | Promise<void>;
      onNewMessage?: (params: { message: any }) => void | Promise<void>;
      onRunStartedEvent?: () => void | Promise<void>;
    }
  ): Promise<void> {
    if (callbacks.onRunStartedEvent) {
      await callbacks.onRunStartedEvent();
    }
    
    for (const event of this.events) {
      await callbacks.onEvent({ event });
    }
  }
}

// Mock agent for testing
class MockAgent implements AbstractAgent {
  async runAgent(
    input: RunAgentInput,
    callbacks: {
      onEvent: (params: { event: any }) => void | Promise<void>;
      onNewMessage?: (params: { message: any }) => void | Promise<void>;
      onRunStartedEvent?: () => void | Promise<void>;
    }
  ): Promise<void> {
    // Emit run started
    if (callbacks.onRunStartedEvent) {
      await callbacks.onRunStartedEvent();
    }
    
    // Emit some events
    await callbacks.onEvent({
      event: {
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      }
    });
    
    // Emit a text message
    await callbacks.onEvent({
      event: {
        type: EventType.TEXT_MESSAGE_START,
        messageId: 'test-msg-1',
        role: 'assistant',
      }
    });
    
    await callbacks.onEvent({
      event: {
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: 'test-msg-1',
        delta: 'Hello from agent',
      }
    });
    
    await callbacks.onEvent({
      event: {
        type: EventType.TEXT_MESSAGE_END,
        messageId: 'test-msg-1',
      }
    });
    
    // Emit run finished
    await callbacks.onEvent({
      event: {
        type: EventType.RUN_FINISHED,
        threadId: input.threadId,
        runId: input.runId,
      }
    });
  }
}

// Error agent for testing
class ErrorAgent implements AbstractAgent {
  async runAgent(
    input: RunAgentInput,
    callbacks: {
      onEvent: (params: { event: any }) => void | Promise<void>;
      onNewMessage?: (params: { message: any }) => void | Promise<void>;
      onRunStartedEvent?: () => void | Promise<void>;
    }
  ): Promise<void> {
    await callbacks.onEvent({
      event: {
        type: EventType.RUN_STARTED,
        threadId: input.threadId,
        runId: input.runId,
      }
    });
    
    await callbacks.onEvent({
      event: {
        type: EventType.RUN_ERROR,
        error: 'Test error',
      }
    });
  }
}

describe('EnterpriseAgentRunner', () => {
  let db: Kysely<any>;
  let redis: any;
  let redisSub: any;
  let runner: EnterpriseAgentRunner;
  
  beforeEach(async () => {
    // In-memory SQLite for testing
    db = new Kysely({
      dialect: new SqliteDialect({
        database: new Database(':memory:')
      })
    });
    
    // Mock Redis for unit tests
    redis = new IORedisMock();
    redisSub = redis.duplicate();
    
    runner = new EnterpriseAgentRunner({
      kysely: db,
      redis,
      redisSub,
      streamRetentionMs: 60000,  // 1 minute for tests
      streamActiveTTLMs: 10000,   // 10 seconds for tests
      lockTTLMs: 30000            // 30 seconds for tests
    });
    
    // Allow schema to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  });
  
  afterEach(async () => {
    await runner.close();
  });
  
  it('should prevent concurrent runs on same thread', async () => {
    // Create a slow agent that takes time to complete
    const slowAgent: AbstractAgent = {
      async runAgent(input, callbacks) {
        if (callbacks.onRunStartedEvent) {
          await callbacks.onRunStartedEvent();
        }
        
        await callbacks.onEvent({
          event: {
            type: EventType.RUN_STARTED,
            threadId: input.threadId,
            runId: input.runId,
          }
        });
        
        // Simulate long running task
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await callbacks.onEvent({
          event: {
            type: EventType.RUN_FINISHED,
            threadId: input.threadId,
            runId: input.runId,
          }
        });
      }
    };
    
    const threadId = 'test-thread-1';
    const input1: RunAgentInput = {
      runId: 'run-1',
      threadId,
      messages: [],
    };
    const input2: RunAgentInput = {
      runId: 'run-2',
      threadId,
      messages: [],
    };
    
    // Start first run
    const run1 = runner.run({ threadId, agent: slowAgent, input: input1 });
    
    // Wait a bit for first run to acquire lock
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Try to start second run on same thread - should error
    const run2 = runner.run({ threadId, agent: slowAgent, input: input2 });
    
    let errorReceived = false;
    let completedWithoutError = false;
    
    await new Promise<void>((resolve) => {
      run2.subscribe({
        next: () => {},
        error: (err) => {
          errorReceived = true;
          expect(err.message).toBe('Thread already running');
          resolve();
        },
        complete: () => {
          completedWithoutError = true;
          resolve();
        }
      });
    });
    
    expect(errorReceived).toBe(true);
    expect(completedWithoutError).toBe(false);
    
    // Let first run complete
    const events1 = await firstValueFrom(run1.pipe(toArray()));
    expect(events1.length).toBeGreaterThan(0);
  });
  
  it('should handle RUN_FINISHED event correctly', async () => {
    const agent = new MockAgent();
    const threadId = 'test-thread-2';
    const input: RunAgentInput = {
      runId: 'run-finished',
      threadId,
      messages: [],
    };
    
    const events = await firstValueFrom(
      runner.run({ threadId, agent, input }).pipe(toArray())
    );
    
    // Should contain RUN_FINISHED event
    const runFinishedEvent = events.find(e => e.type === EventType.RUN_FINISHED);
    expect(runFinishedEvent).toBeDefined();
    
    // Thread should not be running after completion
    const isRunning = await runner.isRunning({ threadId });
    expect(isRunning).toBe(false);
    
    // Stream should have retention TTL
    const streamKey = `stream:${threadId}:${input.runId}`;
    const ttl = await redis.pttl(streamKey);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60000); // retention period
  });
  
  it('should handle RUN_ERROR event correctly', async () => {
    const agent = new ErrorAgent();
    const threadId = 'test-thread-3';
    const input: RunAgentInput = {
      runId: 'run-error',
      threadId,
      messages: [],
    };
    
    const events = await firstValueFrom(
      runner.run({ threadId, agent, input }).pipe(toArray())
    );
    
    // Should contain RUN_ERROR event
    const runErrorEvent = events.find(e => e.type === EventType.RUN_ERROR);
    expect(runErrorEvent).toBeDefined();
    
    // Thread should not be running after error
    const isRunning = await runner.isRunning({ threadId });
    expect(isRunning).toBe(false);
  });
  
  it('should allow late readers to catch up during retention period', async () => {
    const agent = new MockAgent();
    const threadId = 'test-thread-4';
    const input: RunAgentInput = {
      runId: 'run-retention',
      threadId,
      messages: [],
    };
    
    // Start and complete a run
    const runEvents = await firstValueFrom(
      runner.run({ threadId, agent, input }).pipe(toArray())
    );
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Connect should still get all events
    const connectEvents = await firstValueFrom(
      runner.connect({ threadId }).pipe(toArray())
    );
    
    // Should get the same events (after compaction)
    expect(connectEvents.length).toBeGreaterThan(0);
    
    // Should include text message events
    const textStartEvents = connectEvents.filter(e => e.type === EventType.TEXT_MESSAGE_START);
    expect(textStartEvents.length).toBeGreaterThan(0);
  });
  
  it('should handle connect() with no active runs', async () => {
    const threadId = 'test-thread-5';
    
    // Connect to thread with no runs
    const events = await firstValueFrom(
      runner.connect({ threadId }).pipe(toArray())
    );
    
    // Should complete with empty array
    expect(events).toEqual([]);
  });
  
  it('should handle connect() during active run', async () => {
    const agent = new MockAgent();
    const threadId = 'test-thread-6';
    const input: RunAgentInput = {
      runId: 'run-active',
      threadId,
      messages: [],
    };
    
    // Start a run but don't wait for it
    runner.run({ threadId, agent, input });
    
    // Wait for run to start
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Connect while run is active
    const connectPromise = firstValueFrom(
      runner.connect({ threadId }).pipe(toArray())
    );
    
    // Should eventually complete when run finishes
    const events = await connectPromise;
    expect(events.length).toBeGreaterThan(0);
    
    // Should include RUN_FINISHED
    const finishedEvent = events.find(e => e.type === EventType.RUN_FINISHED);
    expect(finishedEvent).toBeDefined();
  });
  
  it('should handle stop() correctly', async () => {
    const agent = new MockAgent();
    const threadId = 'test-thread-7';
    const input: RunAgentInput = {
      runId: 'run-stop',
      threadId,
      messages: [],
    };
    
    // Mock a slow agent
    const slowAgent: AbstractAgent = {
      async runAgent(input, callbacks) {
        await callbacks.onEvent({
          event: {
            type: EventType.RUN_STARTED,
            threadId: input.threadId,
            runId: input.runId,
          }
        });
        
        // Simulate long running task
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    };
    
    // Start run
    runner.run({ threadId, agent: slowAgent, input });
    
    // Wait for run to start
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Stop the run
    const stopped = await runner.stop({ threadId });
    expect(stopped).toBe(true);
    
    // Should not be running
    const isRunning = await runner.isRunning({ threadId });
    expect(isRunning).toBe(false);
    
    // Stream should contain RUN_ERROR event
    const streamKey = `stream:${threadId}:${input.runId}`;
    const stream = await redis.xrange(streamKey, '-', '+');
    const errorEvent = stream.find((entry: any) => {
      const fields = entry[1];
      for (let i = 0; i < fields.length; i += 2) {
        if (fields[i] === 'type' && fields[i + 1] === EventType.RUN_ERROR) {
          return true;
        }
      }
      return false;
    });
    expect(errorEvent).toBeDefined();
  });
  
  it('should handle multiple sequential runs on same thread', async () => {
    const agent = new MockAgent();
    const threadId = 'test-thread-8';
    
    // First run
    const input1: RunAgentInput = {
      runId: 'run-seq-1',
      threadId,
      messages: [],
    };
    
    const events1 = await firstValueFrom(
      runner.run({ threadId, agent, input: input1 }).pipe(toArray())
    );
    expect(events1.length).toBeGreaterThan(0);
    
    // Second run
    const input2: RunAgentInput = {
      runId: 'run-seq-2',
      threadId,
      messages: [],
    };
    
    const events2 = await firstValueFrom(
      runner.run({ threadId, agent, input: input2 }).pipe(toArray())
    );
    expect(events2.length).toBeGreaterThan(0);
    
    // Connect should get both runs' events
    const allEvents = await firstValueFrom(
      runner.connect({ threadId }).pipe(toArray())
    );
    
    // Should have events from both runs
    expect(allEvents.length).toBeGreaterThan(events1.length);
  });
  
  it('should handle input messages correctly', async () => {
    const agent = new MockAgent();
    const threadId = 'test-thread-9';
    const input: RunAgentInput = {
      runId: 'run-messages',
      threadId,
      messages: [
        {
          id: 'user-msg-1',
          role: 'user',
          content: 'Hello',
        }
      ],
    };
    
    const events = await firstValueFrom(
      runner.run({ threadId, agent, input }).pipe(toArray())
    );
    
    // Run events should not include input messages
    const userMessages = events.filter((e: any) => 
      e.type === EventType.TEXT_MESSAGE_START && e.role === 'user'
    );
    expect(userMessages.length).toBe(0);
    
    // But connect should include them
    const connectEvents = await firstValueFrom(
      runner.connect({ threadId }).pipe(toArray())
    );
    
    const userMessagesInConnect = connectEvents.filter((e: any) => 
      e.type === EventType.TEXT_MESSAGE_START && e.role === 'user'
    );
    expect(userMessagesInConnect.length).toBe(1);
  });
  
  // Additional comprehensive tests to match SQLite/InMemory coverage
  
  it('should persist events across runner instances', async () => {
    const threadId = 'test-thread-persistence';
    const events: BaseEvent[] = [
      { type: EventType.TEXT_MESSAGE_START, messageId: 'msg1', role: 'assistant' },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: 'msg1', delta: 'Persisted' },
      { type: EventType.TEXT_MESSAGE_END, messageId: 'msg1' },
      { type: EventType.RUN_FINISHED, threadId, runId: 'run1' },
    ];
    
    const agent = new CustomEventAgent(events);
    const input: RunAgentInput = {
      threadId,
      runId: 'run1',
      messages: [],
    };
    
    // Run with first instance
    await firstValueFrom(
      runner.run({ threadId, agent, input }).pipe(toArray())
    );
    
    // Don't close the first runner's DB connection since we share it
    // Just disconnect Redis
    runner.redis.disconnect();
    runner.redisSub.disconnect();
    
    // Create new runner instance with same DB but new Redis
    const newRunner = new EnterpriseAgentRunner({
      kysely: db,  // Reuse same DB connection
      redis: new IORedisMock(),
      streamRetentionMs: 60000,
      streamActiveTTLMs: 10000,
      lockTTLMs: 30000
    });
    
    // Connect should get persisted events
    const persistedEvents = await firstValueFrom(
      newRunner.connect({ threadId }).pipe(toArray())
    );
    
    expect(persistedEvents.length).toBeGreaterThan(0);
    const textContent = persistedEvents.find(
      e => e.type === EventType.TEXT_MESSAGE_CONTENT
    ) as any;
    expect(textContent?.delta).toBe('Persisted');
    
    // Clean up new runner's Redis connections only
    newRunner.redis.disconnect();
    newRunner.redisSub.disconnect();
  });
  
  it('should handle concurrent connections', async () => {
    const threadId = 'test-thread-concurrent';
    const agent = new MockAgent();
    const input: RunAgentInput = {
      threadId,
      runId: 'run1',
      messages: [],
    };
    
    // Start a run
    const runPromise = firstValueFrom(
      runner.run({ threadId, agent, input }).pipe(toArray())
    );
    
    // Start multiple connections while run is active
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const conn1Promise = firstValueFrom(
      runner.connect({ threadId }).pipe(toArray())
    );
    const conn2Promise = firstValueFrom(
      runner.connect({ threadId }).pipe(toArray())
    );
    const conn3Promise = firstValueFrom(
      runner.connect({ threadId }).pipe(toArray())
    );
    
    // Wait for all to complete
    const [runEvents, conn1Events, conn2Events, conn3Events] = await Promise.all([
      runPromise,
      conn1Promise,
      conn2Promise,
      conn3Promise,
    ]);
    
    // All connections should receive events
    expect(conn1Events.length).toBeGreaterThan(0);
    expect(conn2Events.length).toBeGreaterThan(0);
    expect(conn3Events.length).toBeGreaterThan(0);
  });
  
  it('should store compacted events in the database', async () => {
    const threadId = 'test-thread-compaction';
    const messageId = 'msg-compact';
    
    // Create events that will be compacted
    const events: BaseEvent[] = [
      { type: EventType.TEXT_MESSAGE_START, messageId, role: 'assistant' },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: 'Hello' },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: ' ' },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: 'World' },
      { type: EventType.TEXT_MESSAGE_END, messageId },
      { type: EventType.RUN_FINISHED, threadId, runId: 'run1' },
    ];
    
    const agent = new CustomEventAgent(events);
    const input: RunAgentInput = {
      threadId,
      runId: 'run1',
      messages: [],
    };
    
    // Run the agent
    await firstValueFrom(
      runner.run({ threadId, agent, input }).pipe(toArray())
    );
    
    // Check database has compacted events
    const dbRuns = await db
      .selectFrom('agent_runs')
      .where('thread_id', '=', threadId)
      .selectAll()
      .execute();
    
    expect(dbRuns).toHaveLength(1);
    const storedEvents = JSON.parse(dbRuns[0].events);
    
    // Should have compacted content into single delta
    const contentEvents = storedEvents.filter(
      (e: any) => e.type === EventType.TEXT_MESSAGE_CONTENT
    );
    expect(contentEvents).toHaveLength(1);
    expect(contentEvents[0].delta).toBe('Hello World');
  });
  
  it('should not store duplicate message IDs across multiple runs', async () => {
    const threadId = 'test-thread-nodupe';
    const messageId = 'shared-msg';
    
    // First run with a message
    const input1: RunAgentInput = {
      threadId,
      runId: 'run1',
      messages: [{
        id: messageId,
        role: 'user',
        content: 'First message',
      }],
    };
    
    const agent = new CustomEventAgent([
      { type: EventType.RUN_FINISHED, threadId, runId: 'run1' },
    ]);
    
    await firstValueFrom(
      runner.run({ threadId, agent, input: input1 }).pipe(toArray())
    );
    
    // Second run with same message ID
    const input2: RunAgentInput = {
      threadId,
      runId: 'run2',
      messages: [{
        id: messageId,
        role: 'user',
        content: 'First message',
      }],
    };
    
    await firstValueFrom(
      runner.run({ threadId, agent, input: input2 }).pipe(toArray())
    );
    
    // Check database - message should only be stored in first run
    const dbRuns = await db
      .selectFrom('agent_runs')
      .where('thread_id', '=', threadId)
      .selectAll()
      .orderBy('created_at', 'asc')
      .execute();
    
    expect(dbRuns).toHaveLength(2);
    
    const run1Events = JSON.parse(dbRuns[0].events);
    const run2Events = JSON.parse(dbRuns[1].events);
    
    // First run should have the message events
    const run1MessageEvents = run1Events.filter(
      (e: any) => e.messageId === messageId
    );
    expect(run1MessageEvents.length).toBeGreaterThan(0);
    
    // Second run should NOT have the message events
    const run2MessageEvents = run2Events.filter(
      (e: any) => e.messageId === messageId
    );
    expect(run2MessageEvents.length).toBe(0);
  });
  
  it('should handle all message types (user, assistant, tool, system, developer)', async () => {
    const threadId = 'test-thread-alltypes';
    const messages: Message[] = [
      { id: 'user-1', role: 'user', content: 'User message' },
      { id: 'assistant-1', role: 'assistant', content: 'Assistant message' },
      { id: 'system-1', role: 'system', content: 'System message' },
      { id: 'developer-1', role: 'developer', content: 'Developer message' },
      { 
        id: 'tool-1', 
        role: 'tool', 
        content: 'Tool result',
        toolCallId: 'call-1'
      },
    ];
    
    const input: RunAgentInput = {
      threadId,
      runId: 'run1',
      messages,
    };
    
    const agent = new CustomEventAgent([
      { type: EventType.RUN_FINISHED, threadId, runId: 'run1' },
    ]);
    
    await firstValueFrom(
      runner.run({ threadId, agent, input }).pipe(toArray())
    );
    
    // Connect should get all message types
    const connectEvents = await firstValueFrom(
      runner.connect({ threadId }).pipe(toArray())
    );
    
    // Check each message type is present
    const userEvents = connectEvents.filter(
      (e: any) => e.type === EventType.TEXT_MESSAGE_START && e.role === 'user'
    );
    expect(userEvents.length).toBe(1);
    
    const assistantEvents = connectEvents.filter(
      (e: any) => e.type === EventType.TEXT_MESSAGE_START && e.role === 'assistant'
    );
    expect(assistantEvents.length).toBe(1);
    
    const systemEvents = connectEvents.filter(
      (e: any) => e.type === EventType.TEXT_MESSAGE_START && e.role === 'system'
    );
    expect(systemEvents.length).toBe(1);
    
    const developerEvents = connectEvents.filter(
      (e: any) => e.type === EventType.TEXT_MESSAGE_START && e.role === 'developer'
    );
    expect(developerEvents.length).toBe(1);
    
    const toolEvents = connectEvents.filter(
      (e: any) => e.type === EventType.TOOL_CALL_RESULT
    );
    expect(toolEvents.length).toBe(1);
  });
  
  it('should handle tool calls correctly', async () => {
    const threadId = 'test-thread-tools';
    const messageId = 'assistant-msg';
    const toolCallId = 'tool-call-1';
    
    const messages: Message[] = [
      {
        id: messageId,
        role: 'assistant',
        content: 'Let me help',
        toolCalls: [{
          id: toolCallId,
          function: {
            name: 'calculator',
            arguments: '{"a": 1, "b": 2}'
          }
        }]
      },
      {
        id: 'tool-result-1',
        role: 'tool',
        content: '3',
        toolCallId: toolCallId
      }
    ];
    
    const input: RunAgentInput = {
      threadId,
      runId: 'run1',
      messages,
    };
    
    const agent = new CustomEventAgent([
      { type: EventType.RUN_FINISHED, threadId, runId: 'run1' },
    ]);
    
    await firstValueFrom(
      runner.run({ threadId, agent, input }).pipe(toArray())
    );
    
    const connectEvents = await firstValueFrom(
      runner.connect({ threadId }).pipe(toArray())
    );
    
    // Check tool call events
    const toolCallStart = connectEvents.find(
      (e: any) => e.type === EventType.TOOL_CALL_START && e.toolCallId === toolCallId
    ) as any;
    expect(toolCallStart).toBeDefined();
    expect(toolCallStart.toolCallName).toBe('calculator');
    
    const toolCallArgs = connectEvents.find(
      (e: any) => e.type === EventType.TOOL_CALL_ARGS && e.toolCallId === toolCallId
    ) as any;
    expect(toolCallArgs).toBeDefined();
    expect(toolCallArgs.delta).toBe('{"a": 1, "b": 2}');
    
    const toolCallEnd = connectEvents.find(
      (e: any) => e.type === EventType.TOOL_CALL_END && e.toolCallId === toolCallId
    );
    expect(toolCallEnd).toBeDefined();
    
    const toolResult = connectEvents.find(
      (e: any) => e.type === EventType.TOOL_CALL_RESULT && e.toolCallId === toolCallId
    ) as any;
    expect(toolResult).toBeDefined();
    expect(toolResult.content).toBe('3');
  });
  
  it('should track running state correctly', async () => {
    const threadId = 'test-thread-state';
    
    // Use a slow agent to ensure we can check running state
    const slowAgent: AbstractAgent = {
      async runAgent(input, callbacks) {
        if (callbacks.onRunStartedEvent) {
          await callbacks.onRunStartedEvent();
        }
        
        await callbacks.onEvent({
          event: {
            type: EventType.RUN_STARTED,
            threadId: input.threadId,
            runId: input.runId,
          }
        });
        
        // Delay to ensure we can check running state
        await new Promise(resolve => setTimeout(resolve, 200));
        
        await callbacks.onEvent({
          event: {
            type: EventType.RUN_FINISHED,
            threadId: input.threadId,
            runId: input.runId,
          }
        });
      }
    };
    
    const input: RunAgentInput = {
      threadId,
      runId: 'run1',
      messages: [],
    };
    
    // Check not running initially
    let isRunning = await runner.isRunning({ threadId });
    expect(isRunning).toBe(false);
    
    // Start run
    const runPromise = runner.run({ threadId, agent: slowAgent, input });
    
    // Check running state during execution
    await new Promise(resolve => setTimeout(resolve, 50));
    isRunning = await runner.isRunning({ threadId });
    expect(isRunning).toBe(true);
    
    // Wait for completion
    await firstValueFrom(runPromise.pipe(toArray()));
    
    // Check not running after completion
    isRunning = await runner.isRunning({ threadId });
    expect(isRunning).toBe(false);
  });
  
  it('should handle empty events arrays correctly', async () => {
    const threadId = 'test-thread-empty';
    const agent = new CustomEventAgent([]); // No events
    const input: RunAgentInput = {
      threadId,
      runId: 'run1',
      messages: [],
    };
    
    await firstValueFrom(
      runner.run({ threadId, agent, input }).pipe(toArray())
    );
    
    // Check database - should still create a run record
    const dbRuns = await db
      .selectFrom('agent_runs')
      .where('thread_id', '=', threadId)
      .selectAll()
      .execute();
    
    expect(dbRuns).toHaveLength(1);
    const storedEvents = JSON.parse(dbRuns[0].events);
    expect(storedEvents).toEqual([]);
  });
  
  it('should handle parent-child run relationships', async () => {
    const threadId = 'test-thread-parent-child';
    const agent = new CustomEventAgent([
      { type: EventType.RUN_FINISHED, threadId, runId: 'run1' },
    ]);
    
    // First run (parent)
    await firstValueFrom(
      runner.run({ 
        threadId, 
        agent, 
        input: { threadId, runId: 'run1', messages: [] } 
      }).pipe(toArray())
    );
    
    // Second run (child)
    await firstValueFrom(
      runner.run({ 
        threadId, 
        agent, 
        input: { threadId, runId: 'run2', messages: [] } 
      }).pipe(toArray())
    );
    
    // Check parent-child relationship in database
    const dbRuns = await db
      .selectFrom('agent_runs')
      .where('thread_id', '=', threadId)
      .selectAll()
      .orderBy('created_at', 'asc')
      .execute();
    
    expect(dbRuns).toHaveLength(2);
    expect(dbRuns[0].parent_run_id).toBeNull();
    expect(dbRuns[1].parent_run_id).toBe('run1');
  });
  
  it('should handle database initialization correctly', async () => {
    // Check all tables exist
    const tables = await db
      .selectFrom('sqlite_master')
      .where('type', '=', 'table')
      .select('name')
      .execute();
    
    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('agent_runs');
    expect(tableNames).toContain('run_state');
    expect(tableNames).toContain('schema_version');
    
    // Check schema version
    const schemaVersion = await db
      .selectFrom('schema_version')
      .selectAll()
      .executeTakeFirst();
    
    expect(schemaVersion).toBeDefined();
    expect(schemaVersion?.version).toBe(1);
  });
  
  it('should handle Redis stream expiry correctly', async () => {
    const threadId = 'test-thread-expiry';
    const agent = new MockAgent();
    const input: RunAgentInput = {
      threadId,
      runId: 'run1',
      messages: [],
    };
    
    // Run with short TTL
    const shortTTLRunner = new EnterpriseAgentRunner({
      kysely: db,
      redis,
      redisSub,
      streamRetentionMs: 100, // 100ms retention
      streamActiveTTLMs: 50,   // 50ms active TTL
      lockTTLMs: 1000
    });
    
    await firstValueFrom(
      shortTTLRunner.run({ threadId, agent, input }).pipe(toArray())
    );
    
    // Stream should exist immediately after run
    const streamKey = `stream:${threadId}:run1`;
    let exists = await redis.exists(streamKey);
    expect(exists).toBe(1);
    
    // Wait for retention period to expire
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Stream should be gone
    exists = await redis.exists(streamKey);
    expect(exists).toBe(0);
    
    await shortTTLRunner.close();
  });
});
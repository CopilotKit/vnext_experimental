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
  TextMessageContentEvent,
  TextMessageEndEvent,
  TextMessageStartEvent,
  ToolCallArgsEvent,
  ToolCallEndEvent,
  ToolCallResultEvent,
  ToolCallStartEvent,
} from "@ag-ui/client";

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
}

const GLOBAL_STORE = new Map<string, InProcessEventStore>();

export class InProcessAgentRunner extends AgentRunner {
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

    const nextSubject = new ReplaySubject<BaseEvent>(Infinity);
    const prevSubject = store.subject;

    // Update the store's subject immediately
    store.subject = nextSubject;
    store.abortController = new AbortController();

    // Create a subject for run() return value
    const runSubject = new ReplaySubject<BaseEvent>(Infinity);

    // Helper function to run the agent and handle errors
    const runAgent = async () => {
      try {
        await request.agent.runAgent(request.input, {
          onEvent: ({ event }) => {
            runSubject.next(event); // For run() return - only agent events
            nextSubject.next(event); // For connect() / store - all events
          },
          onNewMessage: ({ message }) => {
            // Called for each new message
            if (!store!.seenMessageIds.has(message.id)) {
              store!.seenMessageIds.add(message.id);
            }
          },
          onRunStartedEvent: (args: any) => {
            if (args && args.event) {
              // Inject the runStarted event only to store (not to run)
              nextSubject.next(args.event);
            }

            // Process each message from input and inject as events
            if (request.input.messages) {
              for (const message of request.input.messages) {
                if (!store!.seenMessageIds.has(message.id)) {
                  // Track the message ID
                  store!.seenMessageIds.add(message.id);

                  // Emit proper ag-ui events based on message type
                  if (message.role === "assistant" && message.content) {
                    // Text message events for assistant messages
                    const textStartEvent: TextMessageStartEvent = {
                      type: "TextMessageStartEvent" as any,
                      messageId: message.id,
                      role: "assistant",
                    };
                    nextSubject.next(textStartEvent);

                    const textContentEvent: TextMessageContentEvent = {
                      type: "TextMessageContentEvent" as any,
                      messageId: message.id,
                      delta: message.content,
                    };
                    nextSubject.next(textContentEvent);

                    const textEndEvent: TextMessageEndEvent = {
                      type: "TextMessageEndEvent" as any,
                      messageId: message.id,
                    };
                    nextSubject.next(textEndEvent);
                  }

                  // Handle tool calls if present
                  if (message.role === "assistant" && message.toolCalls) {
                    for (const toolCall of message.toolCalls) {
                      // ToolCallStart event
                      const toolStartEvent: ToolCallStartEvent = {
                        type: "ToolCallStartEvent" as any,
                        toolCallId: toolCall.id,
                        toolCallName: toolCall.function.name,
                        parentMessageId: message.id,
                      };
                      nextSubject.next(toolStartEvent);

                      // ToolCallArgs event
                      const toolArgsEvent: ToolCallArgsEvent = {
                        type: "ToolCallArgsEvent" as any,
                        toolCallId: toolCall.id,
                        delta: toolCall.function.arguments,
                      };
                      nextSubject.next(toolArgsEvent);

                      // ToolCallEnd event
                      const toolEndEvent: ToolCallEndEvent = {
                        type: "ToolCallEndEvent" as any,
                        toolCallId: toolCall.id,
                      };
                      nextSubject.next(toolEndEvent);
                    }
                  }

                  // Handle tool results
                  if (message.role === "tool" && message.toolCallId) {
                    const toolResultEvent: ToolCallResultEvent = {
                      type: "ToolCallResultEvent" as any,
                      messageId: message.id,
                      toolCallId: message.toolCallId,
                      content: message.content,
                      role: "tool",
                    };
                    nextSubject.next(toolResultEvent);
                  }
                }
              }
            }
          },
        });
        store.isRunning = false;
        runSubject.complete();
        nextSubject.complete();
      } catch {
        store.isRunning = false;
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

    if (!store || !store.subject) {
      return EMPTY;
    }

    return store.subject.asObservable();
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

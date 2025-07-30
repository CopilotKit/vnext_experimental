import {
  AgentRunner,
  AgentRunnerConnectRequest,
  AgentRunnerIsRunningRequest,
  AgentRunnerRunRequest,
  AgentRunnerStopRequest,
} from "./agent-runner";
import { EMPTY, Observable, ReplaySubject } from "rxjs";
import { BaseEvent } from "@ag-ui/client";

class InProcessEventStore {
  constructor(public threadId: string) {}

  /** The subject that current consumers subscribe to. */
  subject: ReplaySubject<BaseEvent> = new ReplaySubject<BaseEvent>(Infinity);

  /** True while a run is actively producing events. */
  isRunning = false;

  /** Lets stop() cancel the current producer. */
  abortController = new AbortController();
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

    const prevSubject = store.subject;
    const nextSubject = new ReplaySubject<BaseEvent>(Infinity);

    const bridge = prevSubject.subscribe({
      next: (e) => nextSubject.next(e),
      error: (err) => nextSubject.error(err),
      complete: () => {
        bridge.unsubscribe();
        request.agent
          .runAgent(request.input, {
            onEvent: ({ event }) => {
              nextSubject.next(event);
            },
          })
          .then(() => {
            store.isRunning = false;
            nextSubject.complete();
          });
      },
    });

    store.subject = nextSubject;
    store.abortController = new AbortController();

    return nextSubject.asObservable();
  }

  connect(request: AgentRunnerConnectRequest): Observable<BaseEvent> {
    const store = GLOBAL_STORE.get(request.threadId);

    if (!store) {
      return EMPTY;
    }

    return store.subject.asObservable();
  }

  isRunning(request: AgentRunnerIsRunningRequest): Promise<boolean> {
    const store = GLOBAL_STORE.get(request.threadId);
    return Promise.resolve(store?.isRunning ?? false);
  }

  stop(request: AgentRunnerStopRequest): Promise<boolean | undefined> {
    throw new Error("Method not implemented.");
  }
}
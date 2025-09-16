import {
  CopilotRuntime,
  createCopilotEndpoint,
  InMemoryAgentRunner,
} from "@copilotkitnext/runtime";
import { handle } from "hono/vercel";
import { OpenAIAgent } from "./openai";
import {
  AbstractAgent,
  BaseEvent,
  EventType,
  RunAgentInput,
} from "@ag-ui/client";
import { Observable } from "rxjs";

class MissingOpenAIKeyAgent extends AbstractAgent {
  clone(): MissingOpenAIKeyAgent {
    return new MissingOpenAIKeyAgent();
  }

  protected run(input: RunAgentInput): Observable<BaseEvent> {
    return new Observable<BaseEvent>((observer) => {
      const { runId, threadId } = input;
      const messageId = runId ?? `missing-key-${Date.now()}`;

      observer.next({
        type: EventType.RUN_STARTED,
        runId,
        threadId,
      } as BaseEvent);

      observer.next({
        type: EventType.TEXT_MESSAGE_START,
        messageId,
        role: "assistant",
      } as BaseEvent);

      observer.next({
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId,
        delta:
          "OPENAI_API_KEY is not set. Provide a key to enable the OpenAI demo agent.",
      } as BaseEvent);

      observer.next({
        type: EventType.TEXT_MESSAGE_END,
        messageId,
      } as BaseEvent);

      observer.next({
        type: EventType.RUN_FINISHED,
        runId,
        threadId,
      } as BaseEvent);

      observer.complete();

      return () => {};
    });
  }
}

const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY?.trim());

const selectedAgent = hasOpenAIKey
  ? new OpenAIAgent()
  : new MissingOpenAIKeyAgent();

const runtime = new CopilotRuntime({
  agents: {
    default: selectedAgent as unknown as AbstractAgent,
  },
  runner: new InMemoryAgentRunner(),
});

const app = createCopilotEndpoint({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);

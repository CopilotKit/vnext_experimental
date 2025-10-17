import { MaybePromise, NonEmptyRecord, logger } from "@copilotkitnext/shared";
import { AbstractAgent } from "@ag-ui/client";
import pkg from "../package.json";
import type { BeforeRequestMiddleware, AfterRequestMiddleware } from "./middleware";
import { TranscriptionService } from "./transcription-service/transcription-service";
import { AgentRunner, ResourceScope } from "./runner/agent-runner";
import { InMemoryAgentRunner } from "./runner/in-memory";

export const VERSION = pkg.version;
export type { ResourceScope } from "./runner/agent-runner";

/**
 * Options used to construct a `CopilotRuntime` instance.
 */
export interface CopilotRuntimeOptions {
  /** Map of available agents (loaded lazily is fine). */
  agents: MaybePromise<NonEmptyRecord<Record<string, AbstractAgent>>>;
  /** The runner to use for running agents. */
  runner?: AgentRunner;
  /** Optional transcription service for audio processing. */
  transcriptionService?: TranscriptionService;
  /** Optional *before* middleware – callback function or webhook URL. */
  beforeRequestMiddleware?: BeforeRequestMiddleware;
  /** Optional *after* middleware – callback function or webhook URL. */
  afterRequestMiddleware?: AfterRequestMiddleware;
  /**
   * Resolve the resource scope for thread access control.
   * This is where you authenticate the request and determine which resource(s)
   * the user has access to.
   *
   * If not provided, defaults to GLOBAL_SCOPE (all threads globally accessible).
   *
   * Return `null` for admin bypass (no filtering).
   *
   * @param context.request - The incoming HTTP request
   * @param context.clientDeclared - Resource ID(s) the client declares it wants to access (must be validated)
   *
   * @example
   * ```typescript
   * // Basic usage (determine access from authentication)
   * resolveThreadsScope: async ({ request }) => {
   *   const user = await authenticate(request);
   *   return { resourceId: user.id };
   * }
   *
   * // Validate client-declared resourceId
   * resolveThreadsScope: async ({ request, clientDeclared }) => {
   *   const user = await authenticate(request);
   *   if (clientDeclared && clientDeclared !== user.id) {
   *     throw new Error('Unauthorized');
   *   }
   *   return { resourceId: user.id };
   * }
   *
   * // Multi-resource: Filter client-declared IDs to only those user has access to
   * resolveThreadsScope: async ({ request, clientDeclared }) => {
   *   const user = await authenticate(request);
   *   const userResourceIds = await getUserResourceIds(user);
   *   const requestedIds = Array.isArray(clientDeclared) ? clientDeclared : [clientDeclared];
   *   const allowedIds = requestedIds.filter(id => userResourceIds.includes(id));
   *   return { resourceId: allowedIds };
   * }
   * ```
   */
  resolveThreadsScope?: (context: {
    request: Request;
    clientDeclared?: string | string[];
  }) => Promise<ResourceScope | null>;
  /**
   * Suppress warning when using GLOBAL_SCOPE.
   *
   * Set to `true` if you intentionally want all threads to be globally accessible
   * (e.g., single-user apps, demos, prototypes).
   */
  suppressResourceIdWarning?: boolean;
}

/**
 * Central runtime object passed to all request handlers.
 */
export class CopilotRuntime {
  /**
   * Built-in global scope for single-user apps or demos.
   *
   * All threads are globally accessible when using this scope.
   *
   * @example
   * ```typescript
   * new CopilotRuntime({
   *   agents: { myAgent },
   *   resolveThreadsScope: CopilotRuntime.GLOBAL_SCOPE,
   *   suppressResourceIdWarning: true
   * });
   * ```
   */
  static readonly GLOBAL_SCOPE = async (context: {
    request: Request;
    clientDeclared?: string | string[];
  }): Promise<ResourceScope> => ({
    resourceId: "global",
  });

  /**
   * Parses the client-declared resource ID(s) from the request header.
   *
   * This is a utility method used internally by handlers to extract the
   * `X-CopilotKit-Resource-ID` header sent by the client via `CopilotKitProvider`.
   *
   * **You typically don't need to call this directly** - it's automatically called
   * by the runtime handlers and passed to your `resolveThreadsScope` function as
   * the `clientDeclared` parameter.
   *
   * @param request - The incoming HTTP request
   * @returns The parsed resource ID(s), or undefined if header is missing
   *          - Returns a string if single ID
   *          - Returns an array if multiple comma-separated IDs
   *          - Returns undefined if header not present
   *
   * @example
   * ```typescript
   * // Automatically used internally:
   * const clientDeclared = CopilotRuntime.parseClientDeclaredResourceId(request);
   * const scope = await runtime.resolveThreadsScope({ request, clientDeclared });
   * ```
   */
  public static parseClientDeclaredResourceId(request: Request): string | string[] | undefined {
    const header = request.headers.get("X-CopilotKit-Resource-ID");
    if (!header) {
      return undefined;
    }

    // Parse comma-separated, URI-encoded values
    const values = header.split(",").map((v) => decodeURIComponent(v.trim()));
    return values.length === 1 ? values[0] : values;
  }

  public agents: CopilotRuntimeOptions["agents"];
  public transcriptionService: CopilotRuntimeOptions["transcriptionService"];
  public beforeRequestMiddleware: CopilotRuntimeOptions["beforeRequestMiddleware"];
  public afterRequestMiddleware: CopilotRuntimeOptions["afterRequestMiddleware"];
  public runner: AgentRunner;
  public resolveThreadsScope: (context: {
    request: Request;
    clientDeclared?: string | string[];
  }) => Promise<ResourceScope | null>;
  private suppressResourceIdWarning: boolean;

  constructor({
    agents,
    transcriptionService,
    beforeRequestMiddleware,
    afterRequestMiddleware,
    runner,
    resolveThreadsScope,
    suppressResourceIdWarning = false,
  }: CopilotRuntimeOptions) {
    this.agents = agents;
    this.transcriptionService = transcriptionService;
    this.beforeRequestMiddleware = beforeRequestMiddleware;
    this.afterRequestMiddleware = afterRequestMiddleware;
    this.runner = runner ?? new InMemoryAgentRunner();
    this.resolveThreadsScope = resolveThreadsScope ?? CopilotRuntime.GLOBAL_SCOPE;
    this.suppressResourceIdWarning = suppressResourceIdWarning;

    // Warn if using GLOBAL_SCOPE without explicit configuration
    if (!resolveThreadsScope && !suppressResourceIdWarning) {
      this.logGlobalScopeWarning();
    }
  }

  private logGlobalScopeWarning(): void {
    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      logger.error({
        msg: "CopilotKit Security Warning: GLOBAL_SCOPE in production",
        details:
          "No resolveThreadsScope configured. All threads are globally accessible to all users. " +
          "Configure authentication for production: https://docs.copilotkit.ai/security/thread-scoping " +
          "To suppress this warning (if intentional), set suppressResourceIdWarning: true",
      });
    } else {
      logger.warn({
        msg: "CopilotKit: Using GLOBAL_SCOPE",
        details:
          "No resolveThreadsScope configured. All threads are globally accessible. " +
          "This is fine for development, but add authentication for production: " +
          "https://docs.copilotkit.ai/security/thread-scoping",
      });
    }
  }
}

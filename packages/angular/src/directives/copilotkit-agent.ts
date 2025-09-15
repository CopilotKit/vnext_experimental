import {
  Directive,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  signal,
  Inject,
  output,
  Input,
} from "@angular/core";
import { toObservable } from "@angular/core/rxjs-interop";
import { Observable } from "rxjs";
import { CopilotKit } from "../core/copilotkit";
import { AbstractAgent } from "@ag-ui/client";
import { DEFAULT_AGENT_ID } from "@copilotkitnext/shared";

/**
 * Directive to watch and interact with CopilotKit agents.
 * Provides reactive outputs for agent state changes.
 *
 * @example
 * ```html
 * <!-- Basic usage with default agent -->
 * <div copilotkitAgent
 *      (agentChange)="onAgentChange($event)"
 *      (runningChange)="isProcessing = $event">
 *   Content here
 * </div>
 *
 * <!-- With specific agent ID -->
 * <div copilotkitAgent
 *      [agentId]="'my-agent-id'"
 *      (agentChange)="currentAgent = $event"
 *      (runningChange)="onRunningStateChange($event)"
 *      (messagesChange)="onMessagesUpdate($event)"
 *      (stateChange)="onStateUpdate($event)">
 *   Content here
 * </div>
 *
 * <!-- Two-way binding for running state -->
 * <div copilotkitAgent
 *      [(running)]="isAgentRunning">
 *   <span *ngIf="isAgentRunning">Processing...</span>
 * </div>
 * ```
 */
@Directive({
  selector: "[copilotkitAgent]",
  standalone: true,
})
export class CopilotKitAgent implements OnInit, OnChanges, OnDestroy {
  private agent?: AbstractAgent;
  private agentSubscription?: { unsubscribe: () => void };
  private coreUnsubscribe?: () => void; // subscribe returns function directly
  private _isRunning = false;
  private runningSignal = signal<boolean>(false);
  private agentSignal = signal<AbstractAgent | undefined>(undefined);

  constructor(@Inject(CopilotKit) private readonly copilotkit: CopilotKit) {}

  /**
   * The ID of the agent to watch.
   * If not provided, uses the default agent ID.
   */
  agentId?: string;

  /**
   * Alternative input using the directive selector.
   * Allows: [copilotkitAgent]="'agent-id'"
   */
  // Maintain alias via classic @Input for now
  @Input("copilotkitAgent")
  set directiveAgentId(value: string | undefined) {
    this.agentId = value ?? undefined;
  }

  /**
   * Emits when the agent instance changes.
   */
  agentChange = output<AbstractAgent | undefined>();

  /**
   * Emits when the running state changes.
   */
  runningChange = output<boolean>();

  /**
   * Observable of the running state.
   */
  get running$(): Observable<boolean> {
    return toObservable(this.runningSignal);
  }

  /**
   * Observable of the agent instance.
   */
  get agent$(): Observable<AbstractAgent | undefined> {
    return toObservable(this.agentSignal);
  }

  /**
   * Two-way binding for running state.
   */
  // running two-way binding exposed via runningChange events only

  /**
   * Emits when agent messages change.
   */
  messagesChange = output<any>();

  /**
   * Emits when agent state changes.
   */
  stateChange = output<any>();

  /**
   * Emits when a run is initialized.
   */
  runInitialized = output<any>();

  /**
   * Emits when a run is finalized.
   */
  runFinalized = output<any>();

  /**
   * Emits when a run fails.
   */
  runFailed = output<any>();

  ngOnInit(): void {
    this.setupAgent();
    this.subscribeToCore();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["agentId"] && !changes["agentId"].firstChange) {
      // Agent ID changed, re-setup
      this.cleanupAgentSubscription();
      this.setupAgent();
    }
  }

  ngOnDestroy(): void {
    this.cleanupAgentSubscription();
    this.cleanupCoreSubscription();
  }

  private setupAgent(): void {
    const effectiveAgentId = this.agentId ?? DEFAULT_AGENT_ID;
    this.agent = this.copilotkit.getAgent(effectiveAgentId);

    // Update signals
    this.agentSignal.set(this.agent);

    // Emit initial agent
    this.agentChange.emit(this.agent);

    // Subscribe to agent events
    this.subscribeToAgent();
  }

  private subscribeToAgent(): void {
    this.cleanupAgentSubscription();

    if (this.agent) {
      this.agentSubscription = this.agent.subscribe({
        onMessagesChanged: (params) => {
          this.messagesChange.emit(params);
        },
        onStateChanged: (params) => {
          this.stateChange.emit(params);
        },
        onRunInitialized: (params) => {
          this._isRunning = true;
          this.runningSignal.set(true);
          this.runningChange.emit(true);
          this.runInitialized.emit(params);
        },
        onRunFinalized: (params) => {
          this._isRunning = false;
          this.runningSignal.set(false);
          this.runningChange.emit(false);
          this.runFinalized.emit(params);
        },
        onRunFailed: (params) => {
          this._isRunning = false;
          this.runningSignal.set(false);
          this.runningChange.emit(false);
          this.runFailed.emit(params);
        },
      });
    }
  }

  private subscribeToCore(): void {
    // Subscribe to CopilotKit changes to detect agent updates
    this.coreUnsubscribe = this.copilotkit.copilotkit.subscribe({
      onRuntimeLoaded: () => {
        // Re-check agent when runtime loads
        this.setupAgent();
      },
    });
  }

  private cleanupAgentSubscription(): void {
    this.agentSubscription?.unsubscribe();
    this.agentSubscription = undefined;
  }

  private cleanupCoreSubscription(): void {
    this.coreUnsubscribe?.();
    this.coreUnsubscribe = undefined;
  }
}

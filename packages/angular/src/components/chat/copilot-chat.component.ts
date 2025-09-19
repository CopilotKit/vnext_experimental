import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  signal,
  effect,
  ChangeDetectorRef,
  Signal,
  Injector,
  Optional,
  SkipSelf,
  Type,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { CopilotChatViewComponent } from "./copilot-chat-view.component";
import { CopilotChatConfigurationService } from "../../core/chat-configuration/chat-configuration.service";
import {
  COPILOT_CHAT_INITIAL_CONFIG,
  CopilotChatConfiguration,
} from "../../core/chat-configuration/chat-configuration.types";
import { watchAgent, watchAgentWith } from "../../utils/agent.utils";
import { DEFAULT_AGENT_ID, randomUUID } from "@copilotkitnext/shared";
import { Message, AbstractAgent } from "@ag-ui/client";
import { ProxiedCopilotRuntimeAgent } from "@copilotkitnext/core";

/**
 * CopilotChat component - Angular equivalent of React's <CopilotChat>
 * Provides a complete chat interface that wires an agent to the chat view
 *
 * @example
 * ```html
 * <copilot-chat [agentId]="'default'" [threadId]="'abc123'"></copilot-chat>
 * ```
 */
@Component({
  selector: "copilot-chat",
  standalone: true,
  imports: [CommonModule, CopilotChatViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: CopilotChatConfigurationService,
      deps: [
        [new Optional(), new SkipSelf(), CopilotChatConfigurationService],
        [new Optional(), COPILOT_CHAT_INITIAL_CONFIG],
      ],
      useFactory: (
        parent: CopilotChatConfigurationService | null,
        initial: CopilotChatConfiguration | null
      ) => parent ?? new CopilotChatConfigurationService(initial ?? null),
    },
  ],
  template: `
    <copilot-chat-view
      [messages]="messages()"
      [autoScroll]="true"
      [messageViewClass]="'w-full'"
      [showCursor]="showCursor()"
      [inputComponent]="inputComponent"
    >
    </copilot-chat-view>
  `,
})
export class CopilotChatComponent implements OnInit, OnChanges {
  @Input() agentId?: string;
  @Input() threadId?: string;
  @Input() inputComponent?: Type<any>;

  constructor(
    @Optional() private chatConfig: CopilotChatConfigurationService | null,
    private cdr: ChangeDetectorRef,
    private injector: Injector
  ) {
    // Create initial watcher once (constructor is a safe injection context)
    const initialId = this.agentId ?? DEFAULT_AGENT_ID;
    this.createWatcher(initialId);

    // Connect once when agent becomes available
    effect(
      () => {
        const a = this.agent();
        if (!a) return;
        // Apply thread id when agent is available
        a.threadId = this.threadId || this.generatedThreadId;
        if (!this.hasConnectedOnce) {
          this.hasConnectedOnce = true;
          if (a instanceof ProxiedCopilotRuntimeAgent) {
            this.connectToAgent(a);
          } else {
            // Not a CopilotKit agent: ensure UI not showing loading cursor
            this.showCursor.set(false);
            this.cdr.markForCheck();
          }
        }
      },
      { allowSignalWrites: true }
    );
  }

  // Signals from watchAgent - destructured from watcher
  protected agent!: Signal<AbstractAgent | undefined>;
  protected messages!: Signal<Message[]>;
  protected isRunning!: Signal<boolean>;
  protected showCursor = signal<boolean>(false);

  private generatedThreadId: string = randomUUID();
  private watcher?: ReturnType<typeof watchAgent>;
  private hasConnectedOnce = false;

  ngOnInit(): void {
    this.setupChatHandlers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["agentId"] && !changes["agentId"].firstChange) {
      const newId = this.agentId ?? DEFAULT_AGENT_ID;
      this.createWatcher(newId);
    }
    if (changes["threadId"] && !changes["threadId"].firstChange) {
      const a = this.agent();
      if (a) {
        a.threadId = this.threadId || this.generatedThreadId;
      }
    }
  }

  private async connectToAgent(agent: AbstractAgent): Promise<void> {
    if (!agent) return;

    this.showCursor.set(true);
    this.cdr.markForCheck();

    try {
      await agent.runAgent(
        { forwardedProps: { __copilotkitConnect: true } },
        {
          onTextMessageStartEvent: () => {
            this.showCursor.set(false);
            this.cdr.detectChanges();
          },
          onToolCallStartEvent: () => {
            this.showCursor.set(false);
            this.cdr.detectChanges();
          },
        }
      );
      this.showCursor.set(false);
      this.cdr.markForCheck();
    } catch (error) {
      console.error("Failed to connect to agent:", error);
      this.showCursor.set(false);
      this.cdr.markForCheck();
    }
  }

  private setupChatHandlers(): void {
    if (!this.chatConfig) return;

    // Handle input submission
    this.chatConfig.setSubmitHandler(async (value: string) => {
      const agent = this.agent();
      if (!agent || !value.trim()) return;

      // Add user message
      const userMessage: Message = {
        id: randomUUID(),
        role: "user",
        content: value,
      };
      agent.addMessage(userMessage);

      // Clear the input
      this.chatConfig!.setInputValue("");

      // Show cursor while processing
      this.showCursor.set(true);
      this.cdr.markForCheck();

      // Run the agent with named subscriber callbacks
      try {
        await agent.runAgent(
          {},
          {
            onTextMessageStartEvent: () => {
              this.showCursor.set(false);
              this.cdr.detectChanges();
            },
            onToolCallStartEvent: () => {
              this.showCursor.set(false);
              this.cdr.detectChanges();
            },
          }
        );
      } catch (error) {
        console.error("Agent run error:", error);
      } finally {
        this.showCursor.set(false);
        this.cdr.markForCheck();
      }
    });

    // Handle input value changes (optional)
    this.chatConfig.setChangeHandler(() => {
      // Keep input state if needed
    });
  }

  private createWatcher(desiredAgentId: string) {
    // Tear down previous watcher if it exists to prevent parallel subscriptions
    this.watcher?.unsubscribe();

    // Create new watcher using the ergonomic helper
    const w = watchAgentWith(this.injector, { agentId: desiredAgentId });

    // Destructure signals directly to class fields
    this.agent = w.agent;
    this.messages = w.messages;
    this.isRunning = w.isRunning;
    this.watcher = w;

    // Reset connection state for new agent
    this.hasConnectedOnce = false;
  }
}

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
  inject,
  EnvironmentInjector,
  runInInjectionContext,
  Optional,
  DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotChatViewComponent } from './copilot-chat-view.component';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import { CopilotKitService } from '../../core/copilotkit.service';
import { watchAgent, type AgentWatchResult } from '../../utils/agent.utils';
import { DEFAULT_AGENT_ID, randomUUID } from '@copilotkit/shared';
import { Message } from '@ag-ui/client';

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
  selector: 'copilot-chat',
  standalone: true,
  imports: [CommonModule, CopilotChatViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  template: `
    <copilot-chat-view 
      [messages]="agent()?.messages ?? []" 
      [autoScroll]="true" 
      [messageViewClass]="'w-full'"
      [showCursor]="showCursor()">
    </copilot-chat-view>
  `
})
export class CopilotChatComponent implements OnInit, OnChanges {
  @Input() agentId?: string;
  @Input() threadId?: string;
  
  private destroyRef = inject(DestroyRef);
  
  constructor(
    @Optional() private chatConfig: CopilotChatConfigurationService | null,
    private copilotKitService: CopilotKitService,
    private cdr: ChangeDetectorRef,
    private injector: Injector,
    private envInjector: EnvironmentInjector,
  ) {
    // Store the services for use in the effect
    const service = this.copilotKitService;
    const destroyRef = this.destroyRef;
    
    // Create the agent watcher effect
    effect(() => {
      const desiredAgentId = this.inputAgentId() || DEFAULT_AGENT_ID;

      // Tear down previous watcher if agent id changes
      if (this.agentWatcher?.unsubscribe) {
        this.agentWatcher.unsubscribe();
        this.agentWatcher = undefined;
        this.hasConnectedOnce = false;
      }

      // Setup watcher for desired agent - pass services explicitly
      this.agentWatcher = watchAgent(desiredAgentId, service, destroyRef);
      this.agent = this.agentWatcher.agent;
      this.isRunning = this.agentWatcher.isRunning;

      const a = this.agent();
      if (!a) return;

      // Apply thread id
      a.threadId = this.inputThreadId() || this.generatedThreadId;

      // Connect once when agent appears
      if (!this.hasConnectedOnce) {
        this.hasConnectedOnce = true;
        this.connectToAgent(a);
      }
    });
  }
  
  // Input mirrors as signals (so effects in constructor can react to changes)
  private inputAgentId = signal<string | undefined>(undefined);
  private inputThreadId = signal<string | undefined>(undefined);

  // Signals from watchAgent - using direct references instead of assignment
  protected agent: Signal<any> = signal<any>(null);
  protected isRunning: Signal<boolean> = signal<boolean>(false);
  protected showCursor = signal<boolean>(false);
  
  private generatedThreadId: string = randomUUID();
  private agentWatcher?: AgentWatchResult;
  private hasConnectedOnce = false;
  
  ngOnInit(): void {
    // Initialize input signals
    this.inputAgentId.set(this.agentId);
    this.inputThreadId.set(this.threadId);
    this.setupChatHandlers();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['agentId']) this.inputAgentId.set(this.agentId);
    if (changes['threadId']) this.inputThreadId.set(this.threadId);
  }
  
  private setupAgent(): void {}

  // Create effects in constructor injection context
  // - Watches agentId/threadId signals
  // - Manages watcher lifecycle and initial connection
  // Effect created in constructor

  
  private async connectToAgent(agent: any): Promise<void> {
    if (!agent) return;
    
    this.showCursor.set(true);
    this.cdr.markForCheck();

    try {
      await agent.runAgent(
        { forwardedProps: { __copilotkitConnect: true } },
        {
          onTextMessageStartEvent: () => {
            this.showCursor.set(false);
            this.cdr.markForCheck();
          },
          onToolCallStartEvent: () => {
            this.showCursor.set(false);
            this.cdr.markForCheck();
          },
        }
      );
      this.showCursor.set(false);
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Failed to connect to agent:', error);
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
        role: 'user',
        content: value,
      };
      agent.addMessage(userMessage);
      
      // Clear the input
      this.chatConfig!.setInputValue('');
      
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
              this.cdr.markForCheck();
            },
            onToolCallStartEvent: () => {
              this.showCursor.set(false);
              this.cdr.markForCheck();
            },
          }
        );
      } catch (error) {
        console.error('Agent run error:', error);
      } finally {
        this.showCursor.set(false);
        this.cdr.markForCheck();
      }
    });
    
    // Handle input value changes (optional)
    this.chatConfig.setChangeHandler((value: string) => {
      // Keep input state if needed
    });
  }
  
  ngOnDestroy(): void {
    if (this.agentWatcher?.unsubscribe) {
      this.agentWatcher.unsubscribe();
    }
  }
}

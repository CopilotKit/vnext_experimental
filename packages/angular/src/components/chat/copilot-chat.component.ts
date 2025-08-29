import {
  Component,
  Input,
  OnInit,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  signal,
  effect,
  ChangeDetectorRef,
  Signal,
  Injector,
  runInInjectionContext,
  Optional,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotChatViewComponent } from './copilot-chat-view.component';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import { watchAgent } from '../../utils/agent.utils';
import { AgentWatchResult } from '../../core/copilotkit.types';
import { DEFAULT_AGENT_ID, randomUUID } from '@copilotkit/shared';
import { Message, AbstractAgent } from '@ag-ui/client';

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
      [messages]="messages()" 
      [autoScroll]="true" 
      [messageViewClass]="'w-full'"
      [showCursor]="showCursor()">
    </copilot-chat-view>
  `
})
export class CopilotChatComponent implements OnInit, OnChanges, OnDestroy {
  @Input() agentId?: string;
  @Input() threadId?: string;
  
  constructor(
    @Optional() private chatConfig: CopilotChatConfigurationService | null,
    private cdr: ChangeDetectorRef,
    private injector: Injector,
  ) {
    // Create initial watcher once (constructor is a safe injection context)
    const initialId = this.agentId ?? DEFAULT_AGENT_ID;
    this.createWatcher(initialId);

    // Connect once when agent becomes available
    effect(() => {
      const a = this.agent();
      if (!a) return;
      // Apply thread id when agent is available
      a.threadId = this.threadId || this.generatedThreadId;
      if (!this.hasConnectedOnce) {
        this.hasConnectedOnce = true;
        this.connectToAgent(a);
      }
    });
  }
  
  // Signals from watchAgent - using direct references instead of assignment
  protected agent: Signal<AbstractAgent | undefined> = signal<AbstractAgent | undefined>(undefined).asReadonly() as unknown as Signal<AbstractAgent | undefined>;
  protected messages: Signal<Message[]> = signal<Message[]>([]).asReadonly() as unknown as Signal<Message[]>;
  protected isRunning: Signal<boolean> = signal<boolean>(false).asReadonly() as unknown as Signal<boolean>;
  protected showCursor = signal<boolean>(false);
  
  private generatedThreadId: string = randomUUID();
  private agentWatcher?: AgentWatchResult;
  private hasConnectedOnce = false;
  private lastAgentId?: string;
  
  ngOnInit(): void {
    this.setupChatHandlers();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['agentId'] && !changes['agentId'].firstChange) {
      const newId = this.agentId ?? DEFAULT_AGENT_ID;
      this.createWatcher(newId);
    }
    if (changes['threadId'] && !changes['threadId'].firstChange) {
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
          }
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
              this.cdr.detectChanges();
            },
            onToolCallStartEvent: () => {
              this.showCursor.set(false);
              this.cdr.detectChanges();
            }
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
    this.chatConfig.setChangeHandler(() => {
      // Keep input state if needed
    });
  }
  
  ngOnDestroy(): void {
    if (this.agentWatcher?.unsubscribe) {
      this.agentWatcher.unsubscribe();
    }
  }

  private createWatcher(desiredAgentId: string) {
    // Tear down previous watcher if it exists
    if (this.agentWatcher?.unsubscribe) {
      this.agentWatcher.unsubscribe();
      this.agentWatcher = undefined;
    }
    // Setup watcher for desired agent - ensure injection context
    this.agentWatcher = runInInjectionContext(this.injector, () =>
      watchAgent({ agentId: desiredAgentId })
    );
    this.agent = this.agentWatcher.agent;
    this.messages = this.agentWatcher.messages;
    this.isRunning = this.agentWatcher.isRunning;
    this.hasConnectedOnce = false;
    this.lastAgentId = desiredAgentId;
  }
}

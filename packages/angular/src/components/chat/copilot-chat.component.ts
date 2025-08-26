import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  inject,
  signal,
  effect,
  ChangeDetectorRef,
  Signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotChatViewComponent } from './copilot-chat-view.component';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import { CopilotKitService } from '../../core/copilotkit.service';
import { watchAgent, type AgentWatchResult } from '../../utils/agent.utils';
import { randomUUID } from '@copilotkit/shared';
import { Message } from '@ag-ui/client';
import { DEFAULT_AGENT_ID, randomUUID } from '@copilotkit/shared';

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
  
  private chatConfig = inject(CopilotChatConfigurationService, { optional: true });
  private copilotKitService = inject(CopilotKitService);
  private cdr = inject(ChangeDetectorRef);
  
  // Signals from watchAgent - using direct references instead of assignment
  protected agent: Signal<any> = signal<any>(null);
  protected isRunning: Signal<boolean> = signal<boolean>(false);
  protected showCursor = signal<boolean>(false);
  
  private generatedThreadId: string = randomUUID();
  private agentWatcher?: AgentWatchResult;
  private hasConnectedOnce = false;
  
  ngOnInit(): void {
    this.setupAgent();
    this.setupChatHandlers();
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['agentId'] || changes['threadId']) {
      this.setupAgent();
    }
  }
  
  private setupAgent(): void {
    // Clean up previous watcher
    if (this.agentWatcher?.unsubscribe) {
      this.agentWatcher.unsubscribe();
    }
    // Allow a fresh connect on new agent/thread
    this.hasConnectedOnce = false;
    
    const agentId = this.agentId || DEFAULT_AGENT_ID;
    
    // Use watchAgent utility to get reactive agent and isRunning signals
    this.agentWatcher = watchAgent(agentId);
    // Store references to the signals directly
    this.agent = this.agentWatcher.agent;
    this.isRunning = this.agentWatcher.isRunning;
    
    // Set thread ID on the agent
    // React to agent availability like React's useEffect([threadId, agent])
    effect(() => {
      const a = this.agent();
      if (!a) return;
      // Set threadId whenever agent becomes available
      a.threadId = this.threadId || this.generatedThreadId;
      // Connect once when agent appears
      if (!this.hasConnectedOnce) {
        this.hasConnectedOnce = true;
        this.connectToAgent(a);
      }
    });
  }
  
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

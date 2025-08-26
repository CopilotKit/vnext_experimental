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
  ChangeDetectorRef,
  Signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotChatViewComponent } from './copilot-chat-view.component';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import { CopilotKitService } from '../../core/copilotkit.service';
import { watchAgent, type AgentWatchResult } from '../../utils/agent.utils';
import { randomUUID } from '@copilotkit/shared';
import { Message, EventType } from '@ag-ui/client';
import { Subscription } from 'rxjs';

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
  private currentSubscription?: Subscription;
  private agentWatcher?: AgentWatchResult;
  
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
    
    const agentId = this.agentId || 'default';
    
    // Use watchAgent utility to get reactive agent and isRunning signals
    this.agentWatcher = watchAgent(agentId);
    // Store references to the signals directly
    this.agent = this.agentWatcher.agent;
    this.isRunning = this.agentWatcher.isRunning;
    
    // Set thread ID on the agent
    const agent = this.agent();
    if (agent) {
      agent.threadId = this.threadId || this.generatedThreadId;
      
      // Perform initial connection
      this.connectToAgent(agent);
    }
  }
  
  private async connectToAgent(agent: any): Promise<void> {
    if (!agent) return;
    
    this.showCursor.set(true);
    this.cdr.markForCheck();
    
    try {
      await agent.runAgent(
        { forwardedProps: { __copilotkitConnect: true } },
        {
          next: (event: any) => {
            if (event.type === EventType.TEXT_MESSAGE_CHUNK || 
                event.type === EventType.TOOL_CALL_CHUNK) {
              this.showCursor.set(true);
            }
            this.cdr.markForCheck();
          },
          complete: () => {
            this.showCursor.set(false);
            this.cdr.markForCheck();
          },
          error: () => {
            this.showCursor.set(false);
            this.cdr.markForCheck();
          }
        }
      );
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
        content: value
      };
      agent.messages.push(userMessage);
      
      // Clear the input
      this.chatConfig!.setInputValue('');
      
      // Show cursor while processing
      this.showCursor.set(true);
      this.cdr.markForCheck();
      
      // Run the agent
      if (this.currentSubscription) {
        this.currentSubscription.unsubscribe();
      }
      
      this.currentSubscription = agent.runAgent({}).subscribe({
        next: (event: any) => {
          if (event.type === EventType.TEXT_MESSAGE_CHUNK || 
              event.type === EventType.TOOL_CALL_CHUNK) {
            this.showCursor.set(true);
          }
          this.cdr.markForCheck();
        },
        complete: () => {
          this.showCursor.set(false);
          this.currentSubscription = undefined;
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          console.error('Agent run error:', error);
          this.showCursor.set(false);
          this.currentSubscription = undefined;
          this.cdr.markForCheck();
        }
      });
    });
    
    // Handle input value changes (optional)
    this.chatConfig.setChangeHandler((value: string) => {
      // Keep input state if needed
    });
  }
  
  ngOnDestroy(): void {
    if (this.currentSubscription) {
      this.currentSubscription.unsubscribe();
    }
    if (this.agentWatcher?.unsubscribe) {
      this.agentWatcher.unsubscribe();
    }
  }
}
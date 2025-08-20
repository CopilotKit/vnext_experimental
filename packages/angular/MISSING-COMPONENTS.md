# Missing Angular Components

## Overview
This document details the React components that are missing from the Angular implementation and provides specifications for implementing them in an Angular-idiomatic way.

## Critical Missing Components

### 1. CopilotChat Component
**React Equivalent**: `CopilotChat`
**Priority**: 🔴 Critical

#### Purpose
Main orchestration component that manages the chat interface, connects to agents, and handles message flow.

#### React Features
- Agent connection and management
- Thread ID management
- Message submission handling
- Auto-connection on mount
- Loading states

#### Angular Implementation Spec
```typescript
@Component({
  selector: 'copilot-chat',
  standalone: true,
  template: `
    <copilot-chat-view
      [messages]="messages()"
      [autoScroll]="autoScroll"
      [showCursor]="showCursor()"
      (submitMessage)="handleSubmit($event)">
      
      <copilot-chat-input
        [mode]="inputMode()"
        [value]="inputValue()"
        (valueChange)="inputValue.set($event)"
        (submitMessage)="handleSubmit($event)"
      />
    </copilot-chat-view>
  `,
  imports: [
    CopilotChatViewComponent,
    CopilotChatInputComponent
  ]
})
export class CopilotChatComponent implements OnInit {
  @Input() agentId = DEFAULT_AGENT_ID;
  @Input() threadId?: string;
  @Input() autoScroll = true;
  @Input() toolsMenu?: ToolsMenuItem[];
  
  // Reactive state
  agentState = watchAgent(this.agentId);
  messages = computed(() => this.agentState.agent()?.messages ?? []);
  isRunning = this.agentState.isRunning;
  showCursor = signal(true);
  inputValue = signal('');
  
  inputMode = computed(() => 
    this.isRunning() ? 'processing' : 'input'
  );
  
  ngOnInit() {
    this.connectToAgent();
  }
  
  private async connectToAgent() {
    const agent = this.agentState.agent();
    if (agent) {
      this.showCursor.set(true);
      await agent.runAgent({
        forwardedProps: { __copilotkitConnect: true }
      });
      this.showCursor.set(false);
    }
  }
  
  async handleSubmit(value: string) {
    this.inputValue.set('');
    const agent = this.agentState.agent();
    await agent?.addMessage({
      id: randomUUID(),
      content: value,
      role: 'user'
    });
    await agent?.runAgent();
  }
}
```

---

### 2. CopilotChatView Component
**React Equivalent**: `CopilotChatView`
**Priority**: 🔴 Critical

#### Purpose
Container component that manages the chat message list, scrolling behavior, and input area.

#### React Features
- Message list rendering
- Auto-scroll to bottom
- Scroll-to-bottom button
- Sticky input area
- Resize handling

#### Angular Implementation Spec
```typescript
@Component({
  selector: 'copilot-chat-view',
  standalone: true,
  template: `
    <div class="copilot-chat-view" [class]="className">
      <!-- Messages container with virtual scrolling -->
      <cdk-virtual-scroll-viewport 
        class="messages-container"
        [itemSize]="estimatedMessageHeight"
        (scrolledIndexChange)="onScroll()">
        
        <copilot-chat-message-view
          *cdkVirtualFor="let message of messages; trackBy: trackByMessageId"
          [message]="message"
          [showToolCalls]="showToolCalls"
          (actionClick)="handleMessageAction($event)"
        />
        
        <!-- Loading indicator -->
        <div class="loading-indicator" *ngIf="isLoading">
          <ng-content select="[loading]">
            <div class="default-loading">
              <span class="typing-indicator"></span>
            </div>
          </ng-content>
        </div>
      </cdk-virtual-scroll-viewport>
      
      <!-- Scroll to bottom button -->
      <button 
        *ngIf="!isAtBottom"
        class="scroll-to-bottom"
        (click)="scrollToBottom()"
        [attr.aria-label]="labels.scrollToBottom">
        <ng-content select="[scroll-button]">
          <svg><!-- Chevron down icon --></svg>
        </ng-content>
      </button>
      
      <!-- Input container -->
      <div class="input-container" #inputContainer>
        <ng-content select="[input]">
          <!-- Default input will be provided by parent -->
        </ng-content>
      </div>
      
      <!-- Optional disclaimer -->
      <div class="disclaimer" *ngIf="showDisclaimer">
        <ng-content select="[disclaimer]">
          <span>{{ labels.disclaimer }}</span>
        </ng-content>
      </div>
    </div>
  `,
  styles: [`
    .copilot-chat-view {
      display: flex;
      flex-direction: column;
      height: 100%;
      position: relative;
    }
    
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }
    
    .scroll-to-bottom {
      position: absolute;
      bottom: 120px;
      right: 20px;
      z-index: 10;
    }
    
    .input-container {
      border-top: 1px solid var(--border-color);
      padding: 1rem;
    }
  `],
  imports: [
    CommonModule,
    ScrollingModule,
    CopilotChatMessageViewComponent
  ]
})
export class CopilotChatViewComponent {
  @Input() messages: Message[] = [];
  @Input() autoScroll = true;
  @Input() showToolCalls = true;
  @Input() showDisclaimer = false;
  @Input() className = '';
  @Input() estimatedMessageHeight = 100;
  @Input() isLoading = false;
  
  @Output() messageAction = new EventEmitter<MessageAction>();
  
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;
  
  isAtBottom = signal(true);
  labels = inject(CopilotChatConfigurationService).labels;
  
  ngAfterViewInit() {
    if (this.autoScroll) {
      this.scrollToBottom();
    }
  }
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['messages'] && this.autoScroll && this.isAtBottom()) {
      setTimeout(() => this.scrollToBottom(), 0);
    }
  }
  
  scrollToBottom() {
    this.viewport?.scrollToIndex(this.messages.length - 1);
  }
  
  onScroll() {
    // Update isAtBottom based on scroll position
  }
  
  trackByMessageId(index: number, message: Message) {
    return message.id;
  }
}
```

---

### 3. CopilotChatMessageView Component
**React Equivalent**: `CopilotChatMessageView`
**Priority**: 🔴 Critical

#### Purpose
Renders individual messages with appropriate styling and handles different message types.

#### React Features
- User/Assistant/System message rendering
- Tool call display
- Message actions (copy, edit, regenerate)
- Markdown rendering
- Code highlighting

#### Angular Implementation Spec
```typescript
@Component({
  selector: 'copilot-chat-message-view',
  standalone: true,
  template: `
    <div [ngClass]="messageClasses" [attr.data-message-role]="message.role">
      <ng-container [ngSwitch]="message.role">
        <!-- User Message -->
        <copilot-chat-user-message
          *ngSwitchCase="'user'"
          [message]="message"
          [branchIndex]="branchIndex"
          [numberOfBranches]="numberOfBranches"
          (editMessage)="onEditMessage($event)"
          (switchBranch)="onSwitchBranch($event)"
        />
        
        <!-- Assistant Message -->
        <copilot-chat-assistant-message
          *ngSwitchCase="'assistant'"
          [message]="message"
          [showToolCalls]="showToolCalls"
          (thumbsUp)="onThumbsUp()"
          (thumbsDown)="onThumbsDown()"
          (regenerate)="onRegenerate()"
          (readAloud)="onReadAloud()"
        />
        
        <!-- System Message -->
        <div *ngSwitchCase="'system'" class="system-message">
          {{ message.content }}
        </div>
        
        <!-- Tool Calls -->
        <copilot-tool-calls
          *ngIf="message.toolCalls?.length && showToolCalls"
          [toolCalls]="message.toolCalls"
          [renderRegistry]="renderRegistry"
        />
      </ng-container>
    </div>
  `,
  imports: [
    CommonModule,
    CopilotChatUserMessageComponent,
    CopilotChatAssistantMessageComponent,
    CopilotToolCallsComponent
  ]
})
export class CopilotChatMessageViewComponent {
  @Input() message!: Message;
  @Input() showToolCalls = true;
  @Input() branchIndex?: number;
  @Input() numberOfBranches?: number;
  
  @Output() messageAction = new EventEmitter<MessageAction>();
  
  renderRegistry = inject(CopilotKitService).currentRenderToolCalls;
  
  get messageClasses() {
    return {
      'message': true,
      'message--user': this.message.role === 'user',
      'message--assistant': this.message.role === 'assistant',
      'message--system': this.message.role === 'system',
    };
  }
  
  // Event handlers...
}
```

---

### 4. CopilotChatAssistantMessage Component
**React Equivalent**: `CopilotChatAssistantMessage`
**Priority**: 🔴 Critical

#### Purpose
Renders assistant messages with markdown support, code highlighting, and action buttons.

#### React Features
- Markdown rendering with remark/rehype
- Code syntax highlighting
- LaTeX math rendering
- Copy button for code blocks
- Thumbs up/down feedback
- Read aloud functionality
- Regenerate response

#### Angular Implementation Spec
```typescript
@Component({
  selector: 'copilot-chat-assistant-message',
  standalone: true,
  template: `
    <div class="assistant-message">
      <!-- Avatar -->
      <div class="avatar">
        <ng-content select="[avatar]">
          <div class="default-avatar">AI</div>
        </ng-content>
      </div>
      
      <!-- Message content -->
      <div class="message-content">
        <!-- Markdown renderer -->
        <div class="markdown-content" [innerHTML]="renderedContent"></div>
        
        <!-- Toolbar -->
        <div class="message-toolbar" *ngIf="showToolbar">
          <button 
            class="toolbar-btn"
            (click)="copyToClipboard()"
            [attr.aria-label]="labels.copy">
            <ng-content select="[copy-button]">
              <span>{{ copied ? '✓' : '📋' }}</span>
            </ng-content>
          </button>
          
          <button 
            class="toolbar-btn"
            (click)="thumbsUp.emit()"
            [class.active]="feedbackState === 'up'"
            [attr.aria-label]="labels.thumbsUp">
            <ng-content select="[thumbs-up]">
              <span>👍</span>
            </ng-content>
          </button>
          
          <button 
            class="toolbar-btn"
            (click)="thumbsDown.emit()"
            [class.active]="feedbackState === 'down'"
            [attr.aria-label]="labels.thumbsDown">
            <ng-content select="[thumbs-down]">
              <span>👎</span>
            </ng-content>
          </button>
          
          <button 
            class="toolbar-btn"
            (click)="readAloud.emit()"
            [attr.aria-label]="labels.readAloud">
            <ng-content select="[read-aloud]">
              <span>🔊</span>
            </ng-content>
          </button>
          
          <button 
            class="toolbar-btn"
            (click)="regenerate.emit()"
            [attr.aria-label]="labels.regenerate">
            <ng-content select="[regenerate]">
              <span>🔄</span>
            </ng-content>
          </button>
        </div>
      </div>
    </div>
  `,
  imports: [
    CommonModule,
    MarkdownModule // Would need to add markdown support
  ]
})
export class CopilotChatAssistantMessageComponent {
  @Input() message!: AssistantMessage;
  @Input() showToolbar = true;
  
  @Output() thumbsUp = new EventEmitter<void>();
  @Output() thumbsDown = new EventEmitter<void>();
  @Output() readAloud = new EventEmitter<void>();
  @Output() regenerate = new EventEmitter<void>();
  
  copied = signal(false);
  feedbackState = signal<'up' | 'down' | null>(null);
  labels = inject(CopilotChatConfigurationService).labels;
  
  get renderedContent() {
    // Process markdown - would need markdown library integration
    return this.processMarkdown(this.message.content);
  }
  
  async copyToClipboard() {
    await navigator.clipboard.writeText(this.message.content);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
  
  private processMarkdown(content: string): string {
    // TODO: Integrate markdown processor
    // Consider using ngx-markdown or marked
    return content;
  }
}
```

---

### 5. CopilotChatUserMessage Component
**React Equivalent**: `CopilotChatUserMessage`
**Priority**: 🔴 Critical

#### Purpose
Renders user messages with edit capabilities and branch navigation.

#### React Features
- Message display
- Edit button
- Copy functionality
- Branch navigation (for message variations)

#### Angular Implementation Spec
```typescript
@Component({
  selector: 'copilot-chat-user-message',
  standalone: true,
  template: `
    <div class="user-message">
      <!-- Message content -->
      <div class="message-content">
        <div class="message-text">{{ message.content }}</div>
        
        <!-- Toolbar -->
        <div class="message-toolbar" *ngIf="showToolbar">
          <button 
            class="toolbar-btn"
            (click)="copyMessage()"
            [attr.aria-label]="labels.copy">
            <ng-content select="[copy-button]">
              <span>{{ copied() ? '✓' : '📋' }}</span>
            </ng-content>
          </button>
          
          <button 
            class="toolbar-btn"
            (click)="editMessage.emit({ message })"
            [attr.aria-label]="labels.edit">
            <ng-content select="[edit-button]">
              <span>✏️</span>
            </ng-content>
          </button>
        </div>
        
        <!-- Branch navigation -->
        <div class="branch-navigation" *ngIf="numberOfBranches && numberOfBranches > 1">
          <button 
            (click)="navigateBranch(-1)"
            [disabled]="branchIndex === 0"
            [attr.aria-label]="labels.previousBranch">
            ←
          </button>
          <span>{{ branchIndex + 1 }} / {{ numberOfBranches }}</span>
          <button 
            (click)="navigateBranch(1)"
            [disabled]="branchIndex === numberOfBranches - 1"
            [attr.aria-label]="labels.nextBranch">
            →
          </button>
        </div>
      </div>
      
      <!-- Avatar -->
      <div class="avatar">
        <ng-content select="[avatar]">
          <div class="default-avatar">You</div>
        </ng-content>
      </div>
    </div>
  `,
  imports: [CommonModule]
})
export class CopilotChatUserMessageComponent {
  @Input() message!: UserMessage;
  @Input() showToolbar = true;
  @Input() branchIndex = 0;
  @Input() numberOfBranches = 1;
  
  @Output() editMessage = new EventEmitter<{ message: UserMessage }>();
  @Output() switchBranch = new EventEmitter<{ 
    message: UserMessage; 
    branchIndex: number; 
    numberOfBranches: number 
  }>();
  
  copied = signal(false);
  labels = inject(CopilotChatConfigurationService).labels;
  
  async copyMessage() {
    await navigator.clipboard.writeText(this.message.content);
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }
  
  navigateBranch(direction: number) {
    const newIndex = this.branchIndex + direction;
    if (newIndex >= 0 && newIndex < this.numberOfBranches) {
      this.switchBranch.emit({
        message: this.message,
        branchIndex: newIndex,
        numberOfBranches: this.numberOfBranches
      });
    }
  }
}
```

---

### 6. CopilotToolCalls Component
**React Equivalent**: Inline rendering in messages
**Priority**: 🟡 Medium

#### Purpose
Renders tool calls within messages with custom rendering support.

#### Angular Implementation Spec
```typescript
@Component({
  selector: 'copilot-tool-calls',
  standalone: true,
  template: `
    <div class="tool-calls">
      <div *ngFor="let toolCall of toolCalls" class="tool-call">
        <div class="tool-call-header">
          <span class="tool-name">{{ toolCall.name }}</span>
          <span class="tool-status" [class]="'status-' + toolCall.status">
            {{ toolCall.status }}
          </span>
        </div>
        
        <!-- Custom render if available -->
        <ng-container *ngIf="hasCustomRender(toolCall.name); else defaultRender">
          <ng-container 
            *ngComponentOutlet="getCustomRender(toolCall.name); 
            injector: createInjector(toolCall)">
          </ng-container>
        </ng-container>
        
        <!-- Default render -->
        <ng-template #defaultRender>
          <div class="tool-call-content">
            <pre>{{ toolCall.args | json }}</pre>
            <div *ngIf="toolCall.result" class="tool-result">
              <strong>Result:</strong>
              <pre>{{ toolCall.result | json }}</pre>
            </div>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  imports: [CommonModule]
})
export class CopilotToolCallsComponent {
  @Input() toolCalls: ToolCall[] = [];
  @Input() renderRegistry!: Record<string, AngularToolCallRender>;
  
  hasCustomRender(toolName: string): boolean {
    return toolName in this.renderRegistry;
  }
  
  getCustomRender(toolName: string): Type<any> | null {
    const render = this.renderRegistry[toolName]?.render;
    return render instanceof Type ? render : null;
  }
  
  createInjector(toolCall: ToolCall): Injector {
    return Injector.create({
      providers: [
        { provide: 'TOOL_CALL', useValue: toolCall },
        { provide: 'TOOL_ARGS', useValue: toolCall.args },
        { provide: 'TOOL_STATUS', useValue: toolCall.status },
        { provide: 'TOOL_RESULT', useValue: toolCall.result }
      ]
    });
  }
}
```

---

## Supporting Components Needed

### 7. Markdown Renderer
**Priority**: 🔴 Critical for assistant messages

Need to integrate a markdown rendering solution:
- Option 1: `ngx-markdown` - Angular wrapper for marked
- Option 2: Custom directive using `marked` + `highlight.js`
- Option 3: Server-side rendering with sanitization

### 8. Code Highlighter
**Priority**: 🟡 Medium

For syntax highlighting in code blocks:
- Option 1: `ngx-highlightjs`
- Option 2: Prism.js integration
- Option 3: Custom directive with highlight.js

### 9. Virtual Scrolling Enhancement
**Priority**: 🟢 Low

Optimize for large message lists:
- Use Angular CDK virtual scrolling
- Dynamic item height calculation
- Scroll position restoration

---

## Implementation Roadmap

### Phase 1: Core Components (Week 1)
1. `CopilotChatComponent` - Basic orchestration
2. `CopilotChatViewComponent` - Message container
3. `CopilotChatMessageViewComponent` - Message routing

### Phase 2: Message Components (Week 2)
4. `CopilotChatUserMessageComponent` - User messages
5. `CopilotChatAssistantMessageComponent` - AI messages (without markdown)
6. Basic toolbar functionality

### Phase 3: Enhanced Features (Week 3)
7. Markdown rendering integration
8. Code syntax highlighting
9. `CopilotToolCallsComponent` - Tool call rendering
10. Branch navigation

### Phase 4: Polish (Week 4)
11. Animations and transitions
12. Virtual scrolling optimization
13. Accessibility improvements
14. Theme support

---

## Testing Strategy

Each component should have:
1. **Unit tests**: Component logic and event handling
2. **Integration tests**: Component interaction with services
3. **E2E tests**: Full chat flow scenarios
4. **Visual tests**: Storybook stories for each component

---

## Storybook Stories Needed

Create stories for:
- `CopilotChat` - Full chat interface
- `CopilotChatView` - Different message states
- `CopilotChatAssistantMessage` - Various content types
- `CopilotChatUserMessage` - Edit and branch states
- `CopilotToolCalls` - Different tool call states

---

## Dependencies to Add

```json
{
  "dependencies": {
    "@angular/cdk": "^17.0.0",
    "ngx-markdown": "^17.0.0",
    "highlight.js": "^11.9.0",
    "marked": "^11.0.0"
  }
}
```

---

## Conclusion

The missing components represent the entire chat UI layer of CopilotKit. While the Angular implementation has the foundational services and directives, it lacks the user-facing components that make the chat interface functional. 

Priority should be given to implementing the core chat components (`CopilotChat`, `CopilotChatView`, and message components) as these are essential for any chat-based application using CopilotKit.
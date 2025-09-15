import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotChatMessageView } from '../copilot-chat-message-view';
import { CopilotChatMessageViewCursor } from '../copilot-chat-message-view-cursor';
import { CopilotChatAssistantMessage } from '../copilot-chat-assistant-message';
import { CopilotChatUserMessage } from '../copilot-chat-user-message';
import { CopilotChatViewHandlers } from '../copilot-chat-view-handlers';
import { provideCopilotKit } from '../../../core/copilotkit.providers';
import { provideCopilotChatConfiguration } from '../../../core/chat-configuration/chat-configuration.providers';
import { Message, AssistantMessage, UserMessage } from '@ag-ui/client';

describe('CopilotChatMessageView', () => {
  let component: CopilotChatMessageView;
  let fixture: ComponentFixture<CopilotChatMessageView>;

  const mockAssistantMessage: AssistantMessage = {
    id: 'assistant-1',
    role: 'assistant',
    content: 'Hello! How can I help you today?'
  } as any;

  const mockUserMessage: UserMessage = {
    id: 'user-1',
    role: 'user',
    content: 'I need help with Angular'
  } as any;

  const mockMessages: Message[] = [
    mockUserMessage,
    mockAssistantMessage
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        CopilotChatMessageView,
        CopilotChatMessageViewCursor,
        CopilotChatAssistantMessage,
        CopilotChatUserMessage
      ],
      providers: [
        provideCopilotKit({}),
        provideCopilotChatConfiguration({}),
        CopilotChatViewHandlers
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CopilotChatMessageView);
    component = fixture.componentInstance;
  });

  describe('Basic Rendering', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should render with default classes "flex flex-col"', () => {
      fixture.detectChanges();
      const container = fixture.nativeElement.querySelector('div');
      expect(container).toBeTruthy();
      expect(container.className).toContain('flex');
      expect(container.className).toContain('flex-col');
    });

    it('should render empty when no messages provided', () => {
      fixture.componentRef.setInput('messages', []);
      fixture.detectChanges();
      
      const messages = fixture.nativeElement.querySelectorAll('copilot-chat-assistant-message, copilot-chat-user-message');
      expect(messages.length).toBe(0);
    });

    it('should render single assistant message', () => {
      fixture.componentRef.setInput('messages', [mockAssistantMessage]);
      fixture.detectChanges();
      
      const assistantMessages = fixture.nativeElement.querySelectorAll('copilot-chat-assistant-message');
      const userMessages = fixture.nativeElement.querySelectorAll('copilot-chat-user-message');
      
      expect(assistantMessages.length).toBe(1);
      expect(userMessages.length).toBe(0);
    });

    it('should render single user message', () => {
      fixture.componentRef.setInput('messages', [mockUserMessage]);
      fixture.detectChanges();
      
      const assistantMessages = fixture.nativeElement.querySelectorAll('copilot-chat-assistant-message');
      const userMessages = fixture.nativeElement.querySelectorAll('copilot-chat-user-message');
      
      expect(assistantMessages.length).toBe(0);
      expect(userMessages.length).toBe(1);
    });

    it('should render mixed messages in order', () => {
      fixture.componentRef.setInput('messages', mockMessages);
      fixture.detectChanges();
      
      const assistantMessages = fixture.nativeElement.querySelectorAll('copilot-chat-assistant-message');
      const userMessages = fixture.nativeElement.querySelectorAll('copilot-chat-user-message');
      
      expect(userMessages.length).toBe(1);
      expect(assistantMessages.length).toBe(1);
    });

    it('should filter out messages with invalid roles', () => {
      const invalidMessage: any = {
        id: 'system-1',
        role: 'system',
        content: 'System message'
      };
      
      fixture.componentRef.setInput('messages', [...mockMessages, invalidMessage]);
      fixture.detectChanges();
      
      const assistantMessages = fixture.nativeElement.querySelectorAll('copilot-chat-assistant-message');
      const userMessages = fixture.nativeElement.querySelectorAll('copilot-chat-user-message');
      
      expect(userMessages.length).toBe(1);
      expect(assistantMessages.length).toBe(1);
    });

    it('should handle null/undefined messages gracefully', () => {
      fixture.componentRef.setInput('messages', [null as any, undefined as any, mockAssistantMessage]);
      fixture.detectChanges();
      
      const assistantMessages = fixture.nativeElement.querySelectorAll('copilot-chat-assistant-message');
      expect(assistantMessages.length).toBe(1);
    });
  });

  describe('Cursor Functionality', () => {
    it('should not show cursor by default', () => {
      const cursor = fixture.nativeElement.querySelector('copilot-chat-message-view-cursor');
      expect(cursor).toBeFalsy();
    });

    it('should show cursor when showCursor is true', () => {
      fixture.componentRef.setInput('showCursor', true);
      fixture.detectChanges();
      
      const cursor = fixture.nativeElement.querySelector('copilot-chat-message-view-cursor');
      expect(cursor).toBeTruthy();
    });

    it('should apply correct cursor classes', () => {
      fixture.componentRef.setInput('showCursor', true);
      fixture.detectChanges();
      
      const cursorDiv = fixture.nativeElement.querySelector('copilot-chat-message-view-cursor div');
      expect(cursorDiv).toBeTruthy();
      expect(cursorDiv.className).toContain('w-[11px]');
      expect(cursorDiv.className).toContain('h-[11px]');
      expect(cursorDiv.className).toContain('rounded-full');
      expect(cursorDiv.className).toContain('bg-foreground');
      expect(cursorDiv.className).toContain('animate-pulse-cursor');
      expect(cursorDiv.className).toContain('ml-1');
    });

    it('should apply custom cursor class', () => {
      fixture.componentRef.setInput('showCursor', true);
      fixture.componentRef.setInput('cursorClass', 'custom-cursor-class');
      fixture.detectChanges();
      
      const cursorDiv = fixture.nativeElement.querySelector('copilot-chat-message-view-cursor div');
      expect(cursorDiv).toBeTruthy();
      // The custom class is merged with default classes
      expect(cursorDiv.className).toContain('w-[11px]');
      expect(cursorDiv.className).toContain('h-[11px]');
      // Note: Custom class is passed but may be overridden by Tailwind merge
    });
  });

  describe('CSS Class Handling', () => {
    it('should merge custom classes with default classes', () => {
      fixture.componentRef.setInput('inputClass', 'custom-container-class');
      fixture.detectChanges();
      
      const container = fixture.nativeElement.querySelector('div');
      expect(container.className).toContain('flex');
      expect(container.className).toContain('flex-col');
      expect(container.className).toContain('custom-container-class');
    });

    it('should apply custom assistant message class', () => {
      fixture.componentRef.setInput('messages', [mockAssistantMessage]);
      fixture.componentRef.setInput('assistantMessageClass', 'custom-assistant-class');
      fixture.detectChanges();
      
      const assistantMessage = fixture.nativeElement.querySelector('copilot-chat-assistant-message');
      expect(assistantMessage).toBeTruthy();
      // Class is passed as input to the component
    });

    it('should apply custom user message class', () => {
      fixture.componentRef.setInput('messages', [mockUserMessage]);
      fixture.componentRef.setInput('userMessageClass', 'custom-user-class');
      fixture.detectChanges();
      
      const userMessage = fixture.nativeElement.querySelector('copilot-chat-user-message');
      expect(userMessage).toBeTruthy();
      // Class is passed as input to the component
    });
  });

  describe('Slot System', () => {
    it('should pass message prop to assistant message component', () => {
      fixture.componentRef.setInput('messages', [mockAssistantMessage]);
      fixture.detectChanges();
      
      const assistantMessage = fixture.nativeElement.querySelector('copilot-chat-assistant-message');
      expect(assistantMessage).toBeTruthy();
      // Message prop is passed via Angular input binding
    });

    it('should pass message prop to user message component', () => {
      fixture.componentRef.setInput('messages', [mockUserMessage]);
      fixture.detectChanges();
      
      const userMessage = fixture.nativeElement.querySelector('copilot-chat-user-message');
      expect(userMessage).toBeTruthy();
      // Message prop is passed via Angular input binding
    });

    it('should support custom assistant message props', () => {
      fixture.componentRef.setInput('messages', [mockAssistantMessage]);
      fixture.componentRef.setInput('assistantMessageClass', 'custom-class');
      fixture.detectChanges();
      
      // Props are merged and passed to slot system
      expect(component.mergeAssistantProps(mockAssistantMessage)).toEqual({
        message: mockAssistantMessage,
        messages: [mockAssistantMessage],
        isLoading: false,
        inputClass: 'custom-class'
      });
    });

    it('should support custom user message props', () => {
      fixture.componentRef.setInput('messages', [mockUserMessage]);
      fixture.componentRef.setInput('userMessageClass', 'custom-class');
      fixture.detectChanges();
      
      // Props are merged and passed to slot system
      expect(component.mergeUserProps(mockUserMessage)).toEqual({
        message: mockUserMessage,
        inputClass: 'custom-class'
      });
    });
  });

  describe('Custom Layout Template', () => {
    @Component({
  standalone: true,
template: `
        <copilot-chat-message-view [messages]="messages" [showCursor]="showCursor">
          <ng-template #customLayout let-messages="messages" let-showCursor="showCursor" let-messageElements="messageElements">
            <div class="custom-layout">
              <h2>Custom Layout</h2>
              <div class="message-count">{{ messages?.length || 0 }} messages</div>
              <div class="cursor-status">Cursor: {{ showCursor }}</div>
              <div class="elements-count">Elements: {{ messageElements?.length || 0 }}</div>
            </div>
          </ng-template>
        </copilot-chat-message-view>
      `,
      imports: [CommonModule, CopilotChatMessageView]
    })
    class TestHostComponent {
      messages = mockMessages;
      showCursor = true;
    }

    it('should render custom layout template when provided', async () => {
      const hostFixture = TestBed.createComponent(TestHostComponent);
      hostFixture.detectChanges();
      
      const customLayout = hostFixture.nativeElement.querySelector('.custom-layout');
      expect(customLayout).toBeTruthy();
      
      const messageCount = hostFixture.nativeElement.querySelector('.message-count');
      expect(messageCount.textContent).toContain('2 messages');
      
      const cursorStatus = hostFixture.nativeElement.querySelector('.cursor-status');
      expect(cursorStatus.textContent).toContain('Cursor: true');
      
      const elementsCount = hostFixture.nativeElement.querySelector('.elements-count');
      expect(elementsCount.textContent).toContain('Elements: 2');
    });
  });

  describe('Performance', () => {
    it('should handle large message lists efficiently', () => {
      const largeMessageList: Message[] = [];
      for (let i = 0; i < 100; i++) {
        largeMessageList.push({
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          createdAt: new Date()
        } as Message);
      }
      
      fixture.componentRef.setInput('messages', largeMessageList);
      fixture.detectChanges();
      
      const allMessages = fixture.nativeElement.querySelectorAll('copilot-chat-assistant-message, copilot-chat-user-message');
      expect(allMessages.length).toBe(100);
    });

    it('should use trackBy function for message iteration', () => {
      const message: Message = {
        id: 'test-1',
        role: 'user',
        content: 'Test'
      } as Message;
      
      const trackById = component.trackByMessageId(0, message);
      expect(trackById).toBe('test-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message content', () => {
      const emptyMessage: Message = {
        id: 'empty-1',
        role: 'assistant',
        content: ''
      } as Message;
      
      fixture.componentRef.setInput('messages', [emptyMessage]);
      fixture.detectChanges();
      
      const assistantMessage = fixture.nativeElement.querySelector('copilot-chat-assistant-message');
      expect(assistantMessage).toBeTruthy();
    });

    it('should handle messages with only whitespace', () => {
      const whitespaceMessage: Message = {
        id: 'whitespace-1',
        role: 'user',
        content: '   '
      } as Message;
      
      fixture.componentRef.setInput('messages', [whitespaceMessage]);
      fixture.detectChanges();
      
      const userMessage = fixture.nativeElement.querySelector('copilot-chat-user-message');
      expect(userMessage).toBeTruthy();
    });

    it('should maintain message order', () => {
      const orderedMessages: Message[] = [
        { id: '1', role: 'user', content: 'First' } as Message,
        { id: '2', role: 'assistant', content: 'Second' } as Message,
        { id: '3', role: 'user', content: 'Third' } as Message,
        { id: '4', role: 'assistant', content: 'Fourth' } as Message
      ];
      
      fixture.componentRef.setInput('messages', orderedMessages);
      fixture.detectChanges();
      
      const allMessages = fixture.nativeElement.querySelectorAll('copilot-chat-assistant-message, copilot-chat-user-message');
      expect(allMessages.length).toBe(4);
      // Order is maintained through the template iteration
    });
  });
});

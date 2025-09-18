import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotChatAssistantMessage } from '../copilot-chat-assistant-message';
import { CopilotChatAssistantMessageRenderer } from '../copilot-chat-assistant-message-renderer';
import {
  CopilotChatAssistantMessageCopyButton,
  CopilotChatAssistantMessageThumbsUpButton,
  CopilotChatAssistantMessageThumbsDownButton,
  CopilotChatAssistantMessageReadAloudButton,
  CopilotChatAssistantMessageRegenerateButton
} from '../copilot-chat-assistant-message-buttons';
import { CopilotChatAssistantMessageToolbar } from '../copilot-chat-assistant-message-toolbar';
import { CopilotChatViewHandlers } from '../copilot-chat-view-handlers';
import { provideCopilotKit } from '../../../core/copilotkit.providers';
import { provideCopilotChatConfiguration } from '../../../core/chat-configuration/chat-configuration.providers';
import { AssistantMessage } from '@ag-ui/client';

describe('CopilotChatAssistantMessage', () => {
  let component: CopilotChatAssistantMessage;
  let fixture: ComponentFixture<CopilotChatAssistantMessage>;

  const mockMessage: AssistantMessage = {
    id: 'test-msg-1',
    role: 'assistant',
    content: 'Hello! This is a test message with **bold text** and *italic text*.'
  } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        CopilotChatAssistantMessage,
        CopilotChatAssistantMessageRenderer,
        CopilotChatAssistantMessageCopyButton,
        CopilotChatAssistantMessageThumbsUpButton,
        CopilotChatAssistantMessageThumbsDownButton,
        CopilotChatAssistantMessageReadAloudButton,
        CopilotChatAssistantMessageRegenerateButton,
        CopilotChatAssistantMessageToolbar
      ],
      providers: [
        provideCopilotKit({}),
        provideCopilotChatConfiguration({
          labels: {
            assistantMessageToolbarCopyMessageLabel: 'Copy',
            assistantMessageToolbarThumbsUpLabel: 'Good',
            assistantMessageToolbarThumbsDownLabel: 'Bad',
            assistantMessageToolbarReadAloudLabel: 'Read',
            assistantMessageToolbarRegenerateLabel: 'Regenerate'
          }
        }),
        CopilotChatViewHandlers
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CopilotChatAssistantMessage);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('message', mockMessage);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the message content', () => {
    const element = fixture.nativeElement;
    expect(element.textContent).toContain('Hello! This is a test message');
  });

  it('should set data-message-id attribute', () => {
    const element = fixture.nativeElement.querySelector('[data-message-id]');
    expect(element).toBeTruthy();
    expect(element.getAttribute('data-message-id')).toBe('test-msg-1');
  });

  it('should show toolbar when toolbarVisible is true', () => {
    fixture.componentRef.setInput('toolbarVisible', true);
    fixture.detectChanges();
    const toolbar = fixture.nativeElement.querySelector('[copilotChatAssistantMessageToolbar]');
    expect(toolbar).toBeTruthy();
  });

  it('should hide toolbar when toolbarVisible is false', () => {
    fixture.componentRef.setInput('toolbarVisible', false);
    fixture.detectChanges();
    const toolbar = fixture.nativeElement.querySelector('[copilotChatAssistantMessageToolbar]');
    expect(toolbar).toBeFalsy();
  });

  it('should emit thumbsUp event when button is clicked', () => {
    let emittedEvent: any;
    component.thumbsUp.subscribe((event) => {
      emittedEvent = event;
    });

    component.handleThumbsUp();
    expect(emittedEvent).toEqual({ message: mockMessage });
  });

  it('should emit thumbsDown event when button is clicked', () => {
    let emittedEvent: any;
    component.thumbsDown.subscribe((event) => {
      emittedEvent = event;
    });

    component.handleThumbsDown();
    expect(emittedEvent).toEqual({ message: mockMessage });
  });

  it('should emit readAloud event when button is clicked', () => {
    let emittedEvent: any;
    component.readAloud.subscribe((event) => {
      emittedEvent = event;
    });

    component.handleReadAloud();
    expect(emittedEvent).toEqual({ message: mockMessage });
  });

  it('should emit regenerate event when button is clicked', () => {
    let emittedEvent: any;
    component.regenerate.subscribe((event) => {
      emittedEvent = event;
    });

    component.handleRegenerate();
    expect(emittedEvent).toEqual({ message: mockMessage });
  });

  it('should handle empty message content', () => {
    fixture.componentRef.setInput('message', {
      ...mockMessage,
      content: ''
    });
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should render with base classes', () => {
    fixture.detectChanges();
    const element = fixture.nativeElement.querySelector('div');
    expect(element.className).toContain('prose');
  });
});

describe('CopilotChatAssistantMessage with code blocks', () => {
  let component: CopilotChatAssistantMessage;
  let fixture: ComponentFixture<CopilotChatAssistantMessage>;

  const codeMessage: AssistantMessage = {
    id: 'test-code-1',
    role: 'assistant',
    content: `Here's a code example:
\`\`\`typescript
function hello(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\``,
  } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        CopilotChatAssistantMessage,
        CopilotChatAssistantMessageRenderer
      ],
      providers: [
        provideCopilotKit({}),
        provideCopilotChatConfiguration({})
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CopilotChatAssistantMessage);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('message', codeMessage);
    fixture.detectChanges();
  });

  it('should render code blocks', async () => {
    await fixture.whenStable();
    const element = fixture.nativeElement;
    const codeBlock = element.querySelector('.code-block-container');
    expect(codeBlock).toBeTruthy();
  });

  it('should display language label for code blocks', async () => {
    await fixture.whenStable();
    const element = fixture.nativeElement;
    const languageLabel = element.querySelector('.code-block-language');
    expect(languageLabel).toBeTruthy();
    expect(languageLabel.textContent).toBe('typescript');
  });

  it('should have copy button for code blocks', async () => {
    await fixture.whenStable();
    const element = fixture.nativeElement;
    const copyButton = element.querySelector('.code-block-copy-button');
    expect(copyButton).toBeTruthy();
  });
});

describe('CopilotChatAssistantMessage with custom slots', () => {
  

  @Component({
    standalone: true,
    selector: 'test-host',
    template: `
      <copilot-chat-assistant-message 
        [message]="message"
        [markdownRendererComponent]="CustomRenderer"
        [copyButtonComponent]="CustomCopyButton">
      </copilot-chat-assistant-message>
    `,
    imports: [CommonModule, CopilotChatAssistantMessage]
  })
  class TestHostComponent {
    message: AssistantMessage = {
      id: 'test-custom-1',
      role: 'assistant',
      content: 'Custom slot test message'
    } as any;

    // Expose component classes for binding
    CustomRenderer = CustomRenderer;
    CustomCopyButton = CustomCopyButton;
  }

  @Component({
    standalone: true,
    selector: 'custom-renderer',
    template: `<div class="custom-renderer">{{ content }}</div>`,
    inputs: ['content']
  })
  class CustomRenderer {
    content?: string;
  }

  @Component({
    standalone: true,
    selector: 'custom-copy-button',
    template: `<button class="custom-copy-btn">Custom Copy</button>`
  })
  class CustomCopyButton {}

  let component: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      providers: [
        provideCopilotKit({}),
        provideCopilotChatConfiguration({})
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should use custom markdown renderer slot', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement;
    const customRenderer = element.querySelector('.custom-renderer');
    expect(customRenderer).toBeTruthy();
    expect(customRenderer.textContent).toBe('Custom slot test message');
  });

  it('should use custom copy button slot', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement;
    const customCopyBtn = element.querySelector('.custom-copy-btn');
    expect(customCopyBtn).toBeTruthy();
    expect(customCopyBtn.textContent).toBe('Custom Copy');
  });
});

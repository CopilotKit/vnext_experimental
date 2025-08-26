import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CopilotChatAssistantMessageComponent } from '../copilot-chat-assistant-message.component';
import { CopilotChatAssistantMessageRendererComponent } from '../copilot-chat-assistant-message-renderer.component';
import {
  CopilotChatAssistantMessageCopyButtonComponent,
  CopilotChatAssistantMessageThumbsUpButtonComponent,
  CopilotChatAssistantMessageThumbsDownButtonComponent,
  CopilotChatAssistantMessageReadAloudButtonComponent,
  CopilotChatAssistantMessageRegenerateButtonComponent
} from '../copilot-chat-assistant-message-buttons.component';
import { CopilotChatAssistantMessageToolbarComponent } from '../copilot-chat-assistant-message-toolbar.component';
import { CopilotChatViewHandlersService } from '../copilot-chat-view-handlers.service';
import { provideCopilotKit } from '../../../core/copilotkit.providers';
import { provideCopilotChatConfiguration } from '../../../core/chat-configuration/chat-configuration.providers';
import { AssistantMessage } from '@ag-ui/client';

describe('CopilotChatAssistantMessageComponent', () => {
  let component: CopilotChatAssistantMessageComponent;
  let fixture: ComponentFixture<CopilotChatAssistantMessageComponent>;

  const mockMessage: AssistantMessage = {
    id: 'test-msg-1',
    role: 'assistant',
    content: 'Hello! This is a test message with **bold text** and *italic text*.',
    createdAt: new Date()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        CopilotChatAssistantMessageComponent,
        CopilotChatAssistantMessageRendererComponent,
        CopilotChatAssistantMessageCopyButtonComponent,
        CopilotChatAssistantMessageThumbsUpButtonComponent,
        CopilotChatAssistantMessageThumbsDownButtonComponent,
        CopilotChatAssistantMessageReadAloudButtonComponent,
        CopilotChatAssistantMessageRegenerateButtonComponent,
        CopilotChatAssistantMessageToolbarComponent
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
        CopilotChatViewHandlersService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CopilotChatAssistantMessageComponent);
    component = fixture.componentInstance;
    component.message = mockMessage;
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
    component.toolbarVisible = true;
    fixture.detectChanges();
    const toolbar = fixture.nativeElement.querySelector('[copilotChatAssistantMessageToolbar]');
    expect(toolbar).toBeTruthy();
  });

  it('should hide toolbar when toolbarVisible is false', () => {
    // Create a fresh instance with toolbarVisible set to false from the start
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        CommonModule,
        CopilotChatAssistantMessageComponent,
        CopilotChatAssistantMessageRendererComponent,
        CopilotChatAssistantMessageToolbarComponent
      ],
      providers: [
        provideCopilotKit({}),
        provideCopilotChatConfiguration({})
      ]
    });
    
    const newFixture = TestBed.createComponent(CopilotChatAssistantMessageComponent);
    const newComponent = newFixture.componentInstance;
    newComponent.message = mockMessage;
    newComponent.toolbarVisible = false;
    newFixture.detectChanges();
    
    const toolbar = newFixture.nativeElement.querySelector('[copilotChatAssistantMessageToolbar]');
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
    component.message = {
      ...mockMessage,
      content: ''
    };
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should support custom CSS class', () => {
    const customClass = 'custom-test-class';
    component.inputClass = customClass;
    fixture.detectChanges();
    
    const element = fixture.nativeElement.querySelector('div');
    expect(element.className).toContain(customClass);
  });
});

describe('CopilotChatAssistantMessageComponent with code blocks', () => {
  let component: CopilotChatAssistantMessageComponent;
  let fixture: ComponentFixture<CopilotChatAssistantMessageComponent>;

  const codeMessage: AssistantMessage = {
    id: 'test-code-1',
    role: 'assistant',
    content: `Here's a code example:
\`\`\`typescript
function hello(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\``,
    createdAt: new Date()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        CopilotChatAssistantMessageComponent,
        CopilotChatAssistantMessageRendererComponent
      ],
      providers: [
        provideCopilotKit({}),
        provideCopilotChatConfiguration({})
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CopilotChatAssistantMessageComponent);
    component = fixture.componentInstance;
    component.message = codeMessage;
    fixture.detectChanges();
  });

  it('should render code blocks', () => {
    const element = fixture.nativeElement;
    const codeBlock = element.querySelector('.code-block-container');
    expect(codeBlock).toBeTruthy();
  });

  it('should display language label for code blocks', () => {
    const element = fixture.nativeElement;
    const languageLabel = element.querySelector('.code-block-language');
    expect(languageLabel).toBeTruthy();
    expect(languageLabel.textContent).toBe('typescript');
  });

  it('should have copy button for code blocks', () => {
    const element = fixture.nativeElement;
    const copyButton = element.querySelector('.code-block-copy-button');
    expect(copyButton).toBeTruthy();
  });
});

describe('CopilotChatAssistantMessageComponent with custom slots', () => {
  @Component({
    selector: 'test-host',
    template: `
      <copilot-chat-assistant-message [message]="message">
        <ng-template #markdownRenderer let-content="content">
          <div class="custom-renderer">{{ content }}</div>
        </ng-template>
        
        <ng-template #copyButton let-onClick="onClick">
          <button class="custom-copy-btn" (click)="onClick()">Custom Copy</button>
        </ng-template>
      </copilot-chat-assistant-message>
    `,
    standalone: true,
    imports: [CommonModule, CopilotChatAssistantMessageComponent]
  })
  class TestHostComponent {
    message: AssistantMessage = {
      id: 'test-custom-1',
      role: 'assistant',
      content: 'Custom slot test message',
      createdAt: new Date()
    };
  }

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

  it('should use custom markdown renderer slot', () => {
    const element = fixture.nativeElement;
    const customRenderer = element.querySelector('.custom-renderer');
    expect(customRenderer).toBeTruthy();
    expect(customRenderer.textContent).toBe('Custom slot test message');
  });

  it('should use custom copy button slot', () => {
    const element = fixture.nativeElement;
    const customCopyBtn = element.querySelector('.custom-copy-btn');
    expect(customCopyBtn).toBeTruthy();
    expect(customCopyBtn.textContent).toBe('Custom Copy');
  });
});
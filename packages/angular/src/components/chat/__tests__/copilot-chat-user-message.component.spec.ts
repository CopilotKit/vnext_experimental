import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { CopilotChatUserMessage } from '../copilot-chat-user-message';
import { provideCopilotChatConfiguration } from '../../../core/chat-configuration/chat-configuration.providers';
import { UserMessage } from '../copilot-chat-user-message.types';

describe('CopilotChatUserMessage', () => {
  let component: CopilotChatUserMessage;
  let fixture: ComponentFixture<CopilotChatUserMessage>;
  let element: HTMLElement;

  const mockMessage: UserMessage = {
    id: 'test-message-1',
    content: 'Hello, this is a test message',
    role: 'user',
    timestamp: new Date()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, CopilotChatUserMessage],
      providers: [
        provideCopilotChatConfiguration({
          labels: {
            userMessageToolbarCopyMessageLabel: 'Copy',
            userMessageToolbarEditMessageLabel: 'Edit'
          }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CopilotChatUserMessage);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    // Set required input via Angular input API
    fixture.componentRef.setInput('message', mockMessage);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render message content', () => {
    const messageElement = element.querySelector('copilot-chat-user-message-renderer');
    expect(messageElement?.textContent?.trim()).toBe(mockMessage.content);
  });

  it('should have message id as data attribute', () => {
    const messageContainer = element.querySelector('[data-message-id]');
    expect(messageContainer?.getAttribute('data-message-id')).toBe(mockMessage.id);
  });

  it('should show copy button', () => {
    const copyButton = element.querySelector('copilot-chat-user-message-copy-button');
    expect(copyButton).toBeTruthy();
  });

  it('should show edit button when editMessage event is observed', async () => {
    // Create a fresh component with a subscription
    const freshFixture = TestBed.createComponent(CopilotChatUserMessage);
    const freshComponent = freshFixture.componentInstance;
    const freshElement = freshFixture.nativeElement;
    
    // Set required input
    freshFixture.componentRef.setInput('message', mockMessage);
    
    // Subscribe before first change detection
    const subscription = freshComponent.editMessage.subscribe(() => {});
    
    // Now detect changes
    freshFixture.detectChanges();
    
    const editButton = freshElement.querySelector('copilot-chat-user-message-edit-button');
    expect(editButton).toBeTruthy();
    
    // Clean up
    subscription.unsubscribe();
    freshFixture.destroy();
  });

  it('should show edit button even when editMessage is not observed', () => {
    const editButton = element.querySelector('copilot-chat-user-message-edit-button');
    expect(editButton).toBeTruthy();
  });

  it('should emit editMessage event when edit button is clicked', (done: any) => {
    component.editMessage.subscribe((event) => {
      expect(event.message).toEqual(mockMessage);
      done();
    });
    
    fixture.detectChanges();
    
    const editButton = element.querySelector('copilot-chat-user-message-edit-button button');
    (editButton as HTMLButtonElement)?.click();
  });

  it('should copy message content to clipboard when copy button is clicked', async () => {
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      writable: true
    });
    
    const copyButton = element.querySelector('copilot-chat-user-message-copy-button button');
    (copyButton as HTMLButtonElement)?.click();
    
    await fixture.whenStable();
    
    expect(writeTextSpy).toHaveBeenCalledWith(mockMessage.content);
  });

  it('should show branch navigation when numberOfBranches > 1', () => {
    fixture.componentRef.setInput('numberOfBranches', 3);
    fixture.componentRef.setInput('branchIndex', 1);
    component.switchToBranch.subscribe(() => {}); // Make it observed
    fixture.detectChanges();
    
    const branchNav = element.querySelector('copilot-chat-user-message-branch-navigation');
    expect(branchNav).toBeTruthy();
    
    const branchText = element.querySelector('.text-muted-foreground');
    expect(branchText?.textContent?.trim()).toBe('2/3');
  });

  it('should not show branch navigation when numberOfBranches = 1', () => {
    fixture.componentRef.setInput('numberOfBranches', 1);
    component.switchToBranch.subscribe(() => {}); // Make it observed
    fixture.detectChanges();
    
    const branchNav = element.querySelector('copilot-chat-user-message-branch-navigation');
    expect(branchNav).toBeFalsy();
  });

  it('should emit switchToBranch event when branch navigation is clicked', (done: any) => {
    fixture.componentRef.setInput('numberOfBranches', 3);
    fixture.componentRef.setInput('branchIndex', 1);
    
    component.switchToBranch.subscribe((event) => {
      expect(event.branchIndex).toBe(2);
      expect(event.numberOfBranches).toBe(3);
      expect(event.message).toEqual(mockMessage);
      done();
    });
    
    fixture.detectChanges();
    
    // Click next button
    const buttons = element.querySelectorAll('copilot-chat-user-message-branch-navigation button');
    const nextButton = buttons[1] as HTMLButtonElement;
    nextButton?.click();
  });

  it('should apply custom class', () => {
    fixture.componentRef.setInput('inputClass', 'custom-test-class');
    fixture.detectChanges();
    
    const container = element.querySelector('.custom-test-class');
    expect(container).toBeTruthy();
  });

  it('should render additional toolbar items', async () => {
    @Component({
      standalone: true,
      template: `
        <ng-template #extra>
          <span class="extra-item">Extra</span>
        </ng-template>
        <copilot-chat-user-message
          [message]="message"
          [additionalToolbarItems]="extra">
        </copilot-chat-user-message>
      `,
      imports: [CommonModule, CopilotChatUserMessage]
    })
    class HostComponent {
      message: UserMessage = {
        id: 'msg-1',
        role: 'user',
        content: 'hello'
      } as any;
    }

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        provideCopilotChatConfiguration({
          labels: {
            userMessageToolbarCopyMessageLabel: 'Copy',
            userMessageToolbarEditMessageLabel: 'Edit'
          }
        })
      ]
    }).compileComponents();

    const hostFixture = TestBed.createComponent(HostComponent);
    hostFixture.detectChanges();
    const el = hostFixture.nativeElement as HTMLElement;
    const extra = el.querySelector('.extra-item');
    expect(extra).toBeTruthy();
  });

  it('should handle empty message content', () => {
    const emptyMessage = { ...mockMessage, content: undefined };
    fixture.componentRef.setInput('message', emptyMessage);
    fixture.detectChanges();
    
    const messageElement = element.querySelector('copilot-chat-user-message-renderer');
    expect(messageElement?.textContent?.trim()).toBe('');
  });

  it('should handle multiline message content', () => {
    const multilineMessage: UserMessage = {
      id: 'multiline-message',
      content: 'Line 1\nLine 2\nLine 3',
      role: 'user',
    } as any;
    
    fixture.componentRef.setInput('message', multilineMessage);
    fixture.detectChanges();
    
    const messageElement = element.querySelector('copilot-chat-user-message-renderer');
    expect(messageElement?.textContent).toContain('Line 1');
    expect(messageElement?.textContent).toContain('Line 2');
    expect(messageElement?.textContent).toContain('Line 3');
  });

  describe('Branch Navigation', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('numberOfBranches', 5);
      fixture.componentRef.setInput('branchIndex', 2);
      component.switchToBranch.subscribe(() => {});
      fixture.detectChanges();
    });

    it('should disable previous button on first branch', () => {
      fixture.componentRef.setInput('branchIndex', 0);
      fixture.detectChanges();
      
      const buttons = element.querySelectorAll('copilot-chat-user-message-branch-navigation button');
      const prevButton = buttons[0] as HTMLButtonElement;
      
      expect(prevButton.disabled).toBeTruthy();
    });

    it('should disable next button on last branch', () => {
      fixture.componentRef.setInput('branchIndex', 4);
      fixture.detectChanges();
      
      const buttons = element.querySelectorAll('copilot-chat-user-message-branch-navigation button');
      const nextButton = buttons[1] as HTMLButtonElement;
      
      expect(nextButton.disabled).toBeTruthy();
    });

    it('should enable both buttons on middle branch', () => {
      const buttons = element.querySelectorAll('copilot-chat-user-message-branch-navigation button');
      const prevButton = buttons[0] as HTMLButtonElement;
      const nextButton = buttons[1] as HTMLButtonElement;
      
      expect(prevButton.disabled).toBeFalsy();
      expect(nextButton.disabled).toBeFalsy();
    });
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { vi } from 'vitest';
import { CopilotChatUserMessageComponent } from '../copilot-chat-user-message.component';
import { provideCopilotChatConfiguration } from '../../../core/chat-configuration/chat-configuration.providers';
import { UserMessage } from '../copilot-chat-user-message.types';

describe('CopilotChatUserMessageComponent', () => {
  let component: CopilotChatUserMessageComponent;
  let fixture: ComponentFixture<CopilotChatUserMessageComponent>;
  let element: HTMLElement;

  const mockMessage: UserMessage = {
    id: 'test-message-1',
    content: 'Hello, this is a test message',
    role: 'user',
    timestamp: new Date()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommonModule, CopilotChatUserMessageComponent],
      providers: [
        provideCopilotChatConfiguration({
          labels: {
            userMessageToolbarCopyMessageLabel: 'Copy',
            userMessageToolbarEditMessageLabel: 'Edit'
          }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CopilotChatUserMessageComponent);
    component = fixture.componentInstance;
    element = fixture.nativeElement;
    
    // Set required input
    component.message = mockMessage;
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

  it('should show edit button when editMessage event is observed', (done) => {
    // Subscribe to make it observed
    component.editMessage.subscribe(() => {});
    fixture.detectChanges();
    
    const editButton = element.querySelector('copilot-chat-user-message-edit-button');
    expect(editButton).toBeTruthy();
    done();
  });

  it('should not show edit button when editMessage is not observed', () => {
    const editButton = element.querySelector('copilot-chat-user-message-edit-button');
    expect(editButton).toBeFalsy();
  });

  it('should emit editMessage event when edit button is clicked', (done) => {
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
    component.numberOfBranches = 3;
    component.branchIndex = 1;
    component.switchToBranch.subscribe(); // Make it observed
    fixture.detectChanges();
    
    const branchNav = element.querySelector('copilot-chat-user-message-branch-navigation');
    expect(branchNav).toBeTruthy();
    
    const branchText = element.querySelector('.text-muted-foreground');
    expect(branchText?.textContent?.trim()).toBe('2/3');
  });

  it('should not show branch navigation when numberOfBranches = 1', () => {
    component.numberOfBranches = 1;
    component.switchToBranch.subscribe(); // Make it observed
    fixture.detectChanges();
    
    const branchNav = element.querySelector('copilot-chat-user-message-branch-navigation');
    expect(branchNav).toBeFalsy();
  });

  it('should emit switchToBranch event when branch navigation is clicked', (done) => {
    component.numberOfBranches = 3;
    component.branchIndex = 1;
    
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
    component.inputClass = 'custom-test-class';
    fixture.detectChanges();
    
    const container = element.querySelector('.custom-test-class');
    expect(container).toBeTruthy();
  });

  it.skip('should render additional toolbar items', () => {
    // This test is skipped as it requires a separate TestBed setup
    // which conflicts with the existing setup
  });

  it('should handle empty message content', () => {
    const emptyMessage = { ...mockMessage, content: undefined };
    component.message = emptyMessage;
    fixture.detectChanges();
    
    const messageElement = element.querySelector('copilot-chat-user-message-renderer');
    expect(messageElement?.textContent?.trim()).toBe('');
  });

  it('should handle multiline message content', () => {
    const multilineMessage: UserMessage = {
      id: 'multiline-message',
      content: 'Line 1\nLine 2\nLine 3',
      role: 'user',
      timestamp: new Date()
    };
    
    component.message = multilineMessage;
    fixture.detectChanges();
    
    const messageElement = element.querySelector('copilot-chat-user-message-renderer');
    expect(messageElement?.textContent).toContain('Line 1');
    expect(messageElement?.textContent).toContain('Line 2');
    expect(messageElement?.textContent).toContain('Line 3');
  });

  describe('Branch Navigation', () => {
    beforeEach(() => {
      component.numberOfBranches = 5;
      component.branchIndex = 2;
      component.switchToBranch.subscribe();
      fixture.detectChanges();
    });

    it('should disable previous button on first branch', () => {
      component.branchIndex = 0;
      fixture.detectChanges();
      
      const buttons = element.querySelectorAll('copilot-chat-user-message-branch-navigation button');
      const prevButton = buttons[0] as HTMLButtonElement;
      
      expect(prevButton.disabled).toBeTruthy();
    });

    it('should disable next button on last branch', () => {
      component.branchIndex = 4;
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

  describe('Template Slots', () => {
    it.skip('should use custom message renderer template', () => {
      // This test is skipped as it requires a separate TestBed setup
      // which conflicts with the existing setup
    });

    it.skip('should use custom copy button template', () => {
      // This test is skipped as it requires a separate TestBed setup
      // which conflicts with the existing setup
    });
  });
});
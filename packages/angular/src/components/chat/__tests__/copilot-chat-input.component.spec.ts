import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CopilotChatInputComponent } from '../copilot-chat-input.component';
import { CopilotChatTextareaComponent } from '../copilot-chat-textarea.component';
import { CopilotChatConfigurationService } from '../../../core/chat-configuration/chat-configuration.service';
import { provideCopilotChatConfiguration } from '../../../core/chat-configuration/chat-configuration.providers';

describe('CopilotChatInputComponent', () => {
  let component: CopilotChatInputComponent;
  let fixture: ComponentFixture<CopilotChatInputComponent>;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CopilotChatInputComponent],
      providers: [
        provideCopilotChatConfiguration({
          labels: {
            chatInputPlaceholder: 'Test placeholder'
          }
        })
      ]
    });
    
    fixture = TestBed.createComponent(CopilotChatInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  describe('Basic Rendering', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
    
    it('should render textarea by default', () => {
      const textarea = fixture.nativeElement.querySelector('copilot-chat-textarea');
      expect(textarea).toBeTruthy();
    });
    
    it('should render toolbar', () => {
      const toolbar = fixture.nativeElement.querySelector('copilot-chat-toolbar');
      expect(toolbar).toBeTruthy();
    });
    
    it('should apply custom class', () => {
      component.inputClass = 'custom-class';
      fixture.detectChanges();
      
      const container = fixture.nativeElement.querySelector('.chat-input-container');
      expect(container).toBeFalsy();
      
      const customContainer = fixture.nativeElement.querySelector('.custom-class');
      expect(customContainer).toBeTruthy();
    });
  });
  
  describe('Mode Switching', () => {
    it('should switch to audio recorder in transcribe mode', () => {
      component.mode = 'transcribe';
      fixture.detectChanges();
      
      const audioRecorder = fixture.nativeElement.querySelector('copilot-chat-audio-recorder');
      expect(audioRecorder).toBeTruthy();
      
      const textarea = fixture.nativeElement.querySelector('copilot-chat-textarea');
      expect(textarea).toBeFalsy();
    });
    
    it('should switch back to textarea from transcribe mode', () => {
      component.mode = 'transcribe';
      fixture.detectChanges();
      
      component.mode = 'input';
      fixture.detectChanges();
      
      const textarea = fixture.nativeElement.querySelector('copilot-chat-textarea');
      expect(textarea).toBeTruthy();
      
      const audioRecorder = fixture.nativeElement.querySelector('copilot-chat-audio-recorder');
      expect(audioRecorder).toBeFalsy();
    });
  });
  
  describe('Value Management', () => {
    it('should set initial value', () => {
      component.value = 'Initial value';
      fixture.detectChanges();
      
      expect(component.computedValue()).toBe('Initial value');
    });
    
    it('should emit valueChange when value changes', () => {
      const spy = vi.fn();
      component.valueChange.subscribe(spy);
      
      component.handleValueChange('New value');
      
      expect(spy).toHaveBeenCalledWith('New value');
      expect(component.computedValue()).toBe('New value');
    });
    
    it('should sync with chat configuration service', () => {
      const service = TestBed.inject(CopilotChatConfigurationService);
      
      component.handleValueChange('Config value');
      
      expect(service.inputValue()).toBe('Config value');
    });
  });
  
  describe('Submit Functionality', () => {
    it('should emit submitMessage on send', () => {
      const spy = vi.fn();
      component.submitMessage.subscribe(spy);
      
      component.valueSignal.set('Test message');
      component.send();
      
      expect(spy).toHaveBeenCalledWith('Test message');
    });
    
    it('should not submit empty message', () => {
      const spy = vi.fn();
      component.submitMessage.subscribe(spy);
      
      component.valueSignal.set('   ');
      component.send();
      
      expect(spy).not.toHaveBeenCalled();
    });
    
    it('should clear input after send', () => {
      component.valueSignal.set('Test message');
      component.send();
      
      expect(component.computedValue()).toBe('');
    });
    
    it('should handle Enter key to send', () => {
      const spy = vi.fn();
      component.submitMessage.subscribe(spy);
      
      component.valueSignal.set('Test message');
      
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: false
      });
      
      component.handleKeyDown(event);
      
      expect(spy).toHaveBeenCalledWith('Test message');
    });
    
    it('should not send on Shift+Enter', () => {
      const spy = vi.fn();
      component.submitMessage.subscribe(spy);
      
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        shiftKey: true
      });
      
      component.handleKeyDown(event);
      
      expect(spy).not.toHaveBeenCalled();
    });
  });
  
  describe('Transcribe Events', () => {
    it('should emit startTranscribe and switch mode', () => {
      const spy = vi.fn();
      component.startTranscribe.subscribe(spy);
      
      component.handleStartTranscribe();
      
      expect(spy).toHaveBeenCalled();
      expect(component.computedMode()).toBe('transcribe');
    });
    
    it('should emit cancelTranscribe and switch mode', () => {
      const spy = vi.fn();
      component.cancelTranscribe.subscribe(spy);
      
      component.modeSignal.set('transcribe');
      component.handleCancelTranscribe();
      
      expect(spy).toHaveBeenCalled();
      expect(component.computedMode()).toBe('input');
    });
    
    it('should emit finishTranscribe and switch mode', () => {
      const spy = vi.fn();
      component.finishTranscribe.subscribe(spy);
      
      component.modeSignal.set('transcribe');
      component.handleFinishTranscribe();
      
      expect(spy).toHaveBeenCalled();
      expect(component.computedMode()).toBe('input');
    });
  });
  
  describe('Tools Menu', () => {
    it('should pass tools menu to toolbar', () => {
      const toolsMenu = [
        { label: 'Tool 1', action: () => {} },
        '-' as const,
        { label: 'Tool 2', action: () => {} }
      ];
      
      component.toolsMenu = toolsMenu;
      fixture.detectChanges();
      
      expect(component.computedToolsMenu()).toEqual(toolsMenu);
    });
  });
  
  describe('File Operations', () => {
    it('should emit addFile event', () => {
      const spy = vi.fn();
      component.addFile.subscribe(spy);
      
      component.handleAddFile();
      
      expect(spy).toHaveBeenCalled();
    });
  });
  
  describe('Slot Overrides', () => {
    it('should support custom textarea component', () => {
      @Component({
        selector: 'custom-textarea',
        template: '<textarea class="custom"></textarea>',
        standalone: true
      })
      class CustomTextarea {}
      
      component.textAreaSlot = CustomTextarea;
      fixture.detectChanges();
      
      // The slot directive should render the custom component
      expect(component.computedTextAreaSlot()).toBe(CustomTextarea);
    });
    
    it('should support CSS class override for textarea', () => {
      component.textAreaSlot = 'custom-textarea-class';
      fixture.detectChanges();
      
      expect(component.computedTextAreaSlot()).toBe('custom-textarea-class');
    });
  });
});

describe('CopilotChatTextareaComponent', () => {
  let component: CopilotChatTextareaComponent;
  let fixture: ComponentFixture<CopilotChatTextareaComponent>;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CopilotChatTextareaComponent],
      providers: [
        provideCopilotChatConfiguration({
          labels: {
            chatInputPlaceholder: 'Test placeholder'
          }
        })
      ]
    });
    
    fixture = TestBed.createComponent(CopilotChatTextareaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  describe('Textarea Behavior', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
    
    it('should set placeholder from configuration', () => {
      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(textarea.placeholder).toBe('Test placeholder');
    });
    
    it('should handle input events', () => {
      const spy = vi.fn();
      component.valueChange.subscribe(spy);
      
      const textarea = fixture.nativeElement.querySelector('textarea');
      textarea.value = 'New text';
      textarea.dispatchEvent(new Event('input'));
      
      expect(spy).toHaveBeenCalledWith('New text');
      expect(component.value()).toBe('New text');
    });
    
    it('should auto-resize based on content', () => {
      const textarea = fixture.nativeElement.querySelector('textarea');
      
      // Mock getComputedStyle to return values
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = vi.fn().mockReturnValue({
        paddingTop: '20px',
        paddingBottom: '0px'
      });
      
      // Set scrollHeight manually for test
      Object.defineProperty(textarea, 'scrollHeight', {
        configurable: true,
        value: 100
      });
      
      // Add multiple lines of text
      textarea.value = 'Line 1\nLine 2\nLine 3';
      textarea.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      
      // Height should be set
      const newHeight = textarea.style.height;
      expect(newHeight).toBeTruthy();
      
      // Restore original getComputedStyle
      window.getComputedStyle = originalGetComputedStyle;
    });
    
    it('should respect maxRows limit', () => {
      component.inputMaxRows = 3;
      fixture.detectChanges();
      
      expect(component.maxRows()).toBe(3);
    });
    
    it('should focus when autoFocus is true', async () => {
      component.inputAutoFocus = true;
      fixture.detectChanges();
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const textarea = fixture.nativeElement.querySelector('textarea');
      expect(document.activeElement).toBe(textarea);
    });
    
    it('should emit keyDown events', () => {
      const spy = vi.fn();
      component.keyDown.subscribe(spy);
      
      const textarea = fixture.nativeElement.querySelector('textarea');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      textarea.dispatchEvent(event);
      
      expect(spy).toHaveBeenCalled();
    });
  });
  
  describe('Public Methods', () => {
    it('should focus textarea programmatically', () => {
      const textarea = fixture.nativeElement.querySelector('textarea');
      
      component.focus();
      
      expect(document.activeElement).toBe(textarea);
    });
    
    it('should get current value', () => {
      component.value.set('Test value');
      
      expect(component.getValue()).toBe('Test value');
    });
    
    it('should set value programmatically', () => {
      const spy = vi.fn();
      component.valueChange.subscribe(spy);
      
      component.setValue('New value');
      
      expect(component.getValue()).toBe('New value');
      expect(spy).toHaveBeenCalledWith('New value');
    });
  });
});
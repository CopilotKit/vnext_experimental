import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CopilotChatInput } from '../copilot-chat-input';
import { CopilotChatTextarea } from '../copilot-chat-textarea';
import { CopilotChatConfigurationService } from '../../../core/chat-configuration/chat-configuration';
import { provideCopilotChatConfiguration } from '../../../core/chat-configuration/chat-configuration.providers';

describe('CopilotChatInput', () => {
  let component: CopilotChatInput;
  let fixture: ComponentFixture<CopilotChatInput>;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CopilotChatInput],
      providers: [
        provideCopilotChatConfiguration({
          labels: {
            chatInputPlaceholder: 'Test placeholder'
          }
        })
      ]
    });
    
    fixture = TestBed.createComponent(CopilotChatInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  describe('Basic Rendering', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
    
    it('should render textarea by default', () => {
      const textarea = fixture.nativeElement.querySelector('textarea[copilotChatTextarea]');
      expect(textarea).toBeTruthy();
    });
    
    it('should render toolbar', () => {
      const toolbar = fixture.nativeElement.querySelector('div[copilotChatToolbar]');
      expect(toolbar).toBeTruthy();
    });
    
    it('should allow host class on component', () => {
      fixture.nativeElement.classList.add('custom-class');
      fixture.detectChanges();
      expect(fixture.nativeElement.classList.contains('custom-class')).toBe(true);
    });
  });
  
  describe('Mode Switching', () => {
    it('should switch to audio recorder in transcribe mode', () => {
      component.handleStartTranscribe();
      fixture.detectChanges();
      
      const audioRecorder = fixture.nativeElement.querySelector('copilot-chat-audio-recorder');
      expect(audioRecorder).toBeTruthy();
      
      const textarea = fixture.nativeElement.querySelector('textarea[copilotChatTextarea]');
      expect(textarea).toBeFalsy();
    });
    
    it('should switch back to textarea from transcribe mode', () => {
      component.handleStartTranscribe();
      fixture.detectChanges();
      
      component.handleCancelTranscribe();
      fixture.detectChanges();
      
      const textarea = fixture.nativeElement.querySelector('textarea[copilotChatTextarea]');
      expect(textarea).toBeTruthy();
      
      const audioRecorder = fixture.nativeElement.querySelector('copilot-chat-audio-recorder');
      expect(audioRecorder).toBeFalsy();
    });
  });
  
  describe('Value Management', () => {
    it('should set initial value', () => {
      component.handleValueChange('Initial value');
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
      
      component.handleValueChange('Test message');
      component.send();
      
      expect(spy).toHaveBeenCalledWith('Test message');
    });
    
    it('should not submit empty message', () => {
      const spy = vi.fn();
      component.submitMessage.subscribe(spy);
      
      component.handleValueChange('   ');
      component.send();
      
      expect(spy).not.toHaveBeenCalled();
    });
    
    it('should clear input after send', () => {
      component.handleValueChange('Test message');
      component.send();
      
      expect(component.computedValue()).toBe('');
    });
    
    it('should handle Enter key to send', () => {
      const spy = vi.fn();
      component.submitMessage.subscribe(spy);
      
      component.handleValueChange('Test message');
      
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
    it('should have empty tools menu by default', () => {
      expect(component.computedToolsMenu()).toEqual([]);
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
  standalone: true,
selector: 'custom-textarea',
        template: '<textarea class="custom"></textarea>',
      })
      class CustomTextarea {}
      
      (component as any).textAreaComponent = () => CustomTextarea as any;
      fixture.detectChanges();
      
      // The slot should accept the custom component
      expect(component.textAreaComponent()).toBe(CustomTextarea as any);
    });
    
    it('should render default textarea when no override is provided', () => {
      (component as any).textAreaComponent = undefined;
      fixture.detectChanges();
      const textarea = fixture.nativeElement.querySelector('textarea[copilotChatTextarea]');
      expect(textarea).toBeTruthy();
    });
  });
});

// Test host component for CopilotChatTextarea directive
@Component({
    standalone: true,
template: `
    <textarea copilotChatTextarea
      [inputValue]="value"
      [inputPlaceholder]="placeholder"
      [inputMaxRows]="maxRows"
      [inputAutoFocus]="autoFocus"
      [inputDisabled]="disabled"
      (valueChange)="onValueChange($event)"
      (keyDown)="onKeyDown($event)">
    </textarea>
  `,
  imports: [CopilotChatTextarea]
})
class TestHostComponent {
  value = '';
  placeholder = '';
  maxRows = 5;
  autoFocus = false;
  disabled = false;
  onValueChange = vi.fn();
  onKeyDown = vi.fn();
}

describe('CopilotChatTextarea', () => {
  let hostComponent: TestHostComponent;
  let fixture: ComponentFixture<TestHostComponent>;
  let component: CopilotChatTextarea;
  let textareaElement: HTMLTextAreaElement;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHostComponent, CopilotChatTextarea],
      providers: [
        provideCopilotChatConfiguration({
          labels: {
            chatInputPlaceholder: 'Test placeholder'
          }
        })
      ]
    });
    
    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
    
    // Get the directive instance
    const textareaDebugElement = fixture.debugElement.query(By.css('textarea'));
    component = textareaDebugElement.injector.get(CopilotChatTextarea);
    textareaElement = textareaDebugElement.nativeElement;
  });
  
  describe('Textarea Behavior', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
    
    it('should set placeholder from configuration', () => {
      expect(textareaElement.placeholder).toBe('Test placeholder');
    });
    
    it('should handle input events', () => {
      textareaElement.value = 'New text';
      textareaElement.dispatchEvent(new Event('input'));
      
      expect(hostComponent.onValueChange).toHaveBeenCalledWith('New text');
      expect(component.getValue()).toBe('New text');
    });
    
    it('should auto-resize based on content', () => {
      // Mock getComputedStyle to return values
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = vi.fn().mockReturnValue({
        paddingTop: '20px',
        paddingBottom: '0px'
      });
      
      // Set scrollHeight manually for test
      Object.defineProperty(textareaElement, 'scrollHeight', {
        configurable: true,
        value: 100
      });
      
      // Add multiple lines of text
      textareaElement.value = 'Line 1\nLine 2\nLine 3';
      textareaElement.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      
      // Height should be set
      const newHeight = textareaElement.style.height;
      expect(newHeight).toBeTruthy();
      
      // Restore original getComputedStyle
      window.getComputedStyle = originalGetComputedStyle;
    });
    
    it('should respect maxRows limit', () => {
      hostComponent.maxRows = 3;
      fixture.detectChanges();
      
      expect(component.inputMaxRows()).toBe(3);
    });
    
    it('should focus when autoFocus is true', async () => {
      // Create a fresh host with autoFocus enabled before first detectChanges
      const freshFixture = TestBed.createComponent(TestHostComponent);
      const freshHost = freshFixture.componentInstance;
      freshHost.autoFocus = true;
      freshFixture.detectChanges();
      // Wait a macrotask for setTimeout(0) in ngAfterViewInit
      await new Promise((r) => setTimeout(r, 0));
      const freshTextarea = freshFixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
      expect(document.activeElement).toBe(freshTextarea);
      freshFixture.destroy();
    });
    
    it('should emit keyDown events', () => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      textareaElement.dispatchEvent(event);
      
      expect(hostComponent.onKeyDown).toHaveBeenCalled();
    });
  });
  
  describe('Public Methods', () => {
    it('should focus textarea programmatically', () => {
      component.focus();
      
      expect(document.activeElement).toBe(textareaElement);
    });
    
    it('should get current value', () => {
      component.setValue('Test value');
      
      expect(component.getValue()).toBe('Test value');
    });
    
    it('should set value programmatically', () => {
      component.setValue('New value');
      
      expect(component.getValue()).toBe('New value');
      expect(hostComponent.onValueChange).toHaveBeenCalledWith('New value');
    });
  });
});

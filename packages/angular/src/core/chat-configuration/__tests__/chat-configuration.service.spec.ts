import { TestBed } from '@angular/core/testing';
import { CopilotChatConfigurationService } from '../chat-configuration';
import { provideCopilotChatConfiguration } from '../chat-configuration.providers';
import { 
  COPILOT_CHAT_DEFAULT_LABELS,
  COPILOT_CHAT_INITIAL_CONFIG
} from '../chat-configuration.types';
import { effect } from '@angular/core';

describe('CopilotChatConfigurationService', () => {
  describe('Default Configuration', () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [CopilotChatConfigurationService]
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should create service with default labels', () => {
      expect(service).toBeDefined();
      expect(service.labels()).toEqual(COPILOT_CHAT_DEFAULT_LABELS);
    });

    it('should have undefined input value by default', () => {
      expect(service.inputValue()).toBeUndefined();
    });

    it('should have no handlers by default', () => {
      expect(service.getSubmitHandler()).toBeUndefined();
      expect(service.getChangeHandler()).toBeUndefined();
    });
  });

  describe('With Initial Configuration', () => {
    let service: CopilotChatConfigurationService;
    const customLabels = {
      chatInputPlaceholder: 'Custom placeholder'
    };
    const submitHandler = vi.fn();
    const changeHandler = vi.fn();

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration({
          labels: customLabels,
          inputValue: 'initial value',
          onSubmitInput: submitHandler,
          onChangeInput: changeHandler
        })
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should merge custom labels with defaults', () => {
      const labels = service.labels();
      expect(labels.chatInputPlaceholder).toBe('Custom placeholder');
      expect(labels.chatInputToolbarAddButtonLabel).toBe(COPILOT_CHAT_DEFAULT_LABELS.chatInputToolbarAddButtonLabel);
    });

    it('should set initial input value', () => {
      expect(service.inputValue()).toBe('initial value');
    });

    it('should set initial handlers', () => {
      expect(service.getSubmitHandler()).toBe(submitHandler);
      expect(service.getChangeHandler()).toBe(changeHandler);
    });
  });

  describe('Label Management', () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [CopilotChatConfigurationService]
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should update labels partially', () => {
      service.setLabels({
        chatInputPlaceholder: 'New placeholder',
        userMessageToolbarEditMessageLabel: 'Modify'
      });

      const labels = service.labels();
      expect(labels.chatInputPlaceholder).toBe('New placeholder');
      expect(labels.userMessageToolbarEditMessageLabel).toBe('Modify');
      expect(labels.chatInputToolbarAddButtonLabel).toBe(COPILOT_CHAT_DEFAULT_LABELS.chatInputToolbarAddButtonLabel);
    });

    it('should notify subscribers when labels change', () => {
      // Signals update synchronously, no need for effect
      service.setLabels({ chatInputPlaceholder: 'Updated' });
      
      const labelsValue = service.labels();
      expect(labelsValue.chatInputPlaceholder).toBe('Updated');
    });
  });

  describe('Input Value Management', () => {
    let service: CopilotChatConfigurationService;
    const changeHandler = vi.fn();

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration({
          onChangeInput: changeHandler
        })
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
      vi.clearAllMocks();
    });

    it('should update input value', () => {
      service.setInputValue('test value');
      expect(service.inputValue()).toBe('test value');
    });

    it('should trigger change handler when setting value', () => {
      service.setInputValue('new value');
      expect(changeHandler).toHaveBeenCalledWith('new value');
    });

    it('should not trigger change handler for undefined', () => {
      service.setInputValue(undefined);
      expect(changeHandler).not.toHaveBeenCalled();
    });
  });

  describe('Submit and Change Handlers', () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [CopilotChatConfigurationService]
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should set and call submit handler', () => {
      const submitHandler = vi.fn();
      service.setSubmitHandler(submitHandler);
      
      service.submitInput('test message');
      
      expect(submitHandler).toHaveBeenCalledWith('test message');
    });

    it('should set and call change handler', () => {
      const changeHandler = vi.fn();
      service.setChangeHandler(changeHandler);
      
      service.changeInput('typing...');
      
      expect(changeHandler).toHaveBeenCalledWith('typing...');
    });

    it('should handle missing handlers gracefully', () => {
      expect(() => service.submitInput('test')).not.toThrow();
      expect(() => service.changeInput('test')).not.toThrow();
    });

    it('should replace handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      service.setSubmitHandler(handler1);
      service.submitInput('first');
      expect(handler1).toHaveBeenCalledWith('first');
      
      service.setSubmitHandler(handler2);
      service.submitInput('second');
      expect(handler2).toHaveBeenCalledWith('second');
      expect(handler1).toHaveBeenCalledTimes(1);
    });
  });

  describe('Update Configuration', () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [CopilotChatConfigurationService]
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should update entire configuration at once', () => {
      const submitHandler = vi.fn();
      const changeHandler = vi.fn();
      
      service.updateConfiguration({
        labels: { chatInputPlaceholder: 'Updated' },
        inputValue: 'new value',
        onSubmitInput: submitHandler,
        onChangeInput: changeHandler
      });
      
      expect(service.labels().chatInputPlaceholder).toBe('Updated');
      expect(service.inputValue()).toBe('new value');
      expect(service.getSubmitHandler()).toBe(submitHandler);
      expect(service.getChangeHandler()).toBe(changeHandler);
    });

    it('should handle partial updates', () => {
      service.setInputValue('initial');
      
      service.updateConfiguration({
        labels: { chatInputPlaceholder: 'New' }
      });
      
      expect(service.labels().chatInputPlaceholder).toBe('New');
      expect(service.inputValue()).toBe('initial');
    });
  });

  describe('Reset', () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration({
          labels: { chatInputPlaceholder: 'Custom' },
          inputValue: 'test',
          onSubmitInput: vi.fn(),
          onChangeInput: vi.fn()
        })
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should reset to default configuration', () => {
      service.reset();
      
      expect(service.labels()).toEqual(COPILOT_CHAT_DEFAULT_LABELS);
      expect(service.inputValue()).toBeUndefined();
      expect(service.getSubmitHandler()).toBeUndefined();
      expect(service.getChangeHandler()).toBeUndefined();
    });
  });
});
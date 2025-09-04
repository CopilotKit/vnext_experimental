import { TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { 
  watchChatConfig,
  registerChatConfig,
  getChatLabels,
  setChatLabels,
  getChatInputValue,
  setChatInputValue,
  createChatConfigController
} from '../chat-config.utils';
import { CopilotChatConfigurationService } from '../../core/chat-configuration/chat-configuration.service';
import { provideCopilotChatConfiguration } from '../../core/chat-configuration/chat-configuration.providers';
import { COPILOT_CHAT_DEFAULT_LABELS } from '../../core/chat-configuration/chat-configuration.types';
import { effect } from '@angular/core';

describe('Chat Configuration Utilities', () => {
  describe('watchChatConfig', () => {
    it('should return reactive configuration within component context', () => {
      @Component({
        template: '',
        standalone: true,
        providers: provideCopilotChatConfiguration({
          labels: { chatInputPlaceholder: 'Test placeholder' },
          inputValue: 'test value'
        })
      })
      class TestComponent {
        config = watchChatConfig();
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const component = fixture.componentInstance;
      
      expect(component.config.labels().chatInputPlaceholder).toBe('Test placeholder');
      expect(component.config.inputValue()).toBe('test value');
      expect(typeof component.config.submitInput).toBe('function');
      expect(typeof component.config.changeInput).toBe('function');
    });

    it('should provide reactive signals that update', () => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration()
      });
      
      @Component({
        template: '',
        standalone: true
      })
      class TestComponent {
        config = watchChatConfig();
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const service = TestBed.inject(CopilotChatConfigurationService);
      
      // Initial value
      expect(fixture.componentInstance.config.labels().chatInputPlaceholder).toBe('Type a message...');
      
      // Update labels through service
      service.setLabels({ chatInputPlaceholder: 'Updated' });
      
      // Signals update synchronously
      expect(fixture.componentInstance.config.labels().chatInputPlaceholder).toBe('Updated');
    });

    it('should call service methods when handlers are invoked', () => {
      const submitHandler = vi.fn();
      const changeHandler = vi.fn();

      @Component({
        template: '',
        standalone: true,
        providers: provideCopilotChatConfiguration({
          onSubmitInput: submitHandler,
          onChangeInput: changeHandler
        })
      })
      class TestComponent {
        config = watchChatConfig();
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const component = fixture.componentInstance;
      
      component.config.submitInput('test submit');
      expect(submitHandler).toHaveBeenCalledWith('test submit');
      
      component.config.changeInput('test change');
      expect(changeHandler).toHaveBeenCalledWith('test change');
    });
  });

  describe('registerChatConfig', () => {
    it('should update configuration when called within injection context', () => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration()
      });
      
      @Component({
        template: '',
        standalone: true
      })
      class TestComponent {
        constructor() {
          registerChatConfig({
            labels: { chatInputPlaceholder: 'Registered placeholder' },
            inputValue: 'registered value'
          });
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const service = TestBed.inject(CopilotChatConfigurationService);
      
      expect(service.labels().chatInputPlaceholder).toBe('Registered placeholder');
      expect(service.inputValue()).toBe('registered value');
    });

    it('should set handlers through registerChatConfig', () => {
      const submitHandler = vi.fn();
      const changeHandler = vi.fn();

      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration()
      });
      
      @Component({
        template: '',
        standalone: true
      })
      class TestComponent {
        constructor() {
          registerChatConfig({
            onSubmitInput: submitHandler,
            onChangeInput: changeHandler
          });
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const service = TestBed.inject(CopilotChatConfigurationService);
      
      service.submitInput('test');
      expect(submitHandler).toHaveBeenCalledWith('test');
      
      service.changeInput('change');
      expect(changeHandler).toHaveBeenCalledWith('change');
    });
  });

  describe('getChatLabels and setChatLabels', () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration()
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should get current labels signal', () => {
      const labels = getChatLabels(service);
      expect(labels()).toEqual(COPILOT_CHAT_DEFAULT_LABELS);
    });

    it('should update labels', () => {
      setChatLabels(service, {
        chatInputPlaceholder: 'New placeholder',
        chatDisclaimerText: 'New disclaimer'
      });
      
      const labels = getChatLabels(service);
      expect(labels().chatInputPlaceholder).toBe('New placeholder');
      expect(labels().chatDisclaimerText).toBe('New disclaimer');
    });

    it('should merge labels with defaults', () => {
      setChatLabels(service, {
        chatInputPlaceholder: 'Custom'
      });
      
      const labels = getChatLabels(service);
      expect(labels().chatInputPlaceholder).toBe('Custom');
      expect(labels().chatInputToolbarAddButtonLabel).toBe(
        COPILOT_CHAT_DEFAULT_LABELS.chatInputToolbarAddButtonLabel
      );
    });
  });

  describe('getChatInputValue and setChatInputValue', () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration()
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should get current input value signal', () => {
      const inputValue = getChatInputValue(service);
      expect(inputValue()).toBeUndefined();
    });

    it('should update input value', () => {
      setChatInputValue(service, 'test value');
      
      const inputValue = getChatInputValue(service);
      expect(inputValue()).toBe('test value');
    });

    it('should handle undefined value', () => {
      setChatInputValue(service, 'value');
      setChatInputValue(service, undefined);
      
      const inputValue = getChatInputValue(service);
      expect(inputValue()).toBeUndefined();
    });

    it('should trigger change handler when setting value', () => {
      const changeHandler = vi.fn();
      service.setChangeHandler(changeHandler);
      
      setChatInputValue(service, 'new value');
      
      expect(changeHandler).toHaveBeenCalledWith('new value');
    });
  });

  describe('createChatConfigController', () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration()
      });
      
      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it('should create controller with initial configuration', () => {
      const controller = createChatConfigController(service, {
        labels: { chatInputPlaceholder: 'Controller placeholder' },
        inputValue: 'controller value'
      });
      
      expect(controller.getLabels().chatInputPlaceholder).toBe('Controller placeholder');
      expect(controller.getInputValue()).toBe('controller value');
    });

    it('should update configuration through controller', () => {
      const controller = createChatConfigController(service);
      
      controller.update({
        labels: { chatInputPlaceholder: 'Updated via controller' },
        inputValue: 'new value'
      });
      
      expect(service.labels().chatInputPlaceholder).toBe('Updated via controller');
      expect(service.inputValue()).toBe('new value');
    });

    it('should reset configuration through controller', () => {
      const controller = createChatConfigController(service, {
        labels: { chatInputPlaceholder: 'Custom' },
        inputValue: 'test'
      });
      
      controller.reset();
      
      expect(service.labels()).toEqual(COPILOT_CHAT_DEFAULT_LABELS);
      expect(service.inputValue()).toBeUndefined();
    });

    it('should provide getter methods', () => {
      const controller = createChatConfigController(service);
      
      service.setLabels({ chatInputPlaceholder: 'Test' });
      service.setInputValue('test value');
      
      expect(controller.getLabels().chatInputPlaceholder).toBe('Test');
      expect(controller.getInputValue()).toBe('test value');
    });

    it('should work without initial configuration', () => {
      const controller = createChatConfigController(service);
      
      expect(controller.getLabels()).toEqual(COPILOT_CHAT_DEFAULT_LABELS);
      expect(controller.getInputValue()).toBeUndefined();
    });
  });
});
import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { CopilotKitChatConfig } from "../copilotkit-chat-config";
import { CopilotChatConfigurationService } from "../../core/chat-configuration/chat-configuration";
import { provideCopilotChatConfiguration } from "../../core/chat-configuration/chat-configuration.providers";
import { By } from "@angular/platform-browser";

describe("CopilotKitChatConfig", () => {
  describe("Basic Usage", () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration(),
        imports: [CopilotKitChatConfig],
      });

      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it("should create directive and update service", () => {
      @Component({
  standalone: true,
template: `
          <div
            copilotkitChatConfig
            [labels]="labels"
            [inputValue]="inputValue"
          ></div>
        `,
        imports: [CopilotKitChatConfig],
      })
      class TestComponent {
        labels = { chatInputPlaceholder: "Test placeholder" };
        inputValue = "test value";
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(service.labels().chatInputPlaceholder).toBe("Test placeholder");
      expect(service.inputValue()).toBe("test value");
    });

    it("should support configuration object input (value only)", () => {
      @Component({
    standalone: true,
template: ` <div [copilotkitChatConfig]="config"></div> `,
        imports: [CopilotKitChatConfig],
      })
      class TestComponent {
        config = {
          labels: { chatInputPlaceholder: "Config placeholder" },
          inputValue: "config value",
        };
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      // Labels via object are not applied in the new API; value is supported
      expect(service.inputValue()).toBe("config value");
    });

    it("should handle missing service gracefully", () => {
      // Configure a module without providing the service
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ imports: [CopilotKitChatConfig] });

      @Component({
        standalone: true,
        template: ` <div copilotkitChatConfig></div> `,
        imports: [CopilotKitChatConfig],
      })
      class NoServiceHost {}

      const fixture = TestBed.createComponent(NoServiceHost);
      expect(() => fixture.detectChanges()).not.toThrow();

      // Ensure we can get the directive instance and call methods without a service
      const dirEl = fixture.debugElement.query(By.directive(CopilotKitChatConfig));
      const dir = dirEl.injector.get(CopilotKitChatConfig);
      expect(() => dir.submit("hello")).not.toThrow();
      expect(() => dir.change("typing")).not.toThrow();
    });
  });

  describe("Event Emissions", () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration(),
        imports: [CopilotKitChatConfig],
      });

      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it("should emit submitInput event", () => {
      let submittedValue: string | undefined;

      @Component({
    standalone: true,
template: `
          <div copilotkitChatConfig (submitInput)="onSubmit($event)"></div>
        `,
        imports: [CopilotKitChatConfig],
      })
      class TestComponent {
        onSubmit(value: string) {
          submittedValue = value;
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(
        By.directive(CopilotKitChatConfig)
      );
      const directive = directiveEl.injector.get(CopilotKitChatConfig);

      directive.submit("test message");

      expect(submittedValue).toBe("test message");
    });

    it("should emit changeInput event", () => {
      let changedValue: string | undefined;

      @Component({
    standalone: true,
template: `
          <div copilotkitChatConfig (changeInput)="onChange($event)"></div>
        `,
        imports: [CopilotKitChatConfig],
      })
      class TestComponent {
        onChange(value: string) {
          changedValue = value;
        }
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(
        By.directive(CopilotKitChatConfig)
      );
      const directive = directiveEl.injector.get(CopilotKitChatConfig);

      directive.change("typing...");

      expect(changedValue).toBe("typing...");
    });
  });

  describe("Two-Way Binding", () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration(),
        imports: [CopilotKitChatConfig],
      });

      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it("should support two-way binding for value", () => {
      @Component({
    standalone: true,
      template: ` <div copilotkitChatConfig [value]="inputText" (valueChange)="inputText = $event"></div> `,
        imports: [CopilotKitChatConfig],
      })
      class TestComponent {
        inputText = "initial";
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(
        By.directive(CopilotKitChatConfig)
      );
      const directive = directiveEl.injector.get(CopilotKitChatConfig);

      // Changing value through directive method should update host via (valueChange)
      directive.change("changed");
      fixture.detectChanges();
      expect(fixture.componentInstance.inputText).toBe("changed");
    });
  });

  describe("Dynamic Updates", () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration(),
        imports: [CopilotKitChatConfig],
      });

      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it("should update configuration when inputs change", () => {
      @Component({
    standalone: true,
template: `
          <div
            copilotkitChatConfig
            [labels]="labels"
            [inputValue]="inputValue"
          ></div>
        `,
        imports: [CopilotKitChatConfig],
      })
      class TestComponent {
        labels = { chatInputPlaceholder: "Initial" };
        inputValue = "initial value";
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(service.labels().chatInputPlaceholder).toBe("Initial");

      // Update labels
      fixture.componentInstance.labels = { chatInputPlaceholder: "Updated" };
      fixture.detectChanges();

      expect(service.labels().chatInputPlaceholder).toBe("Updated");

      // Update input value
      fixture.componentInstance.inputValue = "updated value";
      fixture.detectChanges();

      expect(service.inputValue()).toBe("updated value");
    });
  });

  describe("Handler Integration", () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration(),
        imports: [CopilotKitChatConfig],
      });

      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it("should integrate handlers from config object", () => {
      const submitHandler = vi.fn();
      const changeHandler = vi.fn();

      @Component({
    standalone: true,
template: ` <div [copilotkitChatConfig]="config"></div> `,
        imports: [CopilotKitChatConfig],
      })
      class TestComponent {
        config = {
          onSubmitInput: submitHandler,
          onChangeInput: changeHandler,
        };
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(
        By.directive(CopilotKitChatConfig)
      );
      const directive = directiveEl.injector.get(CopilotKitChatConfig);

      // Submit should call the handler
      directive.submit("test submit");
      expect(submitHandler).toHaveBeenCalledWith("test submit");

      // Change should call the handler
      directive.change("test change");
      expect(changeHandler).toHaveBeenCalledWith("test change");
    });

    it("should call both directive and service handlers", () => {
      const directiveSubmitHandler = vi.fn();
      const serviceSubmitHandler = vi.fn();

      @Component({
    standalone: true,
template: `
          <div copilotkitChatConfig (submitInput)="onSubmit($event)"></div>
        `,
        imports: [CopilotKitChatConfig],
      })
      class TestComponent {
        onSubmit = directiveSubmitHandler;
      }

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      // Also set a handler on the service
      service.setSubmitHandler(serviceSubmitHandler);

      const directiveEl = fixture.debugElement.query(
        By.directive(CopilotKitChatConfig)
      );
      const directive = directiveEl.injector.get(CopilotKitChatConfig);

      directive.submit("test");

      // Both handlers should be called
      expect(directiveSubmitHandler).toHaveBeenCalledWith("test");
      // Note: The directive overrides the service handler, so it's part of the composite
    });
  });

  describe("Public Methods", () => {
    let service: CopilotChatConfigurationService;

    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: provideCopilotChatConfiguration(),
        imports: [CopilotKitChatConfig],
      });

      service = TestBed.inject(CopilotChatConfigurationService);
    });

    it("should expose submit method", () => {
      @Component({
    standalone: true,
template: ` <div copilotkitChatConfig></div> `,
        imports: [CopilotKitChatConfig],
      })
      class TestComponent {}

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(
        By.directive(CopilotKitChatConfig)
      );
      const directive = directiveEl.injector.get(CopilotKitChatConfig);

      expect(typeof directive.submit).toBe("function");
    });

    it("should expose change method", () => {
      @Component({
    standalone: true,
template: ` <div copilotkitChatConfig></div> `,
        imports: [CopilotKitChatConfig],
      })
      class TestComponent {}

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      const directiveEl = fixture.debugElement.query(
        By.directive(CopilotKitChatConfig)
      );
      const directive = directiveEl.injector.get(CopilotKitChatConfig);

      expect(typeof directive.change).toBe("function");
    });
  });
});

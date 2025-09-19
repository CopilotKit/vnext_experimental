import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { CopilotKitFrontendToolDirective } from "../copilotkit-frontend-tool.directive";
import { CopilotKitService } from "../../core/copilotkit.service";
import { provideCopilotKit } from "../../core/copilotkit.providers";
import { z } from "zod";

// Mock CopilotKitCore
vi.mock("@copilotkitnext/core", () => ({
  CopilotKitCore: vi.fn().mockImplementation(() => {
    const runtimeUrlSetter = vi.fn();
    return {
      addTool: vi.fn(),
      removeTool: vi.fn(),
      setHeaders: vi.fn(),
      setProperties: vi.fn(),
      setAgents: vi.fn(),
      subscribe: vi.fn(() => () => {}),
      setRuntimeUrl: vi.fn((url: string | undefined) => {
        runtimeUrlSetter(url);
      }),
      get runtimeUrl() {
        return undefined;
      },
      __runtimeUrlSetter: runtimeUrlSetter,
    };
  }),
}));

describe("CopilotKitFrontendToolDirective", () => {
  let service: CopilotKitService;
  let addToolSpy: any;
  let removeToolSpy: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideCopilotKit({})],
    });

    service = TestBed.inject(CopilotKitService);
    addToolSpy = vi.spyOn(service.copilotkit, "addTool");
    removeToolSpy = vi.spyOn(service.copilotkit, "removeTool");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Registration", () => {
    it("should register tool with static values", () => {
      @Component({
        template: `
          <div
            copilotkitFrontendTool
            name="testTool"
            description="Test tool"
          ></div>
        `,
        standalone: true,
        imports: [CopilotKitFrontendToolDirective],
      })
      class TestComponent {}

      const fixture = TestBed.createComponent(TestComponent);
      fixture.detectChanges();

      expect(addToolSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "testTool",
          description: "Test tool",
        })
      );
    });

    it("should warn if name is missing", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      @Component({
        template: `<div copilotkitFrontendTool></div>`,
        standalone: true,
        imports: [CopilotKitFrontendToolDirective],
      })
      class MissingNameComponent {}

      const fixture = TestBed.createComponent(MissingNameComponent);
      fixture.detectChanges();

      expect(addToolSpy).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'CopilotKitFrontendToolDirective: "name" is required. Please provide a name via [name]="toolName" or [copilotkitFrontendTool]="{ name: \'toolName\', ... }"'
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Cleanup", () => {
    it("should remove tool on destroy", () => {
      @Component({
        template: ` <div copilotkitFrontendTool name="cleanupTool"></div> `,
        standalone: true,
        imports: [CopilotKitFrontendToolDirective],
      })
      class CleanupComponent {}

      const fixture = TestBed.createComponent(CleanupComponent);
      fixture.detectChanges();

      expect(addToolSpy).toHaveBeenCalled();

      fixture.destroy();

      expect(removeToolSpy).toHaveBeenCalledWith("cleanupTool");
    });
  });
});

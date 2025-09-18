import { Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { CopilotKitFrontendTool } from "../copilotkit-frontend-tool";
import { CopilotKit } from "../../core/copilotkit";
import { provideCopilotKit } from "../../core/copilotkit.providers";
import { z } from "zod";

// Mock CopilotKitCore
jest.mock("@copilotkitnext/core", () => ({
  CopilotKitCore: vi.fn().mockImplementation(() => ({
    addTool: vi.fn(),
    removeTool: vi.fn(),
    setRuntimeUrl: vi.fn(),
    setHeaders: vi.fn(),
    setProperties: vi.fn(),
    setAgents: vi.fn(),
    subscribe: vi.fn(() => () => {}),
  })),
}));

describe("CopilotKitFrontendTool", () => {
  let service: CopilotKit;
  let addToolSpy: any;
  let removeToolSpy: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideCopilotKit({})],
    });

    service = TestBed.inject(CopilotKit);
    addToolSpy = vi.spyOn(service.copilotkit, "addTool");
    removeToolSpy = vi.spyOn(service.copilotkit, "removeTool");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Registration", () => {
    it("should register tool with static values", () => {
      @Component({
  standalone: true,
template: `
          <div
            copilotkitFrontendTool
            name="testTool"
            description="Test tool"
          ></div>
        `,
        imports: [CopilotKitFrontendTool],
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
    standalone: true,
template: `<div copilotkitFrontendTool></div>`,
        imports: [CopilotKitFrontendTool],
      })
      class MissingNameComponent {}

      const fixture = TestBed.createComponent(MissingNameComponent);
      fixture.detectChanges();

      expect(addToolSpy).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        'CopilotKitFrontendTool: "name" is required. Please provide a name via [name]="toolName" or [copilotkitFrontendTool]="{ name: \'toolName\', ... }"'
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Cleanup", () => {
    it("should remove tool on destroy", () => {
      @Component({
    standalone: true,
template: ` <div copilotkitFrontendTool name="cleanupTool"></div> `,
        imports: [CopilotKitFrontendTool],
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

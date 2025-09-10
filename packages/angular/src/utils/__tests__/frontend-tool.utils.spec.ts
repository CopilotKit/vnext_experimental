import { TestBed } from "@angular/core/testing";
import { Component } from "@angular/core";
import { addFrontendTool, removeFrontendTool } from "../frontend-tool.utils";
import { CopilotKitService } from "../../core/copilotkit.service";
import { provideCopilotKit } from "../../core/copilotkit.providers";
import { z } from "zod";

// Mock CopilotKitCore
vi.mock("@copilotkitnext/core", () => ({
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

// Mock component for testing
@Component({
  template: `<div>Mock Tool Render</div>`,
  standalone: true,
})
class MockRenderComponent {}

describe("Frontend Tool Utils", () => {
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

  describe("addFrontendTool", () => {
    it("should add tool to CopilotKit", () => {
      const tool = {
        name: "testTool",
        description: "Test tool",
        parameters: z.object({ value: z.string() }),
        handler: vi.fn(async () => "result"),
      };

      const cleanup = addFrontendTool(service, tool);

      expect(addToolSpy).toHaveBeenCalledWith(tool);
      expect(typeof cleanup).toBe("function");

      cleanup();
    });

    it("should register render when provided", () => {
      const tool = {
        name: "renderTool",
        description: "Tool with render",
        render: MockRenderComponent,
      };

      const cleanup = addFrontendTool(service, tool);

      const renders = service.currentRenderToolCalls();
      const renderTool = renders.find((r) => r.name === "renderTool");
      expect(renderTool).toBeDefined();
      expect(renderTool?.render).toBe(MockRenderComponent);

      cleanup();
    });

    it("should return cleanup function that removes tool and render", () => {
      const tool = {
        name: "cleanupTool",
        description: "Tool to cleanup",
        render: MockRenderComponent,
      };

      const cleanup = addFrontendTool(service, tool);

      // Verify tool was added
      expect(addToolSpy).toHaveBeenCalledWith(tool);
      let renders = service.currentRenderToolCalls();
      expect(renders.find((r) => r.name === "cleanupTool")).toBeDefined();

      // Execute cleanup
      cleanup();

      // Verify tool was removed
      expect(removeToolSpy).toHaveBeenCalledWith("cleanupTool");
      renders = service.currentRenderToolCalls();
      expect(renders.find((r) => r.name === "cleanupTool")).toBeUndefined();
    });

    it("should handle tool without parameters", () => {
      const tool = {
        name: "noParams",
        description: "No parameters tool",
        handler: vi.fn(async () => "result"),
      };

      const cleanup = addFrontendTool(service, tool);

      expect(addToolSpy).toHaveBeenCalledWith(tool);

      cleanup();
    });

    it("should warn about duplicate render names", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Pre-register a render
      service.setCurrentRenderToolCalls([
        {
          name: "duplicateTool",
          render: MockRenderComponent,
        },
      ]);

      const tool = {
        name: "duplicateTool",
        render: MockRenderComponent,
      };

      const cleanup = addFrontendTool(service, tool);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("already has a render")
      );

      consoleSpy.mockRestore();
      cleanup();
    });

    it("should handle complex parameter schemas", () => {
      const complexSchema = z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
        settings: z.object({
          theme: z.enum(["light", "dark"]),
          notifications: z.boolean(),
        }),
        items: z.array(z.string()),
      });

      const tool = {
        name: "complexTool",
        parameters: complexSchema,
        handler: vi.fn(),
      };

      const cleanup = addFrontendTool(service, tool);

      expect(addToolSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "complexTool",
          parameters: complexSchema,
        })
      );

      cleanup();
    });
  });

  describe("removeFrontendTool", () => {
    it("should remove tool from CopilotKit", () => {
      removeFrontendTool(service, "testTool");
      expect(removeToolSpy).toHaveBeenCalledWith("testTool");
    });

    it("should remove render if exists", () => {
      // Setup a tool with render
      service.setCurrentRenderToolCalls([
        {
          name: "toolWithRender",
          render: MockRenderComponent,
        },
      ]);

      removeFrontendTool(service, "toolWithRender");

      expect(removeToolSpy).toHaveBeenCalledWith("toolWithRender");
      const renders = service.currentRenderToolCalls();
      expect(renders.find((r) => r.name === "toolWithRender")).toBeUndefined();
    });

    it("should handle removing non-existent tool gracefully", () => {
      expect(() => {
        removeFrontendTool(service, "nonExistent");
      }).not.toThrow();

      expect(removeToolSpy).toHaveBeenCalledWith("nonExistent");
    });

    it("should only remove specified tool", () => {
      // Setup multiple tools
      service.setCurrentRenderToolCalls([
        { name: "tool1", render: MockRenderComponent },
        { name: "tool2", render: MockRenderComponent },
        { name: "tool3", render: MockRenderComponent },
      ]);

      removeFrontendTool(service, "tool2");

      const renders = service.currentRenderToolCalls();
      expect(renders.find((r) => r.name === "tool1")).toBeDefined();
      expect(renders.find((r) => r.name === "tool2")).toBeUndefined();
      expect(renders.find((r) => r.name === "tool3")).toBeDefined();
    });
  });

  describe("Service Integration", () => {
    it("should work with service render methods", () => {
      const tool = {
        name: "serviceTool",
        render: MockRenderComponent,
      };

      // Test registerToolRender
      service.registerToolRender("serviceTool", {
        name: "serviceTool",
        render: MockRenderComponent,
      });

      expect(service.getToolRender("serviceTool")).toBeDefined();

      // Test unregisterToolRender
      service.unregisterToolRender("serviceTool");
      expect(service.getToolRender("serviceTool")).toBeUndefined();
    });

    it("should handle multiple tools with renders", () => {
      const tools = [
        { name: "tool1", render: MockRenderComponent },
        { name: "tool2", render: MockRenderComponent },
        { name: "tool3", render: MockRenderComponent },
      ];

      const cleanups = tools.map((tool) => addFrontendTool(service, tool));

      // All tools should be registered
      expect(addToolSpy).toHaveBeenCalledTimes(3);
      const renders = service.currentRenderToolCalls();
      expect(renders.find((r) => r.name === "tool1")).toBeDefined();
      expect(renders.find((r) => r.name === "tool2")).toBeDefined();
      expect(renders.find((r) => r.name === "tool3")).toBeDefined();

      // Cleanup all
      cleanups.forEach((cleanup) => cleanup());

      // All tools should be removed
      expect(removeToolSpy).toHaveBeenCalledTimes(3);
    });
  });
});

import { TestBed } from "@angular/core/testing";
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

describe("Frontend Tool Integration", () => {
  let service: CopilotKitService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideCopilotKit({})],
    });
    service = TestBed.inject(CopilotKitService);
  });

  describe("Service Tool Render Methods", () => {
    it("should register tool render", () => {
      const render = {
        name: "testTool",
        render: {} as any, // Mock component
      };

      service.registerToolRender("testTool", render);

      const retrieved = service.getToolRender("testTool");
      expect(retrieved).toBe(render);
    });

    it("should unregister tool render", () => {
      const render = {
        name: "removeTool",
        render: {} as any,
      };

      service.registerToolRender("removeTool", render);
      expect(service.getToolRender("removeTool")).toBeDefined();

      service.unregisterToolRender("removeTool");
      expect(service.getToolRender("removeTool")).toBeUndefined();
    });

    it("should warn when overwriting render", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      service.registerToolRender("dupeTool", {
        name: "dupeTool",
        render: {} as any,
      });

      service.registerToolRender("dupeTool", {
        name: "dupeTool",
        render: {} as any,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("being overwritten")
      );

      consoleSpy.mockRestore();
    });

    it("should handle multiple tool renders", () => {
      const tools = ["tool1", "tool2", "tool3"];

      tools.forEach((name) => {
        service.registerToolRender(name, {
          name: name,
          render: {} as any,
        });
      });

      tools.forEach((name) => {
        expect(service.getToolRender(name)).toBeDefined();
      });

      // Remove middle one
      service.unregisterToolRender("tool2");

      expect(service.getToolRender("tool1")).toBeDefined();
      expect(service.getToolRender("tool2")).toBeUndefined();
      expect(service.getToolRender("tool3")).toBeDefined();
    });
  });

  describe("Tool Registration Flow", () => {
    it("should add tool to copilotkit instance", () => {
      const addToolSpy = vi.spyOn(service.copilotkit, "addTool");

      const tool = {
        name: "flowTool",
        description: "Test flow",
        parameters: z.object({ input: z.string() }),
      };

      service.copilotkit.addTool(tool);

      expect(addToolSpy).toHaveBeenCalledWith(tool);
    });

    it("should remove tool from copilotkit instance", () => {
      const removeToolSpy = vi.spyOn(service.copilotkit, "removeTool");

      service.copilotkit.removeTool("testTool");

      expect(removeToolSpy).toHaveBeenCalledWith("testTool");
    });

    it("should handle tool with all properties", () => {
      const addToolSpy = vi.spyOn(service.copilotkit, "addTool");

      const tool = {
        name: "fullTool",
        description: "Full featured tool",
        parameters: z.object({
          query: z.string(),
          filters: z.object({
            category: z.enum(["a", "b", "c"]),
          }),
        }),
        handler: vi.fn(async () => ({ results: [] })),
        followUp: true,
      };

      service.copilotkit.addTool(tool);

      expect(addToolSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "fullTool",
          description: "Full featured tool",
          followUp: true,
        })
      );
    });
  });

  describe("Render Tool Calls State", () => {
    it("should update current render tool calls", () => {
      const initial = service.currentRenderToolCalls();
      expect(initial).toEqual([]);

      const renders = [
        { name: "tool1", render: {} as any },
        { name: "tool2", render: {} as any },
      ];

      service.setCurrentRenderToolCalls(renders);

      expect(service.currentRenderToolCalls()).toEqual(renders);
    });

    it("should merge renders when registering", () => {
      service.setCurrentRenderToolCalls([
        { name: "existing", render: {} as any },
      ]);

      service.registerToolRender("newTool", {
        name: "newTool",
        render: {} as any,
      });

      const renders = service.currentRenderToolCalls();
      expect(renders.find((r) => r.name === "existing")).toBeDefined();
      expect(renders.find((r) => r.name === "newTool")).toBeDefined();
    });

    it("should preserve other renders when unregistering", () => {
      service.setCurrentRenderToolCalls([
        { name: "keep1", render: {} as any },
        { name: "remove", render: {} as any },
        { name: "keep2", render: {} as any },
      ]);

      service.unregisterToolRender("remove");

      const renders = service.currentRenderToolCalls();
      expect(renders.map((r) => r.name)).toEqual(["keep1", "keep2"]);
    });
  });
});

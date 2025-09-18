import {
  Component,
  DestroyRef,
  Injectable,
  inject,
  input,
} from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { CopilotKit } from "./copilotkit";
import {
  ClientToolCall,
  ClientToolRenderer,
  registerClientTool,
} from "./client-tool";
import { provideCopilotKit } from "./config";
import { ToolCallStatus } from "@copilotkitnext/core";
import { RenderToolCalls } from "./render-tool-calls.component";
import { AssistantMessage, ToolCall } from "@ag-ui/client";

@Component({
  selector: "test-tool-renderer",
  standalone: true,
  template: "",
})
class TestToolRenderer implements ClientToolRenderer<{ query: string }> {
  readonly toolCall = input.required<ClientToolCall<{ query: string }>>();
}

@Component({
  selector: "test-wildcard-renderer",
  standalone: true,
  template: "",
})
class TestWildcardRenderer implements ClientToolRenderer<{ value?: string }> {
  readonly toolCall = input.required<ClientToolCall<{ value?: string }>>();
}

@Injectable({ providedIn: "root" })
class DependencyService {
  calls: string[] = [];

  record(value: string) {
    this.calls.push(value);
    return `handled:${value}`;
  }
}

@Component({
  selector: "test-host",
  standalone: true,
  template: "",
})
class TestHostComponent {
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    registerClientTool({
      name: "dependency_tool",
      description: "Uses DependencyService",
      agentId: "agent-one",
      parameters: z.object({ value: z.string() }),
      renderer: TestToolRenderer,
      handler: async ({ value }) => {
        const service = inject(DependencyService);
        return service.record(value);
      },
    });

    this.destroyRef.onDestroy(() => {
      // noop to ensure destroy ref is active
    });
  }
}

describe("CopilotKit", () => {
  it("initializes core with config tools and renderers", () => {
    // Arrange
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideCopilotKit({
          headers: { Authorization: "Bearer token" },
          tools: [
            {
              name: "search",
              description: "Search tool",
              parameters: z.object({ query: z.string() }),
              handler: async () => "done",
              renderer: TestToolRenderer,
            },
          ],
          renderToolCalls: [
            {
              name: "custom",
              args: z.object({ query: z.string() }),
              component: TestToolRenderer,
            },
          ],
        }),
      ],
      imports: [TestToolRenderer],
    });

    // Act
    const copilotKit = TestBed.inject(CopilotKit);

    // Assert
    expect(Object.keys(copilotKit.core.tools)).toContain("search");
    expect(copilotKit.renderToolCalls().map((rc) => rc.name)).toEqual([
      "custom",
      "search",
    ]);
  });

  it("registers client tools with injection-bound handlers and cleans up on destroy", async () => {
    // Arrange
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideCopilotKit({})],
      imports: [TestHostComponent, TestToolRenderer],
    });
    const dependency = TestBed.inject(DependencyService);
    const copilotKit = TestBed.inject(CopilotKit);
    const fixture = TestBed.createComponent(TestHostComponent);

    // Act
    const tool = copilotKit.core.tools["dependency_tool"];
    const handlerResult = await tool.handler?.({ value: "hello" });
    fixture.destroy();

    // Assert
    expect(handlerResult).toBe("handled:hello");
    expect(dependency.calls).toEqual(["hello"]);
    expect(copilotKit.core.tools["dependency_tool"]).toBeUndefined();
    expect(
      copilotKit
        .renderToolCalls()
        .find((candidate) => candidate.name === "dependency_tool")
    ).toBeUndefined();
  });
});

describe("RenderToolCalls", () => {
  it("picks agent-specific renderers and parses tool arguments", () => {
    // Arrange
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideCopilotKit({
          renderToolCalls: [
            {
              name: "specific",
              args: z.object({ query: z.string() }),
              component: TestToolRenderer,
              agentId: "agent-a",
            },
            {
              name: "*",
              args: z.object({ value: z.string().optional() }),
              component: TestWildcardRenderer,
            },
          ],
        }),
      ],
      imports: [TestToolRenderer, TestWildcardRenderer],
    });
    const toolCall = {
      id: "call-1",
      type: "function",
      function: { name: "specific", arguments: '{"query":"Angular"}' },
    } as ToolCall;
    const message = {
      id: "assistant-1",
      role: "assistant",
      content: "",
      agentId: "agent-a",
      toolCalls: [toolCall],
    } as AssistantMessage;
    const renderComponentInstance = TestBed.runInInjectionContext(
      () => new RenderToolCalls()
    );
    Object.defineProperty(renderComponentInstance, "message", {
      value: (() => message) as typeof renderComponentInstance.message,
    });

    // Act
    const renderConfig = renderComponentInstance.pickRenderer("specific");
    const built = renderComponentInstance.buildToolCall(
      toolCall,
      renderConfig!
    );
    const fallback = renderComponentInstance.pickRenderer("unknown");

    // Assert
    expect(renderConfig?.component).toBe(TestToolRenderer);
    expect(built.status).toBe(ToolCallStatus.InProgress);
    expect(built.args).toEqual({ query: "Angular" });
    expect(fallback?.component).toBe(TestWildcardRenderer);
  });
});

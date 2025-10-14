import { Component, input } from "@angular/core";
import { FrontendToolConfig, ToolRenderer } from "@copilotkitnext/angular";
import { JsonPipe } from "@angular/common";
import { AngularToolCall } from "@copilotkitnext/angular";
import { z } from "zod";

@Component({
  selector: "app-hello-world-tool",
  template: ` <pre>{{ toolCall() | json }}</pre> `,
  standalone: true,
  imports: [JsonPipe],
})
export class HelloWorldTool implements ToolRenderer {
  toolCall = input.required<AngularToolCall>();
}

export const helloWorldToolConfig: FrontendToolConfig = {
  name: "hello_world",
  description: "Says hello to the world",
  args: z.object({
    name: z.string(),
  }),
  component: HelloWorldTool,
  handler: async (args) => {
    return `Hello ${args.name}!`;
  },
};

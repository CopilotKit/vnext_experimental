import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import {
  CopilotChatComponent,
  provideCopilotKit,
  provideCopilotChatConfiguration,
  CopilotKitConfigDirective,
} from '@copilotkit/angular';

const meta: Meta<CopilotChatComponent> = {
  title: 'Live/CopilotChat',
  component: CopilotChatComponent,
  decorators: [
    moduleMetadata({
      imports: [CommonModule, CopilotChatComponent, CopilotKitConfigDirective],
      providers: [
        provideCopilotKit({}),
        provideCopilotChatConfiguration({})
      ],
    }),
  ],
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<CopilotChatComponent>;

export const Default: Story = {
  render: () => ({
    template: `
      <div style="height: 100vh; margin: 0; padding: 0; overflow: hidden;"
           copilotkitConfig
           [runtimeUrl]="'http://localhost:3001/api/copilotkit'">
        <copilot-chat [threadId]="'xyz'"></copilot-chat>
      </div>
    `,
    props: {},
  }),
};
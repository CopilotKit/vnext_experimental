import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { fn } from '@storybook/test';
import { 
  CopilotChatInputComponent,
  provideCopilotChatConfiguration,
} from '@copilotkit/angular';

// Custom button component for reuse
@Component({
  selector: 'airplane-send-button',
  standalone: true,
  template: `
    <button
      [disabled]="disabled"
      (click)="handleClick()"
      class="rounded-full w-10 h-10 bg-blue-500 text-white hover:bg-blue-600 transition-colors mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      ✈️
    </button>
  `
})
class AirplaneSendButtonComponent {
  @Input() disabled = false;
  @Output() click = new EventEmitter<void>();
  
  handleClick(): void {
    if (!this.disabled) {
      this.click.emit();
    }
  }
}

// Rocket button component
@Component({
  selector: 'rocket-send-button',
  standalone: true,
  template: `
    <button
      [disabled]="disabled"
      (click)="handleClick()"
      class="rounded-full w-10 h-10 bg-green-500 text-white hover:bg-green-600 transition-colors mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      🚀
    </button>
  `
})
class RocketSendButtonComponent {
  @Input() disabled = false;
  @Output() click = new EventEmitter<void>();
  
  handleClick(): void {
    if (!this.disabled) {
      this.click.emit();
    }
  }
}

const meta: Meta = {
  title: 'UI/Slot System',
  decorators: [
    moduleMetadata({
      imports: [
        CommonModule, 
        CopilotChatInputComponent,
        AirplaneSendButtonComponent,
        RocketSendButtonComponent
      ],
      providers: [
        provideCopilotChatConfiguration({
          labels: {
            chatInputPlaceholder: 'Type a message...',
          }
        })
      ],
    }),
  ],
};

export default meta;
type Story = StoryObj;

// Example 1: Template slot
export const TemplateSlot: Story = {
  name: '1. Template Slot (Full Control)',
  render: () => ({
    props: {
      submitMessage: fn(),
    },
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3 style="margin-bottom: 10px;">Use ng-template for full control:</h3>
        <pre style="background: #282c34; color: #abb2bf; padding: 10px; border-radius: 4px;">
&lt;copilot-chat-input&gt;
  &lt;ng-template #sendButton let-send="send" let-disabled="disabled"&gt;
    &lt;button (click)="send()" [disabled]="disabled"&gt;
      Send 🎯
    &lt;/button&gt;
  &lt;/ng-template&gt;
&lt;/copilot-chat-input&gt;</pre>
        
        <!-- Use the component -->
        <div style="margin-top: 20px;">
          <copilot-chat-input
            (submitMessage)="submitMessage($event)">
            <ng-template #sendButton let-send="send" let-disabled="disabled">
              <button 
                (click)="send()" 
                [disabled]="disabled"
                class="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50">
                Send 🎯
              </button>
            </ng-template>
          </copilot-chat-input>
        </div>
      </div>
    `,
  }),
};

// Example 2: Component in template
export const ComponentInTemplate: Story = {
  name: '2. Component in Template',
  render: () => ({
    props: {
      submitMessage: fn(),
    },
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3 style="margin-bottom: 10px;">Use a custom component inside template:</h3>
        <pre style="background: #282c34; color: #abb2bf; padding: 10px; border-radius: 4px;">
&lt;copilot-chat-input&gt;
  &lt;ng-template #sendButton let-send="send" let-disabled="disabled"&gt;
    &lt;airplane-send-button 
      [disabled]="disabled" 
      (click)="send()"&gt;
    &lt;/airplane-send-button&gt;
  &lt;/ng-template&gt;
&lt;/copilot-chat-input&gt;</pre>
        
        <!-- Use the component -->
        <div style="margin-top: 20px;">
          <copilot-chat-input
            (submitMessage)="submitMessage($event)">
            <ng-template #sendButton let-send="send" let-disabled="disabled">
              <airplane-send-button 
                [disabled]="disabled" 
                (click)="send()">
              </airplane-send-button>
            </ng-template>
          </copilot-chat-input>
        </div>
      </div>
    `,
  }),
};

// Example 3: Props for tweaking defaults
export const PropsForDefaults: Story = {
  name: '3. Props for Tweaking Defaults',
  render: () => ({
    props: {
      submitMessage: fn(),
      buttonProps: {
        className: 'rounded-lg px-6 py-3 bg-indigo-600 text-white font-bold hover:bg-indigo-700',
      }
    },
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3 style="margin-bottom: 10px;">Tweak default component with props:</h3>
        <pre style="background: #282c34; color: #abb2bf; padding: 10px; border-radius: 4px;">
&lt;copilot-chat-input [sendButtonProps]="buttonProps"&gt;
&lt;/copilot-chat-input&gt;

buttonProps = {
  className: 'rounded-lg px-6 py-3 bg-indigo-600 text-white'
}</pre>
        
        <!-- Use the component -->
        <div style="margin-top: 20px;">
          <copilot-chat-input
            [sendButtonProps]="buttonProps"
            (submitMessage)="submitMessage($event)">
          </copilot-chat-input>
        </div>
      </div>
    `,
  }),
};

// Example 4: Direct component (backward compat)
export const DirectComponent: Story = {
  name: '4. Direct Component (Backward Compatible)',
  render: () => ({
    props: {
      submitMessage: fn(),
      SendButton: RocketSendButtonComponent,
    },
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3 style="margin-bottom: 10px;">Pass component directly (backward compat):</h3>
        <pre style="background: #282c34; color: #abb2bf; padding: 10px; border-radius: 4px;">
&lt;copilot-chat-input [sendButtonSlot]="RocketSendButtonComponent"&gt;
&lt;/copilot-chat-input&gt;</pre>
        
        <!-- Use the component -->
        <div style="margin-top: 20px;">
          <copilot-chat-input
            [sendButtonSlot]="SendButton"
            (submitMessage)="submitMessage($event)">
          </copilot-chat-input>
        </div>
      </div>
    `,
  }),
};

// Example 5: Multiple slots
export const MultipleSlots: Story = {
  name: '5. Multiple Slots',
  render: () => ({
    props: {
      submitMessage: fn(),
      toolbarProps: {
        className: 'bg-gray-100 rounded-b-xl'
      }
    },
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3 style="margin-bottom: 10px;">Customize multiple parts at once:</h3>
        <pre style="background: #282c34; color: #abb2bf; padding: 10px; border-radius: 4px;">
&lt;copilot-chat-input [toolbarProps]="toolbarProps"&gt;
  &lt;ng-template #sendButton let-send="send" let-disabled="disabled"&gt;
    &lt;rocket-send-button [disabled]="disabled" (click)="send()"&gt;
    &lt;/rocket-send-button&gt;
  &lt;/ng-template&gt;
&lt;/copilot-chat-input&gt;</pre>
        
        <!-- Use the component -->
        <div style="margin-top: 20px;">
          <copilot-chat-input
            [toolbarProps]="toolbarProps"
            (submitMessage)="submitMessage($event)">
            <ng-template #sendButton let-send="send" let-disabled="disabled">
              <rocket-send-button 
                [disabled]="disabled" 
                (click)="send()">
              </rocket-send-button>
            </ng-template>
          </copilot-chat-input>
        </div>
      </div>
    `,
  }),
};

// Example 6: Pure defaults
export const PureDefaults: Story = {
  name: '6. Pure Defaults',
  render: () => ({
    props: {
      submitMessage: fn(),
    },
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3 style="margin-bottom: 10px;">Use all defaults - no customization needed:</h3>
        <pre style="background: #282c34; color: #abb2bf; padding: 10px; border-radius: 4px;">
&lt;copilot-chat-input&gt;&lt;/copilot-chat-input&gt;</pre>
        
        <!-- Use the component -->
        <div style="margin-top: 20px;">
          <copilot-chat-input
            (submitMessage)="submitMessage($event)">
          </copilot-chat-input>
        </div>
      </div>
    `,
  }),
};
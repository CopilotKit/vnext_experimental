import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { fn } from '@storybook/test';
import { 
  CopilotChatInputComponent,
  provideCopilotChatConfiguration,
} from '@copilotkit/angular';
import { SmartSlotDirective, SlotRegistryService } from '@copilotkit/angular';

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
        SmartSlotDirective,
        AirplaneSendButtonComponent,
        RocketSendButtonComponent
      ],
      providers: [
        SlotRegistryService,
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

// Example 1: Simple class override
export const ClassOverride: Story = {
  name: '1. Class Override (Simplest)',
  render: () => ({
    props: {
      submitMessage: fn(),
    },
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3 style="margin-bottom: 10px;">Override button class with a string:</h3>
        <pre style="background: #282c34; color: #abb2bf; padding: 10px; border-radius: 4px;">
&lt;slot name="chat.input.sendButton" 
      class="rounded-full w-12 h-12 bg-purple-600 text-white"&gt;&lt;/slot&gt;</pre>
        
        <!-- Register the slot -->
        <slot name="chat.input.sendButton" 
              class="rounded-full w-12 h-12 bg-purple-600 text-white hover:bg-purple-700"></slot>
        
        <!-- Use the component -->
        <div style="margin-top: 20px;">
          <copilot-chat-input
            (submitMessage)="submitMessage($event)"
          ></copilot-chat-input>
        </div>
      </div>
    `,
  }),
};

// Example 2: Template slot
export const TemplateSlot: Story = {
  name: '2. Template Slot',
  render: () => ({
    props: {
      submitMessage: fn(),
    },
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3 style="margin-bottom: 10px;">Use ng-template for full control:</h3>
        <pre style="background: #282c34; color: #abb2bf; padding: 10px; border-radius: 4px;">
&lt;ng-template slot="chat.input.sendButton" let-props&gt;
  &lt;button (click)="props.click()" [disabled]="props.disabled"&gt;
    Send 🎯
  &lt;/button&gt;
&lt;/ng-template&gt;</pre>
        
        <!-- Register the slot template -->
        <ng-template slot="chat.input.sendButton" let-props>
          <button 
            (click)="props.click()" 
            [disabled]="props.disabled"
            class="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50">
            Send 🎯
          </button>
        </ng-template>
        
        <!-- Use the component -->
        <div style="margin-top: 20px;">
          <copilot-chat-input
            (submitMessage)="submitMessage($event)"
          ></copilot-chat-input>
        </div>
      </div>
    `,
  }),
};

// Example 3: Component slot
export const ComponentSlot: Story = {
  name: '3. Component Slot',
  render: () => ({
    props: {
      submitMessage: fn(),
    },
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3 style="margin-bottom: 10px;">Use a custom component:</h3>
        <pre style="background: #282c34; color: #abb2bf; padding: 10px; border-radius: 4px;">
&lt;airplane-send-button slot="chat.input.sendButton"&gt;&lt;/airplane-send-button&gt;</pre>
        
        <!-- Register the component as a slot -->
        <airplane-send-button slot="chat.input.sendButton"></airplane-send-button>
        
        <!-- Use the component -->
        <div style="margin-top: 20px;">
          <copilot-chat-input
            (submitMessage)="submitMessage($event)"
          ></copilot-chat-input>
        </div>
      </div>
    `,
  }),
};

// Example 4: Props object
export const PropsObject: Story = {
  name: '4. Props Object (All Properties)',
  render: () => ({
    props: {
      submitMessage: fn(),
      buttonProps: {
        className: 'rounded-lg px-6 py-3 bg-indigo-600 text-white font-bold',
        style: { boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
        'aria-label': 'Send your message',
        'data-testid': 'custom-send-btn',
        title: 'Click to send message'
      }
    },
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3 style="margin-bottom: 10px;">Override all properties with an object:</h3>
        <pre style="background: #282c34; color: #abb2bf; padding: 10px; border-radius: 4px;">
&lt;slot name="chat.input.sendButton" [props]="buttonProps"&gt;&lt;/slot&gt;

buttonProps = {
  className: 'rounded-lg px-6 py-3 bg-indigo-600 text-white',
  style: { boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  'aria-label': 'Send your message',
  'data-testid': 'custom-send-btn'
}</pre>
        
        <!-- Register the props -->
        <slot name="chat.input.sendButton" [props]="buttonProps"></slot>
        
        <!-- Use the component -->
        <div style="margin-top: 20px;">
          <copilot-chat-input
            (submitMessage)="submitMessage($event)"
          ></copilot-chat-input>
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
    },
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3 style="margin-bottom: 10px;">Customize multiple parts at once:</h3>
        <pre style="background: #282c34; color: #abb2bf; padding: 10px; border-radius: 4px;">
&lt;!-- Different slot types for different parts --&gt;
&lt;slot name="chat.input.sendButton" class="custom-button"&gt;&lt;/slot&gt;
&lt;ng-template slot="chat.input.toolbar" let-props&gt;...&lt;/ng-template&gt;
&lt;rocket-send-button slot="chat.input.transcribeButton"&gt;&lt;/rocket-send-button&gt;</pre>
        
        <!-- Register multiple slots -->
        <slot name="chat.input.sendButton" 
              class="rounded-full w-10 h-10 bg-gradient-to-r from-pink-500 to-red-500 text-white"></slot>
        
        <ng-template slot="chat.input.toolbar" let-props>
          <div style="padding: 8px; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 0 0 16px 16px;">
            Custom Toolbar Content
          </div>
        </ng-template>
        
        <rocket-send-button slot="chat.input.transcribeButton"></rocket-send-button>
        
        <!-- Use the component -->
        <div style="margin-top: 20px;">
          <copilot-chat-input
            (submitMessage)="submitMessage($event)"
          ></copilot-chat-input>
        </div>
      </div>
    `,
  }),
};

// Example 6: Dynamic slots
export const DynamicSlots: Story = {
  name: '6. Dynamic Slots',
  render: () => ({
    props: {
      submitMessage: fn(),
      currentTheme: 'blue',
      toggleTheme() {
        this.currentTheme = this.currentTheme === 'blue' ? 'green' : 'blue';
      }
    },
    template: `
      <div style="padding: 20px; background: #f5f5f5;">
        <h3 style="margin-bottom: 10px;">Change slots dynamically:</h3>
        
        <button (click)="toggleTheme()" 
                style="margin-bottom: 10px; padding: 8px 16px; background: #4a5568; color: white; border-radius: 4px;">
          Toggle Theme (Current: {{ currentTheme }})
        </button>
        
        <!-- Dynamic slot based on theme -->
        <ng-container [ngSwitch]="currentTheme">
          <airplane-send-button *ngSwitchCase="'blue'" slot="chat.input.sendButton"></airplane-send-button>
          <rocket-send-button *ngSwitchCase="'green'" slot="chat.input.sendButton"></rocket-send-button>
        </ng-container>
        
        <!-- Use the component -->
        <div style="margin-top: 20px;">
          <copilot-chat-input
            (submitMessage)="submitMessage($event)"
          ></copilot-chat-input>
        </div>
      </div>
    `,
  }),
};
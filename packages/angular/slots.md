# Angular CopilotKit Component Slots Documentation

This document provides a comprehensive inventory of all customization slots available in the Angular CopilotKit components. Each slot can be customized using templates, components, or CSS classes.

## Table of Contents
- [Overview](#overview)
- [Slot Types](#slot-types)
- [Component Inventory](#component-inventory)
  - [CopilotChatView](#copilotchatview)
  - [CopilotChatMessageView](#copilotchatmessageview)
  - [CopilotChatAssistantMessage](#copilotchatassistantmessage)
  - [CopilotChatUserMessage](#copilotchatusermessage)
  - [CopilotChatInput](#copilotchatinput)
- [Context Interfaces](#context-interfaces)
- [Usage Patterns](#usage-patterns)

## Overview

Angular CopilotKit components provide extensive customization through a slot system. Each slot accepts:
- **Templates** (`TemplateRef<any>`) - Using `ng-template` with context variables
- **Components** (`Type<any>`) - Custom Angular components
- **CSS Classes** (`string`) - For styling customization

## Slot Types

### 1. Template Slots
- Defined using `@ContentChild('slotName', { read: TemplateRef })`
- Used with `<ng-template #slotName>`
- Receive context variables via `let-varName="contextProperty"`

### 2. Component Slots
- Defined using `@Input() slotNameComponent?: Type<any>`
- Accept Angular component classes
- Must be standalone or properly imported

### 3. CSS Class Slots
- Defined using `@Input() slotNameClass?: string`
- Apply custom CSS classes to default components
- Support Tailwind classes and custom CSS

## Component Inventory

### CopilotChatView

The top-level chat interface component with comprehensive customization options.

#### Available Slots

| Slot Name | Input Property | Template Property | CSS Property | Description |
|-----------|---------------|-------------------|--------------|-------------|
| Message View | `messageViewComponent` | `messageViewTemplate` | `messageViewClass` | Container for all messages |
| Scroll View | `scrollViewComponent` | `scrollViewTemplate` | `scrollViewClass` | Scrollable message container |
| Scroll Button | `scrollToBottomButtonComponent` | `scrollToBottomButtonTemplate` | `scrollToBottomButtonClass` | Button to scroll to bottom |
| Input | `inputComponent` | `inputTemplate` | - | Chat input field |
| Input Container | `inputContainerComponent` | `inputContainerTemplate` | `inputContainerClass` | Container around input |
| Feather | `featherComponent` | `featherTemplate` | `featherClass` | Gradient feather effect |
| Disclaimer | `disclaimerComponent` | `disclaimerTemplate` | `disclaimerClass` | Disclaimer message |

#### Content Child Templates

| Template Name | Selector | Context | Description |
|--------------|----------|---------|-------------|
| Custom Layout | `customLayout` | `{ messageView, input, scrollView, ... }` | Complete custom layout |
| Send Button | `sendButton` | `{ onClick, disabled }` | Custom send button in input |
| Toolbar | `toolbar` | `{ children }` | Input toolbar customization |
| Text Area | `textArea` | `{ value, onChange, onKeyDown }` | Custom text input area |
| Audio Recorder | `audioRecorder` | `{ isRecording, onStart, onStop }` | Audio recording UI |
| Assistant Markdown | `assistantMessageMarkdownRenderer` | `{ content }` | Markdown rendering for assistant |
| Thumbs Up Button | `thumbsUpButton` | `{ onClick, message }` | Thumbs up feedback button |
| Thumbs Down Button | `thumbsDownButton` | `{ onClick, message }` | Thumbs down feedback button |
| Read Aloud Button | `readAloudButton` | `{ onClick, message }` | Text-to-speech button |
| Regenerate Button | `regenerateButton` | `{ onClick, message }` | Regenerate response button |

#### Event Outputs

| Event | Type | Description |
|-------|------|-------------|
| `assistantMessageThumbsUp` | `EventEmitter<{ message: Message }>` | Thumbs up clicked |
| `assistantMessageThumbsDown` | `EventEmitter<{ message: Message }>` | Thumbs down clicked |
| `assistantMessageReadAloud` | `EventEmitter<{ message: Message }>` | Read aloud clicked |
| `assistantMessageRegenerate` | `EventEmitter<{ message: Message }>` | Regenerate clicked |
| `userMessageCopy` | `EventEmitter<{ message: Message }>` | Copy message clicked |
| `userMessageEdit` | `EventEmitter<{ message: Message }>` | Edit message clicked |

### CopilotChatMessageView

Container for displaying a list of chat messages.

#### Available Slots

| Slot Name | Input Property | Template Property | CSS Property | Description |
|-----------|---------------|-------------------|--------------|-------------|
| Assistant Message | `assistantMessageComponent` | `assistantMessageTemplate` | `assistantMessageClass` | Assistant message display |
| User Message | `userMessageComponent` | `userMessageTemplate` | `userMessageClass` | User message display |
| Cursor | `cursorComponent` | `cursorTemplate` | `cursorClass` | Typing indicator cursor |

#### Content Child Templates

| Template Name | Selector | Context | Description |
|--------------|----------|---------|-------------|
| Custom Layout | `customLayout` | `{ showCursor, messages, messageElements }` | Custom message layout |

### CopilotChatAssistantMessage

Component for displaying assistant/AI messages.

#### Available Slots

| Slot Name | Input Property | Template Property | CSS Property | Description |
|-----------|---------------|-------------------|--------------|-------------|
| Markdown Renderer | `markdownRendererSlot` | `markdownRenderer` (ContentChild) | `markdownRendererClass` | Markdown content renderer |
| Toolbar | `toolbarSlot` | `toolbar` (ContentChild) | `toolbarClass` | Message toolbar |
| Copy Button | `copyButtonSlot` | `copyButton` (ContentChild) | `copyButtonClass` | Copy message button |
| Thumbs Up Button | `thumbsUpButtonSlot` | `thumbsUpButton` (ContentChild) | `thumbsUpButtonClass` | Positive feedback |
| Thumbs Down Button | `thumbsDownButtonSlot` | `thumbsDownButton` (ContentChild) | `thumbsDownButtonClass` | Negative feedback |
| Read Aloud Button | `readAloudButtonSlot` | `readAloudButton` (ContentChild) | `readAloudButtonClass` | Text-to-speech |
| Regenerate Button | `regenerateButtonSlot` | `regenerateButton` (ContentChild) | `regenerateButtonClass` | Regenerate response |

#### Additional Inputs

| Input | Type | Description |
|-------|------|-------------|
| `message` | `AssistantMessage` | The message data |
| `additionalToolbarItems` | `TemplateRef<any>` | Extra toolbar items |
| `toolbarVisible` | `boolean` | Show/hide toolbar |
| `inputClass` | `string` | Additional CSS classes |

### CopilotChatUserMessage

Component for displaying user messages.

#### Available Slots

| Slot Name | Input Property | Template Property | CSS Property | Description |
|-----------|---------------|-------------------|--------------|-------------|
| Markdown Renderer | `markdownRendererSlot` | `markdownRenderer` (ContentChild) | `markdownRendererClass` | Message content renderer |
| Toolbar | `toolbarSlot` | `toolbar` (ContentChild) | `toolbarClass` | Message toolbar |
| Copy Button | `copyButtonSlot` | `copyButton` (ContentChild) | `copyButtonClass` | Copy message button |
| Edit Button | `editButtonSlot` | `editButton` (ContentChild) | `editButtonClass` | Edit message button |

#### Additional Inputs

| Input | Type | Description |
|-------|------|-------------|
| `message` | `UserMessage` | The message data |
| `additionalToolbarItems` | `TemplateRef<any>` | Extra toolbar items |
| `toolbarVisible` | `boolean` | Show/hide toolbar |
| `inputClass` | `string` | Additional CSS classes |

### CopilotChatInput

The chat input component with rich customization options.

#### Available Slots

| Slot Name | Input Property | Template Property | CSS Property | Description |
|-----------|---------------|-------------------|--------------|-------------|
| Text Area | `textAreaSlot` | `textArea` (ContentChild) | `textAreaClass` | Input text area |
| Send Button | `sendButtonSlot` | `sendButton` (ContentChild) | `sendButtonClass` | Send message button |
| Audio Recorder | `audioRecorderSlot` | `audioRecorder` (ContentChild) | `audioRecorderClass` | Voice recording UI |
| Toolbar | `toolbarSlot` | `toolbar` (ContentChild) | `toolbarClass` | Input toolbar |

#### Additional Inputs

| Input | Type | Description |
|-------|------|-------------|
| `placeholder` | `string` | Input placeholder text |
| `disabled` | `boolean` | Disable input |
| `inputClass` | `string` | Additional CSS classes |

## Context Interfaces

### AssistantMessageMarkdownRendererContext
```typescript
interface AssistantMessageMarkdownRendererContext {
  content: string;
}
```

### AssistantMessageToolbarContext
```typescript
interface AssistantMessageToolbarContext {
  children: any;
}
```

### AssistantMessageCopyButtonContext
```typescript
interface AssistantMessageCopyButtonContext {
  onClick: () => void;
}
```

### ThumbsUpButtonContext
```typescript
interface ThumbsUpButtonContext {
  onClick: () => void;
}
```

### ThumbsDownButtonContext
```typescript
interface ThumbsDownButtonContext {
  onClick: () => void;
}
```

### ReadAloudButtonContext
```typescript
interface ReadAloudButtonContext {
  onClick: () => void;
}
```

### RegenerateButtonContext
```typescript
interface RegenerateButtonContext {
  onClick: () => void;
}
```

### InputContext
```typescript
interface InputContext {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}
```

### ScrollButtonContext
```typescript
interface ScrollButtonContext {
  onClick: () => void;
  visible: boolean;
}
```

## Usage Patterns

### Template Customization
```html
<copilot-chat-view>
  <ng-template #disclaimer>
    <div class="custom-disclaimer">
      Custom disclaimer content
    </div>
  </ng-template>
  
  <ng-template #sendButton let-onClick="onClick" let-disabled="disabled">
    <button (click)="onClick()" [disabled]="disabled">
      Send Message
    </button>
  </ng-template>
</copilot-chat-view>
```

### Component Customization
```typescript
@Component({
  template: `
    <copilot-chat-view
      [disclaimerComponent]="customDisclaimerComponent"
      [inputComponent]="customInputComponent">
    </copilot-chat-view>
  `
})
export class MyComponent {
  customDisclaimerComponent = CustomDisclaimerComponent;
  customInputComponent = CustomInputComponent;
}
```

### CSS Customization
```html
<copilot-chat-view
  [disclaimerClass]="'bg-blue-500 text-white p-4 rounded-lg'"
  [inputClass]="'border-2 border-gray-300 focus:border-blue-500'"
  [messageViewClass]="'max-w-4xl mx-auto'">
</copilot-chat-view>
```

### Event Handling
```typescript
@Component({
  template: `
    <copilot-chat-view
      (assistantMessageThumbsUp)="handleThumbsUp($event)"
      (assistantMessageThumbsDown)="handleThumbsDown($event)"
      (userMessageEdit)="handleEdit($event)">
    </copilot-chat-view>
  `
})
export class MyComponent {
  handleThumbsUp(event: { message: Message }) {
    console.log('Thumbs up for message:', event.message);
  }
  
  handleThumbsDown(event: { message: Message }) {
    console.log('Thumbs down for message:', event.message);
  }
  
  handleEdit(event: { message: Message }) {
    console.log('Edit message:', event.message);
  }
}
```

## Best Practices

1. **Use Templates for Dynamic Content**: When you need to pass context variables or handle events, use templates.

2. **Use Components for Complex Logic**: When customization requires significant logic or state management, create a custom component.

3. **Use CSS Classes for Simple Styling**: For basic visual customization, CSS classes are the simplest approach.

4. **Combine Approaches**: You can mix templates, components, and CSS classes for different slots in the same component.

5. **Type Safety**: Define proper TypeScript interfaces for your context objects when creating custom templates.

6. **Performance**: Use `ChangeDetectionStrategy.OnPush` in custom components for better performance.

7. **Accessibility**: Ensure custom components maintain proper ARIA attributes and keyboard navigation.

## Future Enhancements

- Additional slot positions for more granular customization
- Built-in theme presets
- Animation and transition customization slots
- Custom loading states and error handling slots
- Plugin system for extending functionality
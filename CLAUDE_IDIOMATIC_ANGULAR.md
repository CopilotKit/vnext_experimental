# Angular Idiomatic Refactoring Plan

This document outlines the changes needed to make the Angular CopilotKit implementation fully idiomatic to Angular patterns and conventions, moving away from React-inspired patterns.

## Executive Summary

The current Angular implementation uses several React patterns that are not idiomatic to Angular:
- "props" terminology and pattern
- Callback functions passed as object properties
- Nested configuration objects
- React-style slot system

This refactoring will transform these into proper Angular patterns while maintaining functionality.

## Core Issues to Address

### 1. **"Props" Terminology**
- **Current**: Components use `props`, `xxxProps`, `messageViewProps`
- **Idiomatic**: Use `config`, `options`, or specific input names
- **Files affected**: 22 files use "props" terminology

### 2. **Callback Functions as Properties**
- **Current**: `onThumbsUp`, `onThumbsDown`, `onClick` passed as function properties
- **Idiomatic**: Use `@Output()` with `EventEmitter`
- **Files affected**: 11 files use callback patterns

### 3. **Slot System**
- **Current**: Complex slot system mimicking React's renderSlot
- **Idiomatic**: Use Angular's content projection and templates
- **Files affected**: 4 core slot files, used throughout

### 4. **Nested Configuration Objects**
- **Current**: `messageViewProps: { assistantMessage: { onThumbsUp: ... }}`
- **Idiomatic**: Flatten to direct inputs or use proper composition

## Detailed Refactoring Plan

### Phase 1: Core Slot System Refactoring

#### 1.1 Replace CopilotSlot with Angular Patterns

**Current Pattern:**
```typescript
<copilot-slot
  [slot]="messageView"
  [props]="messageViewProps"
  [defaultComponent]="defaultMessageViewComponent">
</copilot-slot>
```

**Idiomatic Pattern:**
```typescript
<!-- Option A: Direct component projection -->
<ng-container *ngComponentOutlet="messageViewComponent || defaultMessageViewComponent; 
                                   injector: createInjector({ messages })">
</ng-container>

<!-- Option B: Template projection -->
<ng-container *ngTemplateOutlet="messageViewTemplate || defaultMessageViewTemplate; 
                                  context: { messages }">
</ng-container>
```

**Files to modify:**
- `/lib/slots/copilot-slot.component.ts` - Deprecate or simplify
- `/lib/slots/slot.utils.ts` - Remove React-style utilities
- `/lib/slots/slot.types.ts` - Simplify types

### Phase 2: Component Input/Output Refactoring

#### 2.1 CopilotChatView Component

**Current:**
```typescript
@Input() messageViewProps?: any;
@Input() scrollToBottomButtonProps?: any;
@Input() inputContainerProps?: any;
```

**Idiomatic:**
```typescript
// Direct inputs for configuration
@Input() autoScroll: boolean = true;
@Input() showScrollButton: boolean = true;
@Input() enableVoiceInput: boolean = false;

// Event outputs instead of callbacks
@Output() assistantThumbsUp = new EventEmitter<Message>();
@Output() assistantThumbsDown = new EventEmitter<Message>();
@Output() userMessageEdit = new EventEmitter<Message>();
@Output() messageRegenerate = new EventEmitter<Message>();

// Template inputs for customization
@ContentChild('assistantMessageTemplate') assistantMessageTemplate?: TemplateRef<any>;
@ContentChild('userMessageTemplate') userMessageTemplate?: TemplateRef<any>;
@ContentChild('inputTemplate') inputTemplate?: TemplateRef<any>;
```

**Usage Before:**
```html
<copilot-chat-view
  [messageViewProps]="{
    assistantMessage: {
      onThumbsUp: handleThumbsUp,
      onThumbsDown: handleThumbsDown
    }
  }">
</copilot-chat-view>
```

**Usage After:**
```html
<copilot-chat-view
  [messages]="messages"
  [autoScroll]="true"
  (assistantThumbsUp)="handleThumbsUp($event)"
  (assistantThumbsDown)="handleThumbsDown($event)">
  
  <!-- Optional: Custom templates -->
  <ng-template #assistantMessageTemplate let-message="message">
    <app-custom-assistant [message]="message"></app-custom-assistant>
  </ng-template>
</copilot-chat-view>
```

#### 2.2 CopilotChatAssistantMessage Component

**Current:**
```typescript
@Input() onThumbsUp?: () => void;
@Input() onThumbsDown?: () => void;
@Input() onCopy?: (content: string) => void;
@Input() onRegenerate?: () => void;
```

**Idiomatic:**
```typescript
@Output() thumbsUp = new EventEmitter<void>();
@Output() thumbsDown = new EventEmitter<void>();
@Output() copy = new EventEmitter<string>();
@Output() regenerate = new EventEmitter<void>();
```

#### 2.3 CopilotChatUserMessage Component

**Current:**
```typescript
@Input() onEdit?: (content: string) => void;
@Input() onCopy?: (content: string) => void;
```

**Idiomatic:**
```typescript
@Output() edit = new EventEmitter<string>();
@Output() copy = new EventEmitter<string>();
```

#### 2.4 CopilotChatInput Component

**Current:**
```typescript
@Input() onSend?: (message: string) => void;
@Input() onStop?: () => void;
@Input() sendButtonProps?: any;
```

**Idiomatic:**
```typescript
@Output() send = new EventEmitter<string>();
@Output() stop = new EventEmitter<void>();
@Input() sendButtonDisabled: boolean = false;
@Input() sendButtonClass?: string;
```

### Phase 3: Configuration Management

#### 3.1 Replace Props Objects with Configuration Interfaces

**Create proper configuration interfaces:**
```typescript
// copilot-chat.config.ts
export interface CopilotChatConfig {
  autoScroll?: boolean;
  showTimestamps?: boolean;
  enableVoiceInput?: boolean;
  messageAnimations?: boolean;
}

export interface AssistantMessageConfig {
  showToolbar?: boolean;
  enableCopy?: boolean;
  enableThumbsUp?: boolean;
  enableThumbsDown?: boolean;
  enableRegenerate?: boolean;
}
```

**Use with dependency injection:**
```typescript
// Provide at module or component level
providers: [
  {
    provide: COPILOT_CHAT_CONFIG,
    useValue: {
      autoScroll: true,
      showTimestamps: false
    }
  }
]
```

### Phase 4: Template and Content Projection

#### 4.1 Proper Template Structure

**Current mixed approach:**
```typescript
@Input() assistantMessageComponent?: Type<any>;
@Input() assistantMessageTemplate?: TemplateRef<any>;
@Input() assistantMessageClass?: string;
@Input() assistantMessageProps?: any;
```

**Idiomatic approach:**
```typescript
// Use EITHER component composition OR templates, not both
@ContentChild('assistantMessage') assistantMessageTemplate?: TemplateRef<MessageContext>;

// OR use a directive for more control
@ContentChild(AssistantMessageDirective) assistantMessage?: AssistantMessageDirective;
```

### Phase 5: File-by-File Changes

#### Core Components

1. **copilot-chat-view.component.ts**
   - Remove all `xxxProps` inputs
   - Add specific `@Output()` EventEmitters
   - Simplify slot handling to use `ngTemplateOutlet`
   - Remove `renderSlot` usage

2. **copilot-chat-message-view.component.ts**
   - Remove `assistantMessageProps`, `userMessageProps`
   - Add `@Output()` events that bubble up from child components
   - Use `ngComponentOutlet` or `ngTemplateOutlet`

3. **copilot-chat-assistant-message.component.ts**
   - Convert all `onXxx` inputs to `@Output()` EventEmitters
   - Remove callback function handling
   - Update template to use `(click)` instead of calling functions

4. **copilot-chat-user-message.component.ts**
   - Convert `onEdit`, `onCopy` to EventEmitters
   - Remove callback patterns

5. **copilot-chat-input.component.ts**
   - Convert `onSend`, `onStop` to EventEmitters
   - Remove `sendButtonProps`, use specific inputs

#### Slot System Files (Deprecate or Simplify)

6. **lib/slots/copilot-slot.component.ts**
   - Deprecate in favor of Angular built-ins
   - Or simplify to only handle component/template switching

7. **lib/slots/slot.utils.ts**
   - Remove `renderSlot` function
   - Remove React-style prop merging

8. **lib/slots/slot.types.ts**
   - Simplify types to only what Angular needs

#### Supporting Components

9. **copilot-chat-view-scroll-view.component.ts**
   - Remove `messageViewProps`, `scrollToBottomButtonProps`
   - Use content projection for customization

10. **copilot-chat-view-scroll-to-bottom-button.component.ts**
    - Change `onClick` input to `@Output() click`

11. **copilot-chat-buttons.component.ts**
    - Convert all callbacks to EventEmitters

### Phase 6: Type System Updates

#### Remove React-style Types
```typescript
// Remove
export type SlotValue<T> = Type<T> | TemplateRef<T> | string | Partial<T>;
export type WithSlots<...> = ...;

// Replace with Angular types
export interface ComponentConfig {
  // Specific configuration properties
}
```

### Phase 7: Documentation Updates

1. Update all examples to use Angular patterns
2. Remove references to "props" in comments
3. Update JSDoc to use Angular terminology
4. Create Angular-specific usage examples

### Phase 8: Testing Updates

1. Update all tests to use EventEmitter patterns
2. Remove props-based test scenarios
3. Add tests for template projection
4. Add tests for event bubbling

## Migration Strategy

### Backward Compatibility Approach

To maintain backward compatibility during migration:

1. **Phase 1**: Add new idiomatic APIs alongside existing ones
2. **Phase 2**: Mark old APIs as `@deprecated`
3. **Phase 3**: Provide migration tooling/codemods
4. **Phase 4**: Remove deprecated APIs in next major version

### Example Migration Helper

```typescript
// Temporary compatibility layer
@Component({...})
export class CopilotChatViewComponent {
  // New idiomatic API
  @Output() assistantThumbsUp = new EventEmitter<Message>();
  
  // Deprecated prop-based API
  @Input() 
  @deprecated('Use (assistantThumbsUp) output instead')
  set messageViewProps(props: any) {
    // Bridge old API to new
    if (props?.assistantMessage?.onThumbsUp) {
      this.assistantThumbsUp.subscribe(props.assistantMessage.onThumbsUp);
    }
  }
}
```

## Benefits of This Refactoring

1. **Angular Native**: Follows Angular style guide and best practices
2. **Better Type Safety**: Angular's template type checking works properly
3. **Improved Developer Experience**: Angular developers will find it familiar
4. **Better Performance**: Leverages Angular's change detection properly
5. **Clearer API**: No confusion about props vs inputs vs outputs
6. **Better Tooling Support**: IDEs can better understand and autocomplete

## Estimated Effort

- **Small components**: 2-4 hours each (buttons, simple components)
- **Large components**: 8-12 hours each (chat-view, message-view)
- **Slot system refactor**: 16-20 hours
- **Testing updates**: 8-12 hours
- **Documentation**: 4-6 hours
- **Total estimate**: 60-80 hours for complete refactoring

## Recommended Approach

1. **Start with leaf components** (buttons, simple components)
2. **Move up the hierarchy** gradually
3. **Keep backward compatibility** during transition
4. **Update documentation** as you go
5. **Create codemods** for common patterns
6. **Release as major version** when removing old APIs

## Example Component After Refactoring

```typescript
@Component({
  selector: 'copilot-chat-view',
  template: `
    <div class="chat-container">
      <!-- Message list with event delegation -->
      <copilot-chat-message-view
        [messages]="messages"
        (assistantAction)="handleAssistantAction($event)"
        (userAction)="handleUserAction($event)">
        
        <!-- Optional template customization -->
        <ng-template #assistantMessageTemplate let-message="message">
          <ng-content select="[assistant-message]"></ng-content>
        </ng-template>
      </copilot-chat-message-view>
      
      <!-- Input with proper event binding -->
      <copilot-chat-input
        (send)="handleSend($event)"
        (stop)="handleStop()"
        [disabled]="isLoading">
      </copilot-chat-input>
    </div>
  `
})
export class CopilotChatViewComponent {
  @Input() messages: Message[] = [];
  @Input() isLoading = false;
  
  @Output() messageSent = new EventEmitter<string>();
  @Output() assistantThumbsUp = new EventEmitter<Message>();
  @Output() assistantThumbsDown = new EventEmitter<Message>();
  
  handleAssistantAction(event: AssistantAction) {
    switch(event.type) {
      case 'thumbsUp':
        this.assistantThumbsUp.emit(event.message);
        break;
      case 'thumbsDown':
        this.assistantThumbsDown.emit(event.message);
        break;
    }
  }
}
```

## Conclusion

This refactoring will transform the Angular CopilotKit from a React-inspired implementation to a truly idiomatic Angular library. While it requires significant changes, the benefits in terms of maintainability, developer experience, and performance make it worthwhile.

The key is to embrace Angular's patterns:
- Inputs and Outputs instead of props
- EventEmitters instead of callbacks
- Templates and content projection instead of render props
- Dependency injection for configuration
- Strong typing with TypeScript

This will make the library feel natural to Angular developers and leverage the full power of the Angular framework.
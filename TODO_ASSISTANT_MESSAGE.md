# TODO: Port React Assistant Message Component to Angular

## Core Architecture Setup
- [ ] Create main `copilot-chat-assistant-message.component.ts` with standalone component decorator
- [ ] Define `copilot-chat-assistant-message.types.ts` for all interfaces and types
- [ ] Set up slot-based architecture using existing Angular slot system
- [ ] Implement namespace pattern for sub-components (similar to user message)
- [ ] Add proper ChangeDetectionStrategy.OnPush and ViewEncapsulation.None
- [ ] Support render prop pattern equivalent (using ng-content with context)
- [ ] Add proper displayName equivalents for Angular DevTools

## Type Definitions
- [ ] Create `AssistantMessage` interface/type import from @ag-ui/core
- [ ] Define context interfaces for each slot:
  - [ ] `MarkdownRendererContext`
  - [ ] `ToolbarContext`
  - [ ] `CopyButtonContext`
  - [ ] `ThumbsUpButtonContext`
  - [ ] `ThumbsDownButtonContext`
  - [ ] `ReadAloudButtonContext`
  - [ ] `RegenerateButtonContext`
- [ ] Create props interface with all event handlers and configuration options

## Markdown Renderer Component
- [ ] Create `copilot-chat-assistant-message-renderer.component.ts`
- [ ] Integrate markdown rendering library (marked or markdown-it)
- [ ] Configure remark plugins:
  - [ ] GitHub Flavored Markdown support (tables, strikethrough, task lists)
  - [ ] Math expressions support
- [ ] Configure rehype plugins:
  - [ ] Syntax highlighting with dual theme support (dark/light)
  - [ ] KaTeX for math equation rendering
  - [ ] Keep background false for code blocks
  - [ ] Bypass inline code setting
- [ ] Implement partial markdown completion:
  - [ ] Move `completePartialMarkdown` function to @copilotkit/core package
  - [ ] Import and use the shared function from core
  - [ ] Ensure function handles:
    - [ ] Auto-close unclosed code fences (handle both ``` and ~~~)
    - [ ] Complete incomplete links `[text](url`
    - [ ] Balance unclosed emphasis markers (*, **, _, __, ~~)
    - [ ] Handle nested markdown elements
    - [ ] Preserve code block content integrity
    - [ ] Handle bracket matching for markdown links
    - [ ] Implement state-based parsing with OpenElement tracking
    - [ ] Support code block and inline code range detection
    - [ ] Handle parentheses balancing outside code blocks
- [ ] Add KaTeX CSS import (`katex/dist/katex.min.css`)
- [ ] Support custom component overrides for `pre` and `code` elements

## Code Block Features
- [ ] Create custom code block component within renderer
- [ ] Implement language detection and display in header
- [ ] Add copy code button with visual feedback (check icon when copied)
- [ ] Implement syntax highlighting with theme support (one-dark-pro/one-light)
- [ ] Add custom styling (rounded corners, borders, transparent background)
- [ ] Handle code content extraction from nested elements
- [ ] Style inline code with special background and padding (`px-[4.8px] py-[2.5px]`)
- [ ] Implement bypass inline code processing for proper highlighting
- [ ] Add language label display with proper font styling
- [ ] Support empty code block handling

## Toolbar Components
- [ ] Create `copilot-chat-assistant-message-toolbar.component.ts`
- [ ] Implement base toolbar button component with tooltip support
- [ ] Create individual button components:
  - [ ] `copilot-chat-assistant-message-copy-button.component.ts`
  - [ ] `copilot-chat-assistant-message-thumbs-up-button.component.ts`
  - [ ] `copilot-chat-assistant-message-thumbs-down-button.component.ts`
  - [ ] `copilot-chat-assistant-message-read-aloud-button.component.ts`
  - [ ] `copilot-chat-assistant-message-regenerate-button.component.ts`
- [ ] Add Lucide Angular icons integration (Copy, Check, ThumbsUp, ThumbsDown, Volume2, RefreshCw)
- [ ] Implement dynamic icon switching (Copy → Check when copied)
- [ ] Add consistent icon sizing (18px for most, 20px for Volume2, 10px for code block icons)
- [ ] Implement conditional rendering of buttons based on prop/handler presence
- [ ] Support button variant styling (`assistantMessageToolbarButton`)

## State Management
- [ ] Implement copy button state with 2-second timeout
- [ ] Add independent copy state per code block
- [ ] Create signals for reactive state management
- [ ] Handle clipboard API interactions

## Event Handlers
- [ ] Implement `onThumbsUp` event emitter with message object
- [ ] Implement `onThumbsDown` event emitter with message object
- [ ] Implement `onReadAloud` event emitter with message object
- [ ] Implement `onRegenerate` event emitter with message object
- [ ] Add code block click handler support
- [ ] Implement clipboard write error handling with console logging

## Configuration & Localization
- [ ] Integrate with `CopilotChatConfigurationService` for labels
- [ ] Add default labels for all UI text:
  - [ ] `assistantMessageToolbarCopyCodeLabel`
  - [ ] `assistantMessageToolbarCopyCodeCopiedLabel`
  - [ ] `assistantMessageToolbarCopyMessageLabel`
  - [ ] `assistantMessageToolbarThumbsUpLabel`
  - [ ] `assistantMessageToolbarThumbsDownLabel`
  - [ ] `assistantMessageToolbarReadAloudLabel`
  - [ ] `assistantMessageToolbarRegenerateLabel`
- [ ] Support label overrides via configuration

## Slot Implementation
- [ ] Implement slot support for `markdownRenderer`
- [ ] Implement slot support for `toolbar`
- [ ] Implement slot support for `copyButton`
- [ ] Implement slot support for `thumbsUpButton`
- [ ] Implement slot support for `thumbsDownButton`
- [ ] Implement slot support for `readAloudButton`
- [ ] Implement slot support for `regenerateButton`
- [ ] Support both template and component slots for each

## Styling & Layout
- [ ] Port all Tailwind classes to Angular component styles
- [ ] Implement prose container with max-width and word breaking (`prose max-w-full break-words`)
- [ ] Add dark mode support throughout (`dark:prose-invert`)
- [ ] Style toolbar with proper spacing and alignment (`-ml-[5px] -mt-[0px]`)
- [ ] Add hover states for all interactive elements
- [ ] Ensure background transparency
- [ ] Add `data-message-id` attribute support
- [ ] Implement twMerge equivalent for class merging
- [ ] Add specific styling for code block container (`rounded-2xl bg-transparent border-t-0 my-1!`)

## Accessibility
- [ ] Add ARIA labels on all toolbar buttons
- [ ] Implement tooltip directive/component for button descriptions
- [ ] Ensure semantic HTML structure
- [ ] Support keyboard navigation

## Additional Features
- [ ] Support `additionalToolbarItems` via ng-template
- [ ] Implement `toolbarVisible` input property (default true)
- [ ] Add graceful handling of missing content
- [ ] Support custom CSS classes via `className` input
- [ ] Implement proper error boundaries/handling
- [ ] Handle safe code content extraction from various node structures
- [ ] Implement rendering slot pattern with context and props

## Testing
- [ ] Create `copilot-chat-assistant-message.component.spec.ts`
- [ ] Test markdown rendering with various content types
- [ ] Test partial markdown completion
- [ ] Test all toolbar button interactions
- [ ] Test slot overrides
- [ ] Test clipboard operations
- [ ] Test event emissions
- [ ] Test dark mode styles
- [ ] Test accessibility features

## Storybook
- [ ] Create `CopilotChatAssistantMessage.stories.ts`
- [ ] Add story for default assistant message
- [ ] Add story with custom slots
- [ ] Add story demonstrating all toolbar buttons
- [ ] Add story with code blocks and syntax highlighting
- [ ] Add story with math equations
- [ ] Add story with partial markdown
- [ ] Add story with dark mode

## Documentation
- [ ] Document all component inputs and outputs
- [ ] Add JSDoc comments for public methods
- [ ] Create usage examples
- [ ] Document slot customization patterns
- [ ] Add migration notes from React version

## Performance Optimization
- [ ] Implement OnPush change detection strategy
- [ ] Use trackBy functions for any ngFor loops
- [ ] Optimize markdown rendering for large content
- [ ] Implement virtual scrolling if needed
- [ ] Memoize computed values where appropriate

## Integration
- [ ] Ensure compatibility with existing Angular CopilotKit components
- [ ] Test integration with CopilotChat component
- [ ] Verify proper cleanup on component destroy
- [ ] Ensure proper zone.js handling for async operations
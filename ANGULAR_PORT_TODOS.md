# Angular Port Todo List - CopilotChatMessageView

## Core Component Implementation

### 1. Create Main Component File
- [ ] Create `/packages/angular/src/components/chat/copilot-chat-message-view.component.ts`
- [ ] Import necessary Angular modules: `Component`, `Input`, `ContentChild`, `TemplateRef`, `Type`, `ChangeDetectionStrategy`, `ViewEncapsulation`, `signal`, `computed`
- [ ] Import `CommonModule` from `@angular/common`
- [ ] Import `CopilotSlotComponent` from slot system
- [ ] Import `Message` type from `@ag-ui/client`
- [ ] Import existing components: `CopilotChatAssistantMessageComponent`, `CopilotChatUserMessageComponent`
- [ ] Import `cn` utility from `../../lib/utils`

### 2. Component Decorator Configuration
- [ ] Set selector as `copilot-chat-message-view`
- [ ] Mark as `standalone: true`
- [ ] Add imports array with all dependencies
- [ ] Set `changeDetection: ChangeDetectionStrategy.OnPush`
- [ ] Set `encapsulation: ViewEncapsulation.None`

### 3. Component Properties
- [ ] Add `@Input() messages: Message[] = []` input property
- [ ] Add `@Input() showCursor: boolean = false` input property
- [ ] Add `@Input() inputClass?: string` for custom CSS classes
- [ ] Add slot inputs for assistant message customization:
  - [ ] `@Input() assistantMessageComponent?: Type<any>`
  - [ ] `@Input() assistantMessageTemplate?: TemplateRef<any>`
  - [ ] `@Input() assistantMessageClass?: string`
  - [ ] `@Input() assistantMessageProps?: any`
- [ ] Add slot inputs for user message customization:
  - [ ] `@Input() userMessageComponent?: Type<any>`
  - [ ] `@Input() userMessageTemplate?: TemplateRef<any>`
  - [ ] `@Input() userMessageClass?: string`
  - [ ] `@Input() userMessageProps?: any`
- [ ] Add slot inputs for cursor customization:
  - [ ] `@Input() cursorComponent?: Type<any>`
  - [ ] `@Input() cursorTemplate?: TemplateRef<any>`
  - [ ] `@Input() cursorClass?: string`
  - [ ] `@Input() cursorProps?: any`
- [ ] Add `@ContentChild('customLayout') customLayoutTemplate?: TemplateRef<any>` for render prop pattern

### 4. Computed Properties
- [ ] Create `computedClass` signal that merges default classes `'flex flex-col'` with `inputClass`
- [ ] Create `messageElements` computed signal that processes messages array
- [ ] Create `assistantMessageSlot` computed signal for assistant message slot resolution
- [ ] Create `userMessageSlot` computed signal for user message slot resolution
- [ ] Create `cursorSlot` computed signal for cursor slot resolution

### 5. Component Template
- [ ] Create template with conditional rendering for custom layout
- [ ] Implement default layout with message iteration
- [ ] Add message role checking (`assistant` vs `user`)
- [ ] Implement slot rendering for each message type
- [ ] Add cursor rendering with visibility condition
- [ ] Ensure proper data attributes (`data-message-id`)

## Cursor Component Implementation

### 6. Create Cursor Component
- [ ] Create `/packages/angular/src/components/chat/copilot-chat-message-view-cursor.component.ts`
- [ ] Import necessary Angular modules
- [ ] Create standalone component with selector `copilot-chat-message-view-cursor`
- [ ] Add `@Input() inputClass?: string` for custom styling
- [ ] Implement default template with pulsing animation div
- [ ] Apply default classes: `w-[11px] h-[11px] rounded-full bg-foreground animate-pulse-cursor ml-1`
- [ ] Use `cn` utility to merge classes

### 7. CSS Animation
- [ ] Verify `animate-pulse-cursor` animation exists in `/packages/angular/src/styles/globals.css`
- [ ] If missing, add keyframe animation:
  ```css
  @keyframes pulse-cursor {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.5);
      opacity: 0.8;
    }
  }
  ```
- [ ] Add animation utility class to Tailwind theme configuration

## Type Definitions

### 8. Create Type File
- [ ] Create `/packages/angular/src/components/chat/copilot-chat-message-view.types.ts`
- [ ] Export interface `CopilotChatMessageViewProps` with all input properties
- [ ] Export interface `MessageViewContext` for template context
- [ ] Export interface `CursorContext` for cursor template context
- [ ] Export type aliases for slot values

## Slot Integration

### 9. Update Slot System
- [ ] Ensure slot system supports all required slot types
- [ ] Verify `renderSlot` utility works with message components
- [ ] Test slot context passing for templates
- [ ] Ensure proper prop merging for component slots

## Export Configuration

### 10. Update Module Exports
- [ ] Add export to `/packages/angular/src/components/chat/index.ts`
- [ ] Export component: `export { CopilotChatMessageViewComponent } from './copilot-chat-message-view.component'`
- [ ] Export cursor: `export { CopilotChatMessageViewCursorComponent } from './copilot-chat-message-view-cursor.component'`
- [ ] Export types: `export * from './copilot-chat-message-view.types'`
- [ ] Add to main barrel export at `/packages/angular/src/index.ts`

## Unit Testing

### 11. Create Test File
- [ ] Create `/packages/angular/src/components/chat/__tests__/copilot-chat-message-view.component.spec.ts`
- [ ] Import testing utilities from `@angular/core/testing`
- [ ] Import component and all dependencies
- [ ] Set up TestBed configuration with providers

### 12. Basic Rendering Tests
- [ ] Test component creation
- [ ] Test empty messages array rendering
- [ ] Test single assistant message rendering
- [ ] Test single user message rendering
- [ ] Test mixed message array rendering
- [ ] Test undefined/null message handling
- [ ] Test message filtering (only assistant/user roles)

### 13. Cursor Tests
- [ ] Test cursor hidden by default
- [ ] Test cursor shown when `showCursor=true`
- [ ] Test cursor custom class application
- [ ] Test cursor custom component override
- [ ] Test cursor template override

### 14. Slot System Tests
- [ ] Test assistant message component override
- [ ] Test assistant message template override
- [ ] Test assistant message class override
- [ ] Test assistant message props override
- [ ] Test user message component override
- [ ] Test user message template override
- [ ] Test user message class override
- [ ] Test user message props override

### 15. Custom Layout Tests
- [ ] Test custom layout template rendering
- [ ] Test context passing to custom layout
- [ ] Test messageElements array in context
- [ ] Test showCursor value in context
- [ ] Test messages array in context

### 16. CSS Class Tests
- [ ] Test default container classes
- [ ] Test custom class merging
- [ ] Test class precedence
- [ ] Test Tailwind class merging with `cn` utility

### 17. Data Attribute Tests
- [ ] Test data-message-id on each message
- [ ] Test container data attributes
- [ ] Test accessibility attributes

## Storybook Stories

### 18. Create Stories File
- [ ] Create `/apps/angular/storybook/stories/CopilotChatMessageView.stories.ts`
- [ ] Import necessary Storybook utilities
- [ ] Import component and dependencies
- [ ] Set up module metadata with providers

### 19. Default Story
- [ ] Create story showing conversation flow
- [ ] Include multiple user messages
- [ ] Include multiple assistant messages
- [ ] Show markdown content in messages
- [ ] Include code blocks in assistant messages
- [ ] Add interactive callbacks (thumbs up/down)
- [ ] Use full-screen layout decorator

### 20. ShowCursor Story
- [ ] Create story with cursor visible
- [ ] Show single user message
- [ ] Display animated cursor
- [ ] Simulate "typing" state

### 21. Custom Slots Story
- [ ] Create story with custom assistant message component
- [ ] Create story with custom user message component
- [ ] Create story with custom cursor component
- [ ] Show template slot overrides
- [ ] Show class slot overrides

### 22. Custom Layout Story
- [ ] Create story with custom layout template
- [ ] Show alternative message arrangement
- [ ] Include custom header/footer
- [ ] Demonstrate full layout control

### 23. Empty State Story
- [ ] Create story with no messages
- [ ] Show cursor only
- [ ] Demonstrate initial state

### 24. Long Conversation Story
- [ ] Create story with many messages
- [ ] Test scrolling behavior
- [ ] Include various message types
- [ ] Show performance with large lists

## Integration with CopilotChatView

### 25. Update CopilotChatView Component
- [ ] Import `CopilotChatMessageViewComponent`
- [ ] Add as default for messageView slot
- [ ] Pass messages array to component
- [ ] Handle showCursor state
- [ ] Connect slot overrides

### 26. Scroll Management Integration
- [ ] Install Angular CDK if not present: `@angular/cdk`
- [ ] Import `ScrollingModule` from `@angular/cdk/scrolling`
- [ ] Implement auto-scroll behavior
- [ ] Add scroll-to-bottom functionality
- [ ] Handle scroll position on new messages
- [ ] Consider using `CdkVirtualScrollViewport` for performance with large message lists
- [ ] Alternative: Use `use-stick-to-bottom` Angular port or implement custom directive

## Performance Optimizations

### 27. Change Detection Optimization
- [ ] Use `OnPush` change detection strategy
- [ ] Implement `trackBy` function for message iteration
- [ ] Use signals for reactive state
- [ ] Minimize unnecessary re-renders

### 28. Virtual Scrolling (Optional)
- [ ] Evaluate need for virtual scrolling
- [ ] Implement `CdkVirtualScrollViewport` if needed
- [ ] Configure item size strategy
- [ ] Handle dynamic content heights

## Documentation

### 29. Component Documentation
- [ ] Add JSDoc comments to component class
- [ ] Document all input properties
- [ ] Document slot system usage
- [ ] Add usage examples in comments
- [ ] Document custom layout pattern

### 30. README Updates
- [ ] Add CopilotChatMessageView to component list
- [ ] Include basic usage example
- [ ] Document slot customization
- [ ] Add migration guide from React

## Build and Bundle

### 31. Build Configuration
- [ ] Verify component is included in ng-package.json
- [ ] Ensure CSS is properly bundled
- [ ] Test production build
- [ ] Verify tree-shaking works

### 32. CSS Export
- [ ] Ensure animation CSS is included in bundle
- [ ] Verify Tailwind classes are processed
- [ ] Check CSS file size
- [ ] Test CSS in consuming application

## Testing in Demo App

### 33. Integration Testing
- [ ] Add CopilotChatMessageView to Angular demo app
- [ ] Test with real message data
- [ ] Verify all slots work
- [ ] Test performance with many messages
- [ ] Check accessibility

### 34. Cross-Browser Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test in Edge
- [ ] Verify animations work consistently

## Code Quality

### 35. Linting and Formatting
- [ ] Run `pnpm lint` and fix any issues
- [ ] Run `pnpm format` to ensure consistent formatting
- [ ] Check for unused imports
- [ ] Remove console.log statements

### 36. Type Safety
- [ ] Run `pnpm check-types` to verify TypeScript compilation
- [ ] Ensure all props have proper types
- [ ] Add strict null checks
- [ ] Verify generic type constraints

## Final Checklist

### 37. Feature Parity Verification
- [ ] Compare with React implementation line by line
- [ ] Verify all props are supported
- [ ] Check all slot types work
- [ ] Ensure render prop pattern works
- [ ] Test all customization points

### 38. Bundle Size Analysis
- [ ] Check component bundle size
- [ ] Verify no unnecessary dependencies
- [ ] Ensure proper code splitting
- [ ] Optimize imports

### 39. Accessibility Audit
- [ ] Check keyboard navigation
- [ ] Verify screen reader compatibility
- [ ] Test ARIA attributes
- [ ] Ensure proper semantic HTML

### 40. Performance Metrics
- [ ] Measure initial render time
- [ ] Test with 100+ messages
- [ ] Check memory usage
- [ ] Profile change detection cycles

## Notes

### Important Considerations
1. **Slot System**: Angular's slot system differs from React's. We use a combination of `@ContentChild`, `TemplateRef`, and component types
2. **Change Detection**: Use `OnPush` strategy with signals for optimal performance
3. **CSS-in-JS**: Angular doesn't have styled-components, use Tailwind classes and `cn` utility
4. **Render Props**: Implement via `TemplateRef` and context passing
5. **Refs**: Use `ViewChild` instead of React refs
6. **Hooks**: Use Angular signals and computed properties instead of React hooks

### Dependencies to Verify
- `@angular/cdk` for scrolling features
- `tailwind-merge` (via `cn` utility)
- `@ag-ui/client` for Message types
- Existing chat components (assistant, user)

### Testing Strategy
- Unit tests with `TestBed`
- Use `ComponentFixture` for DOM testing
- Mock services with providers
- Test slots with dynamic component creation

### Migration Challenges
1. **Children as Function**: Use `ng-template` with context
2. **Dynamic Component Creation**: Use `ViewContainerRef` and `ComponentRef`
3. **Class Merging**: Ensure `cn` utility works properly
4. **Animation**: Verify CSS animations work in Angular

This comprehensive todo list ensures complete feature parity with the React CopilotChatMessageView component while following Angular best practices and patterns.
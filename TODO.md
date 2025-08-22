# CopilotChatView Angular Port - Complete TODO List

## Phase 1: Core Infrastructure & Dependencies

### 1.1 Auto-Scrolling System Dependencies
- [ ] Research Angular alternatives to `use-stick-to-bottom` library
  - [ ] Option A: Port use-stick-to-bottom logic to Angular directives
  - [ ] Option B: Use Angular CDK ScrollingModule with custom behavior
  - [ ] Option C: Implement custom scroll management service
- [ ] Create `StickToBottomDirective` for intelligent auto-scrolling
  - [ ] Implement smooth scrolling behavior
  - [ ] Handle user scroll interruptions
  - [ ] Add resize="smooth" behavior
  - [ ] Add initial="smooth" behavior
- [ ] Create `StickToBottomService` for scroll state management
  - [ ] Track isAtBottom state
  - [ ] Provide scrollToBottom method
  - [ ] Handle scroll position monitoring

### 1.2 Utility Services
- [ ] Create `ScrollPositionService` for scroll tracking
  - [ ] Monitor scroll position in real-time
  - [ ] Threshold detection (within 10px of bottom)
  - [ ] ResizeObserver integration
- [ ] Create `ResizeObserverService` for dynamic content
  - [ ] Track element size changes
  - [ ] Debounced resize operations (250ms)
  - [ ] Cleanup on component destroy

## Phase 2: Main Component Implementation

### 2.1 CopilotChatViewComponent Core
- [ ] Create `copilot-chat-view.component.ts`
  - [ ] Import all necessary Angular modules
  - [ ] Define component decorator with exact selector
  - [ ] Set ChangeDetectionStrategy.OnPush
  - [ ] Set ViewEncapsulation.None
- [ ] Define component inputs matching React props exactly
  - [ ] `messages?: Message[]`
  - [ ] `autoScroll?: boolean` (default true)
  - [ ] `inputClass?: string`
  - [ ] Additional HTML attributes support
- [ ] Implement slot inputs for all customizable components
  - [ ] `messageViewComponent?: Type<any>`
  - [ ] `messageViewTemplate?: TemplateRef<any>`
  - [ ] `messageViewClass?: string`
  - [ ] `messageViewProps?: any`
  - [ ] `scrollViewComponent?: Type<any>`
  - [ ] `scrollViewTemplate?: TemplateRef<any>`
  - [ ] `scrollViewClass?: string`
  - [ ] `scrollViewProps?: any`
  - [ ] `scrollToBottomButtonComponent?: Type<any>`
  - [ ] `scrollToBottomButtonTemplate?: TemplateRef<any>`
  - [ ] `scrollToBottomButtonClass?: string`
  - [ ] `scrollToBottomButtonProps?: any`
  - [ ] `inputComponent?: Type<any>`
  - [ ] `inputTemplate?: TemplateRef<any>`
  - [ ] `inputClass?: string`
  - [ ] `inputProps?: any`
  - [ ] `inputContainerComponent?: Type<any>`
  - [ ] `inputContainerTemplate?: TemplateRef<any>`
  - [ ] `inputContainerClass?: string`
  - [ ] `inputContainerProps?: any`
  - [ ] `featherComponent?: Type<any>`
  - [ ] `featherTemplate?: TemplateRef<any>`
  - [ ] `featherClass?: string`
  - [ ] `featherProps?: any`
  - [ ] `disclaimerComponent?: Type<any>`
  - [ ] `disclaimerTemplate?: TemplateRef<any>`
  - [ ] `disclaimerClass?: string`
  - [ ] `disclaimerProps?: any`

### 2.2 Component Template Structure
- [ ] Create main template with exact React DOM structure
  - [ ] Outer div with `relative h-full` classes
  - [ ] Conditional rendering for custom layout support
  - [ ] Default layout implementation
- [ ] Implement render props pattern support
  - [ ] `@ContentChild('customLayout')` for custom templates
  - [ ] Context object with all bound components
  - [ ] Support children as function pattern

### 2.3 State Management
- [ ] Implement signals for reactive state
  - [ ] `inputContainerHeight = signal<number>(0)`
  - [ ] `isResizing = signal<boolean>(false)`
  - [ ] `hasMounted = signal<boolean>(false)`
  - [ ] `showScrollButton = signal<boolean>(false)`
- [ ] Create computed signals for derived state
  - [ ] Computed class merging
  - [ ] Dynamic positioning calculations
- [ ] Implement ViewChild references
  - [ ] `@ViewChild('inputContainer') inputContainerRef`
  - [ ] `@ViewChild('scrollContainer') scrollRef`
  - [ ] `@ViewChild('contentContainer') contentRef`

## Phase 3: Sub-Components Implementation

### 3.1 ScrollView Component
- [ ] Create `CopilotChatViewScrollViewComponent`
  - [ ] Implement auto-scroll mode logic
  - [ ] Implement manual scroll mode logic
  - [ ] SSR-safe rendering with hydration checks
  - [ ] Smooth resize and initial scroll behavior
- [ ] Template structure matching React exactly
  - [ ] Overflow handling (y-scroll, x-hidden)
  - [ ] Content padding management
  - [ ] Maximum width constraint (3xl/48rem)
  - [ ] Responsive padding (px-4 sm:px-0)
- [ ] Integrate StickToBottom functionality
  - [ ] Use directive/service for auto-scroll mode
  - [ ] Manual scroll position tracking
  - [ ] Scroll button visibility logic

### 3.2 ScrollToBottomButton Component
- [ ] Create `CopilotChatViewScrollToBottomButtonComponent`
  - [ ] Circular button design (40x40px)
  - [ ] ChevronDown icon from lucide-angular or similar
  - [ ] Shadow effect styling
- [ ] Implement exact Tailwind classes
  - [ ] `rounded-full w-10 h-10 p-0`
  - [ ] `bg-white dark:bg-gray-900`
  - [ ] `shadow-lg border border-gray-200 dark:border-gray-700`
  - [ ] `hover:bg-gray-50 dark:hover:bg-gray-800`
  - [ ] `flex items-center justify-center cursor-pointer`
- [ ] Smart visibility logic
  - [ ] Hidden when at bottom
  - [ ] Hidden during resize
  - [ ] Dynamic positioning

### 3.3 Feather Component
- [ ] Create `CopilotChatViewFeatherComponent`
  - [ ] Gradient overlay implementation
  - [ ] Height of 24 units (h-24)
  - [ ] Transparent to solid transition
- [ ] Implement exact styling
  - [ ] `absolute bottom-0 left-0 right-4 h-24 pointer-events-none z-10`
  - [ ] `bg-gradient-to-t from-white via-white to-transparent`
  - [ ] `dark:from-[rgb(33,33,33)] dark:via-[rgb(33,33,33)]`

### 3.4 InputContainer Component
- [ ] Create `CopilotChatViewInputContainerComponent`
  - [ ] ForwardRef implementation for DOM access
  - [ ] Absolute positioning at bottom
  - [ ] Z-index layering (z-20)
- [ ] Template structure
  - [ ] Container for input component
  - [ ] Container for disclaimer
  - [ ] Maximum width constraint (3xl)
  - [ ] Responsive padding

### 3.5 Disclaimer Component
- [ ] Create `CopilotChatViewDisclaimerComponent`
  - [ ] Integration with CopilotChatConfigurationService
  - [ ] Default text display
  - [ ] Configurable via labels
- [ ] Implement exact styling
  - [ ] `text-center text-xs text-muted-foreground`
  - [ ] `py-3 px-4 max-w-3xl mx-auto`

## Phase 4: Feature Implementation

### 4.1 Dynamic Height Management
- [ ] Implement ResizeObserver for input container
  - [ ] Monitor height changes
  - [ ] Update scroll view padding dynamically
  - [ ] Prevent content overlap
- [ ] Implement resize state management
  - [ ] Track resize operations
  - [ ] 250ms timeout for completion
  - [ ] Prevent UI jitter

### 4.2 Scroll Position Management
- [ ] Implement scroll event listeners
  - [ ] Monitor scroll position
  - [ ] Bottom detection logic
  - [ ] Smooth animations
- [ ] Implement scroll-to-bottom functionality
  - [ ] Smooth scrolling behavior
  - [ ] Focus management after scroll

### 4.3 Message Integration
- [ ] Integrate with existing CopilotChatMessageViewComponent
  - [ ] Pass messages array
  - [ ] Pass slot configurations
  - [ ] Handle feedback callbacks
- [ ] Implement message container styling
  - [ ] Maximum width constraint
  - [ ] Centered with auto margins
  - [ ] Dynamic bottom padding

### 4.4 Input Integration
- [ ] Integrate with existing CopilotChatInputComponent
  - [ ] Pass input configurations
  - [ ] Handle submit callbacks
  - [ ] Support all input modes

## Phase 5: Configuration & Providers

### 5.1 Configuration Service Integration
- [ ] Integrate with CopilotChatConfigurationService
  - [ ] Access labels configuration
  - [ ] Access input handlers
  - [ ] Support scoped configuration
- [ ] Default configuration support
  - [ ] Work without provider
  - [ ] Fallback to defaults

### 5.2 Dependency Injection
- [ ] Create proper provider functions
  - [ ] Component-level providers
  - [ ] Global providers
- [ ] Support multiple instances
  - [ ] Independent configurations
  - [ ] Isolated state

## Phase 6: Testing

### 6.1 Unit Tests (`copilot-chat-view.component.spec.ts`)
- [ ] Basic rendering tests
  - [ ] Component creation
  - [ ] Default classes application
  - [ ] Empty state rendering
- [ ] Message display tests
  - [ ] Single message rendering
  - [ ] Multiple messages rendering
  - [ ] Message filtering logic
- [ ] Scroll behavior tests
  - [ ] Auto-scroll mode
  - [ ] Manual scroll mode
  - [ ] Scroll button visibility
- [ ] Slot customization tests
  - [ ] Custom component slots
  - [ ] Template slots
  - [ ] Class overrides
  - [ ] Props passing
- [ ] Resize observer tests
  - [ ] Height tracking
  - [ ] Padding updates
  - [ ] Debounce behavior
- [ ] Configuration tests
  - [ ] Label customization
  - [ ] Handler callbacks
  - [ ] Default values

### 6.2 Sub-component Tests
- [ ] ScrollView component tests
  - [ ] Scroll position tracking
  - [ ] SSR safety
  - [ ] Mode switching
- [ ] ScrollToBottomButton tests
  - [ ] Click handling
  - [ ] Visibility logic
  - [ ] Styling application
- [ ] Feather component tests
  - [ ] Gradient rendering
  - [ ] Dark mode support
- [ ] InputContainer tests
  - [ ] Ref forwarding
  - [ ] Children rendering
- [ ] Disclaimer tests
  - [ ] Text display
  - [ ] Configuration integration

### 6.3 Integration Tests
- [ ] Full chat flow tests
  - [ ] Message sending
  - [ ] Auto-scrolling
  - [ ] User interactions
- [ ] Custom layout tests
  - [ ] Render props pattern
  - [ ] Context passing
- [ ] Multiple instance tests
  - [ ] Independent configurations
  - [ ] State isolation

## Phase 7: Storybook Stories

### 7.1 Main Story (`CopilotChatView.stories.ts`)
- [ ] Create story file with proper metadata
  - [ ] Title: "UI/CopilotChatView"
  - [ ] Component description
  - [ ] Fullscreen layout
- [ ] Default story implementation
  - [ ] Full conversation example
  - [ ] Mixed message types
  - [ ] Markdown content
  - [ ] Code blocks
- [ ] Configure providers
  - [ ] CopilotKit provider
  - [ ] Chat configuration provider
  - [ ] Labels configuration

### 7.2 Story Variations
- [ ] Auto-scroll enabled story
- [ ] Manual scroll mode story
- [ ] Custom scroll button story
- [ ] No feather effect story
- [ ] Custom disclaimer story
- [ ] Empty state story
- [ ] Loading state story
- [ ] Error state story

### 7.3 Interactive Stories
- [ ] Message feedback story
  - [ ] Thumbs up/down handlers
  - [ ] Alert on feedback
- [ ] Dynamic messages story
  - [ ] Add message functionality
  - [ ] Remove message functionality
- [ ] Theme switching story
  - [ ] Light/dark mode toggle
  - [ ] Style preservation

## Phase 8: Styling & CSS

### 8.1 Tailwind Classes
- [ ] Ensure all Tailwind classes match React exactly
  - [ ] Container classes
  - [ ] Responsive classes
  - [ ] Dark mode classes
- [ ] Verify class merging with cn() utility
- [ ] Test all breakpoints

### 8.2 Dark Mode Support
- [ ] Implement all dark mode variants
  - [ ] Background colors
  - [ ] Border colors
  - [ ] Text colors
  - [ ] Gradient colors
- [ ] Test theme switching

### 8.3 Responsive Design
- [ ] Mobile layout testing
  - [ ] Touch interactions
  - [ ] Padding adjustments
  - [ ] Button sizes
- [ ] Desktop layout testing
  - [ ] Wide screens
  - [ ] Content constraints

## Phase 9: Performance Optimization

### 9.1 Change Detection
- [ ] Implement OnPush strategy
- [ ] Use signals for efficient updates
- [ ] Minimize unnecessary renders

### 9.2 Memory Management
- [ ] Proper cleanup in ngOnDestroy
  - [ ] Observer disconnection
  - [ ] Event listener removal
  - [ ] Timeout cancellation
- [ ] Subscription management

### 9.3 Virtual Scrolling (Optional Enhancement)
- [ ] Consider CDK virtual scrolling for large message lists
- [ ] Implement if performance issues arise

## Phase 10: Documentation & Export

### 10.1 Component Documentation
- [ ] Add comprehensive JSDoc comments
  - [ ] Component description
  - [ ] Input descriptions
  - [ ] Usage examples
- [ ] Document all public methods
- [ ] Document slot system usage

### 10.2 Export Configuration
- [ ] Add to public-api.ts
  - [ ] Main component
  - [ ] All sub-components
  - [ ] Types and interfaces
- [ ] Update barrel exports
- [ ] Verify tree-shaking

### 10.3 Migration Guide
- [ ] Document React to Angular mapping
- [ ] Provide migration examples
- [ ] Note any behavioral differences

## Phase 11: Quality Assurance

### 11.1 Cross-browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

### 11.2 Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] ARIA attributes
- [ ] Focus management

### 11.3 Performance Testing
- [ ] Large message lists
- [ ] Rapid scrolling
- [ ] Resize performance
- [ ] Memory leaks

## Phase 12: Final Review

### 12.1 Code Review Checklist
- [ ] All features from COPILOT_CHAT_VIEW.md implemented
- [ ] DOM structure matches React exactly
- [ ] All Tailwind classes preserved
- [ ] Slot system fully functional
- [ ] Tests passing with good coverage
- [ ] Storybook stories working
- [ ] No console errors or warnings

### 12.2 Feature Parity Verification
- [ ] Message display system ✓
- [ ] Auto-scrolling system ✓
- [ ] Scroll-to-bottom button ✓
- [ ] Input container system ✓
- [ ] Visual feather effect ✓
- [ ] Disclaimer section ✓
- [ ] Input component integration ✓
- [ ] Layout system ✓
- [ ] Configuration provider integration ✓
- [ ] Render props pattern support ✓
- [ ] Responsive design features ✓
- [ ] Performance optimizations ✓
- [ ] Accessibility features ✓
- [ ] Storybook integration ✓
- [ ] Styling customization ✓
- [ ] State management ✓
- [ ] Event handling ✓
- [ ] TypeScript features ✓
- [ ] Component composition ✓
- [ ] Error boundaries ✓

## Notes

- **Priority**: Focus on exact feature parity with React implementation
- **DOM Structure**: Must match React exactly for CSS compatibility
- **Tailwind Classes**: Copy all classes verbatim from React components
- **Slot System**: Use Angular slot system as seen in existing components
- **Testing**: Follow patterns from existing Angular component tests
- **Storybook**: Match React story structure and examples

## Dependencies to Add

```json
{
  "dependencies": {
    "@angular/cdk": "^17.x.x",  // For ScrollingModule if needed
    "lucide-angular": "^x.x.x"  // Or alternative icon library
  }
}
```

## Estimated Timeline

- Phase 1-2: 2 days (Infrastructure & Main Component)
- Phase 3-4: 2 days (Sub-components & Features)
- Phase 5-6: 1 day (Configuration & Testing)
- Phase 7-8: 1 day (Storybook & Styling)
- Phase 9-12: 2 days (Optimization, QA, Review)

**Total: ~8 days for complete implementation**
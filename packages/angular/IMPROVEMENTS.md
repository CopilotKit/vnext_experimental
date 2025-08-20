# Angular Implementation Improvements

## Executive Summary

The Angular implementation of CopilotKit provides core functionality but needs improvements to achieve feature parity with React and better leverage Angular's strengths. This document outlines specific improvements needed for the existing implementation.

## 1. API Consistency Issues

### Current Problems

The Angular implementation has inconsistent API patterns compared to React:

| React API             | Angular Current                             | Angular Recommended                  |
| --------------------- | ------------------------------------------- | ------------------------------------ |
| `useAgent()`          | `watchAgent()` + `CopilotkitAgentDirective` | Keep both, standardize naming        |
| `useAgentContext()`   | `CopilotkitAgentContextDirective` only      | Add `registerAgentContext()` utility |
| `useFrontendTool()`   | `registerFrontendTool()` + directive        | ✅ Good pattern                      |
| `useHumanInTheLoop()` | `CopilotkitHumanInTheLoopDirective` only    | Add utility function                 |

### Recommendations

- **Standardize naming**: Use `watch*` for reactive utilities, `register*` for setup utilities
- **Provide both patterns**: Directive for template use, utility for programmatic use
- **Document clearly**: Explain when to use each approach

## 2. Memory and Testing Issues

### Problem: Field Injection in Directives

```typescript
// Current (problematic)
export class CopilotkitAgentDirective {
  private readonly copilotkit = inject(CopilotKitService);
  private readonly destroyRef = inject(DestroyRef);
}
```

**Issues:**

- Causes "JavaScript heap out of memory" errors in tests
- Must be called in injection context
- Harder to test with mocked dependencies

### Solution: Constructor Injection

```typescript
// Recommended
export class CopilotkitAgentDirective {
  constructor(
    private readonly copilotkit: CopilotKitService,
    private readonly destroyRef: DestroyRef
  ) {}
}
```

**Benefits:**

- Better testability
- No memory issues
- More explicit dependencies
- Works with TestBed.configureTestingModule()

## 3. Directive Input Handling

### Current Complexity

```typescript
@Input('copilotkitAgent')
set directiveAgentId(value: string | undefined | '') {
  if (value === '') {
    this.agentId = undefined;
  } else if (typeof value === 'string') {
    this.agentId = value;
  }
}
```

### Recommended Simplification

```typescript
@Input() agentId?: string;

// Or if selector-based input is needed:
@Input('copilotkitAgent') agentId?: string;
```

## 4. Missing Utility Functions

### Add Agent Context Utility

```typescript
export function registerAgentContext(context: Context): string {
  const service = inject(CopilotKitService);
  const destroyRef = inject(DestroyRef);

  const id = service.copilotkit.addContext(context);

  destroyRef.onDestroy(() => {
    service.copilotkit.removeContext(id);
  });

  return id;
}
```

### Add Human-in-the-Loop Utility

```typescript
export function registerHumanInTheLoop<T extends Record<string, any>>(
  config: HumanInTheLoopConfig<T>
): HumanInTheLoopHandle {
  const service = inject(CopilotKitService);
  const destroyRef = inject(DestroyRef);
  const statusSignal = signal<HumanInTheLoopStatus>("inProgress");

  // Implementation similar to directive but as utility
  // ...

  return {
    status: statusSignal.asReadonly(),
    respond: (result: unknown) => {
      /* ... */
    },
    destroy: () => {
      /* ... */
    },
  };
}
```

## 5. Leverage Angular Features

### Add RxJS Support

```typescript
// Current: Only signals
readonly isRunning = signal<boolean>(false);

// Add: Observable alternatives
readonly isRunning$ = toObservable(this.isRunning);

```

### Use Angular CDK for the tool menu in the chat input

## 6. Type Safety Improvements

### Current Issue

```typescript
// Too permissive
@Input() value?: any;
```

### Recommended

```typescript
// Use generics
export class CopilotkitAgentContextDirective<T = unknown> {
  @Input() value?: T;
  @Input() description!: string;
}
```

## 8. Slot System Improvements

The current slot system is functional but could be more Angular-idiomatic:

### Current

```typescript
renderSlot(slots.textArea, {} /* default content */);
```

### Recommended: Use ng-content projection

```typescript
@Component({
  template: `
    <ng-content select="[textarea]">
      <!-- Default content -->
    </ng-content>
  `
})
```

## 9. Error Handling

### Add Better Error Messages

```typescript
if (!tool.name) {
  throw new Error(
    'CopilotkitFrontendToolDirective: "name" is required. ' +
      'Please provide a name via [name]="toolName" or ' +
      "[copilotkitFrontendTool]=\"{ name: 'toolName', ... }\""
  );
}
```

### Add Development Mode Warnings

```typescript
if (isDevMode() && tool.name in currentRenders) {
  console.warn(
    `[CopilotKit] Tool "${tool.name}" already has a render. ` +
      `The previous render will be replaced. ` +
      `This may indicate a duplicate tool registration.`
  );
}
```

## 10. Testing Improvements

### Current Test Issues

- Memory problems with many test components
- Difficulty testing directives with inject()
- Complex TestBed configurations

### Recommendations

1. **Use testing utilities**

```typescript
// Create testing module helper
export function createCopilotKitTestingModule(
  config?: Partial<CopilotKitConfig>
) {
  return TestBed.configureTestingModule({
    providers: [
      provideCopilotKit(config ?? {}),
      // Mock providers
    ],
  });
}
```

2. **Simplify directive tests**

```typescript
// Use host components with constructor injection
@Component({
  template: `<div copilotkitAgent [agentId]="agentId"></div>`,
})
class TestHostComponent {
  agentId = "test-agent";
}
```

3. **Add integration tests**

```typescript
// Test full flows, not just units
it("should handle agent context updates through lifecycle", async () => {
  // Test directive + service + context together
});
```

## Priority Implementation Order

### High Priority

1. Fix memory issues (constructor injection)
2. Add missing utility functions
3. Standardize API naming

### Medium Priority

4. Improve type safety
5. Add RxJS support
6. Enhance error handling

### Low Priority

7. Refactor service architecture
8. Add Angular CDK integration
9. Improve slot system
10. Add animations

## Conclusion

The Angular implementation has a solid foundation but needs these improvements to:

- Achieve feature parity with React
- Be more idiomatic to Angular
- Provide better developer experience
- Improve testability and performance

Focus should be on fixing critical issues (memory, testing) first, then enhancing the API surface, and finally adding Angular-specific optimizations.

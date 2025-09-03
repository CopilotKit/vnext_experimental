# CopilotKit Angular - Agent Context

This document demonstrates how to use agent context in the Angular version of CopilotKit.

## Installation

```bash
pnpm add @copilotkit/angular
```

## Usage

### 1. Directive Approach (Declarative)

The directive approach is ideal for template-driven context management.

#### Basic Usage

```typescript
import { Component } from "@angular/core";
import { CopilotKitAgentContextDirective } from "@copilotkit/angular";

@Component({
  selector: "app-user-profile",
  template: `
    <div
      copilotkitAgentContext
      description="User profile data"
      [value]="userProfile"
    >
      <!-- Your component content -->
    </div>
  `,
  standalone: true,
  imports: [CopilotKitAgentContextDirective],
})
export class UserProfileComponent {
  userProfile = {
    id: 123,
    name: "John Doe",
    preferences: {
      theme: "dark",
      language: "en",
    },
  };
}
```

#### Dynamic Values with Signals

```typescript
import { Component, signal, computed } from "@angular/core";

@Component({
  selector: "app-counter",
  template: `
    <div
      copilotkitAgentContext
      description="Counter state"
      [value]="contextValue()"
    >
      <button (click)="increment()">Count: {{ count() }}</button>
    </div>
  `,
})
export class CounterComponent {
  count = signal(0);

  contextValue = computed(() => ({
    count: this.count(),
    doubled: this.count() * 2,
    timestamp: Date.now(),
  }));

  increment() {
    this.count.update((c) => c + 1);
  }
}
```

#### With Observables

```typescript
import { Component } from "@angular/core";
import { interval, map } from "rxjs";
import { AsyncPipe } from "@angular/common";

@Component({
  selector: "app-live-data",
  template: `
    <div
      copilotkitAgentContext
      description="Live data stream"
      [value]="liveData$ | async"
    >
      <!-- Component content -->
    </div>
  `,
  imports: [AsyncPipe, CopilotKitAgentContextDirective],
})
export class LiveDataComponent {
  liveData$ = interval(1000).pipe(
    map((tick) => ({
      iteration: tick,
      timestamp: new Date(),
      data: this.generateData(tick),
    }))
  );
}
```

#### Using Context Object

```typescript
@Component({
  template: `
    <div [copilotkitAgentContext]="myContext">
      <!-- Content -->
    </div>
  `
})
export class MyComponent {
  myContext = {
    description: 'Application state',
    value: {
      route: '/dashboard',
      user: 'admin',
      settings: { ... }
    }
  };
}
```

### 2. Programmatic Approach

For services and components that need programmatic control.

#### Basic Usage

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { addAgentContext, injectCopilotKit } from '@copilotkit/angular';

@Component({...})
export class MyComponent implements OnInit, OnDestroy {
  private copilotkit = injectCopilotKit();
  private cleanupFns: Array<() => void> = [];

  ngOnInit() {
    // Add context and store cleanup function
    const cleanup = addAgentContext(this.copilotkit, {
      description: 'Component initialization data',
      value: this.initData
    });

    this.cleanupFns.push(cleanup);
  }

  ngOnDestroy() {
    // Clean up all contexts
    this.cleanupFns.forEach(fn => fn());
  }
}
```

#### Auto-cleanup with useAgentContext

```typescript
import { Component, OnInit } from '@angular/core';
import { useAgentContext } from '@copilotkit/angular';

@Component({...})
export class MyComponent implements OnInit {
  ngOnInit() {
    // Automatically cleaned up when component is destroyed
    const contextId = useAgentContext({
      description: 'Auto-managed context',
      value: this.data
    });

    console.log('Context added with ID:', contextId);
  }
}
```

#### Reactive Context

```typescript
import { Component, signal, computed } from '@angular/core';
import { createReactiveContext } from '@copilotkit/angular';

@Component({...})
export class ReactiveComponent {
  private settings = signal({ theme: 'light' });

  ngOnInit() {
    const context = createReactiveContext(
      'User settings',
      computed(() => this.settings())
    );

    // Update context when needed
    this.settings.set({ theme: 'dark' });
    context.update(); // Manually trigger update if needed
  }
}
```

### 3. Multiple Contexts

You can have multiple contexts active at the same time:

```typescript
@Component({
  template: `
    <div copilotkitAgentContext
         description="User data"
         [value]="userData">

      <div copilotkitAgentContext
           description="Form state"
           [value]="formData">

        <div copilotkitAgentContext
             description="UI state"
             [value]="uiState">
          <!-- All three contexts are active here -->
        </div>
      </div>
    </div>
  `
})
export class MultiContextComponent {
  userData = { ... };
  formData = { ... };
  uiState = { ... };
}
```

### 4. Conditional Context

Context can be conditionally added/removed:

```typescript
@Component({
  template: `
    <div *ngIf="isLoggedIn"
         copilotkitAgentContext
         description="Authenticated user context"
         [value]="userContext">
      <!-- Only added when user is logged in -->
    </div>
  `
})
export class ConditionalContextComponent {
  isLoggedIn = false;
  userContext = { ... };
}
```

## Best Practices

1. **Use descriptive names**: Make context descriptions clear and specific
2. **Keep values serializable**: Context values should be JSON-serializable
3. **Avoid sensitive data**: Don't include passwords, tokens, or PII in context
4. **Update responsibly**: Frequent updates may impact performance
5. **Clean up**: Always remove contexts when no longer needed

## Comparison with React

| React                           | Angular                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `useAgentContext(context)` hook | `copilotkitAgentContext` directive or `useAgentContext()` function |
| Updates via useEffect deps      | Updates via `OnChanges` lifecycle                                  |
| Cleanup in useEffect return     | Cleanup in `OnDestroy` lifecycle                                   |
| Re-renders trigger updates      | Signal/Observable changes trigger updates                          |

## TypeScript Support

All functions and directives are fully typed:

```typescript
import type { Context } from '@copilotkit/angular';

const myContext: Context = {
  description: 'Typed context',
  value: {
    // Any serializable value
    id: 123,
    data: ['a', 'b', 'c'],
    nested: { ... }
  }
};
```

## Testing

The agent context directive and utilities are fully testable:

```typescript
it("should add context on init", () => {
  const fixture = TestBed.createComponent(MyComponent);
  fixture.detectChanges();

  expect(mockCopilotKit.addContext).toHaveBeenCalledWith({
    description: "Test context",
    value: expectedValue,
  });
});
```

Overall Statistics

- 8 out of 33 test files (24%) rely on timing mechanisms
- Total timing-related instances: 167

Breakdown by Timing Pattern:

| Pattern                         | Files | Instances |
| ------------------------------- | ----- | --------- |
| waitFor (React Testing Library) | 6     | 119       |
| setTimeout/setInterval          | 6     | 25        |
| waitForReactUpdate (custom)     | 2     | 11        |
| waitForCondition (custom)       | 1     | 5         |
| Date.now/performance.now        | 3     | 7         |

Most Timing-Dependent Test Files:

1. use-frontend-tool.e2e.test.tsx - 58 timing instances (55 waitFor + 3 setTimeout)
2. CopilotChat.e2e.test.tsx - 38 instances (28 waitFor + 10 waitForReactUpdate)
3. CopilotChatToolRendering.e2e.test.tsx - 20 instances (19 waitFor + 1 setTimeout)
4. use-human-in-the-loop.e2e.test.tsx - 14 instances (13 waitFor + 1 waitForReactUpdate)
5. enterprise-runner.test.ts - 12 instances (all setTimeout)

Key Insights:

- React e2e tests dominate timing dependencies (135 out of 167 instances)
- No timer mocking - tests use real delays instead of fake timers
- Two custom wait utilities exist that could potentially be standardized
- Most delays range from 10ms to 1000ms, with 50-100ms being most common

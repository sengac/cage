# Phase 2: Testing Interactive Components

## Testing Philosophy

Following **Acceptance Criteria Driven Development (ACDD)**, all tests are written BEFORE implementation and map directly to acceptance criteria from PHASE2.md. Tests use the exact Given-When-Then language from specifications.

## Testing Stack

### Core Tools
- **Vitest**: Test runner (NEVER Jest)
- **ink-testing-library**: Ink component testing
- **@testing-library/react-hooks**: Hook testing
- **@vitest/ui**: Visual test runner

### Test Types
1. **Unit Tests**: Individual component behavior
2. **Integration Tests**: Component interaction
3. **E2E Tests**: Full TUI flows
4. **Performance Tests**: Rendering and memory

## Writing Tests for Ink Components

### Basic Component Test
```typescript
import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { MainMenu } from './MainMenu';

describe('MainMenu', () => {
  describe('Given the main menu is displayed', () => {
    describe('When the user presses down arrow', () => {
      it('Then the selection should move to the next item', () => {
        const { stdin, lastFrame } = render(<MainMenu />);

        // Initial state
        expect(lastFrame()).toContain('> Events Inspector');

        // Press down arrow
        stdin.write('\u001B[B');

        // Verify selection moved
        expect(lastFrame()).toContain('> Real-time Monitor');
      });
    });

    describe('When the user presses Enter', () => {
      it('Then it should navigate to the selected view', () => {
        const onSelect = vi.fn();
        const { stdin } = render(<MainMenu onSelect={onSelect} />);

        stdin.write('\r');

        expect(onSelect).toHaveBeenCalledWith('events');
      });
    });
  });
});
```

### Testing Virtual Scrolling
```typescript
describe('VirtualList', () => {
  const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);

  describe('Given a list with 100 items and height of 10', () => {
    describe('When rendered', () => {
      it('Then only 10 items should be visible', () => {
        const { lastFrame } = render(
          <VirtualList
            items={items}
            height={10}
            renderItem={(item) => <Text>{item}</Text>}
          />
        );

        const frame = lastFrame();
        expect(frame).toContain('Item 0');
        expect(frame).toContain('Item 9');
        expect(frame).not.toContain('Item 10');
      });
    });

    describe('When scrolling down', () => {
      it('Then the viewport should update', () => {
        const { stdin, lastFrame } = render(
          <VirtualList
            items={items}
            height={10}
            renderItem={(item) => <Text>{item}</Text>}
          />
        );

        // Scroll down 10 times
        for (let i = 0; i < 10; i++) {
          stdin.write('\u001B[B');
        }

        const frame = lastFrame();
        expect(frame).toContain('Item 10');
        expect(frame).not.toContain('Item 0');
      });
    });
  });
});
```

### Testing State Management
```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useAppStore } from './appStore';

describe('AppStore', () => {
  describe('Given the app store is initialized', () => {
    describe('When navigate is called', () => {
      it('Then currentView should update', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.navigate('events');
        });

        expect(result.current.currentView).toBe('events');
        expect(result.current.navigationStack).toContain('menu');
      });
    });

    describe('When goBack is called', () => {
      it('Then should return to previous view', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.navigate('events');
          result.current.navigate('eventDetail');
          result.current.goBack();
        });

        expect(result.current.currentView).toBe('events');
      });
    });
  });
});
```

### Testing Keyboard Input
```typescript
describe('Keyboard Navigation', () => {
  describe('Given a component with keyboard navigation', () => {
    const testCases = [
      { key: '\u001B[A', description: 'up arrow', expected: 'moveUp' },
      { key: '\u001B[B', description: 'down arrow', expected: 'moveDown' },
      { key: 'k', description: 'k key', expected: 'moveUp' },
      { key: 'j', description: 'j key', expected: 'moveDown' },
      { key: '\r', description: 'enter key', expected: 'select' },
      { key: '\u001B', description: 'escape key', expected: 'back' },
    ];

    testCases.forEach(({ key, description, expected }) => {
      describe(`When ${description} is pressed`, () => {
        it(`Then should trigger ${expected} action`, () => {
          const actions = {
            moveUp: vi.fn(),
            moveDown: vi.fn(),
            select: vi.fn(),
            back: vi.fn(),
          };

          const { stdin } = render(<TestComponent {...actions} />);
          stdin.write(key);

          expect(actions[expected]).toHaveBeenCalled();
        });
      });
    });
  });
});
```

## Testing Patterns

### Mock Data Generation
```typescript
// test-utils/mockData.ts
export const generateMockEvents = (count: number): Event[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `event-${i}`,
    timestamp: new Date(Date.now() - i * 1000).toISOString(),
    eventType: ['ToolUse', 'UserMessage'][i % 2],
    toolName: ['Read', 'Edit', 'Write'][i % 3],
    // ... more fields
  }));
};
```

### Custom Test Utilities
```typescript
// test-utils/ink-helpers.ts
export const waitForText = async (
  getInstance: () => any,
  text: string,
  timeout = 1000
): Promise<void> => {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const frame = getInstance().lastFrame();
    if (frame?.includes(text)) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  throw new Error(`Text "${text}" not found within ${timeout}ms`);
};
```

### Testing Async Operations
```typescript
describe('SSE Connection', () => {
  describe('Given the stream view is open', () => {
    describe('When events are received', () => {
      it('Then they should appear in the list', async () => {
        const { rerender } = render(<StreamView />);

        // Simulate SSE event
        act(() => {
          mockEventSource.emit('message', {
            data: JSON.stringify(mockEvent)
          });
        });

        await waitFor(() => {
          expect(lastFrame()).toContain(mockEvent.id);
        });
      });
    });
  });
});
```

## Performance Testing

### Rendering Performance
```typescript
describe('Performance', () => {
  describe('Given a large dataset', () => {
    it('Then should render within 100ms', () => {
      const items = generateMockEvents(10000);

      const start = performance.now();
      const { container } = render(
        <EventInspector events={items} />
      );
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });

    it('Then should use virtual scrolling', () => {
      const items = generateMockEvents(10000);

      const { container } = render(
        <VirtualList items={items} height={20} />
      );

      // Only 20 items should be in DOM
      const renderedItems = container.querySelectorAll('[data-item]');
      expect(renderedItems.length).toBe(20);
    });
  });
});
```

### Memory Testing
```typescript
describe('Memory Management', () => {
  it('should not leak memory on unmount', () => {
    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < 100; i++) {
      const { unmount } = render(<LargeComponent />);
      unmount();
    }

    global.gc(); // Run garbage collection

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Should not increase by more than 10MB
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
  });
});
```

## Integration Testing

### Full Flow Tests
```typescript
describe('Event Inspection Flow', () => {
  describe('Given the user launches Cage', () => {
    describe('When navigating to event inspector', () => {
      it('Then should complete full inspection flow', () => {
        const { stdin, lastFrame } = render(<App />);

        // Skip logo
        stdin.write(' ');
        expect(lastFrame()).toContain('CAGE CONTROL CENTER');

        // Navigate to events
        stdin.write('\r');
        expect(lastFrame()).toContain('EVENT INSPECTOR');

        // Search for events
        stdin.write('/');
        stdin.write('Read');
        stdin.write('\r');
        expect(lastFrame()).toContain('Read');

        // Select an event
        stdin.write('\r');
        expect(lastFrame()).toContain('Event Details');

        // Go back
        stdin.write('\u001B');
        expect(lastFrame()).toContain('EVENT INSPECTOR');
      });
    });
  });
});
```

## Test Organization

### File Structure
```
packages/cli/src/
├── components/
│   ├── Logo.tsx
│   ├── Logo.test.tsx
│   ├── MainMenu.tsx
│   ├── MainMenu.test.tsx
│   ├── VirtualList.tsx
│   └── VirtualList.test.tsx
├── stores/
│   ├── appStore.ts
│   └── appStore.test.ts
└── test-utils/
    ├── mockData.ts
    ├── ink-helpers.ts
    └── setup.ts
```

### Test Naming Convention
```typescript
// Component tests
ComponentName.test.tsx

// Integration tests
ComponentName.integration.test.tsx

// Performance tests
ComponentName.perf.test.tsx

// E2E tests
feature.e2e.test.tsx
```

## Coverage Requirements

### Minimum Coverage
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### Critical Path Coverage
These must have 100% coverage:
- Navigation logic
- Event filtering
- Virtual scrolling
- State management

## Running Tests

### Commands
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test Logo.test.tsx

# Run with UI
npm run test:ui
```

### CI/CD Integration
```yaml
# .github/workflows/test.yml
test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v2
    - uses: actions/setup-node@v2
    - run: npm ci
    - run: npm run test:coverage
    - uses: codecov/codecov-action@v2
```

## Debugging Tests

### Visual Debugging
```typescript
const { stdin, stdout, lastFrame, frames } = render(<App />);

// Print all frames for debugging
console.log(frames.map(f => f.output).join('\n---\n'));

// Print last frame
console.log('Last frame:', lastFrame());
```

### Interactive Debugging
```typescript
it.only('debug this test', () => {
  const { stdin, lastFrame, rerender } = render(<Component />);

  // Add debugger statement
  debugger;

  stdin.write('test input');

  // Inspect state
  console.log(lastFrame());
});
```

## Test Checklist

### For Each Component
- [ ] Renders without errors
- [ ] Handles all props correctly
- [ ] Keyboard navigation works
- [ ] Callbacks are called correctly
- [ ] Error states are handled
- [ ] Loading states work
- [ ] Empty states display
- [ ] Accessibility requirements met

### For Each Feature
- [ ] Happy path works
- [ ] Error cases handled
- [ ] Edge cases covered
- [ ] Performance acceptable
- [ ] Memory usage reasonable
- [ ] Integration points tested

## Current Test Status

### Components with Tests ✅
- VirtualList (comprehensive)

### Components Needing Tests ⏳
- Logo
- MainMenu
- EventInspector
- App
- All stores

### Test Infrastructure ✅
- Vitest configured
- ink-testing-library installed
- Test utilities created
- Mock data generators

## Next Steps

1. Write tests for existing components
2. Add integration tests for navigation
3. Create performance benchmarks
4. Setup CI/CD test pipeline
5. Add visual regression tests
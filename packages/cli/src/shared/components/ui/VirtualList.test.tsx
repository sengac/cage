import React from 'react';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VirtualList, useVirtualListState } from './VirtualList';
import { InputModeProvider } from '../../contexts/InputContext';

describe('VirtualList', () => {
  const mockItems = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    name: `Item ${i + 1}`,
  }));

  const renderItem = (
    item: (typeof mockItems)[0],
    _index: number,
    isSelected: boolean
  ) => (
    <Text color={isSelected ? 'blue' : 'white'}>
      {isSelected ? '>' : ' '} {item.name}
    </Text>
  );

  // Helper to render VirtualList with InputModeProvider
  const renderVirtualList = (
    props: React.ComponentProps<typeof VirtualList>
  ) => {
    return render(
      <InputModeProvider>
        <VirtualList {...props} />
      </InputModeProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render visible items within height limit', () => {
      const { lastFrame } = renderVirtualList({
        items: mockItems,
        height: 5,
        renderItem,
      });

      const frame = lastFrame();
      expect(frame).toContain('Item 1');
      expect(frame).toContain('Item 5');
      expect(frame).not.toContain('Item 6');
    });

    it('should show empty message when no items', () => {
      const { lastFrame } = renderVirtualList({
        items: [],
        height: 5,
        renderItem,
        emptyMessage: 'No data available',
      });

      expect(lastFrame()).toContain('No data available');
    });

    it('should highlight selected item', () => {
      const { lastFrame } = renderVirtualList({
        items: mockItems.slice(0, 3),
        height: 3,
        renderItem,
      });

      const frame = lastFrame();
      expect(frame).toContain('> Item 1');
      expect(frame).toContain('  Item 2');
      expect(frame).toContain('  Item 3');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should move selection down with arrow key', async () => {
      const { lastFrame, stdin, rerender } = renderVirtualList({
        items: mockItems.slice(0, 3),
        height: 3,
        renderItem,
        testMode: true,
      });

      stdin.write('\u001B[B'); // Down arrow
      await act(() => {
        rerender(
          <InputModeProvider>
            <VirtualList
              items={mockItems.slice(0, 3)}
              height={3}
              renderItem={renderItem}
              testMode={true}
            />
          </InputModeProvider>
        );
      });

      const frame = lastFrame();
      expect(frame).toContain('  Item 1');
      expect(frame).toContain('> Item 2');
      expect(frame).toContain('  Item 3');
    });

    it('should move selection up with arrow key', async () => {
      const { lastFrame, stdin, rerender } = renderVirtualList({
        items: mockItems.slice(0, 3),
        height: 3,
        renderItem,
        testMode: true,
      });

      stdin.write('\u001B[B'); // Down arrow
      await act(() => {
        rerender(
          <InputModeProvider>
            <VirtualList
              items={mockItems.slice(0, 3)}
              height={3}
              renderItem={renderItem}
              testMode={true}
            />
          </InputModeProvider>
        );
      });

      stdin.write('\u001B[B'); // Down arrow
      await act(() => {
        rerender(
          <InputModeProvider>
            <VirtualList
              items={mockItems.slice(0, 3)}
              height={3}
              renderItem={renderItem}
              testMode={true}
            />
          </InputModeProvider>
        );
      });

      stdin.write('\u001B[A'); // Up arrow
      await act(() => {
        rerender(
          <InputModeProvider>
            <VirtualList
              items={mockItems.slice(0, 3)}
              height={3}
              renderItem={renderItem}
              testMode={true}
            />
          </InputModeProvider>
        );
      });

      const frame = lastFrame();
      expect(frame).toContain('  Item 1');
      expect(frame).toContain('> Item 2');
      expect(frame).toContain('  Item 3');
    });

    it('should wrap around when enableWrapAround is true', async () => {
      const { lastFrame, stdin, rerender } = renderVirtualList({
        items: mockItems.slice(0, 3),
        height: 3,
        renderItem,
        enableWrapAround: true,
        testMode: true,
      });

      stdin.write('\u001B[A'); // Up arrow from first item
      await act(() => {
        rerender(
          <InputModeProvider>
            <VirtualList
              items={mockItems.slice(0, 3)}
              height={3}
              renderItem={renderItem}
              enableWrapAround={true}
              testMode={true}
            />
          </InputModeProvider>
        );
      });

      const frame = lastFrame();
      expect(frame).toContain('  Item 1');
      expect(frame).toContain('  Item 2');
      expect(frame).toContain('> Item 3');
    });

    it('should not wrap around when enableWrapAround is false', () => {
      const { lastFrame, stdin } = renderVirtualList({
        items: mockItems.slice(0, 3),
        height: 3,
        renderItem,
        enableWrapAround: false,
        testMode: true,
      });

      stdin.write('\u001B[A'); // Up arrow from first item

      const frame = lastFrame();
      expect(frame).toContain('> Item 1'); // Still on first item
      expect(frame).toContain('  Item 2');
      expect(frame).toContain('  Item 3');
    });
  });

  describe('Virtual Scrolling', () => {
    it('should scroll down when selection moves beyond visible area', async () => {
      const { lastFrame, stdin, rerender } = renderVirtualList({
        items: mockItems,
        height: 3,
        renderItem,
        testMode: true,
      });

      // Move down 3 times to trigger scroll
      for (let i = 0; i < 3; i++) {
        stdin.write('\u001B[B');
        await act(() => {
          rerender(
            <InputModeProvider>
              <VirtualList
                items={mockItems}
                height={3}
                renderItem={renderItem}
                testMode={true}
              />
            </InputModeProvider>
          );
        });
      }

      const frame = lastFrame();
      expect(frame).toContain('Item 2');
      expect(frame).toContain('Item 3');
      expect(frame).toContain('> Item 4');
      expect(frame).not.toContain('Item 1');
    });

    it('should scroll up when selection moves above visible area', async () => {
      const { lastFrame, stdin, rerender } = renderVirtualList({
        items: mockItems,
        height: 3,
        renderItem,
        testMode: true,
      });

      // Move to bottom then back up
      for (let i = 0; i < 5; i++) {
        stdin.write('\u001B[B'); // Down arrow
        await act(() => {
          rerender(
            <InputModeProvider>
              <VirtualList
                items={mockItems}
                height={3}
                renderItem={renderItem}
                testMode={true}
              />
            </InputModeProvider>
          );
        });
      }
      for (let i = 0; i < 3; i++) {
        stdin.write('\u001B[A'); // Up arrow
        await act(() => {
          rerender(
            <InputModeProvider>
              <VirtualList
                items={mockItems}
                height={3}
                renderItem={renderItem}
                testMode={true}
              />
            </InputModeProvider>
          );
        });
      }

      const frame = lastFrame();
      expect(frame).toContain('> Item 3');
    });
  });

  describe('Callbacks', () => {
    it('should call onSelect when Enter is pressed', async () => {
      const onSelect = vi.fn();
      const { stdin, rerender } = renderVirtualList({
        items: mockItems.slice(0, 3),
        height: 3,
        renderItem,
        onSelect,
        testMode: true,
      });

      stdin.write('\r'); // Enter key
      await act(() => {
        rerender(
          <InputModeProvider>
            <VirtualList
              items={mockItems.slice(0, 3)}
              height={3}
              renderItem={renderItem}
              onSelect={onSelect}
              testMode={true}
            />
          </InputModeProvider>
        );
      });

      expect(onSelect).toHaveBeenCalledWith(mockItems[0], 0);
    });

    it('should call onFocus when selection changes', async () => {
      const onFocus = vi.fn();
      const { stdin, rerender } = renderVirtualList({
        items: mockItems.slice(0, 3),
        height: 3,
        renderItem,
        onFocus,
        testMode: true,
      });

      stdin.write('\u001B[B'); // Down arrow
      await act(() => {
        rerender(
          <InputModeProvider>
            <VirtualList
              items={mockItems.slice(0, 3)}
              height={3}
              renderItem={renderItem}
              onFocus={onFocus}
              testMode={true}
            />
          </InputModeProvider>
        );
      });

      expect(onFocus).toHaveBeenLastCalledWith(mockItems[1], 1);
    });
  });

  describe('Scrollbar', () => {
    it('should show scrollbar when items exceed height', () => {
      const { lastFrame } = renderVirtualList({
        items: mockItems,
        height: 5,
        renderItem,
        showScrollbar: true,
      });

      const frame = lastFrame();
      expect(frame).toMatch(/[█─]/); // Contains scrollbar characters (square and line)
    });

    it('should not show scrollbar when showScrollbar is false', () => {
      const { lastFrame } = renderVirtualList({
        items: mockItems,
        height: 5,
        renderItem,
        showScrollbar: false,
      });

      const frame = lastFrame();
      expect(frame).not.toMatch(/[■│]/);
    });
  });

  describe('useVirtualListState hook', () => {
    it('should manage list state externally', async () => {
      const items = mockItems.slice(0, 5);
      let hookResult: ReturnType<
        typeof useVirtualListState<(typeof items)[0]>
      > | null = null;

      function TestComponent() {
        hookResult = useVirtualListState(items);
        return <Text>{hookResult.selectedIndex}</Text>;
      }

      const { rerender } = render(<TestComponent />);

      expect(hookResult?.selectedIndex).toBe(0);
      expect(hookResult?.selectedItem).toBe(items[0]);

      await act(() => {
        hookResult?.selectItem(2);
        rerender(<TestComponent />);
      });

      expect(hookResult?.selectedIndex).toBe(2);
      expect(hookResult?.selectedItem).toBe(items[2]);
    });

    it('should reset state', async () => {
      const items = mockItems.slice(0, 5);
      let hookResult: ReturnType<
        typeof useVirtualListState<(typeof items)[0]>
      > | null = null;

      function TestComponent() {
        hookResult = useVirtualListState(items, 1);
        return <Text>{hookResult.selectedIndex}</Text>;
      }

      const { rerender } = render(<TestComponent />);

      await act(() => {
        hookResult?.selectItem(3);
        hookResult?.scrollTo(2);
        rerender(<TestComponent />);
      });

      expect(hookResult?.selectedIndex).toBe(3);
      expect(hookResult?.scrollOffset).toBe(2);

      await act(() => {
        hookResult?.reset();
        rerender(<TestComponent />);
      });

      expect(hookResult?.selectedIndex).toBe(1);
      expect(hookResult?.scrollOffset).toBe(0);
    });
  });
});

// Helper to render hooks in tests
function renderHook<T>(hookFn: () => T) {
  const results: T[] = [];
  let renderCount = 0;

  function TestComponent() {
    const hookResult = hookFn();
    results[renderCount] = hookResult;
    renderCount++;
    return null;
  }

  const utils = render(<TestComponent />);

  return {
    result: {
      get current() {
        return results[renderCount - 1];
      },
    },
    rerender: () => {
      utils.rerender(<TestComponent />);
    },
    ...utils,
  };
}

// Helper for async actions in tests - forces re-render after state changes
function act(callback: () => void) {
  callback();
  // Force a small delay to allow React state updates to process
  return new Promise(resolve => setTimeout(resolve, 0));
}

import React, { useState, useEffect } from 'react';
import { Box, Text, useFocusManager } from 'ink';
import { useSafeInput } from '../hooks/useSafeInput';
import { useTheme } from '../hooks/useTheme';
import figures from 'figures';
import { useInputMode } from '../contexts/InputContext';

interface VirtualListProps<T> {
  items: T[];
  height: number;
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  onSelect?: (item: T, index: number) => void;
  onFocus?: (item: T, index: number) => void;
  keyExtractor?: (item: T, index: number) => string;
  emptyMessage?: string;
  showScrollbar?: boolean;
  enableWrapAround?: boolean;
  testMode?: boolean; // For testing, bypasses focus requirement
  initialIndex?: number; // Initial selected index
}

export function VirtualList<T>({
  items,
  height,
  renderItem,
  onSelect,
  onFocus,
  keyExtractor = (_item, index) => String(index),
  emptyMessage = 'No items to display',
  showScrollbar = true,
  enableWrapAround = true,
  testMode = false,
  initialIndex = 0,
}: VirtualListProps<T>): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [scrollOffset, setScrollOffset] = useState(Math.max(0, initialIndex - Math.floor(height / 2)));
  const theme = useTheme();
  const { isFocused } = useFocusManager();
  const { mode } = useInputMode();

  // Calculate visible range
  const visibleHeight = Math.min(height, items.length);
  const maxScrollOffset = Math.max(0, items.length - visibleHeight);

  // Helper to update both selected index and scroll offset atomically
  const navigateTo = (newIndex: number) => {
    setSelectedIndex(newIndex);

    // Calculate new scroll offset
    setScrollOffset(current => {
      if (newIndex < current) {
        return newIndex;
      } else if (newIndex >= current + visibleHeight) {
        return newIndex - visibleHeight + 1;
      }
      return current;
    });
  };

  // Call onFocus when selection changes (but only if items exist)
  useEffect(() => {
    if (items.length > 0 && onFocus && items[selectedIndex]) {
      onFocus(items[selectedIndex], selectedIndex);
    }
  }, [selectedIndex, items, onFocus]);

  useSafeInput(
    (input, key) => {
      if ((!isFocused && !testMode) || items.length === 0) return;

      if (key.upArrow || input === 'k') {
        const newIndex = selectedIndex === 0
          ? (enableWrapAround ? items.length - 1 : 0)
          : selectedIndex - 1;
        navigateTo(newIndex);
      } else if (key.downArrow || input === 'j') {
        const newIndex = selectedIndex === items.length - 1
          ? (enableWrapAround ? 0 : items.length - 1)
          : selectedIndex + 1;
        navigateTo(newIndex);
      } else if (key.pageUp) {
        navigateTo(Math.max(0, selectedIndex - visibleHeight));
      } else if (key.pageDown) {
        navigateTo(Math.min(items.length - 1, selectedIndex + visibleHeight));
      } else if (key.home || input === 'g') {
        navigateTo(0);
      } else if (key.end || input === 'G') {
        navigateTo(items.length - 1);
      } else if (key.return && onSelect && items[selectedIndex]) {
        onSelect(items[selectedIndex], selectedIndex);
      }
    },
    { isActive: isFocused, respectFocus: false }
  );

  // Empty state
  if (items.length === 0) {
    return (
      <Box height={height} alignItems="center" justifyContent="center">
        <Text color={theme.ui.textMuted} dimColor>
          {emptyMessage}
        </Text>
      </Box>
    );
  }

  // Calculate visible items
  const visibleItems = items.slice(scrollOffset, scrollOffset + visibleHeight);

  // Calculate scrollbar
  const scrollbarHeight = Math.max(1, Math.round((visibleHeight / items.length) * visibleHeight));
  const scrollbarPosition = Math.round((scrollOffset / maxScrollOffset) * (visibleHeight - scrollbarHeight));

  return (
    <Box flexDirection="row" height={height}>
      <Box flexDirection="column" flexGrow={1}>
        {visibleItems.map((item, visibleIndex) => {
          const actualIndex = scrollOffset + visibleIndex;
          const isSelected = actualIndex === selectedIndex;
          return (
            <Box
              key={keyExtractor(item, actualIndex)}
              width="100%"
              height={1}
              flexShrink={0}
            >
              {renderItem(item, actualIndex, isSelected)}
            </Box>
          );
        })}
      </Box>

      {/* Scrollbar */}
      {showScrollbar && items.length > visibleHeight && (
        <Box flexDirection="column" marginLeft={1}>
          {Array.from({ length: visibleHeight }).map((_, i) => {
            const isScrollbarHere = i >= scrollbarPosition && i < scrollbarPosition + scrollbarHeight;
            return (
              <Text key={i} color={isScrollbarHere ? theme.ui.border : theme.ui.borderSubtle}>
                {isScrollbarHere ? figures.square : figures.line}
              </Text>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

// Hook for managing list state externally
export function useVirtualListState<T>(items: T[], defaultIndex = 0) {
  const [selectedIndex, setSelectedIndex] = useState(defaultIndex);
  const [scrollOffset, setScrollOffset] = useState(0);

  const selectItem = (index: number) => {
    setSelectedIndex(Math.max(0, Math.min(items.length - 1, index)));
  };

  const scrollTo = (offset: number) => {
    setScrollOffset(Math.max(0, offset));
  };

  const reset = () => {
    setSelectedIndex(defaultIndex);
    setScrollOffset(0);
  };

  return {
    selectedIndex,
    scrollOffset,
    selectItem,
    scrollTo,
    reset,
    selectedItem: items[selectedIndex],
  };
}
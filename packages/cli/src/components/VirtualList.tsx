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

  // Reset selection when initialIndex changes
  useEffect(() => {
    setSelectedIndex(initialIndex);
    setScrollOffset(Math.max(0, initialIndex - Math.floor(height / 2)));
  }, [initialIndex, height]);

  // Calculate visible range
  const visibleHeight = Math.min(height, items.length);
  const maxScrollOffset = Math.max(0, items.length - visibleHeight);

  // Ensure scroll offset follows selection
  useEffect(() => {
    if (selectedIndex < scrollOffset) {
      setScrollOffset(selectedIndex);
    } else if (selectedIndex >= scrollOffset + visibleHeight) {
      setScrollOffset(selectedIndex - visibleHeight + 1);
    }
  }, [selectedIndex, scrollOffset, visibleHeight]);

  // Call onFocus when selection changes
  useEffect(() => {
    if (items.length > 0 && onFocus) {
      onFocus(items[selectedIndex], selectedIndex);
    }
  }, [selectedIndex, items, onFocus]);

  useSafeInput(
    (input, key) => {
      if ((!isFocused && !testMode) || items.length === 0) return;

      if (key.upArrow || input === 'k') {
        setSelectedIndex((prev) => {
          if (prev === 0) {
            return enableWrapAround ? items.length - 1 : 0;
          }
          return prev - 1;
        });
      } else if (key.downArrow || input === 'j') {
        setSelectedIndex((prev) => {
          if (prev === items.length - 1) {
            return enableWrapAround ? 0 : items.length - 1;
          }
          return prev + 1;
        });
      } else if (key.pageUp) {
        setSelectedIndex((prev) => {
          const newIndex = Math.max(0, prev - visibleHeight);
          setScrollOffset(Math.max(0, newIndex));
          return newIndex;
        });
      } else if (key.pageDown) {
        setSelectedIndex((prev) => {
          const newIndex = Math.min(items.length - 1, prev + visibleHeight);
          return newIndex;
        });
      } else if (key.home || input === 'g') {
        setSelectedIndex(0);
        setScrollOffset(0);
      } else if (key.end || input === 'G') {
        setSelectedIndex(items.length - 1);
      } else if (key.return && onSelect) {
        onSelect(items[selectedIndex], selectedIndex);
      }
    },
    { isActive: isFocused }
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
import React, { useMemo } from 'react';
import { Box } from 'ink';
import { VirtualList } from './VirtualList';
import { useLayout } from '../../contexts/LayoutContext';

interface LayoutAwareListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  onSelect?: (item: T, index: number) => void;
  onFocus?: (item: T, index: number) => void;
  keyExtractor?: (item: T, index: number) => string;
  emptyMessage?: string;
  showScrollbar?: boolean;
  enableWrapAround?: boolean;
  testMode?: boolean;
  initialIndex?: number;
  /**
   * Height used by other elements in the component (status bars, headers, etc.)
   * This is ONLY for elements within the component itself, not global layout
   */
  localHeightOffset?: number;
  /**
   * Maximum height for the list (optional).
   */
  maxHeight?: number;
}

/**
 * LayoutAwareList - A list component that automatically uses the centralized layout height
 * No need to calculate terminal height or account for global headers/footers
 */
export function LayoutAwareList<T>({
  items,
  renderItem,
  onSelect,
  onFocus,
  keyExtractor = (_item, index) => String(index),
  emptyMessage = 'No items to display',
  showScrollbar = true,
  enableWrapAround = true,
  testMode = false,
  initialIndex = 0,
  localHeightOffset = 0,
  maxHeight,
}: LayoutAwareListProps<T>): React.ReactElement {
  const { availableHeight } = useLayout();

  // Calculate list height based on centralized available height
  const listHeight = useMemo(() => {
    // Start with the centrally calculated available height
    let height = availableHeight - localHeightOffset;

    // Apply max height if specified
    if (maxHeight) {
      height = Math.min(height, maxHeight);
    }

    // Also limit by number of items if list is small
    height = Math.min(height, items.length || 1);

    // Ensure at least 1 row
    return Math.max(1, height);
  }, [availableHeight, localHeightOffset, maxHeight, items.length]);

  // Wrapper for renderItem to ensure proper constraints
  const constrainedRenderItem = (
    item: T,
    index: number,
    isSelected: boolean
  ) => {
    const rendered = renderItem(item, index, isSelected);

    // If the rendered item is already wrapped in a Box with constraints, return as-is
    if (React.isValidElement(rendered) && rendered.type === Box) {
      type BoxProps = React.ComponentProps<typeof Box>;
      const props = rendered.props as BoxProps;
      if (props.width === '100%' && props.height === 1) {
        return rendered;
      }
    }

    // Otherwise, wrap it with proper constraints
    return (
      <Box width="100%" height={1} overflow="hidden">
        {rendered}
      </Box>
    );
  };

  return (
    <VirtualList
      items={items}
      height={listHeight}
      renderItem={constrainedRenderItem}
      onSelect={onSelect}
      onFocus={onFocus}
      keyExtractor={keyExtractor}
      emptyMessage={emptyMessage}
      showScrollbar={showScrollbar}
      enableWrapAround={enableWrapAround}
      testMode={testMode}
      initialIndex={initialIndex}
    />
  );
}

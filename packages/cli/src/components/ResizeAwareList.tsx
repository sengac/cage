import React, { useState, useEffect } from 'react';
import { Box } from 'ink';
import { VirtualList } from './VirtualList';
import { useStdout } from 'ink';

interface ResizeAwareListProps<T> {
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
   * Offset to subtract from terminal height for UI elements like headers/footers.
   * Default is 10 for typical layout with header/footer.
   */
  heightOffset?: number;
  /**
   * Additional dynamic offset (e.g., for search bars that appear/disappear).
   */
  dynamicOffset?: number;
  /**
   * Minimum height for the list.
   * Default is 5.
   */
  minHeight?: number;
  /**
   * Maximum height for the list (optional).
   * If not set, will use available terminal space.
   */
  maxHeight?: number;
}

/**
 * ResizeAwareList - A wrapper around VirtualList that automatically handles terminal resizing
 * and calculates the appropriate height based on available terminal space.
 *
 * This component:
 * - Automatically adjusts to terminal resize events
 * - Calculates available height accounting for other UI elements
 * - Ensures each list item is properly constrained to prevent overlap
 * - Provides sensible defaults for height calculations
 */
export function ResizeAwareList<T>({
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
  heightOffset = 10,
  dynamicOffset = 0,
  minHeight = 5,
  maxHeight,
}: ResizeAwareListProps<T>): React.ReactElement {
  const { stdout } = useStdout();
  const [terminalHeight, setTerminalHeight] = useState(stdout.rows || 24);

  // Update terminal height on resize
  useEffect(() => {
    const updateHeight = () => {
      setTerminalHeight(stdout.rows || 24);
    };

    // Initial update
    updateHeight();

    // Listen for resize events
    const handleResize = () => {
      updateHeight();
    };

    process.stdout.on('resize', handleResize);

    return () => {
      process.stdout.off('resize', handleResize);
    };
  }, [stdout]);

  // Calculate the actual list height
  const calculateHeight = () => {
    const totalOffset = heightOffset + dynamicOffset;
    let calculatedHeight = Math.max(minHeight, terminalHeight - totalOffset);

    // Apply max height if specified
    if (maxHeight) {
      calculatedHeight = Math.min(calculatedHeight, maxHeight);
    }

    // Also limit by number of items if list is small
    calculatedHeight = Math.min(calculatedHeight, items.length || 1);

    return calculatedHeight;
  };

  const listHeight = calculateHeight();

  // Wrapper for renderItem to ensure proper constraints
  const constrainedRenderItem = (item: T, index: number, isSelected: boolean) => {
    const rendered = renderItem(item, index, isSelected);

    // If the rendered item is already wrapped in a Box with constraints, return as-is
    if (React.isValidElement(rendered) && rendered.type === Box) {
      // Use type guard to check Box props
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
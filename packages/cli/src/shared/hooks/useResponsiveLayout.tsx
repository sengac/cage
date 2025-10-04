import React, {
  useState,
  useEffect,
  useMemo,
  useContext,
  createContext,
} from 'react';
import { useStdout, Text } from 'ink';
import type { ReactNode } from 'react';

// Types
export type BreakpointSize = 'small' | 'medium' | 'large';
export type LayoutOrientation = 'horizontal' | 'vertical';

export interface TerminalDimensions {
  width: number;
  height: number;
  isMinimumSize: boolean;
  isSmall: boolean;
  isMedium: boolean;
  isLarge: boolean;
}

export interface ResponsiveConfig {
  breakpoints?: {
    small: number;
    medium: number;
    large: number;
  };
  minWidth?: number;
  minHeight?: number;
}

export interface ResponsiveLayoutData {
  dimensions: TerminalDimensions;
  breakpoint: BreakpointSize;
  orientation: LayoutOrientation;
  columns: number;
  showSidebar: boolean;
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  showMinSizeWarning: boolean;
  minSizeMessage: string;
  resizePrompt: string;
  allowInteraction: boolean;
  enableScroll: boolean;
  maxVisibleItems: number;
  gridColumns: number;
  itemWidth: number;
  hints: {
    showFullMenu: boolean;
    showCompactMenu: boolean;
    showStatusBar: boolean;
    showTitle: boolean;
  };
  isPortrait: boolean;
  isLandscape: boolean;
}

// Default configuration
const DEFAULT_CONFIG: Required<ResponsiveConfig> = {
  breakpoints: {
    small: 100,
    medium: 140,
    large: 180,
  },
  minWidth: 80,
  minHeight: 24,
};

// Context for sharing layout data
const ResponsiveLayoutContext = createContext<ResponsiveLayoutData | null>(
  null
);

/**
 * Hook to get current terminal size
 */
export function useTerminalSize(): TerminalDimensions {
  const { stdout } = useStdout();
  const [dimensions, setDimensions] = useState<TerminalDimensions>(() => {
    const width = stdout.columns || 80;
    const height = stdout.rows || 24;

    return {
      width,
      height,
      isMinimumSize:
        width >= DEFAULT_CONFIG.minWidth && height >= DEFAULT_CONFIG.minHeight,
      isSmall: width < DEFAULT_CONFIG.breakpoints.small,
      isMedium:
        width >= DEFAULT_CONFIG.breakpoints.small &&
        width < DEFAULT_CONFIG.breakpoints.medium,
      isLarge: width >= DEFAULT_CONFIG.breakpoints.medium,
    };
  });

  useEffect(() => {
    const handleResize = () => {
      const width = stdout.columns || 80;
      const height = stdout.rows || 24;

      setDimensions({
        width,
        height,
        isMinimumSize:
          width >= DEFAULT_CONFIG.minWidth &&
          height >= DEFAULT_CONFIG.minHeight,
        isSmall: width < DEFAULT_CONFIG.breakpoints.small,
        isMedium:
          width >= DEFAULT_CONFIG.breakpoints.small &&
          width < DEFAULT_CONFIG.breakpoints.medium,
        isLarge: width >= DEFAULT_CONFIG.breakpoints.medium,
      });
    };

    stdout.on('resize', handleResize);
    return () => {
      stdout.off('resize', handleResize);
    };
  }, [stdout]);

  return dimensions;
}

/**
 * Hook to get current breakpoint
 */
export function useBreakpoint(): BreakpointSize {
  const dimensions = useTerminalSize();

  if (dimensions.width >= DEFAULT_CONFIG.breakpoints.medium) {
    return 'large';
  }
  if (dimensions.width >= DEFAULT_CONFIG.breakpoints.small) {
    return 'medium';
  }
  return 'small';
}

/**
 * Main responsive layout hook
 */
export function useResponsiveLayout(
  config?: ResponsiveConfig
): ResponsiveLayoutData {
  const context = useContext(ResponsiveLayoutContext);

  // If we're inside a provider, use context
  if (context) {
    return context;
  }

  // Otherwise, create new layout data
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const dimensions = useTerminalSize();
  const breakpoint = useBreakpoint();

  return useMemo(() => {
    const { width, height } = dimensions;
    const isSmall = breakpoint === 'small';
    const isMedium = breakpoint === 'medium';
    const isLarge = breakpoint === 'large';

    // Calculate layout properties
    const orientation: LayoutOrientation =
      width >= 120 ? 'horizontal' : 'vertical';
    const columns = isLarge ? 3 : isMedium ? 2 : 1;
    const showSidebar = width >= 140;

    // Responsive padding
    const padding = {
      top: isLarge ? 1 : 0,
      right: isLarge ? 2 : 1,
      bottom: isLarge ? 1 : 0,
      left: isLarge ? 2 : 1,
    };

    // Min size handling
    const isMinimumSize =
      width >= mergedConfig.minWidth && height >= mergedConfig.minHeight;
    const showMinSizeWarning = !isMinimumSize;
    const minSizeMessage = `Terminal too small. Minimum: ${mergedConfig.minWidth}x${mergedConfig.minHeight}`;
    const resizePrompt = showMinSizeWarning
      ? 'Please resize your terminal'
      : '';
    const allowInteraction = isMinimumSize;

    // Scrolling and overflow
    const enableScroll = height > 10;
    const maxVisibleItems = Math.max(1, height - 4); // Leave room for header/footer

    // Grid layout calculations
    const gridColumns = isLarge ? 3 : isMedium ? 2 : 1;
    const itemWidth = Math.floor(
      (width - padding.left - padding.right) / gridColumns
    );

    // Layout hints
    const hints = {
      showFullMenu: width >= 100,
      showCompactMenu: width < 100,
      showStatusBar: height >= 20,
      showTitle: height >= 15,
    };

    // Orientation detection
    const aspectRatio = width / height;
    const isPortrait = aspectRatio < 2;
    const isLandscape = aspectRatio >= 2;

    return {
      dimensions,
      breakpoint,
      orientation,
      columns,
      showSidebar,
      padding,
      showMinSizeWarning,
      minSizeMessage,
      resizePrompt,
      allowInteraction,
      enableScroll,
      maxVisibleItems,
      gridColumns,
      itemWidth,
      hints,
      isPortrait,
      isLandscape,
    };
  }, [dimensions, breakpoint, mergedConfig]);
}

/**
 * Provider component for responsive layout
 */
export function ResponsiveLayoutProvider({
  children,
  config,
}: {
  children: ReactNode;
  config?: ResponsiveConfig;
}) {
  const layoutData = useResponsiveLayout(config);

  return (
    <ResponsiveLayoutContext.Provider value={layoutData}>
      {children}
    </ResponsiveLayoutContext.Provider>
  );
}

/**
 * Responsive Box component
 */
export interface ResponsiveBoxProps {
  children: ReactNode;
  hideOn?: BreakpointSize[];
  showOn?: BreakpointSize[];
  responsivePadding?: boolean;
  styles?: Partial<Record<BreakpointSize, Record<string, unknown>>>;
}

export function ResponsiveBox({
  children,
  hideOn = [],
  showOn = [],
  responsivePadding = false,
  styles = {},
}: ResponsiveBoxProps) {
  const layout = useResponsiveLayout();

  // Check visibility
  if (hideOn.includes(layout.breakpoint)) {
    return null;
  }

  if (showOn.length > 0 && !showOn.includes(layout.breakpoint)) {
    return null;
  }

  // Get styles for current breakpoint
  const breakpointStyles = styles[layout.breakpoint] || {};

  // Apply responsive padding if requested
  const paddingProps = responsivePadding
    ? {
        paddingTop: layout.padding.top,
        paddingRight: layout.padding.right,
        paddingBottom: layout.padding.bottom,
        paddingLeft: layout.padding.left,
      }
    : {};

  return <>{children}</>;
}

/**
 * Responsive Text component
 */
export interface ResponsiveTextProps {
  children: string;
  hideOn?: BreakpointSize[];
  truncate?: boolean;
  wrap?: boolean;
  styles?: Partial<Record<BreakpointSize, Record<string, unknown>>>;
}

export function ResponsiveText({
  children,
  hideOn = [],
  truncate = false,
  wrap = false,
  styles = {},
}: ResponsiveTextProps) {
  const layout = useResponsiveLayout();

  // Check visibility
  if (hideOn.includes(layout.breakpoint)) {
    return null;
  }

  let text = children;

  // Apply truncation
  if (truncate && text.length > layout.dimensions.width - 4) {
    text = text.substring(0, layout.dimensions.width - 7) + '...';
  }

  // Note: Ink handles text wrapping automatically with Text component
  return <Text>{text}</Text>;
}

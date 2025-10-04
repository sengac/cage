import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from 'react';
import { useStdout } from 'ink';

interface LayoutContextValue {
  /**
   * Available height for content after accounting for header and footer
   */
  availableHeight: number;
  /**
   * Total terminal height
   */
  terminalHeight: number;
  /**
   * Height reserved for header (3 lines: border top, title, border bottom)
   */
  headerHeight: number;
  /**
   * Height reserved for footer (3 lines: border top, content, border bottom)
   */
  footerHeight: number;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

interface LayoutProviderProps {
  children: React.ReactNode;
  /**
   * Override the header height if needed (default: 3)
   */
  headerHeight?: number;
  /**
   * Override the footer height if needed (default: 3)
   */
  footerHeight?: number;
  /**
   * Additional padding to account for (default: 2 for paddingY)
   */
  contentPadding?: number;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({
  children,
  headerHeight = 3,
  footerHeight = 3,
  contentPadding = 2,
}) => {
  const { stdout } = useStdout();
  const [terminalHeight, setTerminalHeight] = useState(stdout.rows || 24);

  // Update terminal height on resize
  useEffect(() => {
    const updateHeight = () => {
      const currentHeight = process.stdout.rows || stdout.rows || 24;
      setTerminalHeight(currentHeight);
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

  // Calculate available height for content
  const availableHeight = useMemo(() => {
    // Total reserved: header + footer + content padding
    const totalReserved = headerHeight + footerHeight + contentPadding;
    return Math.max(1, terminalHeight - totalReserved);
  }, [terminalHeight, headerHeight, footerHeight, contentPadding]);

  const value = useMemo(
    () => ({
      availableHeight,
      terminalHeight,
      headerHeight,
      footerHeight,
    }),
    [availableHeight, terminalHeight, headerHeight, footerHeight]
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
};

/**
 * Hook to get layout dimensions from the centralized context
 */
export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    // Fallback values if not within provider
    return {
      availableHeight: 20,
      terminalHeight: 24,
      headerHeight: 3,
      footerHeight: 3,
    };
  }
  return context;
};

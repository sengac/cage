import React, { type ReactNode } from 'react';
import { Box } from 'ink';
import { useTerminalSize } from '../hooks/useResponsiveLayout';

interface FullScreenWrapperProps {
  children: ReactNode;
}

/**
 * A single full-screen wrapper that ensures consistent layout for the entire app.
 * This component should wrap the entire application to provide:
 * - Full terminal width and height
 * - Proper screen clearing on mount
 * - Consistent centering for all content
 * - Responsive to terminal resize events
 */
export const FullScreenWrapper: React.FC<FullScreenWrapperProps> = ({
  children,
}) => {
  // Use the responsive hook that handles resize events
  const dimensions = useTerminalSize();

  // Note: Screen clearing is done BEFORE Ink renders in index.tsx
  // to ensure we start from position (0,0)

  return (
    <Box
      width={dimensions.width}
      height={dimensions.height - 1}
      flexDirection="column"
    >
      {children}
    </Box>
  );
};

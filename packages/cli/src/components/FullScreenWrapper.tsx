import React, { type ReactNode } from 'react';
import { Box, useStdout } from 'ink';

interface FullScreenWrapperProps {
  children: ReactNode;
}

/**
 * A single full-screen wrapper that ensures consistent layout for the entire app.
 * This component should wrap the entire application to provide:
 * - Full terminal width and height
 * - Proper screen clearing on mount
 * - Consistent centering for all content
 */
export const FullScreenWrapper: React.FC<FullScreenWrapperProps> = ({ children }) => {
  const { stdout } = useStdout();

  // Note: Screen clearing is done BEFORE Ink renders in index.tsx
  // to ensure we start from position (0,0)

  const terminalHeight = stdout?.rows || 24;
  const terminalWidth = stdout?.columns || 80;

  return (
    <Box
      width={terminalWidth}
      height={terminalHeight - 1}
      flexDirection="column"
    >
      {children}
    </Box>
  );
};
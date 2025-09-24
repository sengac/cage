import React from 'react';
import { Box, Text } from 'ink';
import type { ViewProps } from '../../types/viewSystem';

/**
 * DebugConsoleView - placeholder implementation
 * TODO: Integrate existing component
 */
export const DebugConsoleView: React.FC<ViewProps> = ({ onBack, onNavigate }) => {
  return (
    <Box flexDirection="column">
      <Text>Debug Console - Coming Soon</Text>
      <Text dimColor>This view is being refactored to use the new shared component system</Text>
    </Box>
  );
};

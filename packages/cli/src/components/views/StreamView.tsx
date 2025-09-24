import React from 'react';
import { Box, Text } from 'ink';
import type { ViewProps } from '../../types/viewSystem';

/**
 * StreamView - placeholder implementation
 * TODO: Integrate existing component
 */
export const StreamView: React.FC<ViewProps> = ({ onBack, onNavigate }) => {
  return (
    <Box flexDirection="column">
      <Text>Real-time Event Stream - Coming Soon</Text>
      <Text dimColor>This view is being refactored to use the new shared component system</Text>
    </Box>
  );
};

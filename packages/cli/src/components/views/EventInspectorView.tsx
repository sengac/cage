import React from 'react';
import { Box, Text } from 'ink';
import type { ViewProps } from '../../types/viewSystem';

/**
 * Event Inspector view - placeholder for now
 * TODO: Integrate existing EventInspector component
 */
export const EventInspectorView: React.FC<ViewProps> = ({ onBack, onNavigate }) => {
  return (
    <Box flexDirection="column">
      <Text>Events Inspector - Coming Soon</Text>
      <Text dimColor>This will show the event list and filtering options</Text>
    </Box>
  );
};
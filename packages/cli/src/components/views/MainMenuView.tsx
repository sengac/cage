import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../../hooks/useTheme';
import type { ViewProps } from '../../types/viewSystem';
import figures from 'figures';

interface MenuItem {
  label: string;
  value: string;
  description: string;
}

const menuItems: MenuItem[] = [
  {
    label: 'Events Inspector',
    value: 'events',
    description: 'Browse & analyze events',
  },
  {
    label: 'Real-time Monitor',
    value: 'stream',
    description: 'Stream live events',
  },
  {
    label: 'Server Management',
    value: 'server',
    description: 'Start/stop/status',
  },
  {
    label: 'Hooks Configuration',
    value: 'hooks',
    description: 'Setup & verify hooks',
  },
  {
    label: 'Statistics Dashboard',
    value: 'statistics',
    description: 'View metrics & charts',
  },
  {
    label: 'Settings',
    value: 'settings',
    description: 'Configure Cage',
  },
  {
    label: 'Debug Console',
    value: 'debug',
    description: 'View debug output',
  },
];

/**
 * Main menu view component - content only, no layout
 * Layout is handled by ViewManager and FullScreenLayout
 */
export const MainMenuView: React.FC<ViewProps> = ({ onNavigate, onBack }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const theme = useTheme();

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => (prev === 0 ? menuItems.length - 1 : prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => (prev === menuItems.length - 1 ? 0 : prev + 1));
    } else if (key.return) {
      onNavigate(menuItems[selectedIndex].value);
    } else if (input === '?') {
      onNavigate('help');
    }
    // ESC/q handled by FullScreenLayout, not here
  });

  const renderItem = (item: MenuItem, index: number) => {
    const isSelected = index === selectedIndex;
    const textColor = isSelected ? theme.ui.hover : theme.ui.text;
    const indicator = isSelected ? figures.pointer : ' ';

    // Add unique index to key to ensure no duplicates
    return (
      <Box key={`${item.value}-${index}`} flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={textColor}>
            {indicator} {item.label}
          </Text>
        </Box>
        <Box marginLeft={4}>
          <Text color={theme.ui.textMuted} dimColor>
            {item.description}
          </Text>
        </Box>
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      {menuItems.map((item, index) => renderItem(item, index))}
    </Box>
  );
};
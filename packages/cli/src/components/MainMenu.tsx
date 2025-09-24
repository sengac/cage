import React, { useState } from 'react';
import { Box, Text, useStdout } from 'ink';
import { useSafeInput } from '../hooks/useSafeInput';
import { useAppStore, type ViewType } from '../stores/appStore';
import { useTheme } from '../hooks/useTheme';
import { StatusBar } from './shared/StatusBar';
import figures from 'figures';

interface MenuItem {
  label: string;
  value: ViewType;
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

interface MainMenuProps {
  onExit?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onExit }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useAppStore((state) => state.navigate);
  const theme = useTheme();
  const { stdout } = useStdout();

  useSafeInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => (prev === 0 ? menuItems.length - 1 : prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => (prev === menuItems.length - 1 ? 0 : prev + 1));
    } else if (key.return) {
      navigate(menuItems[selectedIndex].value);
    } else if (input === '?') {
      navigate('help');
    }
  });

  const renderItem = (item: MenuItem, index: number) => {
    const isSelected = index === selectedIndex;
    const textColor = isSelected ? theme.ui.hover : theme.ui.text;
    const indicator = isSelected ? figures.pointer : ' ';

    return (
      <Box key={item.value} flexDirection="column" marginBottom={1}>
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
    <Box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <Box
        paddingX={2}
        borderStyle="round"
        borderColor={theme.ui.borderSubtle}
        justifyContent="space-between"
        minHeight={3}
      >
        <Text color={theme.secondary.blue} bold>
          CAGE | Code Alignment Guard Engine
        </Text>
        <StatusBar compact />
      </Box>

      {/* Menu Items Container with flex grow to fill available space */}
      <Box flexDirection="column" paddingX={2} flexGrow={1}>
        {menuItems.map((item, index) => renderItem(item, index))}
      </Box>

      {/* Footer - positioned at bottom */}
      <Box
        paddingX={2}
        borderStyle="single"
        borderColor={theme.ui.borderSubtle}
      >
        <Text color={theme.ui.textDim}>
          ↑↓ Navigate  ↵ Select  ESC Exit  ? Help
        </Text>
      </Box>
    </Box>
  );
};
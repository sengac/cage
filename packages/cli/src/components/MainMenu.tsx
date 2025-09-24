import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { useAppStore, type ViewType } from '../stores/appStore';
import { useTheme } from '../hooks/useTheme';
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
  const serverStatus = useAppStore((state) => state.serverStatus);
  const theme = useTheme();
  const { stdout } = useStdout();

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => (prev === 0 ? menuItems.length - 1 : prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => (prev === menuItems.length - 1 ? 0 : prev + 1));
    } else if (key.return) {
      navigate(menuItems[selectedIndex].value);
    } else if (key.escape || input === 'q') {
      onExit?.();
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

  const getStatusColor = () => {
    switch (serverStatus) {
      case 'running':
        return theme.status.success;
      case 'error':
        return theme.status.error;
      case 'connecting':
        return theme.status.warning;
      default:
        return theme.ui.textMuted;
    }
  };

  const getStatusIcon = () => {
    switch (serverStatus) {
      case 'running':
        return figures.tick;
      case 'error':
        return figures.cross;
      case 'connecting':
        return figures.ellipsis;
      default:
        return figures.circle;
    }
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
        <Box>
          <Text color={theme.ui.textMuted}>Server: </Text>
          <Text color={getStatusColor()}>
            {getStatusIcon()} {serverStatus}
          </Text>
        </Box>
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
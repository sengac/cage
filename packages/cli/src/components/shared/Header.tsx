import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme';
import { StatusBar } from './StatusBar';

interface HeaderProps {
  /** The title to display (e.g., "Events Inspector", "Server Management") */
  title: string;
}

/**
 * Shared header component for all views in the TUI
 * Provides consistent styling and layout across all screens
 * Always shows the server status in the top right
 */
export const Header: React.FC<HeaderProps> = ({
  title
}) => {
  const theme = useTheme();

  return (
    <Box
      paddingX={2}
      borderStyle="round"
      borderColor={theme.ui.borderSubtle}
      justifyContent="space-between"
      minHeight={3}
    >
      <Text color={theme.secondary.blue} bold>
        CAGE | {title}
      </Text>
      <StatusBar compact />
    </Box>
  );
};
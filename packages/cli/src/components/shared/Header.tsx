import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme';
import { StatusBar } from './StatusBar';
import type { ReactNode } from 'react';

interface HeaderProps {
  /** The title to display (e.g., "Events Inspector", "Server Management") */
  title: string;

  /** Optional subtitle or status to show on the right */
  subtitle?: string | ReactNode;

  /** Whether to show server status */
  showServerStatus?: boolean;
}

/**
 * Shared header component for all views in the TUI
 * Provides consistent styling and layout across all screens
 */
export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showServerStatus = false
}) => {
  const theme = useTheme();

  const renderRightContent = () => {
    if (showServerStatus) {
      return <StatusBar compact />
    }

    if (subtitle) {
      if (typeof subtitle === 'string') {
        return (
          <Text color={theme.ui.textMuted} dimColor>
            {subtitle}
          </Text>
        );
      }
      return subtitle;
    }

    return null;
  };

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
      {renderRightContent()}
    </Box>
  );
};
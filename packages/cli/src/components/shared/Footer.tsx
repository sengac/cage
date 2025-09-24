import React from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme';
import figures from 'figures';
import type { ReactNode } from 'react';

interface FooterProps {
  /** Custom footer content */
  content?: string | ReactNode;

  /** Whether to show default navigation shortcuts */
  showDefaults?: boolean;

  /** Whether this is the main menu (shows Exit instead of Back) */
  isMainMenu?: boolean;
}

/**
 * Shared footer component for all views in the TUI
 * Shows contextual keyboard shortcuts and navigation hints
 */
export const Footer: React.FC<FooterProps> = ({
  content,
  showDefaults = true,
  isMainMenu = false
}) => {
  const theme = useTheme();

  const renderContent = () => {
    if (content) {
      if (typeof content === 'string') {
        return <Text color={theme.ui.textDim}>{content}</Text>;
      }
      return content;
    }

    if (showDefaults) {
      if (isMainMenu) {
        return (
          <Text color={theme.ui.textDim}>
            ↑↓ Navigate  ↵ Select  ESC Exit  ? Help
          </Text>
        );
      }

      return (
        <Text color={theme.ui.textDim}>
          {figures.arrowLeft} Back (ESC)  ↑↓ Navigate  ↵ Select  ? Help
        </Text>
      );
    }

    return null;
  };

  return (
    <Box
      paddingX={2}
      borderStyle="single"
      borderColor={theme.ui.borderSubtle}
    >
      {renderContent()}
    </Box>
  );
};
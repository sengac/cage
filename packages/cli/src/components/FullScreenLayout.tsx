import React, { type ReactNode } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../hooks/useTheme';
import figures from 'figures';

interface FullScreenLayoutProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  children: ReactNode;
  footer?: ReactNode;
  showServerStatus?: boolean;
}

export const FullScreenLayout: React.FC<FullScreenLayoutProps> = ({
  title,
  subtitle,
  onBack,
  children,
  footer,
  showServerStatus = true
}) => {
  const theme = useTheme();

  // Handle ESC key for going back
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Header */}
      <Box
        paddingX={2}
        paddingY={1}
        borderStyle="round"
        borderColor={theme.ui.borderSubtle}
        justifyContent="space-between"
      >
        <Text color={theme.secondary.blue} bold>
          CAGE | {title}
        </Text>
        {subtitle && (
          <Text color={theme.ui.textMuted} dimColor>
            {subtitle}
          </Text>
        )}
      </Box>

      {/* Main Content Area - flexGrow to fill available space */}
      <Box flexDirection="column" flexGrow={1} paddingX={2} paddingY={1}>
        {children}
      </Box>

      {/* Footer */}
      <Box
        paddingX={2}
        paddingY={1}
        borderStyle="single"
        borderColor={theme.ui.borderSubtle}
      >
        {footer || (
          <Text color={theme.ui.textDim}>
            {figures.arrowLeft} Back (ESC)  ↑↓ Navigate  ↵ Select  ? Help
          </Text>
        )}
      </Box>
    </Box>
  );
};
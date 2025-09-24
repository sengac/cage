import React, { type ReactNode } from 'react';
import { Box } from 'ink';
import { useSafeInput } from '../hooks/useSafeInput';
import { Header } from './shared/Header';
import { Footer } from './shared/Footer';

interface FullScreenLayoutProps {
  title: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: string | ReactNode;
  showDefaultFooter?: boolean;
  isMainMenu?: boolean;
}

/**
 * FullScreenLayout provides the consistent layout structure for all views
 * Uses shared Header and Footer components for consistency
 */
export const FullScreenLayout: React.FC<FullScreenLayoutProps> = ({
  title,
  onBack,
  children,
  footer,
  showDefaultFooter = true,
  isMainMenu = false
}) => {
  // Handle ESC key for going back (if onBack is provided)
  useSafeInput((input, key) => {
    if (onBack && (key.escape || input === 'q')) {
      onBack();
    }
  });

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Header title={title} />

      {/* Main Content Area - flexGrow to fill available space */}
      <Box flexDirection="column" flexGrow={1} paddingX={2} paddingY={1}>
        {children}
      </Box>

      <Footer
        content={footer}
        showDefaults={showDefaultFooter}
        isMainMenu={isMainMenu}
      />
    </Box>
  );
};
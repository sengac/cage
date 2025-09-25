import React, { useState, useCallback } from 'react';
import { Logo } from './Logo';
import { FullScreenWrapper } from './FullScreenWrapper';
import { ViewManager } from './ViewManager';
import { viewDefinitions } from '../config/viewDefinitions';
import { InputModeProvider } from '../contexts/InputContext';

interface AppProps {
  showLogo?: boolean;
  onExit?: () => void;
  showDebugPanel?: boolean;
  args?: string[];
}

/**
 * Main App component that uses the ViewManager for navigation
 * Shows logo first, then delegates all view management to ViewManager
 */
export const App: React.FC<AppProps> = ({
  showLogo = true,
  onExit
}) => {
  const [logoComplete, setLogoComplete] = useState(!showLogo);

  const handleLogoComplete = useCallback(() => {
    setLogoComplete(true);
  }, []);

  const handleExit = useCallback(() => {
    onExit?.();
  }, [onExit]);

  return (
    <InputModeProvider>
      <FullScreenWrapper>
        {/* Show logo first if requested */}
        {!logoComplete ? (
          <Logo onComplete={handleLogoComplete} />
        ) : (
          // Use ViewManager for all view management
          <ViewManager
            views={viewDefinitions}
            initialView="main"
            onExit={handleExit}
          />
        )}
      </FullScreenWrapper>
    </InputModeProvider>
  );
};
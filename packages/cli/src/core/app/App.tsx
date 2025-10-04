import React, { useState, useCallback, useEffect } from 'react';
import { Logo } from '../../shared/components/ui/Logo';
import { FullScreenWrapper } from '../../shared/components/layout/FullScreenWrapper';
import { ViewManager } from '../navigation/ViewManager';
import { viewDefinitions } from '../navigation/viewDefinitions';
import { InputModeProvider } from '../../shared/contexts/InputContext';
import { StreamService } from '../../features/events/services/stream-service';
import { HooksStatusService } from '../../features/hooks/services/hooks-status-service';
import { DebugLogsService } from '../../features/debug/services/debug-logs-service';
import { useAppStore } from '../../shared/stores/appStore';

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
export const App: React.FC<AppProps> = ({ showLogo = true, onExit }) => {
  const [logoComplete, setLogoComplete] = useState(!showLogo);
  const serverStatus = useAppStore(state => state.serverStatus);

  const handleLogoComplete = useCallback(() => {
    setLogoComplete(true);
  }, []);

  const handleExit = useCallback(() => {
    onExit?.();
  }, [onExit]);

  useEffect(() => {
    if (serverStatus === 'running') {
      const streamService = StreamService.getInstance();
      streamService.connect();

      // Start hooks status polling service
      const hooksStatusService = HooksStatusService.getInstance();
      hooksStatusService.start();

      // Start debug logs service (EXACT same pattern as hooks status)
      const debugLogsService = DebugLogsService.getInstance();
      debugLogsService.start();

      // Fetch initial data once when app starts
      const store = useAppStore.getState();
      void store.fetchLatestEvents();
      void store.refreshHooksStatus(); // Initial hooks status fetch
      // Note: debugLogsService.start() already fetches initial logs

      return () => {
        streamService.disconnect();
        hooksStatusService.stop();
        debugLogsService.stop();
      };
    }
  }, [serverStatus]);

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

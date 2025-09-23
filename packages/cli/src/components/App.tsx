import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { Logo } from './Logo';
import { MainMenu } from './MainMenu';
import { FullScreenWrapper } from './FullScreenWrapper';
import { EventInspector } from './EventInspector';
import { EventDetail } from './EventDetail';
import { StreamView } from './StreamView';
import { ServerManager } from './ServerManager';
import { ConfigurationMenu } from './ConfigurationMenu';
import { HooksConfiguration } from './HooksConfiguration';
import { StatisticsDashboard } from './StatisticsDashboard';
import { DebugConsole } from './DebugConsole';
import { HelpSystem } from './HelpSystem';
import { useAppStore } from '../stores/appStore';

interface AppProps {
  showLogo?: boolean;
  onExit?: () => void;
  showDebugPanel?: boolean;
  args?: string[];
}

export const App: React.FC<AppProps> = ({ showLogo = true, onExit, showDebugPanel = false, args = [] }) => {
  const [logoComplete, setLogoComplete] = useState(!showLogo);
  const currentView = useAppStore((state) => state.currentView);
  const [debugPanelVisible, setDebugPanelVisible] = useState(showDebugPanel);

  useEffect(() => {
    if (showDebugPanel) {
      setDebugPanelVisible(true);
    }
  }, [showDebugPanel]);

  const handleLogoComplete = () => {
    setLogoComplete(true);
  };

  const handleExit = () => {
    onExit?.();
  };

  return (
    <FullScreenWrapper>
      {/* Show logo first if requested */}
      {!logoComplete ? (
        <Logo onComplete={handleLogoComplete} />
      ) : (
        // Route to the appropriate view based on currentView
        <AppContent currentView={currentView} handleExit={handleExit} />
      )}
    </FullScreenWrapper>
  );
};

// Separate component for the main app content after logo
const AppContent: React.FC<{ currentView: string; handleExit: () => void }> = ({ currentView, handleExit }) => {
  switch (currentView) {
    case 'menu':
      return <MainMenu onExit={handleExit} />;

    case 'events':
      return (
        <EventInspector
          onSelectEvent={(event) => {
            useAppStore.getState().selectEvent(event);
            useAppStore.getState().navigate('eventDetail');
          }}
          onBack={() => useAppStore.getState().navigate('menu')}
        />
      );

    case 'eventDetail':
      return (
        <EventDetail
          onBack={() => useAppStore.getState().navigate('events')}
        />
      );

    case 'stream':
      return (
        <StreamView
          onBack={() => useAppStore.getState().navigate('menu')}
        />
      );

    case 'server':
      return (
        <ServerManager
          onBack={() => useAppStore.getState().navigate('menu')}
        />
      );

    case 'hooks':
      return (
        <HooksConfiguration
          onBack={() => useAppStore.getState().navigate('menu')}
        />
      );

    case 'statistics':
      return (
        <StatisticsDashboard
          onBack={() => useAppStore.getState().navigate('menu')}
        />
      );

    case 'settings':
      return (
        <ConfigurationMenu
          onBack={() => useAppStore.getState().navigate('menu')}
        />
      );

    case 'debug':
      return (
        <DebugConsole
          onBack={() => useAppStore.getState().navigate('menu')}
        />
      );

    case 'help':
      return (
        <HelpSystem
          onBack={() => useAppStore.getState().navigate('menu')}
        />
      );

    default:
      return <MainMenu onExit={handleExit} />;
  }
};
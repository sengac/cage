import type { ViewDefinition } from '../types/viewSystem';

// Import all view components (we'll refactor them next)
import { MainMenuView } from '../components/views/MainMenuView';
import { EventInspectorView } from '../components/views/EventInspectorView';
import { ServerManagerView } from '../components/views/ServerManagerView';
import { HooksConfigurationView } from '../components/views/HooksConfigurationView';
import { StreamView } from '../components/views/StreamView';
import { StatisticsDashboardView } from '../components/views/StatisticsDashboardView';
import { ConfigurationMenuView } from '../components/views/ConfigurationMenuView';
import { DebugConsoleView } from '../components/views/DebugConsoleView';
import { HelpSystemView } from '../components/views/HelpSystemView';
import { EventDetailView } from '../components/views/EventDetailView';

/**
 * Central registry of all views in the application
 * Each view definition includes its component and metadata
 */
export const viewDefinitions: Record<string, ViewDefinition> = {
  main: {
    id: 'main',
    component: MainMenuView,
    metadata: {
      title: 'Code Alignment Guard Engine',
      showServerStatus: true,
      showDefaultFooter: true
    }
  },

  events: {
    id: 'events',
    component: EventInspectorView,
    metadata: {
      title: 'Events Inspector',
      subtitle: 'Browse & analyze events',
      showDefaultFooter: true
    }
  },

  eventDetail: {
    id: 'eventDetail',
    component: EventDetailView,
    metadata: {
      title: 'Event Detail',
      showDefaultFooter: true
    }
  },

  server: {
    id: 'server',
    component: ServerManagerView,
    metadata: {
      title: 'Server Management',
      subtitle: 'Start/stop/status',
      showServerStatus: true,
      showDefaultFooter: true
    }
  },

  hooks: {
    id: 'hooks',
    component: HooksConfigurationView,
    metadata: {
      title: 'Hooks Configuration',
      subtitle: 'Setup & verify hooks',
      showDefaultFooter: true
    }
  },

  stream: {
    id: 'stream',
    component: StreamView,
    metadata: {
      title: 'Real-time Monitor',
      subtitle: 'Stream live events',
      footer: 'SPACE Pause | ↵ Inspect | F Filter | / Search | ESC Back',
      showDefaultFooter: false
    }
  },

  statistics: {
    id: 'statistics',
    component: StatisticsDashboardView,
    metadata: {
      title: 'Statistics Dashboard',
      subtitle: 'View metrics & charts',
      showDefaultFooter: true
    }
  },

  settings: {
    id: 'settings',
    component: ConfigurationMenuView,
    metadata: {
      title: 'Settings',
      subtitle: 'Configure Cage',
      footer: 'TAB/Shift+TAB Navigate | SPACE Toggle | ↵ Edit | S Save | R Reset | ESC Back',
      showDefaultFooter: false
    }
  },

  debug: {
    id: 'debug',
    component: DebugConsoleView,
    metadata: {
      title: 'Debug Console',
      subtitle: 'View debug output',
      footer: '↑↓ Scroll | F Filter | L Toggle Levels | C Clear | ESC Back',
      showDefaultFooter: false
    }
  },

  help: {
    id: 'help',
    component: HelpSystemView,
    metadata: {
      title: 'Help System',
      showDefaultFooter: true
    }
  }
};
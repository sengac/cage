import type { ViewDefinition } from './types';

// Import all view components
import { MainMenuView } from '../../features/menu/views/MainMenuView';
import { EventInspectorView } from '../../features/events/views/EventInspectorView';
import { ServerManagerView } from '../../features/server/views/ServerManagerView';
import { HooksConfigurationView } from '../../features/hooks/views/HooksConfigurationView';
import { StreamView } from '../../features/events/views/StreamView';
import { StatisticsDashboardView } from '../../features/statistics/views/StatisticsDashboardView';
import { ConfigurationMenuView } from '../../features/settings/views/ConfigurationMenuView';
import { DebugConsoleView } from '../../features/debug/views/DebugConsoleView';
import { HelpSystemView } from '../../features/help/views/HelpSystemView';
import { EventDetailView } from '../../features/events/views/EventDetailView';

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
      showDefaultFooter: true,
    },
  },

  events: {
    id: 'events',
    component: EventInspectorView,
    metadata: {
      title: 'Events Inspector',
      subtitle: 'Browse & analyze events',
      footer:
        '↵ View | / Search | t,y,o,s Sort | r Reverse | c Clear | ESC Back',
      showDefaultFooter: false,
    },
  },

  eventDetail: {
    id: 'eventDetail',
    component: EventDetailView,
    metadata: {
      title: 'Event Detail',
      footer: '← → Switch tabs | c Copy | e Export | ESC Back',
      showDefaultFooter: false,
    },
  },

  server: {
    id: 'server',
    component: ServerManagerView,
    metadata: {
      title: 'Server Management',
      subtitle: 'Start/stop/status',
      showServerStatus: true,
      footer: 's Start/Stop | r Restart | c Config | l Logs | ESC Back',
      showDefaultFooter: false,
    },
  },

  hooks: {
    id: 'hooks',
    component: HooksConfigurationView,
    metadata: {
      title: 'Hooks Configuration',
      subtitle: 'Setup & verify hooks',
      footer:
        'Space Toggle | a Enable All | d Disable All | r Refresh | v Verify | / Search | f Filter | ESC Back',
      showDefaultFooter: false,
    },
  },

  stream: {
    id: 'stream',
    component: StreamView,
    metadata: {
      title: 'Real-time Monitor',
      subtitle: 'Stream live events',
      footer: '/ Filter | c Clear | ↵ View | ESC Back',
      showDefaultFooter: false,
    },
  },

  statistics: {
    id: 'statistics',
    component: StatisticsDashboardView,
    metadata: {
      title: 'Statistics Dashboard',
      subtitle: 'View metrics & charts',
      footer: '↑↓ Navigate | ↵ View Details | r Refresh | ? Help | ESC Back',
      showDefaultFooter: false,
    },
  },

  settings: {
    id: 'settings',
    component: ConfigurationMenuView,
    metadata: {
      title: 'Settings',
      subtitle: 'Configure Cage',
      footer:
        'TAB/Shift+TAB Navigate | SPACE Toggle | ↵ Edit | S Save | R Reset | ESC Back',
      showDefaultFooter: false,
    },
  },

  debug: {
    id: 'debug',
    component: DebugConsoleView,
    metadata: {
      title: 'Debug Console',
      subtitle: 'View debug output',
      footer:
        '/ Search | f Filter Level | c Filter Component | r Reset | ESC Back',
      showDefaultFooter: false,
    },
  },

  help: {
    id: 'help',
    component: HelpSystemView,
    metadata: {
      title: 'Help System',
      footer:
        '↑↓ Navigate | ↵ View Topic | / Search | ? Advanced | h Reference | ESC Back',
      showDefaultFooter: false,
    },
  },
};

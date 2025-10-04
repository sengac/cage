import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../../../shared/hooks/useSafeInput';

export interface HelpSystemProps {
  onBack: () => void;
  context?: string;
  mode?: 'full' | 'overlay';
  tooltip?: string;
}

interface HelpCategory {
  id: string;
  title: string;
  description: string;
  content: string[];
}

type ViewMode = 'main' | 'detail' | 'search' | 'overlay' | 'tooltip';

const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Quick start guide and basic concepts',
    content: [
      'GETTING STARTED',
      '',
      'Welcome to Cage',
      'Cage is a controlled environment for AI that provides boundaries, context, and guidance.',
      '',
      'Basic Concepts:',
      '• Event Monitoring - Track Claude Code tool usage',
      '• Hook Configuration - Customize event handling',
      '• Server Management - Control backend services',
      '• Statistics & Debug - Analyze performance',
      '',
      'First Steps:',
      '1. Install Cage: npm install -g @cage/cli',
      '2. Initialize: cage init',
      '3. Start server: cage start',
      '4. Configure hooks: cage hooks setup',
      '',
      'Requirements:',
      '• Node.js 18 or later',
      '• Claude Code extension',
      '• npm install -g @cage/cli',
      '',
      'Basic CLI Commands:',
      'cage start     - Start the Cage backend server',
      'cage events    - Monitor and view events',
      'cage hooks     - Configure Claude Code hooks',
      'cage server    - Manage server status',
    ],
  },
  {
    id: 'navigation',
    title: 'Navigation',
    description: 'How to navigate through Cage',
    content: [
      'NAVIGATION GUIDE',
      '',
      'Main Menu Navigation:',
      '• ↑↓ or j/k - Move between options',
      '• ↵ Enter - Select option',
      '• ESC - Go back',
      '• q - Quit application',
      '',
      'Universal Shortcuts:',
      'ESC - Go back',
      'q - Quit',
      '? - Help',
      '↑↓ or j/k - Navigate',
      '',
      'Component Navigation:',
      '• Event Inspector: f (filter), t (tail), / (search)',
      '• Server Manager: s (start), p (stop), r (restart)',
      '• Configuration Menu: Tab (switch), s (save), r (reset)',
      '',
      'View-Specific Navigation:',
      'Event Inspector:',
      '  f - Filter events by type',
      '  t - Toggle tail mode',
      '  / - Search events',
      '',
      'Server Manager:',
      '  s - Start server',
      '  p - Stop server',
      '  r - Restart server',
      '',
      'Configuration Menu:',
      '  Tab - Switch between sections',
      '  s - Save changes',
      '  r - Reset to defaults',
      '',
      'Breadcrumb Trail:',
      'Home > Help > Navigation',
    ],
  },
  {
    id: 'components',
    title: 'Components',
    description: 'Overview of all available components',
    content: [
      'COMPONENTS OVERVIEW',
      '',
      'Event Inspector:',
      '• Monitor and analyze events in real-time',
      '• Filter by event type, component, or time',
      '• View detailed event information',
      '• Export event data',
      '',
      'Server Manager:',
      '• Control backend server state',
      '• View server logs and status',
      '• Configure server settings',
      '• Monitor server health',
      '',
      'Configuration Menu:',
      '• Customize Cage settings',
      '• Theme and display options',
      '• Key binding preferences',
      '• Import/export configurations',
      '',
      'Hooks Configuration:',
      '• Install and manage Claude Code hooks',
      '• Enable/disable specific hooks',
      '• View hook status and statistics',
      '• Troubleshoot hook issues',
      '',
      'Statistics Dashboard:',
      '• View usage analytics and trends',
      '• Performance metrics and insights',
      '• Event type breakdowns',
      '• Historical data visualization',
      '',
      'Debug Console:',
      '• Raw event and log viewing',
      '• Advanced filtering and search',
      '• Performance monitoring',
      '• Error tracking and debugging',
      '',
      'Usage Examples:',
      '• Press ↵ to enter any component',
      '• Use filters to focus on specific data',
      '• Navigate with arrow keys or j/k',
      '• Press ESC to return to main menu',
    ],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Complete keyboard reference guide',
    content: [
      'KEYBOARD SHORTCUTS REFERENCE',
      '',
      'Navigation Shortcuts:',
      '↑↓ or j/k    - Navigate up/down',
      '←→ or h/l    - Navigate left/right',
      '↵ Enter      - Select/confirm',
      'ESC          - Go back/cancel',
      'Tab          - Switch focus area',
      '',
      'Action Shortcuts:',
      's            - Start/save',
      'p            - Stop/pause',
      'r            - Restart/refresh',
      't            - Toggle mode',
      'e            - Export',
      'i            - Import',
      '',
      'Filter & Search:',
      'f            - Open filter menu',
      '/ Search     - Start search',
      'c            - Clear filters',
      'n            - Next result',
      'N            - Previous result',
      '',
      'System Controls:',
      'q            - Quit application',
      '?            - Show help',
      'h            - Quick reference',
      '',
      'Component-Specific Shortcuts:',
      '',
      'Event Inspector:',
      'f - Filter events',
      't - Toggle tail mode',
      'x - Export events',
      '',
      'Server Manager:',
      's - Start server',
      'p - Stop server',
      'r - Restart server',
      'l - View logs',
      '',
      'Shortcut Combinations:',
      'Ctrl+C - Force quit',
      'Shift+? - Context help',
      'Alt+Tab - Switch views',
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Common issues and solutions',
    content: [
      'TROUBLESHOOTING GUIDE',
      '',
      'Common Issues:',
      '',
      'Backend connection failed:',
      '• Check if server is running: cage server status',
      '• Restart server: cage server restart',
      '• Check port availability: cage doctor',
      '',
      'Hooks not working:',
      '• Verify installation: cage hooks status',
      '• Reinstall hooks: cage hooks setup',
      '• Check Claude Code settings',
      '',
      'Events not appearing:',
      '• Ensure hooks are enabled',
      '• Check event filters',
      '• Restart Claude Code',
      '',
      'Diagnostic Commands:',
      'cage doctor     - Run system diagnostics',
      'cage logs       - View application logs',
      'cage status     - Check overall status',
      'cage version    - Show version info',
      '',
      'Frequently Asked Questions:',
      '',
      'Q: How do I reset Cage?',
      'A: Run "cage reset" to restore defaults',
      '',
      'Q: Why are my events missing?',
      'A: Check hook status and event filters',
      '',
      'Q: How do I update Cage?',
      'A: Run "npm update -g @cage/cli"',
      '',
      'Q: Can I use Cage offline?',
      'A: Yes, events are cached locally',
      '',
      'Q: How do I backup my configuration?',
      'A: Use "cage config export" command',
    ],
  },
];

export const HelpSystem: React.FC<HelpSystemProps> = ({
  onBack,
  context = '',
  mode = 'full',
  tooltip = '',
}) => {
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>(
    mode === 'overlay' ? 'overlay' : tooltip ? 'tooltip' : 'main'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Auto-dismiss tooltip after timeout
  useEffect(() => {
    if (tooltip && viewMode === 'tooltip') {
      const timer = setTimeout(() => {
        onBack();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [tooltip, viewMode, onBack]);

  useSafeInput((input, key) => {
    if (viewMode === 'overlay') {
      if (key.escape) {
        onBack();
      }
      return;
    }

    if (viewMode === 'tooltip') {
      if (key.escape) {
        onBack();
      }
      return;
    }

    if (isSearchMode) {
      if (key.escape) {
        setIsSearchMode(false);
        setSearchTerm('');
        setViewMode('main');
      } else if (key.return) {
        setViewMode('search');
        setIsSearchMode(false);
      } else if (key.backspace) {
        setSearchTerm(prev => prev.slice(0, -1));
      } else if (input && input.length === 1) {
        setSearchTerm(prev => prev + input);
      }
      return;
    }

    if (viewMode === 'search') {
      if (key.escape) {
        setViewMode('main');
        setSearchTerm('');
      }
      return;
    }

    if (viewMode === 'detail') {
      if (key.escape) {
        setViewMode('main');
      }
      return;
    }

    // Main view navigation
    if (key.escape) {
      onBack();
    } else if (key.downArrow || input === 'j') {
      setSelectedCategoryIndex(prev => (prev + 1) % HELP_CATEGORIES.length);
    } else if (key.upArrow || input === 'k') {
      setSelectedCategoryIndex(
        prev => (prev - 1 + HELP_CATEGORIES.length) % HELP_CATEGORIES.length
      );
    } else if (key.return) {
      setViewMode('detail');
    } else if (input === '/') {
      setIsSearchMode(true);
      setSearchTerm('');
    } else if (input === '?') {
      setShowAdvanced(!showAdvanced);
    } else if (input === 'h') {
      setSelectedCategoryIndex(3); // Keyboard Shortcuts
      setViewMode('detail');
    }
  });

  const renderTooltip = (): JSX.Element => {
    const tooltipContent = getTooltipContent(tooltip);

    return (
      <Box
        flexDirection="column"
        padding={1}
        borderStyle="single"
        borderColor="cyan"
      >
        <Text bold color="cyan">
          {tooltipContent.title}
        </Text>
        <Text>{tooltipContent.description}</Text>
        {tooltipContent.shortcut && (
          <Text color="gray">Shortcut: {tooltipContent.shortcut}</Text>
        )}
      </Box>
    );
  };

  const getTooltipContent = (tooltipId: string) => {
    const tooltips: Record<
      string,
      { title: string; description: string; shortcut?: string }
    > = {
      'filter-button': {
        title: 'Filter Button',
        description: 'Click to open filter options',
        shortcut: 'f',
      },
      'event-count': {
        title: 'Event Count',
        description: 'Total number of events captured',
      },
      'status-indicator': {
        title: 'Status Indicator',
        description: 'Shows current system status',
      },
    };

    return (
      tooltips[tooltipId] || {
        title: 'Help',
        description: 'No information available',
      }
    );
  };

  const renderOverlay = (): JSX.Element => (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle="double"
      borderColor="cyan"
    >
      <Text bold color="cyan">
        Quick Help
      </Text>
      <Text></Text>
      <Text>↑↓ Navigate</Text>
      <Text>↵ Select</Text>
      <Text>ESC Back</Text>
      <Text>q Quit</Text>
      <Text></Text>
      <Text color="gray">Press ? for full help</Text>
      <Text color="gray">ESC to close</Text>
    </Box>
  );

  const renderSearchMode = (): JSX.Element => (
    <Box flexDirection="column">
      <Text>Search Help: {searchTerm}</Text>
      <Text color="gray">Type to search...</Text>
    </Box>
  );

  const renderSearchResults = (): JSX.Element => {
    const results = searchInHelpContent(searchTerm);

    return (
      <Box flexDirection="column">
        <Text bold color="cyan">
          Search Results
        </Text>
        <Text>Search: "{searchTerm}"</Text>
        <Text>Found {results.length} results</Text>
        <Text></Text>
        {results.map((result, index) => (
          <Box key={index} marginBottom={1}>
            <Text bold>{result.category}</Text>
            <Text> {result.snippet}</Text>
          </Box>
        ))}
      </Box>
    );
  };

  const searchInHelpContent = (term: string) => {
    const results: Array<{ category: string; snippet: string }> = [];

    HELP_CATEGORIES.forEach(category => {
      category.content.forEach(line => {
        if (line.toLowerCase().includes(term.toLowerCase())) {
          results.push({
            category: category.title,
            snippet: line.length > 80 ? line.substring(0, 80) + '...' : line,
          });
        }
      });
    });

    return results.slice(0, 10); // Limit results
  };

  const renderDetailView = (): JSX.Element => {
    const category = HELP_CATEGORIES[selectedCategoryIndex];
    const breadcrumb = `Help > ${category.title}`;

    return (
      <Box flexDirection="column">
        <Text color="gray">{breadcrumb}</Text>
        <Text></Text>
        {category.content.map((line, index) => (
          <Text key={index} bold={line === category.content[0]}>
            {line}
          </Text>
        ))}
      </Box>
    );
  };

  const renderMainView = (): JSX.Element => {
    return (
      <Box flexDirection="column" flexGrow={1}>
        {/* Main Content */}
        <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>
          {/* Context indicator */}
          {context && (
            <Box marginBottom={1}>
              <Text>Context: {getContextDisplayName(context)}</Text>
              {renderContextHelp(context)}
            </Box>
          )}

          {/* Title */}
          <Box marginBottom={1}>
            <Text bold color="cyan">
              CAGE HELP SYSTEM
            </Text>
          </Box>

          {/* Location indicator */}
          <Box marginBottom={1}>
            <Text color="gray">Location: Main Help Menu</Text>
          </Box>

          {/* Categories */}
          <Box flexDirection="column" marginBottom={1}>
            {HELP_CATEGORIES.map((category, index) => {
              const isSelected = index === selectedCategoryIndex;
              const prefix = isSelected ? '❯ ' : '  ';

              return (
                <Box key={category.id} flexDirection="column" marginBottom={1}>
                  <Text color={isSelected ? 'cyan' : 'white'}>
                    {prefix}
                    {category.title}
                  </Text>
                  <Text color="gray"> {category.description}</Text>
                </Box>
              );
            })}
          </Box>

          {/* Advanced help toggle */}
          {showAdvanced && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold color="yellow">
                Advanced Help
              </Text>
              <Text>Developer Mode</Text>
              <Text>System Diagnostics</Text>
              <Text>API Documentation</Text>
            </Box>
          )}

          {/* Keyboard shortcuts */}
          <Box flexDirection="column" marginBottom={1}>
            <Text bold>Keyboard Shortcuts:</Text>
            <Text>↑↓ Navigate ↵ View details</Text>
            <Text>j/k Move / Search help</Text>
            <Text>ESC Go back q Quit</Text>
          </Box>
        </Box>
      </Box>
    );
  };

  const getContextDisplayName = (contextId: string): string => {
    const contexts: Record<string, string> = {
      'event-inspector': 'Event Inspector',
      'server-manager': 'Server Manager',
      'hooks-config': 'Hooks Configuration',
    };
    return contexts[contextId] || contextId;
  };

  const renderContextHelp = (contextId: string): JSX.Element => {
    const contextHelp: Record<string, JSX.Element> = {
      'event-inspector': (
        <Box flexDirection="column">
          <Text bold>Relevant Shortcuts:</Text>
          <Text>f - Filter events</Text>
          <Text>t - Toggle tail mode</Text>
          <Text></Text>
          <Text bold>Related Topics:</Text>
          <Text>• Event Monitoring</Text>
          <Text>• Filtering Guide</Text>
        </Box>
      ),
      'server-manager': (
        <Box flexDirection="column">
          <Text bold>Quick Tips:</Text>
          <Text>Use s to start the server</Text>
          <Text>Check logs for errors</Text>
          <Text></Text>
          <Text bold>Related Topics:</Text>
          <Text>• Server Configuration</Text>
          <Text>• Troubleshooting</Text>
        </Box>
      ),
      'hooks-config': (
        <Box flexDirection="column">
          <Text bold>Related Topics:</Text>
          <Text>Hook Installation</Text>
          <Text>Event Monitoring</Text>
          <Text>Troubleshooting Hooks</Text>
        </Box>
      ),
    };

    return contextHelp[contextId] || <Text></Text>;
  };

  if (viewMode === 'tooltip') {
    return renderTooltip();
  }

  if (viewMode === 'overlay') {
    return renderOverlay();
  }

  if (isSearchMode) {
    return renderSearchMode();
  }

  if (viewMode === 'search') {
    return renderSearchResults();
  }

  if (viewMode === 'detail') {
    return renderDetailView();
  }

  return renderMainView();
};

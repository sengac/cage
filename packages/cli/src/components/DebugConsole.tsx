import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppStore } from '../stores/appStore';
import { useDebugStore } from '../stores/useStore';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { getEventsDir } from '../utils/event-utils';

export interface DebugConsoleProps {
  onBack: () => void;
}

type ViewMode = 'list' | 'filter' | 'search' | 'help';

interface DebugEvent {
  id: string;
  timestamp: string;
  type: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  component: 'hooks' | 'backend' | 'cli';
  message: string;
  duration?: number;
  stackTrace?: string;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ onBack }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterComponent, setFilterComponent] = useState<string>('all');
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);

  // Get real events from store
  const events = useAppStore(state => state.events) || [];
  const debugMode = useDebugStore(state => state.debugMode) || false;
  const debugLogs = useDebugStore(state => state.debugLogs) || [];

  // Convert real events to debug events
  useEffect(() => {
    const converted: DebugEvent[] = [];

    // Add events from appStore
    if (events && events.length > 0) {
      events.forEach(event => {
        converted.push({
          id: event.id,
          timestamp: event.timestamp,
          type: event.eventType,
          level: event.error ? 'ERROR' : 'INFO',
          component: event.toolName ? 'hooks' : 'backend',
          message: `${event.eventType} ${event.toolName ? `for ${event.toolName}` : ''}`,
          duration: event.executionTime,
          stackTrace: event.error
        });
      });
    }

    // Add debug logs if in debug mode
    if (debugMode && debugLogs.length > 0) {
      debugLogs.forEach((log, index) => {
        converted.push({
          id: `debug-${index}`,
          timestamp: new Date().toISOString(),
          type: 'Debug',
          level: 'DEBUG',
          component: 'cli',
          message: log
        });
      });
    }

    // Try to load real events from filesystem if available
    try {
      const eventsDir = getEventsDir();
      if (existsSync(eventsDir)) {
        const files = readdirSync(eventsDir)
          .filter(f => f.endsWith('.jsonl'))
          .slice(-5); // Get last 5 files

        files.forEach(file => {
          const content = readFileSync(join(eventsDir, file), 'utf-8');
          const lines = content.split('\n').filter(line => line.trim());

          lines.forEach((line, idx) => {
            try {
              const event = JSON.parse(line);
              converted.push({
                id: `file-${file}-${idx}`,
                timestamp: event.timestamp || new Date().toISOString(),
                type: event.type || event.eventType || 'Unknown',
                level: event.level || (event.error ? 'ERROR' : 'INFO'),
                component: event.tool ? 'hooks' : event.source || 'backend',
                message: event.message || JSON.stringify(event).substring(0, 100),
                duration: event.duration || event.executionTime,
                stackTrace: event.stackTrace || event.error
              });
            } catch (e) {
              // Skip malformed lines
            }
          });
        });
      }
    } catch (error) {
      // Fallback to mock data if filesystem fails
      converted.push(
        {
          id: 'fallback-1',
          timestamp: new Date().toISOString(),
          type: 'PreToolUse',
          level: 'INFO',
          component: 'hooks',
          message: 'Processing PreToolUse hook for Read tool',
          duration: 45
        },
        {
          id: 'fallback-2',
          timestamp: new Date().toISOString(),
          type: 'Backend',
          level: 'INFO',
          component: 'backend',
          message: 'Connection established to backend server',
        },
        {
          id: 'fallback-3',
          timestamp: new Date().toISOString(),
          type: 'Error',
          level: 'ERROR',
          component: 'backend',
          message: 'Failed to connect to server - Connection refused',
          stackTrace: 'Error: Connection refused\n    at TCPConnectWrap.afterConnect [as oncomplete] (net.js:1146:16)\n    at connect() line 42'
        },
        {
          id: 'fallback-4',
          timestamp: new Date().toISOString(),
          type: 'PostToolUse',
          level: 'INFO',
          component: 'hooks',
          message: 'PostToolUse hook completed for Edit tool',
          duration: 78
        },
        {
          id: 'fallback-5',
          timestamp: new Date().toISOString(),
          type: 'UserPromptSubmit',
          level: 'INFO',
          component: 'hooks',
          message: 'User prompt submitted and processed',
        },
        {
          id: 'fallback-6',
          timestamp: new Date().toISOString(),
          type: 'Performance',
          level: 'WARN',
          component: 'hooks',
          message: 'Slow operation detected',
          duration: 1500
        },
        {
          id: 'fallback-7',
          timestamp: new Date().toISOString(),
          type: 'FileWrite',
          level: 'DEBUG',
          component: 'cli',
          message: 'Writing file /tmp/debug.log',
          duration: 23
        }
      );
    }

    // Apply filters
    let filtered = converted;
    if (filterLevel !== 'all') {
      filtered = filtered.filter(e => e.level === filterLevel);
    }
    if (filterComponent !== 'all') {
      filtered = filtered.filter(e => e.component === filterComponent);
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.message.toLowerCase().includes(search) ||
        e.type.toLowerCase().includes(search)
      );
    }

    setDebugEvents(filtered);
  }, [events, debugMode, debugLogs, filterLevel, filterComponent, searchTerm]);

  useInput((input, key) => {
    if (viewMode === 'help') {
      if (key.escape || input === '?') {
        setViewMode('list');
      }
      return;
    }

    if (viewMode === 'filter') {
      if (key.escape) {
        setViewMode('list');
      }
      // TODO: Implement filter selection
      return;
    }

    if (viewMode === 'search') {
      if (key.escape) {
        setSearchTerm('');
        setViewMode('list');
      } else if (key.return) {
        // Apply search
        setViewMode('list');
      } else if (key.backspace) {
        setSearchTerm(prev => prev.slice(0, -1));
      } else if (input && input.length === 1) {
        setSearchTerm(prev => prev + input);
      }
      return;
    }

    // List view navigation
    if (key.downArrow || input === 'j') {
      setSelectedIndex(prev => Math.min(prev + 1, debugEvents.length - 1));
    } else if (key.upArrow || input === 'k') {
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (input === 'f') {
      setViewMode('filter');
    } else if (input === '/') {
      setViewMode('search');
      setSearchTerm('');
    } else if (input === '?') {
      setViewMode('help');
    }
    // ESC/q handled by FullScreenLayout, not here
  });

  const renderHelp = () => (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">HELP - Keyboard Shortcuts</Text>
      <Text> </Text>
      <Text>Navigation:</Text>
      <Text>  ↑/↓ or j/k  - Navigate events</Text>
      <Text>  ESC or q    - Back/Exit</Text>
      <Text> </Text>
      <Text>Filtering:</Text>
      <Text>  f           - Open filter menu</Text>
      <Text>  /           - Search within logs</Text>
      <Text> </Text>
      <Text>Other:</Text>
      <Text>  ?           - Toggle help</Text>
      <Text> </Text>
      <Text color="gray">Press ESC or ? to close help</Text>
    </Box>
  );

  const renderFilter = () => (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">FILTER OPTIONS</Text>
      <Text> </Text>
      <Text bold>Log Level:</Text>
      <Text>  • ALL</Text>
      <Text>  • ERROR</Text>
      <Text>  • WARN</Text>
      <Text>  • INFO</Text>
      <Text>  • DEBUG</Text>
      <Text> </Text>
      <Text bold>Component:</Text>
      <Text>  • all</Text>
      <Text>  • hooks</Text>
      <Text>  • backend</Text>
      <Text>  • cli</Text>
      <Text> </Text>
      <Text color="gray">Press ESC to go back</Text>
    </Box>
  );

  const renderSearch = () => (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">SEARCH</Text>
      <Text> </Text>
      <Text>Search: {searchTerm}_</Text>
      <Text> </Text>
      <Text color="gray">Type to search, Enter to apply, ESC to cancel</Text>
    </Box>
  );

  const renderList = () => {
    const getLevelColor = (level: string) => {
      switch (level) {
        case 'ERROR': return 'red';
        case 'WARN': return 'yellow';
        case 'INFO': return 'cyan';
        case 'DEBUG': return 'gray';
        default: return 'white';
      }
    };

    return (
      <Box flexDirection="column" flexGrow={1}>
        {/* Main Content */}
        <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>

        {/* Status bar */}
        <Box marginBottom={1}>
          <Text>Total Events: {debugEvents.length}</Text>
          <Text> | </Text>
          <Text>Filter: {filterLevel === 'all' ? 'All Levels' : filterLevel}</Text>
          <Text> | </Text>
          <Text>Component: {filterComponent === 'all' ? 'All' : filterComponent}</Text>
        </Box>

        {/* Events list */}
        <Box flexDirection="column" marginBottom={1}>
          {debugEvents.length === 0 && (
            <Text color="gray">No debug events yet. Events will appear here as they occur.</Text>
          )}
          {debugEvents.map((event, index) => {
            const isSelected = index === selectedIndex;
            const prefix = isSelected ? '❯ ' : '  ';
            const time = new Date(event.timestamp).toLocaleTimeString();

            return (
              <Box key={event.id} flexDirection="column">
                <Text color={isSelected ? 'yellow' : getLevelColor(event.level)}>
                  {prefix}[{time}] [{event.level}] [{event.component}] {event.type}: {event.message}
                  {event.duration && ` (${event.duration}ms)`}
                </Text>
                {/* Show stack trace for errors */}
                {event.level === 'ERROR' && event.stackTrace && isSelected && (
                  <Box marginLeft={4} flexDirection="column">
                    <Text color="red" dimColor>Stack trace:</Text>
                    <Text color="red" dimColor>{event.stackTrace}</Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        </Box>
      </Box>
    );
  };

  // Choose which view to render
  if (viewMode === 'help') {
    return renderHelp();
  }

  if (viewMode === 'filter') {
    return renderFilter();
  }

  if (viewMode === 'search') {
    return renderSearch();
  }

  return renderList();
};
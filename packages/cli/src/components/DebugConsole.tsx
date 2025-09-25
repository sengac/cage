import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../hooks/useSafeInput';
import { useTheme } from '../hooks/useTheme';
import figures from 'figures';
import { ResizeAwareList } from './ResizeAwareList';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { Logger } from '@cage/shared';
import { useExclusiveInput } from '../contexts/InputContext';

const logger = new Logger({ context: 'DebugConsole' });

interface DebugEvent {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component: string;
  type: string;
  message: string;
  stackTrace?: string;
  duration?: number;
}

interface DebugConsoleProps {
  onBack: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ onBack }) => {
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterLevel, setFilterLevel] = useState<'all' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'>('all');
  const [filterComponent, setFilterComponent] = useState<string>('all');
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const { enterExclusiveMode } = useExclusiveInput('debug-console');
  const releaseFocusRef = useRef<(() => void) | null>(null);

  // Dynamic offset for search bar
  const dynamicOffset = searchMode ? 3 : 0;

  // Handle entering/exiting search mode
  useEffect(() => {
    if (searchMode) {
      const release = enterExclusiveMode('search');
      releaseFocusRef.current = release;
    } else if (releaseFocusRef.current) {
      releaseFocusRef.current();
      releaseFocusRef.current = null;
    }

    return () => {
      if (releaseFocusRef.current) {
        releaseFocusRef.current();
      }
    };
  }, [searchMode, enterExclusiveMode]);

  // Load debug events from filesystem
  useEffect(() => {
    const loadDebugEvents = () => {
      try {
        setLoading(true);
        const events: DebugEvent[] = [];
        const eventsDir = join(process.cwd(), '.cage/events');

        if (!existsSync(eventsDir)) {
          setDebugEvents([]);
          return;
        }

        // Get all date directories
        const dateDirs = readdirSync(eventsDir)
          .filter(dir => !dir.startsWith('.'))
          .sort((a, b) => b.localeCompare(a))
          .slice(0, 3); // Last 3 days

        for (const dateDir of dateDirs) {
          const datePath = join(eventsDir, dateDir);
          const files = readdirSync(datePath)
            .filter(f => f.endsWith('.jsonl'))
            .slice(-5); // Get last 5 files

          files.forEach(file => {
            const filePath = join(datePath, file);
            const content = readFileSync(filePath, 'utf-8');
            const lines = content.trim().split('\n').filter(Boolean);

            lines.forEach(line => {
              try {
                const event = JSON.parse(line);
                // Convert to debug event format
                events.push({
                  id: `${event.timestamp}-${Math.random()}`,
                  timestamp: event.timestamp,
                  level: event.level || 'INFO',
                  component: event.toolName || event.eventType || 'System',
                  type: event.eventType || 'Event',
                  message: event.message || JSON.stringify(event.arguments || {}),
                  stackTrace: event.error,
                  duration: event.executionTime
                });
              } catch {
                // Skip invalid JSON
              }
            });
          });
        }

        // Sort by timestamp descending
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setDebugEvents(events);
      } catch (error) {
        logger.error('Failed to load debug events', { error });
        setDebugEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadDebugEvents();

    // Refresh every 5 seconds
    const interval = setInterval(loadDebugEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter events
  const filteredEvents = debugEvents.filter(event => {
    if (filterLevel !== 'all' && event.level !== filterLevel) return false;
    if (filterComponent !== 'all' && event.component !== filterComponent) return false;

    if (appliedSearch) {
      const searchableContent = [
        event.message,
        event.component,
        event.type,
        event.level
      ].join(' ').toLowerCase();
      if (!searchableContent.includes(appliedSearch.toLowerCase())) return false;
    }

    return true;
  });

  // Get unique components for filtering
  const components = Array.from(new Set(debugEvents.map(e => e.component))).sort();

  useSafeInput((input, key) => {
    // Search mode - capture all text input
    if (searchMode) {
      if (key.return) {
        setAppliedSearch(searchQuery);
        setSearchMode(false);
        return;
      }
      if (key.escape) {
        setSearchMode(false);
        setSearchQuery('');
        return;
      }
      if (key.delete || key.backspace) {
        setSearchQuery(prev => prev.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setSearchQuery(prev => prev + input);
        return;
      }
      return; // Block all other input
    }

    // Normal mode - handle escape to go back
    if (key.escape) {
      onBack();
      return;
    }

    // Normal mode shortcuts
    switch (input) {
      case '/':
        setSearchMode(true);
        setSearchQuery('');
        break;
      case 'f':
        // Cycle through filter levels
        const levels: Array<typeof filterLevel> = ['all', 'DEBUG', 'INFO', 'WARN', 'ERROR'];
        const currentIndex = levels.indexOf(filterLevel);
        setFilterLevel(levels[(currentIndex + 1) % levels.length]);
        break;
      case 'c':
        // Cycle through components
        const allComponents = ['all', ...components];
        const currentCompIndex = allComponents.indexOf(filterComponent);
        setFilterComponent(allComponents[(currentCompIndex + 1) % allComponents.length]);
        break;
      case 'r':
        // Clear all filters
        setFilterLevel('all');
        setFilterComponent('all');
        setAppliedSearch('');
        break;
    }
  }, { componentId: 'debug-console' });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return theme.status.error;
      case 'WARN': return theme.status.warning;
      case 'INFO': return theme.ui.text;
      case 'DEBUG': return theme.ui.textMuted;
      default: return theme.ui.textDim;
    }
  };

  const renderEvent = (event: DebugEvent, _index: number, isSelected: boolean) => {
    const textColor = isSelected ? theme.ui.hover : getLevelColor(event.level);
    const indicator = isSelected ? figures.pointer : ' ';
    const time = new Date(event.timestamp).toLocaleTimeString();

    // ResizeAwareList will handle the wrapping, but we need to handle multi-line for stack trace
    if (isSelected && event.stackTrace) {
      return (
        <Box flexDirection="column" width="100%">
          <Box width="100%">
            <Text color={textColor} wrap="truncate">
              {indicator} {time}  {event.level.padEnd(5)}  {event.component.substring(0, 15).padEnd(15)}  {event.message}
              {event.duration ? ` (${event.duration}ms)` : ''}
            </Text>
          </Box>
          <Box marginLeft={2} width="100%">
            <Text color={theme.status.error} dimColor wrap="truncate">
              {event.stackTrace}
            </Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box width="100%">
        <Text color={textColor} wrap="truncate">
          {indicator} {time}  {event.level.padEnd(5)}  {event.component.substring(0, 15).padEnd(15)}  {event.message}
          {event.duration ? ` (${event.duration}ms)` : ''}
        </Text>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text color={theme.ui.textMuted}>Loading debug events...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Status bar */}
      <Box marginBottom={1} paddingX={1}>
        <Text color={theme.ui.textMuted}>Events: {filteredEvents.length}/{debugEvents.length}</Text>
        {filterLevel !== 'all' && (
          <Text color={theme.primary.aqua}> Level: {filterLevel}</Text>
        )}
        {filterComponent !== 'all' && (
          <Text color={theme.primary.aqua}> Component: {filterComponent}</Text>
        )}
        {appliedSearch && (
          <Text color={theme.primary.aqua}> Search: {appliedSearch}</Text>
        )}
      </Box>

      {/* Search input */}
      {searchMode && (
        <Box marginBottom={1} paddingX={1} borderStyle="single" borderColor={theme.primary.aqua}>
          <Text color={theme.ui.text}>Search: {searchQuery}</Text>
        </Box>
      )}

      {/* Column headers */}
      <Box paddingX={1} marginBottom={1}>
        <Text color={theme.ui.textMuted} bold>
          {'  Time       Level  Component        Message'}
        </Text>
      </Box>

      {/* Events list */}
      <Box width="100%" flexGrow={1}>
        <ResizeAwareList
          items={filteredEvents}
          renderItem={renderEvent}
          onFocus={(_, index) => setSelectedIndex(index)}
          keyExtractor={(event) => event.id}
          emptyMessage="No debug events found"
          showScrollbar={true}
          enableWrapAround={true}
          testMode={true}
          initialIndex={selectedIndex}
          heightOffset={14}  // Header(3) + Footer(3) + Padding(2) + Status(2) + Columns(2) + Buffer(2)
          dynamicOffset={dynamicOffset}
        />
      </Box>

    </Box>
  );
};
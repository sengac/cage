import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../../../shared/hooks/useSafeInput';
import { useTheme } from '../../../core/theme/useTheme';
import figures from 'figures';
import { LayoutAwareList } from '../../../shared/components/ui/LayoutAwareList';
import { useExclusiveInput } from '../../../shared/contexts/InputContext';
import { useAppStore } from '../../../shared/stores/appStore';
import { format } from 'date-fns';

interface DebugEvent {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component: string;
  message: string;
  context?: unknown;
  stackTrace?: string;
}

interface DebugConsoleProps {
  onBack: () => void;
}

export const DebugConsole: React.FC<DebugConsoleProps> = ({ onBack }) => {
  // Get debug logs from Zustand store
  const debugLogs = useAppStore(state => state.debugLogs);
  
  const [filterLevel, setFilterLevel] = useState<
    'all' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
  >('all');
  const [filterComponent, setFilterComponent] = useState<string>('all');
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

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
  }, [searchMode]);

  // Convert debug logs to debug events format for compatibility
  const debugEvents = useMemo<DebugEvent[]>(() => {
    return debugLogs.map((log, index) => ({
      id: `${log.timestamp}-${index}`,
      timestamp: log.timestamp,
      level: log.level,
      component: log.component || 'Unknown',
      message: log.message,
      context: log.context,
      stackTrace: log.stackTrace,
    }));
  }, [debugLogs]);

  // Get unique components
  const uniqueComponents = useMemo(() => {
    const components = new Set(debugEvents.map(e => e.component));
    return Array.from(components).sort();
  }, [debugEvents]);

  // Apply filters
  const filteredEvents = useMemo(() => {
    let filtered = debugEvents;

    // Level filter
    if (filterLevel !== 'all') {
      filtered = filtered.filter(event => event.level === filterLevel);
    }

    // Component filter
    if (filterComponent !== 'all') {
      filtered = filtered.filter(event => event.component === filterComponent);
    }

    // Search filter
    if (appliedSearch) {
      const searchLower = appliedSearch.toLowerCase();
      filtered = filtered.filter(event => {
        const eventStr = JSON.stringify({
          message: event.message,
          component: event.component,
          context: event.context,
        }).toLowerCase();
        return eventStr.includes(searchLower);
      });
    }

    return filtered;
  }, [debugEvents, filterLevel, filterComponent, appliedSearch]);

  // Normal mode handler - only active when mode is 'normal'
  useSafeInput(
    (input, key) => {
      if (key.escape) {
        onBack();
        return;
      }

      if (input === '/') {
        setSearchMode(true);
      } else if (input === 'f') {
        // Cycle through filter levels
        const levels: Array<'all' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'> = [
          'all',
          'DEBUG',
          'INFO',
          'WARN',
          'ERROR',
        ];
        const currentIndex = levels.indexOf(filterLevel);
        const nextIndex = (currentIndex + 1) % levels.length;
        setFilterLevel(levels[nextIndex]);
      } else if (input === 'c') {
        // Cycle through components
        const allComponents = ['all', ...uniqueComponents];
        const currentIndex = allComponents.indexOf(filterComponent);
        const nextIndex = (currentIndex + 1) % allComponents.length;
        setFilterComponent(allComponents[nextIndex]);
      } else if (input === 'r') {
        // Reset all filters
        setFilterLevel('all');
        setFilterComponent('all');
        setAppliedSearch('');
      }
    },
    { componentId: 'debug-console', activeModes: ['normal'] }
  );

  // Search mode handler - only active when mode is 'search'
  useSafeInput(
    (input, key) => {
      if (key.escape) {
        setSearchMode(false);
        setSearchQuery('');
        setAppliedSearch('');
        return;
      }
      if (key.return) {
        setAppliedSearch(searchQuery);
        setSearchMode(false);
        return;
      }
      if (key.backspace || key.delete) {
        setSearchQuery(prev => prev.slice(0, -1));
        return;
      }
      if (input && input.length === 1) {
        setSearchQuery(prev => prev + input);
        return;
      }
    },
    { componentId: 'debug-console', activeModes: ['search'] }
  );

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'DEBUG':
        return theme.ui.textMuted;
      case 'INFO':
        return theme.ui.text;
      case 'WARN':
        return theme.status.warning;
      case 'ERROR':
        return theme.status.error;
      default:
        return theme.ui.text;
    }
  };

  const renderDebugEvent = (
    event: DebugEvent,
    _index: number,
    isSelected: boolean
  ) => {
    const indicator = isSelected ? figures.pointer : ' ';
    const time = format(new Date(event.timestamp), 'HH:mm:ss.SSS');
    const level = event.level.padEnd(5);
    const component = event.component.substring(0, 15).padEnd(15);
    const message = event.message.substring(0, 80);

    const textColor = isSelected ? theme.ui.hover : getLevelColor(event.level);

    return (
      <Text color={textColor}>
        {indicator} {time} {level} {component} {message}
      </Text>
    );
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Header with filters */}
      <Box marginBottom={1} paddingX={1}>
        <Text color={theme.ui.textMuted}>Level: </Text>
        <Text color={filterLevel === 'all' ? theme.ui.text : getLevelColor(filterLevel)}>
          {filterLevel}
        </Text>
        <Text color={theme.ui.textMuted}> | Component: </Text>
        <Text color={theme.ui.text}>{filterComponent}</Text>
        {appliedSearch && (
          <>
            <Text color={theme.ui.textMuted}> | Search: </Text>
            <Text color={theme.primary.aqua}>{appliedSearch}</Text>
          </>
        )}
        <Text color={theme.ui.textMuted}> | Events: </Text>
        <Text color={theme.ui.text}>{filteredEvents.length}</Text>
      </Box>

      {/* Search bar */}
      {searchMode && (
        <Box
          marginBottom={1}
          paddingX={1}
          borderStyle="single"
          borderColor={theme.primary.aqua}
        >
          <Text color={theme.ui.text}>Search: {searchQuery}</Text>
        </Box>
      )}

      {/* Column headers */}
      <Box paddingX={1} marginBottom={1}>
        <Text color={theme.ui.textMuted} bold>
          {'  Time          Level Component       Message'}
        </Text>
      </Box>

      {/* Events list */}
      <LayoutAwareList
        items={filteredEvents}
        renderItem={renderDebugEvent}
        onSelect={() => {}} // No action on select
        keyExtractor={event => event.id}
        emptyMessage="No debug events"
        showScrollbar={true}
        enableWrapAround={false}
        testMode={true}
        localHeightOffset={4 + dynamicOffset}
      />
    </Box>
  );
};
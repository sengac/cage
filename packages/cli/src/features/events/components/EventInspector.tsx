import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../../../shared/hooks/useSafeInput';
import { format } from 'date-fns';
import figures from 'figures';
import type { Event } from '../../../shared/stores/appStore';
import { useTheme } from '../../../core/theme/useTheme';
import { LayoutAwareList } from '../../../shared/components/ui/LayoutAwareList';
import { useExclusiveInput } from '../../../shared/contexts/InputContext';
import { useAppStore } from '../../../shared/stores/appStore';
import { CageApiClient } from '../../../api/cage-api-client';
import { Logger } from '@cage/shared';

const logger = new Logger({ context: 'EventInspector' });

interface EventInspectorProps {
  onSelectEvent: (event: Event, index: number) => void;
  onBack: () => void;
  initialSelectedIndex?: number;
}

type SortField = 'timestamp' | 'type' | 'tool' | 'session';
type SortOrder = 'asc' | 'desc';

export const EventInspector: React.FC<EventInspectorProps> = ({
  onSelectEvent,
  onBack,
  initialSelectedIndex = 0,
}) => {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [realEvents, setRealEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const { enterExclusiveMode } = useExclusiveInput('event-inspector');
  const releaseFocusRef = useRef<(() => void) | null>(null);
  const serverStatus = useAppStore(state => state.serverStatus);

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

  // Load events from server API ONLY if server is running
  useEffect(() => {
    const loadEvents = async () => {
      // Only load events if server is running
      if (serverStatus !== 'running') {
        setRealEvents([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const client = await CageApiClient.initializeFromConfig();
        const response = await client.getEvents({ limit: 1000 });

        if (response.success && response.data) {
          setRealEvents(response.data.events);
        } else {
          setRealEvents([]);
          logger.error('Failed to load events:', { error: response.error });
        }
      } catch (error) {
        setRealEvents([]);
        logger.error('Error loading events:', { error });
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, [serverStatus]);

  // Sort and filter events
  const processedEvents = useMemo(() => {
    let filtered = [...realEvents];

    // Apply search filter
    if (appliedSearch) {
      filtered = filtered.filter(event => {
        const searchableContent = [
          event.eventType,
          event.toolName || '',
          JSON.stringify(event.arguments || {}),
          JSON.stringify(event.result || {}),
        ]
          .join(' ')
          .toLowerCase();
        return searchableContent.includes(appliedSearch.toLowerCase());
      });
    }

    // Sort events
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'timestamp':
          comparison =
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'type':
          comparison = a.eventType.localeCompare(b.eventType);
          break;
        case 'tool':
          comparison = (a.toolName || '').localeCompare(b.toolName || '');
          break;
        case 'session':
          comparison = a.sessionId.localeCompare(b.sessionId);
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [realEvents, sortField, sortOrder, appliedSearch]);

  // Normal mode handler - only active when mode is 'normal'
  useSafeInput(
    (input, key) => {
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
        case 't':
          setSortField('timestamp');
          setSortOrder(prev =>
            sortField === 'timestamp'
              ? prev === 'desc'
                ? 'asc'
                : 'desc'
              : 'desc'
          );
          break;
        case 'y':
          setSortField('type');
          setSortOrder(prev =>
            sortField === 'type' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc'
          );
          break;
        case 'o':
          setSortField('tool');
          setSortOrder(prev =>
            sortField === 'tool' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc'
          );
          break;
        case 's':
          setSortField('session');
          setSortOrder(prev =>
            sortField === 'session'
              ? prev === 'desc'
                ? 'asc'
                : 'desc'
              : 'desc'
          );
          break;
        case 'r':
          setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
          break;
        case 'c':
          setAppliedSearch('');
          break;
        case 'q':
          onBack();
          break;
      }
    },
    { componentId: 'event-inspector', activeModes: ['normal'] }
  );

  // Search mode handler - only active when mode is 'search'
  useSafeInput(
    (input, key) => {
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
    },
    { componentId: 'event-inspector', activeModes: ['search'] }
  );

  const getSortIndicator = (field: SortField) => {
    if (sortField === field) {
      return sortOrder === 'desc' ? '↓' : '↑';
    }
    return '';
  };

  const formatEventDescription = (event: Event) => {
    const args = event.arguments as Record<string, unknown>;

    // Try to get a meaningful description from arguments
    if (args?.file_path) return String(args.file_path);
    if (args?.pattern) return String(args.pattern);
    if (args?.command) return String(args.command);
    if (args?.prompt) return String(args.prompt).slice(0, 60);

    // For tool events, show the tool name
    if (event.toolName) return `${event.toolName} operation`;

    // Default to event type
    return '';
  };

  // Render a single event row
  const renderEvent = (event: Event, _index: number, isSelected: boolean) => {
    const textColor = isSelected ? theme.ui.hover : theme.ui.text;
    const indicator = isSelected ? figures.pointer : ' ';

    // Format fields with proper width
    const time = format(new Date(event.timestamp), 'HH:mm:ss.SSS');
    const type = (event.eventType || '').substring(0, 18).padEnd(18);
    const tool = (event.toolName || '-').substring(0, 18).padEnd(18);
    const desc = formatEventDescription(event);

    return (
      <Box width="100%">
        <Text color={textColor} wrap="truncate">
          {indicator} {time} {type} {tool} {desc}
        </Text>
      </Box>
    );
  };

  // Check server status first
  if (serverStatus !== 'running') {
    return (
      <Box
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        flexGrow={1}
      >
        <Text color={theme.status.warning}>Server is not running</Text>
        <Text color={theme.ui.textMuted}>Start the server to view events</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text color={theme.ui.textMuted}>Loading events...</Text>
      </Box>
    );
  }

  if (realEvents.length === 0) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text color={theme.ui.textMuted}>No events found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Status bar with event count */}
      <Box marginBottom={1} paddingX={1}>
        <Text color={theme.ui.textMuted}>
          {processedEvents.length} events
          {appliedSearch && ` filtered from ${realEvents.length}`}
        </Text>
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
          {'  '}
          {'Time'}
          {sortField === 'timestamp'
            ? sortOrder === 'desc'
              ? ' ↓'
              : ' ↑'
            : '  '}
          {'         '}
          {'Type'}
          {sortField === 'type' ? (sortOrder === 'desc' ? ' ↓' : ' ↑') : '  '}
          {'              '}
          {'Tool'}
          {sortField === 'tool' ? (sortOrder === 'desc' ? ' ↓' : ' ↑') : '  '}
          {'              '}
          {'Description'}
        </Text>
      </Box>

      {/* Event list using LayoutAwareList */}
      <LayoutAwareList
        items={processedEvents}
        renderItem={renderEvent}
        onSelect={(event, index) => {
          onSelectEvent(event, index);
        }}
        keyExtractor={event => event.id}
        emptyMessage="No events to display"
        showScrollbar={true}
        enableWrapAround={true}
        testMode={true} // Enable input without focus check
        initialIndex={initialSelectedIndex}
        localHeightOffset={4 + dynamicOffset} // Status bar (1) + Column headers (1) + margins (2)
      />
    </Box>
  );
};

import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../hooks/useSafeInput';
import { format } from 'date-fns';
import figures from 'figures';
import type { Event } from '../stores/appStore';
import { useTheme } from '../hooks/useTheme';
import { loadRealEvents } from '../utils/real-events';
import { VirtualList } from './VirtualList';

interface EventInspectorProps {
  onSelectEvent: (event: Event, index: number) => void;
  onBack: () => void;
  initialSelectedIndex?: number;
}

type SortField = 'timestamp' | 'type' | 'tool' | 'session';
type SortOrder = 'asc' | 'desc';

export const EventInspector: React.FC<EventInspectorProps> = ({ onSelectEvent, onBack, initialSelectedIndex = 0 }) => {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [realEvents, setRealEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const theme = useTheme();

  // Load real events on component mount
  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true);
        const events = await loadRealEvents();
        setRealEvents(events);
      } catch (error) {
        setRealEvents([]);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  // Sort and filter events
  const processedEvents = useMemo(() => {
    let filtered = [...realEvents];

    // Apply search filter
    if (appliedSearch) {
      filtered = filtered.filter((event) => {
        const searchableContent = [
          event.eventType,
          event.toolName || '',
          JSON.stringify(event.arguments || {}),
          JSON.stringify(event.result || {}),
        ].join(' ').toLowerCase();
        return searchableContent.includes(appliedSearch.toLowerCase());
      });
    }

    // Sort events
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
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

  // Handle keyboard shortcuts when not in VirtualList
  useSafeInput((input, key) => {
    // Handle search mode
    if (searchMode) {
      if (key.return) {
        setAppliedSearch(searchQuery);
        setSearchMode(false);
      } else if (key.escape) {
        setSearchMode(false);
        setSearchQuery('');
      } else if (key.backspace) {
        setSearchQuery(prev => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setSearchQuery(prev => prev + input);
      }
      return;
    }

    // Handle escape to go back
    if (key.escape) {
      onBack();
      return;
    }

    // Sort commands
    switch (input) {
      case '/':
        setSearchMode(true);
        setSearchQuery('');
        break;
      case 't':
        setSortField('timestamp');
        setSortOrder(prev => sortField === 'timestamp' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc');
        break;
      case 'y':
        setSortField('type');
        setSortOrder(prev => sortField === 'type' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc');
        break;
      case 'o':
        setSortField('tool');
        setSortOrder(prev => sortField === 'tool' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc');
        break;
      case 's':
        setSortField('session');
        setSortOrder(prev => sortField === 'session' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc');
        break;
      case 'r':
        setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        break;
      case 'c':
        setAppliedSearch('');
        break;
    }
  });

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
    const desc = formatEventDescription(event).substring(0, 80);

    return (
      <Box width="100%" height={1} overflow="hidden">
        <Text color={textColor}>
          {indicator} {time}  {type}  {tool}  {desc}
        </Text>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text color={theme.ui.textMuted}>
          Loading events...
        </Text>
      </Box>
    );
  }

  if (realEvents.length === 0) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text color={theme.ui.textMuted}>
          No events found
        </Text>
      </Box>
    );
  }

  // Calculate available height
  // The component is already inside FullScreenLayout with header/footer
  // We need to account for: column headers (2 lines), margins (2 lines),
  // and search bar when visible (3 lines)
  const baseOffset = 10; // Safe offset for all UI elements
  const searchOffset = searchMode ? 3 : 0;
  const availableHeight = process.stdout.rows ? Math.max(5, process.stdout.rows - baseOffset - searchOffset) : 15;

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Search bar */}
      {searchMode && (
        <Box marginBottom={1} paddingX={1} borderStyle="single" borderColor={theme.primary.aqua}>
          <Text color={theme.ui.text}>
            Search: {searchQuery}
          </Text>
        </Box>
      )}

      {/* Column headers */}
      <Box paddingX={1} marginBottom={1}>
        <Text color={theme.ui.textMuted} bold>
          {'  Time           Type                Tool                Description'}
        </Text>
      </Box>

      {/* Event list using VirtualList */}
      <VirtualList
        items={processedEvents}
        height={availableHeight}
        renderItem={renderEvent}
        onSelect={(event, index) => {
          onSelectEvent(event, index);
        }}
        keyExtractor={(event) => event.id}
        emptyMessage="No events to display"
        showScrollbar={true}
        enableWrapAround={true}
        testMode={true}  // Enable input without focus check
        initialIndex={initialSelectedIndex}
      />
    </Box>
  );
};
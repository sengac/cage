import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../hooks/useSafeInput';
import { format } from 'date-fns';
import figures from 'figures';
import type { Event } from '../stores/appStore';
import { useAppStore } from '../stores/appStore';
import { useTheme } from '../hooks/useTheme';
import { loadRealEvents } from '../utils/real-events';

interface EventInspectorProps {
  onSelectEvent: (event: Event) => void;
  onBack: () => void;
}

type SortField = 'timestamp' | 'type' | 'tool' | 'session';
type SortOrder = 'asc' | 'desc';

export const EventInspector: React.FC<EventInspectorProps> = ({ onSelectEvent, onBack }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [filterField, setFilterField] = useState<string | null>(null);
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
        // Error is already logged in loadRealEvents
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

  // Reset selection when events change
  React.useEffect(() => {
    if (selectedIndex >= processedEvents.length && processedEvents.length > 0) {
      setSelectedIndex(0);
    }
  }, [processedEvents.length, selectedIndex]);

  useSafeInput((input, key) => {
    if (searchMode) {
      if (key.return) {
        setAppliedSearch(searchQuery);
        setSearchMode(false);
        setSelectedIndex(0);
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

    if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => (prev === 0 ? processedEvents.length - 1 : prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => (prev === processedEvents.length - 1 ? 0 : prev + 1));
    } else if (key.return && processedEvents.length > 0) {
      onSelectEvent(processedEvents[selectedIndex]);
    } else if (input === '/') {
      setSearchMode(true);
      setSearchQuery('');
    } else if (input === 't') {
      setSortField('timestamp');
      setSortOrder(prev => sortField === 'timestamp' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc');
    } else if (input === 'y') {
      setSortField('type');
      setSortOrder(prev => sortField === 'type' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc');
    } else if (input === 'o') {
      setSortField('tool');
      setSortOrder(prev => sortField === 'tool' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc');
    } else if (input === 's') {
      setSortField('session');
      setSortOrder(prev => sortField === 'session' ? (prev === 'desc' ? 'asc' : 'desc') : 'desc');
    } else if (input === 'r') {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else if (input === 'f') {
      // Cycle through filter fields (placeholder)
      setFilterField(prev => prev === null ? 'type' : null);
    } else if (input === 'F') {
      // Clear all filters
      setAppliedSearch('');
      setFilterField(null);
      setSelectedIndex(0);
    }
  });

  const getSortIndicator = (field: SortField) => {
    if (sortField === field) {
      return sortOrder === 'desc' ? '↓' : '↑';
    }
    return '';
  };

  const truncateText = (text: string, maxLength: number): string => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 1);
  };

  const formatEventDescription = (event: Event) => {
    if (event.eventType === 'ToolUse' && event.toolName) {
      const args = event.arguments as Record<string, unknown>;
      if (args?.file_path) {
        return `${args.file_path}`;
      }
      if (args?.pattern) {
        return `${args.pattern}`;
      }
      if (args?.command) {
        return `${args.command}`;
      }
    }
    if (event.eventType === 'UserMessage') {
      const args = event.arguments as Record<string, unknown>;
      return args?.prompt ? String(args.prompt).slice(0, 50) + '...' : 'User input';
    }
    return event.eventType;
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
      <Box marginBottom={1} paddingX={1} width="100%">
        <Text color={theme.ui.text}> </Text>
        <Box width={14} flexShrink={0}>
          <Text color={theme.ui.textMuted} bold>
            Time {getSortIndicator('timestamp')}
          </Text>
        </Box>
        <Box width={20} flexShrink={0}>
          <Text color={theme.ui.textMuted} bold>
            Type {getSortIndicator('type')}
          </Text>
        </Box>
        <Box width={20} flexShrink={0}>
          <Text color={theme.ui.textMuted} bold>
            Tool {getSortIndicator('tool')}
          </Text>
        </Box>
        <Box flexGrow={1}>
          <Text color={theme.ui.textMuted} bold>
            Description
          </Text>
        </Box>
      </Box>

      {/* Event list */}
      <Box flexDirection="column" flexGrow={1}>
        {processedEvents.map((event, index) => {
          const isSelected = index === selectedIndex;
          const textColor = isSelected ? theme.ui.hover : theme.ui.text;
          const indicator = isSelected ? figures.pointer : ' ';

          return (
            <Box key={event.id} paddingX={1} width="100%">
              <Text color={textColor}>{indicator}</Text>
              <Box width={14} flexShrink={0}>
                <Text color={textColor}>
                  {truncateText(format(new Date(event.timestamp), 'HH:mm:ss.SSS'), 13)}
                </Text>
              </Box>
              <Box width={20} flexShrink={0}>
                <Text color={textColor}>
                  {truncateText(event.eventType || '', 19)}
                </Text>
              </Box>
              <Box width={20} flexShrink={0}>
                <Text color={textColor}>
                  {truncateText(event.toolName || '-', 19)}
                </Text>
              </Box>
              <Box flexGrow={1}>
                <Text color={textColor}>
                  {truncateText(formatEventDescription(event), 100)}
                </Text>
              </Box>
            </Box>
          );
        })}
      </Box>

      </Box>
  );
};
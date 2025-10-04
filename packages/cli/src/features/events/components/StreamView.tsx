import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../../../shared/hooks/useSafeInput';
import { format } from 'date-fns';
import figures from 'figures';
import { useAppStore } from '../../../shared/stores/appStore';
import { useTheme } from '../../../core/theme/useTheme';
import type { Event } from '../../../shared/stores/appStore';
import { LayoutAwareList } from '../../../shared/components/ui/LayoutAwareList';
import { useExclusiveInput } from '../../../shared/contexts/InputContext';

interface StreamViewProps {
  onBack: () => void;
  onNavigate?: (view: string) => void;
}

const getEventDescription = (event: Event): string => {
  const args = event.arguments as Record<string, unknown>;

  // Try to get a meaningful description from arguments
  if (args?.file_path) return String(args.file_path);
  if (args?.pattern) return String(args.pattern);
  if (args?.command) return String(args.command);
  if (args?.prompt) return String(args.prompt).slice(0, 60);

  // For tool events, show the tool name + operation
  if (event.toolName) return `${event.toolName} operation`;

  // Default to empty string (not event type)
  return '';
};

export const StreamView: React.FC<StreamViewProps> = ({
  onBack,
  onNavigate,
}) => {
  const events = useAppStore(state => state.events);
  const isStreaming = useAppStore(state => state.isStreaming);
  const selectEvent = useAppStore(state => state.selectEvent);
  const selectedEventIndex = useAppStore(state => state.selectedEventIndex);
  const theme = useTheme();

  const [filterMode, setFilterMode] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');

  const { enterExclusiveMode } = useExclusiveInput('stream-view');
  const releaseFocusRef = useRef<(() => void) | null>(null);

  // Handle entering/exiting filter mode
  useEffect(() => {
    if (filterMode) {
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
  }, [filterMode]);

  // Events are already sorted newest-first in the store
  const filteredEvents = appliedFilter
    ? events.filter(event => {
        const searchableContent = [
          event.eventType,
          event.toolName || '',
          JSON.stringify(event.arguments || {}),
          JSON.stringify(event.result || {}),
        ]
          .join(' ')
          .toLowerCase();
        return searchableContent.includes(appliedFilter.toLowerCase());
      })
    : events;

  // Normal mode handler - only active when mode is 'normal'
  useSafeInput(
    (input, key) => {
      if (key.escape) {
        onBack();
        return;
      }

      switch (input) {
        case '/':
          setFilterMode(true);
          setFilterQuery('');
          break;
        case 'c':
          setAppliedFilter('');
          break;
        case 'q':
          onBack();
          break;
      }
    },
    { componentId: 'stream-view', activeModes: ['normal'] }
  );

  // Search mode handler - only active when mode is 'search'
  useSafeInput(
    (input, key) => {
      if (key.return) {
        setAppliedFilter(filterQuery);
        setFilterMode(false);
        return;
      }
      if (key.escape) {
        setFilterMode(false);
        setFilterQuery('');
        return;
      }
      if (key.backspace || key.delete) {
        setFilterQuery(prev => prev.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && !key.meta) {
        setFilterQuery(prev => prev + input);
        return;
      }
    },
    { componentId: 'stream-view', activeModes: ['search'] }
  );

  const renderEvent = (event: Event, _index: number, isSelected: boolean) => {
    const textColor = isSelected ? theme.ui.hover : theme.ui.text;
    const indicator = isSelected ? figures.pointer : ' ';

    const time = event.timestamp
      ? format(new Date(event.timestamp), 'HH:mm:ss.SSS')
      : 'Invalid';
    const type = (event.eventType || '').substring(0, 18).padEnd(18);
    const tool = (event.toolName || '-').substring(0, 18).padEnd(18);
    const desc = getEventDescription(event).substring(0, 60);

    return (
      <Text color={textColor}>
        {indicator} {time} {type} {tool} {desc}
      </Text>
    );
  };

  const handleSelectEvent = (event: Event) => {
    selectEvent(event, events.indexOf(event));
    if (onNavigate) {
      onNavigate('eventDetail');
    }
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      <Box marginBottom={1} paddingX={1}>
        <Text color={theme.ui.textMuted}>Streaming: </Text>
        <Text color={isStreaming ? theme.status.success : theme.status.warning}>
          {isStreaming ? 'LIVE' : 'CONNECTING...'}
        </Text>
        {isStreaming && (
          <>
            <Text color={theme.ui.textMuted}> </Text>
            <Text color={theme.ui.text}>
              {filteredEvents.length} events{appliedFilter ? ' (filtered)' : ''}
            </Text>
          </>
        )}
        {appliedFilter && (
          <>
            <Text color={theme.ui.textMuted}> Filter: </Text>
            <Text color={theme.primary.aqua}>{appliedFilter}</Text>
          </>
        )}
      </Box>

      {filterMode && (
        <Box
          marginBottom={1}
          paddingX={1}
          borderStyle="single"
          borderColor={theme.primary.aqua}
        >
          <Text color={theme.ui.text}>Filter: {filterQuery}</Text>
        </Box>
      )}

      <Box paddingX={1} marginBottom={1}>
        <Text color={theme.ui.textMuted} bold>
          {
            '  Time           Type                Tool                Description'
          }
        </Text>
      </Box>

      <LayoutAwareList
        items={filteredEvents}
        renderItem={renderEvent}
        onSelect={handleSelectEvent}
        keyExtractor={event => event.id}
        emptyMessage={
          appliedFilter ? 'No events match filter' : 'No events in stream'
        }
        showScrollbar={true}
        enableWrapAround={false}
        testMode={true}
        initialIndex={selectedEventIndex}
        localHeightOffset={filterMode ? 7 : 4}
      />
    </Box>
  );
};

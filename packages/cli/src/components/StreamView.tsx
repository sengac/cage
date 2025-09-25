import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../hooks/useSafeInput';
import { format } from 'date-fns';
import figures from 'figures';
import { useAppStore } from '../stores/appStore';
import { useTheme } from '../hooks/useTheme';
import type { Event } from '../stores/appStore';
import { ResizeAwareList } from './ResizeAwareList';

interface StreamViewProps {
  onBack: () => void;
  onNavigate?: (view: string) => void;
}

export const StreamView: React.FC<StreamViewProps> = ({
  onBack,
  onNavigate,
}) => {
  const streamBuffer = useAppStore(state => state.streamBuffer);
  const isStreaming = useAppStore(state => state.isStreaming);
  const isPaused = useAppStore(state => state.isPaused);
  const newEventCount = useAppStore(state => state.newEventCount);
  const toggleStream = useAppStore(state => state.toggleStream);
  const pauseStream = useAppStore(state => state.pauseStream);
  const selectEvent = useAppStore(state => state.selectEvent);

  const theme = useTheme();

  const [filterMode, setFilterMode] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [lastSelectedIndex, setLastSelectedIndex] = useState(0);

  // Filter events based on applied filter
  const filteredEvents = appliedFilter
    ? streamBuffer.filter(event => {
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
    : streamBuffer;

  // Auto-follow latest event when streaming
  useEffect(() => {
    if (isStreaming && !isPaused && filteredEvents.length > 0) {
      setLastSelectedIndex(filteredEvents.length - 1);
    }
  }, [isStreaming, isPaused, filteredEvents.length]);

  useSafeInput((input, key) => {
    if (filterMode) {
      if (key.return) {
        setAppliedFilter(filterQuery);
        setFilterMode(false);
        setLastSelectedIndex(0);
      } else if (key.escape) {
        setFilterMode(false);
        setFilterQuery('');
      } else if (key.backspace) {
        setFilterQuery(prev => prev.slice(0, -1));
      } else if (input && !key.ctrl && !key.meta) {
        setFilterQuery(prev => prev + input);
      }
      return;
    }

    if (key.escape) {
      onBack();
      return;
    }

    switch (input) {
      case ' ':
        pauseStream();
        break;
      case 's':
        toggleStream();
        break;
      case '/':
        setFilterMode(true);
        setFilterQuery('');
        break;
      case 'c':
        setAppliedFilter('');
        break;
    }
  });

  const getStreamingStatus = () => {
    if (!isStreaming) return 'STOPPED';
    if (isPaused) return 'PAUSED';
    return 'LIVE';
  };

  const getStreamingStatusColor = () => {
    if (!isStreaming) return theme.ui.textMuted;
    if (isPaused) return theme.status.warning;
    return theme.status.success;
  };

  const renderEvent = (event: Event, _index: number, isSelected: boolean) => {
    const textColor = isSelected ? theme.ui.hover : theme.ui.text;
    const indicator = isSelected ? figures.pointer : ' ';

    // Format fields
    const time = format(new Date(event.timestamp), 'HH:mm:ss.SSS');
    const type = (event.eventType || '').substring(0, 18).padEnd(18);
    const tool = (event.toolName || '-').substring(0, 18).padEnd(18);

    // Format description
    let desc = '';
    if (event.eventType === 'ToolUse' && event.toolName) {
      const args = event.arguments as Record<string, unknown>;
      if (args?.file_path) desc = String(args.file_path);
      else if (args?.command) desc = String(args.command);
      else if (args?.pattern) desc = String(args.pattern);
    } else if (event.eventType === 'UserMessage') {
      const args = event.arguments as Record<string, unknown>;
      desc = args?.prompt ? String(args.prompt).slice(0, 50) : 'User input';
    } else {
      desc = event.eventType;
    }

    return (
      <Text color={textColor}>
        {indicator} {time} {type} {tool} {desc.substring(0, 60)}
      </Text>
    );
  };

  const handleSelectEvent = (event: Event, index: number) => {
    setLastSelectedIndex(index);
    selectEvent(event, index);
    if (onNavigate) {
      onNavigate('eventDetail');
    }
  };

  if (!isStreaming && streamBuffer.length === 0) {
    return (
      <Box
        flexDirection="column"
        flexGrow={1}
        justifyContent="center"
        alignItems="center"
      >
        <Text color={theme.ui.textMuted}>
          No events in stream. Press 's' to start streaming.
        </Text>
      </Box>
    );
  }

  // Dynamic offset for filter input
  const dynamicOffset = filterMode ? 3 : 0;

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Status bar */}
      <Box marginBottom={1} paddingX={1}>
        <Text color={theme.ui.textMuted}>Status: </Text>
        <Text color={getStreamingStatusColor()}>{getStreamingStatus()}</Text>
        {isStreaming && (
          <>
            <Text color={theme.ui.textMuted}> Events: </Text>
            <Text color={theme.ui.text}>{filteredEvents.length}</Text>
          </>
        )}
        {newEventCount > 0 && (
          <>
            <Text color={theme.ui.textMuted}> New: </Text>
            <Text color={theme.status.success}>{newEventCount}</Text>
          </>
        )}
        {appliedFilter && (
          <>
            <Text color={theme.ui.textMuted}> Filter: </Text>
            <Text color={theme.primary.aqua}>{appliedFilter}</Text>
          </>
        )}
      </Box>

      {/* Filter input */}
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

      {/* Column headers */}
      <Box paddingX={1} marginBottom={1}>
        <Text color={theme.ui.textMuted} bold>
          {
            '  Time           Type                Tool                Description'
          }
        </Text>
      </Box>

      {/* Events list */}
      <ResizeAwareList
        items={filteredEvents}
        renderItem={renderEvent}
        onSelect={handleSelectEvent}
        onFocus={(_, index) => setLastSelectedIndex(index)}
        keyExtractor={event => event.id}
        emptyMessage="No events match filter"
        showScrollbar={true}
        enableWrapAround={false}
        testMode={true}
        initialIndex={lastSelectedIndex}
        heightOffset={9} // Account for status bar, column headers
        dynamicOffset={dynamicOffset}
      />
    </Box>
  );
};

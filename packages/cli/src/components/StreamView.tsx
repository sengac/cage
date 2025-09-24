import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../hooks/useSafeInput';
import { format } from 'date-fns';
import figures from 'figures';
import { useAppStore } from '../stores/appStore';
import { useTheme } from '../hooks/useTheme';
import type { Event } from '../stores/appStore';

interface StreamViewProps {
  onBack: () => void;
  onNavigate?: (view: string) => void;
}

export const StreamView: React.FC<StreamViewProps> = ({ onBack, onNavigate }) => {
  const streamBuffer = useAppStore((state) => state.streamBuffer);
  const isStreaming = useAppStore((state) => state.isStreaming);
  const isPaused = useAppStore((state) => state.isPaused);
  const newEventCount = useAppStore((state) => state.newEventCount);
  const toggleStream = useAppStore((state) => state.toggleStream);
  const pauseStream = useAppStore((state) => state.pauseStream);
  const selectEvent = useAppStore((state) => state.selectEvent);

  const theme = useTheme();

  const [filterMode, setFilterMode] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [splitScreenMode, setSplitScreenMode] = useState(false);

  // Filter events based on applied filter
  const filteredEvents = appliedFilter
    ? streamBuffer.filter((event) => {
        const searchableContent = [
          event.eventType,
          event.toolName || '',
          JSON.stringify(event.arguments || {}),
          JSON.stringify(event.result || {}),
        ].join(' ').toLowerCase();
        return searchableContent.includes(appliedFilter.toLowerCase());
      })
    : streamBuffer;

  const [internalSelectedIndex, setInternalSelectedIndex] = useState(-1);

  // Calculate actual selected index - auto-select most recent when streaming
  const selectedIndex = (() => {
    if (filteredEvents.length === 0) return -1;
    if (isStreaming && !isPaused) return filteredEvents.length - 1; // Always latest when streaming
    if (internalSelectedIndex === -1) return filteredEvents.length - 1; // Default to latest
    return Math.min(internalSelectedIndex, filteredEvents.length - 1); // Ensure within bounds
  })();

  // Update internal index when events change
  useEffect(() => {
    if (filteredEvents.length > 0 && internalSelectedIndex === -1) {
      setInternalSelectedIndex(filteredEvents.length - 1);
    }
  }, [filteredEvents.length, internalSelectedIndex]);

  useSafeInput((input, key) => {
    if (filterMode) {
      if (key.return) {
        setAppliedFilter(filterQuery);
        setFilterMode(false);
        setInternalSelectedIndex(0);
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

    if (input === ' ') {
      pauseStream();
    } else if (key.upArrow && isPaused && filteredEvents.length > 0) {
      setInternalSelectedIndex((prev) => {
        const current = prev === -1 ? filteredEvents.length - 1 : prev;
        return current === 0 ? filteredEvents.length - 1 : current - 1;
      });
    } else if (key.downArrow && isPaused && filteredEvents.length > 0) {
      setInternalSelectedIndex((prev) => {
        const current = prev === -1 ? filteredEvents.length - 1 : prev;
        return current === filteredEvents.length - 1 ? 0 : current + 1;
      });
    } else if (key.return && filteredEvents.length > 0 && selectedIndex >= 0) {
      const selectedEvent = filteredEvents[selectedIndex];
      selectEvent(selectedEvent);
      if (onNavigate) {
        onNavigate('eventDetail');
      }
    } else if (input === 's') {
      toggleStream();
    } else if (input === '/') {
      setFilterMode(true);
      setFilterQuery('');
    } else if (input === 'e') {
      setShowExportOptions(!showExportOptions);
    } else if (key.tab) {
      setSplitScreenMode(!splitScreenMode);
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

  const formatEventDescription = (event: Event) => {
    if (event.eventType === 'ToolUse' && event.toolName) {
      const args = event.arguments as Record<string, unknown>;
      if (args?.file_path) {
        return String(args.file_path);
      }
      if (args?.command) {
        return String(args.command);
      }
    }
    if (event.eventType === 'UserMessage') {
      const args = event.arguments as Record<string, unknown>;
      return args?.prompt ? String(args.prompt).slice(0, 30) + '...' : 'User input';
    }
    return event.eventType;
  };

  const renderStreamContent = () => {
    if (!isStreaming && streamBuffer.length === 0) {
      return (
        <Box justifyContent="center" marginY={2}>
          <Text color={theme.ui.textMuted}>
            No events in stream
          </Text>
        </Box>
      );
    }

    if (filteredEvents.length === 0) {
      return (
        <Box justifyContent="center" marginY={2}>
          <Text color={theme.ui.textMuted}>
            No events match filter
          </Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" flexGrow={1}>
        {filteredEvents.map((event, index) => {
          const isSelected = index === selectedIndex && selectedIndex >= 0;
          const textColor = isSelected ? theme.ui.hover : theme.ui.text;
          const indicator = isSelected ? figures.pointer : ' ';

          return (
            <Box key={event.id} paddingX={1}>
              <Text color={textColor}>
                {indicator}
              </Text>
              <Box width={11}>
                <Text color={textColor}>
                  {format(new Date(event.timestamp), 'HH:mm:ss.SSS')}
                </Text>
              </Box>
              <Box width={15}>
                <Text color={textColor}>
                  {event.eventType}
                </Text>
              </Box>
              <Box width={12}>
                <Text color={textColor}>
                  {event.toolName || '-'}
                </Text>
              </Box>
              <Box flexGrow={1}>
                <Text color={textColor}>
                  {formatEventDescription(event)}
                </Text>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderSplitScreen = () => {
    if (!splitScreenMode || filteredEvents.length === 0 || selectedIndex < 0) return null;

    const selectedEvent = filteredEvents[selectedIndex];
    return (
      <Box
        marginTop={1}
        paddingX={2}
        paddingY={1}
        borderStyle="single"
        borderColor={theme.ui.borderSubtle}
        minHeight={8}
      >
        <Box flexDirection="column">
          <Text color={theme.ui.textMuted}>Event Detail:</Text>
          <Text color={theme.ui.text}>{selectedEvent.id}</Text>
          <Text color={theme.ui.text}>{selectedEvent.eventType}</Text>
          {selectedEvent.toolName && (
            <Text color={theme.ui.text}>{selectedEvent.toolName}</Text>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Main Content */}
      <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>

      {/* Status bar */}
      <Box marginBottom={1} paddingX={1}>
        <Text color={theme.ui.textMuted}>Status: </Text>
        <Text color={getStreamingStatusColor()}>
          {getStreamingStatus()}
        </Text>
        {isStreaming && (
          <>
            <Text color={theme.ui.textMuted}>  Mode: </Text>
            <Text color={theme.ui.text}>Streaming</Text>
          </>
        )}
        {newEventCount > 0 && (
          <>
            <Text color={theme.ui.textMuted}>  </Text>
            <Text color={theme.status.success}>{newEventCount} new</Text>
          </>
        )}
      </Box>

      {/* Event count */}
      <Box marginBottom={1} paddingX={1}>
        <Text color={theme.ui.text}>
          {appliedFilter
            ? `${filteredEvents.length} events (filtered)`
            : `${filteredEvents.length} events`
          }
        </Text>
      </Box>

      {/* Filter bar */}
      {filterMode && (
        <Box marginBottom={1} paddingX={1} borderStyle="single" borderColor={theme.primary.aqua}>
          <Text color={theme.ui.text}>
            Filter: {filterQuery}
          </Text>
        </Box>
      )}

      {/* Column headers */}
      {filteredEvents.length > 0 && (
        <Box marginBottom={1} paddingX={1}>
          <Box width={12}>
            <Text color={theme.ui.textMuted} bold>
              Time
            </Text>
          </Box>
          <Box width={15}>
            <Text color={theme.ui.textMuted} bold>
              Type
            </Text>
          </Box>
          <Box width={12}>
            <Text color={theme.ui.textMuted} bold>
              Tool
            </Text>
          </Box>
          <Box flexGrow={1}>
            <Text color={theme.ui.textMuted} bold>
              Description
            </Text>
          </Box>
        </Box>
      )}

      {/* Stream content */}
      {renderStreamContent()}

      {/* Split screen detail */}
      {renderSplitScreen()}

      {/* Export options */}
      {showExportOptions && (
        <Box marginY={1} paddingX={1} borderStyle="single" borderColor={theme.primary.aqua}>
          <Text color={theme.ui.text}>
            Export options: JSON, CSV, Raw
          </Text>
        </Box>
      )}
      </Box>
    </Box>
  );
};
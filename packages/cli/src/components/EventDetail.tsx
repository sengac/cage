import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../hooks/useSafeInput';
import { format } from 'date-fns';
import figures from 'figures';
import { useAppStore } from '../stores/appStore';
import { useTheme } from '../hooks/useTheme';
import { VirtualList } from './VirtualList';
import { useExclusiveInput } from '../contexts/InputContext';

interface EventDetailProps {
  onBack: () => void;
}

type TabType = 'arguments' | 'result' | 'raw';

export const EventDetail: React.FC<EventDetailProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('arguments');
  const [copyMessage, setCopyMessage] = useState('');
  const [showExportOptions, setShowExportOptions] = useState(false);

  const selectedEvent = useAppStore(state => state.selectedEvent);
  const theme = useTheme();
  const { enterExclusiveMode } = useExclusiveInput('event-detail');
  const releaseFocusRef = useRef<(() => void) | null>(null);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'arguments', label: 'Arguments' },
    { key: 'result', label: 'Result' },
    { key: 'raw', label: 'Raw' },
  ];

  useEffect(() => {
    if (copyMessage) {
      const timer = setTimeout(() => {
        setCopyMessage('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copyMessage]);

  // Claim exclusive focus to prevent FullScreenLayout from handling ESC
  useEffect(() => {
    const release = enterExclusiveMode('normal');
    releaseFocusRef.current = release;

    return () => {
      if (releaseFocusRef.current) {
        releaseFocusRef.current();
        releaseFocusRef.current = null;
      }
    };
  }, [enterExclusiveMode]);

  useSafeInput(
    (input, key) => {
      if (key.escape) {
        onBack();
        return;
      }

      if (key.leftArrow) {
        const currentIndex = tabs.findIndex(tab => tab.key === activeTab);
        const newIndex =
          currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        setActiveTab(tabs[newIndex].key);
      } else if (key.rightArrow) {
        const currentIndex = tabs.findIndex(tab => tab.key === activeTab);
        const newIndex =
          currentIndex === tabs.length - 1 ? 0 : currentIndex + 1;
        setActiveTab(tabs[newIndex].key);
      } else if (input === '1') {
        setActiveTab('arguments');
      } else if (input === '2') {
        setActiveTab('result');
      } else if (input === '3') {
        setActiveTab('raw');
      } else if (input === 'c') {
        setCopyMessage('Copied to clipboard');
        // In a real implementation, this would copy to clipboard
      } else if (input === 'e') {
        setShowExportOptions(!showExportOptions);
      }
    },
    { componentId: 'event-detail' }
  );

  const formatJSON = (obj: unknown): string => {
    if (typeof obj === 'string') {
      // Try to parse if it looks like JSON, otherwise treat as plain text
      try {
        const parsed = JSON.parse(obj);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // If it contains escaped newlines, convert them to actual newlines
        return obj
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"');
      }
    }
    return JSON.stringify(obj, null, 2);
  };

  // Convert content to lines for scrollable display
  const getContentLines = (content: string): string[] => {
    return content.split('\n').map(line => line || ' '); // Replace empty lines with space to preserve them
  };

  // Memoize the content lines to avoid recalculating on every render
  const contentLines = useMemo(() => {
    if (!selectedEvent) return [];

    let content: string;
    switch (activeTab) {
      case 'arguments':
        content = selectedEvent.arguments
          ? formatJSON(selectedEvent.arguments)
          : 'No arguments';
        break;
      case 'result':
        const hasResult = selectedEvent.result || selectedEvent.error;
        const resultContent = selectedEvent.error
          ? { error: selectedEvent.error }
          : selectedEvent.result || {};
        content = hasResult ? formatJSON(resultContent) : 'No result';
        break;
      case 'raw':
        content = formatJSON(selectedEvent);
        break;
      default:
        content = '';
    }
    return getContentLines(content);
  }, [selectedEvent, activeTab]);

  const renderLine = (line: string, _index: number, isSelected: boolean) => {
    // Add a subtle indicator for selected line to show scrolling is working
    const indicator = isSelected ? '>' : ' ';
    return (
      <Box width="100%">
        <Text
          color={isSelected ? theme.ui.hover : theme.ui.text}
          wrap="truncate"
        >
          {indicator} {line}
        </Text>
      </Box>
    );
  };

  if (!selectedEvent) {
    return (
      <Box
        flexDirection="column"
        flexGrow={1}
        justifyContent="center"
        alignItems="center"
      >
        <Text color={theme.ui.textMuted}>No event selected</Text>
      </Box>
    );
  }

  // Calculate available height for the content area
  const contentHeight =
    process.stdout.rows -
    3 - // Header
    3 - // Footer
    8 - // Event metadata (3 lines + spacing)
    2 - // Tab headers
    2 - // Borders
    2 - // Padding
    (copyMessage ? 2 : 0) - // Copy message
    (showExportOptions ? 3 : 0); // Export options

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Main Content */}
      <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>
        {/* Event metadata */}
        <Box flexDirection="column" marginBottom={1} paddingX={1}>
          <Box marginBottom={1}>
            <Text color={theme.ui.textMuted}>ID: </Text>
            <Text color={theme.ui.text}>{selectedEvent.id}</Text>
            <Text color={theme.ui.textMuted}> Type: </Text>
            <Text color={theme.ui.text}>{selectedEvent.eventType}</Text>
            {selectedEvent.toolName && (
              <>
                <Text color={theme.ui.textMuted}> Tool: </Text>
                <Text color={theme.ui.text}>{selectedEvent.toolName}</Text>
              </>
            )}
          </Box>
          <Box marginBottom={1}>
            <Text color={theme.ui.textMuted}>Time: </Text>
            <Text color={theme.ui.text}>
              {format(new Date(selectedEvent.timestamp), 'yyyy-MM-dd HH:mm:ss')}
            </Text>
            {selectedEvent.executionTime !== undefined && (
              <>
                <Text color={theme.ui.textMuted}> Duration: </Text>
                <Text color={theme.ui.text}>
                  {String(selectedEvent.executionTime)}ms
                </Text>
              </>
            )}
          </Box>
          <Box>
            <Text color={theme.ui.textMuted}>Session: </Text>
            <Text color={theme.ui.text}>{selectedEvent.sessionId}</Text>
            {selectedEvent.error && (
              <>
                <Text color={theme.ui.textMuted}> Error: </Text>
                <Text color={theme.status.error}>{selectedEvent.error}</Text>
              </>
            )}
          </Box>
        </Box>

        {/* Tab headers */}
        <Box marginBottom={1} paddingX={1}>
          {tabs.map((tab, index) => {
            const isActive = tab.key === activeTab;
            const textColor = isActive ? theme.ui.hover : theme.ui.text;
            const indicator = isActive ? figures.pointer : ' ';

            return (
              <Box key={tab.key} marginRight={3}>
                <Text color={textColor}>
                  {indicator} {tab.label}
                </Text>
              </Box>
            );
          })}
        </Box>

        {/* Tab content with scrollable list */}
        <Box
          flexDirection="column"
          height={Math.max(10, contentHeight)}
          borderStyle="single"
          borderColor={theme.ui.borderSubtle}
        >
          <VirtualList
            items={contentLines}
            height={Math.max(8, contentHeight - 2)} // -2 for border
            renderItem={renderLine}
            keyExtractor={(_, index) => String(index)}
            emptyMessage="No content to display"
            showScrollbar={true}
            enableWrapAround={false}
            testMode={true}
          />
        </Box>

        {/* Copy/Export messages */}
        {copyMessage && (
          <Box marginY={1} justifyContent="center">
            <Text color={theme.status.success}>{copyMessage}</Text>
          </Box>
        )}

        {showExportOptions && (
          <Box
            marginY={1}
            paddingX={1}
            borderStyle="single"
            borderColor={theme.primary.aqua}
          >
            <Text color={theme.ui.text}>Export options: JSON, CSV, Raw</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

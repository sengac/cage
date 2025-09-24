import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { format } from 'date-fns';
import figures from 'figures';
import { useAppStore } from '../stores/appStore';
import { useTheme } from '../hooks/useTheme';

interface EventDetailProps {
  onBack: () => void;
}

type TabType = 'arguments' | 'result' | 'raw';

export const EventDetail: React.FC<EventDetailProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('arguments');
  const [copyMessage, setCopyMessage] = useState('');
  const [showExportOptions, setShowExportOptions] = useState(false);

  const selectedEvent = useAppStore((state) => state.selectedEvent);
  const theme = useTheme();

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

  useInput((input, key) => {
    if (key.leftArrow) {
      const currentIndex = tabs.findIndex(tab => tab.key === activeTab);
      const newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
      setActiveTab(tabs[newIndex].key);
    } else if (key.rightArrow) {
      const currentIndex = tabs.findIndex(tab => tab.key === activeTab);
      const newIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1;
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
    } else if (key.escape || input === 'q') {
      onBack();
    }
  });

  const formatJSON = (obj: unknown): string => {
    return JSON.stringify(obj, null, 2);
  };

  const renderTabContent = () => {
    if (!selectedEvent) return null;

    switch (activeTab) {
      case 'arguments':
        return (
          <Box flexDirection="column" paddingX={2} paddingY={1}>
            <Text color={theme.ui.text}>
              {selectedEvent.arguments ? formatJSON(selectedEvent.arguments) : 'No arguments'}
            </Text>
          </Box>
        );

      case 'result':
        const hasResult = selectedEvent.result || selectedEvent.error;
        const resultContent = selectedEvent.error
          ? { error: selectedEvent.error }
          : selectedEvent.result || {};

        return (
          <Box flexDirection="column" paddingX={2} paddingY={1}>
            <Text color={theme.ui.text}>
              {hasResult ? formatJSON(resultContent) : 'No result'}
            </Text>
          </Box>
        );

      case 'raw':
        return (
          <Box flexDirection="column" paddingX={2} paddingY={1}>
            <Text color={theme.ui.text}>
              {formatJSON(selectedEvent)}
            </Text>
          </Box>
        );

      default:
        return null;
    }
  };

  if (!selectedEvent) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        {/* Header */}
        <Box
          paddingX={2}
          borderStyle="round"
          borderColor={theme.ui.borderSubtle}
          justifyContent="space-between"
          minHeight={3}
        >
          <Text color={theme.secondary.blue} bold>
            CAGE | Event Detail
          </Text>
        </Box>
        <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1} justifyContent="center" alignItems="center">
          <Text color={theme.ui.textMuted}>
            No event selected
          </Text>
        </Box>
        <Box
          paddingX={2}
          borderStyle="single"
          borderColor={theme.ui.borderSubtle}
        >
          <Text color={theme.ui.textDim}>
            ESC Back
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Header with event info */}
      <Box
        paddingX={2}
        borderStyle="round"
        borderColor={theme.ui.borderSubtle}
        justifyContent="space-between"
        minHeight={3}
      >
        <Text color={theme.secondary.blue} bold>
          CAGE | Event Detail
        </Text>
        <Text color={theme.ui.textMuted} dimColor>
          {selectedEvent.eventType}
        </Text>
      </Box>

      {/* Main Content */}
      <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>

      {/* Event metadata */}
      <Box flexDirection="column" marginBottom={1} paddingX={1}>
        <Box marginBottom={1}>
          <Text color={theme.ui.textMuted}>ID: </Text>
          <Text color={theme.ui.text}>{selectedEvent.id}</Text>
          <Text color={theme.ui.textMuted}>  Type: </Text>
          <Text color={theme.ui.text}>{selectedEvent.eventType}</Text>
          {selectedEvent.toolName && (
            <>
              <Text color={theme.ui.textMuted}>  Tool: </Text>
              <Text color={theme.ui.text}>{selectedEvent.toolName}</Text>
            </>
          )}
        </Box>
        <Box marginBottom={1}>
          <Text color={theme.ui.textMuted}>Time: </Text>
          <Text color={theme.ui.text}>
            {format(new Date(selectedEvent.timestamp), 'yyyy-MM-dd HH:mm:ss')}
          </Text>
          {selectedEvent.executionTime && (
            <>
              <Text color={theme.ui.textMuted}>  Duration: </Text>
              <Text color={theme.ui.text}>{selectedEvent.executionTime}ms</Text>
            </>
          )}
        </Box>
        <Box>
          <Text color={theme.ui.textMuted}>Session: </Text>
          <Text color={theme.ui.text}>{selectedEvent.sessionId}</Text>
          {selectedEvent.error && (
            <>
              <Text color={theme.ui.textMuted}>  Error: </Text>
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

      {/* Tab content */}
      <Box
        flexDirection="column"
        flexGrow={1}
        borderStyle="single"
        borderColor={theme.ui.borderSubtle}
        minHeight={10}
      >
        {renderTabContent()}
      </Box>

      {/* Copy/Export messages */}
      {copyMessage && (
        <Box marginY={1} justifyContent="center">
          <Text color={theme.status.success}>
            {copyMessage}
          </Text>
        </Box>
      )}

      {showExportOptions && (
        <Box marginY={1} paddingX={1} borderStyle="single" borderColor={theme.primary.aqua}>
          <Text color={theme.ui.text}>
            Export options: JSON, CSV, Raw
          </Text>
        </Box>
      )}
      </Box>

      {/* Footer with shortcuts */}
      <Box
        paddingX={2}
        borderStyle="single"
        borderColor={theme.ui.borderSubtle}
      >
        <Text color={theme.ui.textDim}>
          ← → Switch tabs  c Copy  e Export  ESC Back
        </Text>
      </Box>
    </Box>
  );
};
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../hooks/useSafeInput';
import figures from 'figures';
import { useTheme } from '../hooks/useTheme';
import { getRealHooksStatus } from '../utils/real-hooks';
import type { RealHooksStatus as HooksStatus, Hook } from '../utils/real-hooks';
import { ResizeAwareList } from './ResizeAwareList';

interface HooksConfigurationProps {
  onBack: () => void;
}

export const HooksConfiguration: React.FC<HooksConfigurationProps> = ({ onBack }) => {
  const [realHooksStatus, setRealHooksStatus] = useState<HooksStatus>({
    isInstalled: false,
    installedHooks: [],
    totalEvents: 0
  });

  const [selectedHookIndex, setSelectedHookIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [operationInProgress, setOperationInProgress] = useState(false);
  const [loading, setLoading] = useState(true);

  const theme = useTheme();

  // Load hooks status on mount
  useEffect(() => {
    const loadStatus = async () => {
      setLoading(true);
      try {
        const status = await getRealHooksStatus();
        setRealHooksStatus(status);
      } finally {
        setLoading(false);
      }
    };
    loadStatus();
  }, []);

  // Filter hooks based on search and filter mode
  const filteredHooks = realHooksStatus.installedHooks.filter(hook => {
    const matchesSearch = !searchTerm ||
      hook.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filterMode === 'all' ||
      (filterMode === 'enabled' && hook.enabled) ||
      (filterMode === 'disabled' && !hook.enabled);

    return matchesSearch && matchesFilter;
  });

  // Handle keyboard input
  useSafeInput((input, key) => {
    if (operationInProgress) return;

    if (searchMode) {
      if (key.return) {
        setSearchMode(false);
      } else if (key.escape) {
        setSearchMode(false);
        setSearchTerm('');
      } else if (key.backspace) {
        setSearchTerm(prev => prev.slice(0, -1));
      } else if (input && input.length === 1) {
        setSearchTerm(prev => prev + input);
      }
      return;
    }

    if (key.escape) {
      onBack();
      return;
    }

    switch (input) {
      case ' ':
        if (filteredHooks.length > 0) {
          handleHookAction(filteredHooks[selectedHookIndex], 'toggle');
        }
        break;
      case 'a':
        handleHookAction(null, 'enableAll');
        break;
      case 'd':
        handleHookAction(null, 'disableAll');
        break;
      case 'r':
        handleHookAction(null, 'refresh');
        break;
      case 'v':
        handleHookAction(null, 'verify');
        break;
      case '/':
        setSearchMode(true);
        break;
      case 'f':
        // Cycle through filter modes
        setFilterMode(prev =>
          prev === 'all' ? 'enabled' :
          prev === 'enabled' ? 'disabled' : 'all'
        );
        break;
    }
  });

  const handleHookAction = async (hook: Hook | null, action: string) => {
    if (operationInProgress) return;

    setOperationInProgress(true);
    try {
      // For now, just refresh the status
      // In a real implementation, this would call the appropriate API
      const updatedStatus = await getRealHooksStatus();
      setRealHooksStatus(updatedStatus);
    } finally {
      setOperationInProgress(false);
    }
  };

  const renderHook = (hook: Hook, index: number, isSelected: boolean) => {
    const textColor = isSelected ? theme.ui.hover : theme.ui.text;
    const indicator = isSelected ? figures.pointer : ' ';
    const statusIcon = hook.enabled ? figures.tick : figures.cross;
    const statusColor = hook.enabled ? theme.status.success : theme.status.error;

    return (
      <Text color={textColor}>
        {indicator} <Text color={statusColor}>{statusIcon}</Text> {hook.name.padEnd(30)}
        <Text color={theme.ui.textMuted}>Events: {hook.eventCount || 0}</Text>
      </Text>
    );
  };

  if (loading) {
    return (
      <Box justifyContent="center" alignItems="center" flexGrow={1}>
        <Text color={theme.ui.textMuted}>Loading hooks configuration...</Text>
      </Box>
    );
  }

  if (!realHooksStatus.isInstalled) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text color={theme.status.warning}>⚠ Hooks not installed</Text>
        <Box marginTop={1}>
          <Text color={theme.ui.text}>
            Hooks are not configured. Please run the setup wizard to configure hooks.
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.ui.textMuted}>
            Press 'w' to start the setup wizard or ESC to go back.
          </Text>
        </Box>
      </Box>
    );
  }

  // Dynamic offsets
  const searchOffset = searchMode ? 3 : 0;
  const operationOffset = operationInProgress ? 2 : 0;
  const dynamicOffset = searchOffset + operationOffset;

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Status Bar */}
      <Box marginBottom={1} paddingX={1}>
        <Text color={theme.ui.textMuted}>
          Hooks: {filteredHooks.filter(h => h.enabled).length}/{filteredHooks.length} enabled
        </Text>
        {filterMode !== 'all' && (
          <Text color={theme.primary.aqua}> (Filter: {filterMode})</Text>
        )}
        {searchTerm && (
          <Text color={theme.primary.aqua}> (Search: {searchTerm})</Text>
        )}
      </Box>

      {/* Search Mode */}
      {searchMode && (
        <Box marginBottom={1} paddingX={1} borderStyle="single" borderColor={theme.primary.aqua}>
          <Text color={theme.ui.text}>Search: {searchTerm}</Text>
        </Box>
      )}

      {/* Hooks List */}
      <ResizeAwareList
        items={filteredHooks}
        renderItem={renderHook}
        onSelect={(hook, index) => setSelectedHookIndex(index)}
        keyExtractor={(hook) => hook.name}
        emptyMessage="No hooks found"
        showScrollbar={true}
        enableWrapAround={true}
        testMode={true}
        initialIndex={selectedHookIndex}
        heightOffset={11}  // Account for status bar, help text, and other static elements
        dynamicOffset={dynamicOffset}
      />

      {/* Operation Status */}
      {operationInProgress && (
        <Box marginTop={1} paddingX={1}>
          <Text color={theme.ui.textMuted}>
            Processing...
          </Text>
        </Box>
      )}

      {/* Help Text */}
      <Box marginTop={1} paddingX={1}>
        <Text color={theme.ui.textDim}>
          Space: Toggle | a: Enable All | d: Disable All | r: Refresh | v: Verify | /: Search | f: Filter | ESC: Back
        </Text>
      </Box>
    </Box>
  );
};
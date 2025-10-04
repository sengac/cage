import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../../../shared/hooks/useSafeInput';
import figures from 'figures';
import { useTheme } from '../../../core/theme/useTheme';
import { getRealHooksStatus } from '../utils/real-hooks';
import type { RealHooksStatus as HooksStatus, Hook } from '../utils/real-hooks';
import { LayoutAwareList } from '../../../shared/components/ui/LayoutAwareList';
import { useAppStore } from '../../../shared/stores/appStore';
import { useExclusiveInput } from '../../../shared/contexts/InputContext';

interface HooksConfigurationProps {
  onBack: () => void;
}

export const HooksConfiguration: React.FC<HooksConfigurationProps> = ({
  onBack,
}) => {
  const hooksStatus = useAppStore(state => state.hooksStatus);
  const toggleHook = useAppStore(state => state.toggleHook);
  const installHooks = useAppStore(state => state.installHooks);
  const uninstallHooks = useAppStore(state => state.uninstallHooks);
  const verifyHooks = useAppStore(state => state.verifyHooks);
  const refreshHooksStatus = useAppStore(state => state.refreshHooksStatus);

  const [realHooksStatus, setRealHooksStatus] = useState<HooksStatus>({
    isInstalled: false,
    installedHooks: [],
    totalEvents: 0,
  });

  const [selectedHookIndex, setSelectedHookIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'enabled' | 'disabled'>(
    'all'
  );
  const [operationInProgress, setOperationInProgress] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedHook, setSelectedHook] = useState<Hook | null>(null);
  const [actionAreaFocused, setActionAreaFocused] = useState(false);
  const [selectedActionIndex, setSelectedActionIndex] = useState(0);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [operationStatus, setOperationStatus] = useState<string>('');

  const theme = useTheme();
  const { enterExclusiveMode } = useExclusiveInput('hooks-configuration');
  const searchReleaseFocusRef = useRef<(() => void) | null>(null);
  const wizardReleaseFocusRef = useRef<(() => void) | null>(null);

  // Handle entering/exiting search mode
  useEffect(() => {
    if (searchMode) {
      const release = enterExclusiveMode('search');
      searchReleaseFocusRef.current = release;
    } else if (searchReleaseFocusRef.current) {
      searchReleaseFocusRef.current();
      searchReleaseFocusRef.current = null;
    }

    return () => {
      if (searchReleaseFocusRef.current) {
        searchReleaseFocusRef.current();
      }
    };
  }, [searchMode]);

  // Handle entering/exiting wizard mode
  useEffect(() => {
    if (showWizard) {
      const release = enterExclusiveMode('modal');
      wizardReleaseFocusRef.current = release;
    } else if (wizardReleaseFocusRef.current) {
      wizardReleaseFocusRef.current();
      wizardReleaseFocusRef.current = null;
    }

    return () => {
      if (wizardReleaseFocusRef.current) {
        wizardReleaseFocusRef.current();
      }
    };
  }, [showWizard]);

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
    const matchesSearch =
      !searchTerm || hook.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterMode === 'all' ||
      (filterMode === 'enabled' && hook.enabled) ||
      (filterMode === 'disabled' && !hook.enabled);

    return matchesSearch && matchesFilter;
  });

  const actions = ['Install', 'Uninstall', 'Verify', 'Refresh'];

  // Normal mode handler - only active when mode is 'normal'
  useSafeInput(
    (input, key) => {
      if (operationInProgress) return;

      // Tab navigation between list and action area
      if (key.tab) {
        setActionAreaFocused(!actionAreaFocused);
        if (!actionAreaFocused) {
          setSelectedActionIndex(0);
        }
        return;
      }

      // Handle action area navigation
      if (actionAreaFocused) {
        if (key.rightArrow) {
          setSelectedActionIndex(prev => (prev + 1) % actions.length);
          return;
        }
        if (key.leftArrow) {
          setSelectedActionIndex(
            prev => (prev - 1 + actions.length) % actions.length
          );
          return;
        }
        if (key.return) {
          // Execute action
          switch (actions[selectedActionIndex]) {
            case 'Install':
              handleHookAction(null, 'install');
              break;
            case 'Uninstall':
              handleHookAction(null, 'uninstall');
              break;
            case 'Verify':
              handleHookAction(null, 'verify');
              break;
            case 'Refresh':
              handleHookAction(null, 'refresh');
              break;
          }
          return;
        }
      }

      if (key.escape) {
        if (showDetails) {
          setShowDetails(false);
          setSelectedHook(null);
        } else if (actionAreaFocused) {
          setActionAreaFocused(false);
        } else {
          onBack();
        }
        return;
      }

      if (key.return && !showDetails && !actionAreaFocused) {
        if (filteredHooks.length > 0) {
          setSelectedHook(filteredHooks[selectedHookIndex]);
          setShowDetails(true);
        }
        return;
      }

      switch (input) {
        case ' ':
          if (filteredHooks.length > 0 && !actionAreaFocused) {
            handleHookAction(filteredHooks[selectedHookIndex], 'toggle');
          }
          break;
        case 'q':
          onBack();
          break;
        case 'i':
          handleHookAction(null, 'install');
          break;
        case 'u':
          handleHookAction(null, 'uninstall');
          break;
        case 'w':
          setShowWizard(true);
          setWizardStep(1);
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
            prev === 'all' ? 'enabled' : prev === 'enabled' ? 'disabled' : 'all'
          );
          break;
        case 'c':
          // Clear filter and search
          setFilterMode('all');
          setSearchTerm('');
          break;
      }
    },
    { componentId: 'hooks-configuration', activeModes: ['normal'] }
  );

  // Search mode handler - only active when mode is 'search'
  useSafeInput(
    (input, key) => {
      if (key.return) {
        setSearchMode(false);
        return;
      }
      if (key.escape) {
        setSearchMode(false);
        setSearchTerm('');
        return;
      }
      if (key.backspace || key.delete) {
        setSearchTerm(prev => prev.slice(0, -1));
        return;
      }
      if (input && input.length === 1) {
        setSearchTerm(prev => prev + input);
        return;
      }
    },
    { componentId: 'hooks-configuration', activeModes: ['search'] }
  );

  // Wizard mode handler - only active when mode is 'modal'
  useSafeInput(
    (input, key) => {
      if (key.escape) {
        setShowWizard(false);
        return;
      }
      if (key.rightArrow) {
        setWizardStep(prev => Math.min(prev + 1, 3));
        return;
      }
      if (key.leftArrow) {
        setWizardStep(prev => Math.max(prev - 1, 1));
        return;
      }
      if (key.return && wizardStep === 3) {
        handleHookAction(null, 'install');
        setShowWizard(false);
        return;
      }
    },
    { componentId: 'hooks-configuration', activeModes: ['modal'] }
  );

  const handleHookAction = async (hook: Hook | null, action: string) => {
    if (operationInProgress) return;

    setOperationInProgress(true);
    try {
      switch (action) {
        case 'toggle':
          if (hook) {
            await toggleHook(hook.name);
          }
          break;
        case 'verify':
          setOperationStatus('Verifying hooks...');
          await verifyHooks();
          setOperationStatus('Verification complete');
          break;
        case 'refresh':
          setOperationStatus('Refreshing...');
          await refreshHooksStatus();
          setOperationStatus('');
          break;
        case 'install':
          setOperationStatus('Installing hooks...');
          await installHooks();
          setOperationStatus('Hooks installed successfully');
          break;
        case 'uninstall':
          setOperationStatus('Uninstalling hooks...');
          await uninstallHooks();
          setOperationStatus('Hooks uninstalled');
          break;
      }
      // Refresh display after action
      const updatedStatus = await getRealHooksStatus();
      setRealHooksStatus(updatedStatus);

      // Clear status after 2 seconds
      if (action !== 'refresh') {
        setTimeout(() => setOperationStatus(''), 2000);
      }
    } catch (error) {
      setOperationStatus('Installation failed');
      setTimeout(() => setOperationStatus(''), 2000);
    } finally {
      setOperationInProgress(false);
    }
  };

  const renderHook = (hook: Hook, index: number, isSelected: boolean) => {
    const textColor = isSelected ? theme.ui.hover : theme.ui.text;
    const indicator = isSelected ? figures.pointer : ' ';
    const statusIcon = hook.enabled ? figures.tick : figures.cross;
    const statusColor = hook.enabled
      ? theme.status.success
      : theme.status.error;

    return (
      <Text color={textColor}>
        {indicator} <Text color={statusColor}>{statusIcon}</Text>{' '}
        {hook.name.padEnd(30)}
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
          <Text color={theme.ui.textMuted}>Status: Not Installed</Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.ui.text}>
            No hooks installed. Hooks are not configured. Please run the setup
            wizard to configure hooks.
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.primary.aqua}>Setup Wizard</Text>
          <Text color={theme.ui.textMuted}>
            {' '}
            Press 'w' to start the setup wizard or ESC to go back.
          </Text>
        </Box>
      </Box>
    );
  }

  // Show setup wizard
  if (showWizard) {
    return (
      <Box flexDirection="column" paddingX={2} paddingY={1}>
        <Text color={theme.primary.aqua} bold>
          Setup Wizard
        </Text>
        <Box marginTop={1}>
          <Text color={theme.ui.text}>
            Step {wizardStep} of 3:{' '}
            {wizardStep === 1
              ? 'Check Claude Code installation'
              : wizardStep === 2
                ? 'Configure hook settings'
                : 'Install and verify hooks'}
          </Text>
        </Box>

        <Box marginTop={2}>
          {wizardStep === 1 && (
            <Box flexDirection="column">
              <Text color={theme.ui.textMuted}>
                Checking Claude Code setup...
              </Text>
              <Text color={theme.ui.text}>✓ Claude Code is installed</Text>
              <Text color={theme.ui.text}>✓ .claude directory found</Text>
              <Box marginTop={1}>
                <Text color={theme.ui.textMuted}>Press → to continue</Text>
              </Box>
            </Box>
          )}

          {wizardStep === 2 && (
            <Box flexDirection="column">
              <Text color={theme.ui.textMuted}>
                Configuring hook settings...
              </Text>
              <Text color={theme.ui.text}>• PreToolUse hook</Text>
              <Text color={theme.ui.text}>• PostToolUse hook</Text>
              <Text color={theme.ui.text}>• UserPromptSubmit hook</Text>
              <Box marginTop={1}>
                <Text color={theme.ui.textMuted}>
                  Press → to continue or ← to go back
                </Text>
              </Box>
            </Box>
          )}

          {wizardStep === 3 && (
            <Box flexDirection="column">
              <Text color={theme.ui.textMuted}>Ready to install hooks</Text>
              <Text color={theme.ui.text}>This will:</Text>
              <Text color={theme.ui.text}>
                • Copy hook handler to .claude/hooks/
              </Text>
              <Text color={theme.ui.text}>• Update .claude/settings.json</Text>
              <Text color={theme.ui.text}>• Verify hook configuration</Text>
              <Box marginTop={1}>
                <Text color={theme.primary.aqua}>
                  Press Enter to install or ← to go back
                </Text>
              </Box>
            </Box>
          )}
        </Box>

        <Box marginTop={2}>
          <Text color={theme.ui.textMuted}>Press ESC to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Dynamic offsets
  const searchOffset = searchMode ? 3 : 0;
  const operationOffset = operationInProgress || operationStatus ? 2 : 0;
  const dynamicOffset = searchOffset + operationOffset;

  // Show hook details view
  if (showDetails && selectedHook) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Box flexDirection="column" paddingX={2} paddingY={1}>
          <Text color={theme.primary.aqua} bold>
            Hook Details: {selectedHook.name}
          </Text>

          <Box marginTop={1}>
            <Text color={theme.ui.textMuted}>Status: </Text>
            <Text
              color={
                selectedHook.enabled ? theme.status.success : theme.status.error
              }
            >
              {selectedHook.enabled ? 'Enabled' : 'Disabled'}
            </Text>
          </Box>

          <Box marginTop={1}>
            <Text color={theme.ui.textMuted}>
              Events: {selectedHook.eventCount || 0}
            </Text>
          </Box>

          <Box marginTop={1}>
            <Text color={theme.ui.textMuted} bold>
              Configuration
            </Text>
            <Box marginTop={1}>
              <Text color={theme.ui.text}>
                {JSON.stringify(
                  {
                    name: selectedHook.name,
                    enabled: selectedHook.enabled,
                    eventCount: selectedHook.eventCount,
                  },
                  null,
                  2
                )}
              </Text>
            </Box>
          </Box>

          <Box marginTop={2}>
            <Text color={theme.ui.textMuted}>Press ESC to go back</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Status Bar */}
      <Box marginBottom={1} paddingX={1}>
        <Text color={theme.ui.textMuted}>
          Hooks: {filteredHooks.filter(h => h.enabled).length}/
          {filteredHooks.length} enabled
        </Text>
        <Text color={theme.ui.textMuted}>
          {' '}
          | Total Events: {realHooksStatus.totalEvents}
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
        <Box
          marginBottom={1}
          paddingX={1}
          borderStyle="single"
          borderColor={theme.primary.aqua}
        >
          <Text color={theme.ui.text}>Search: {searchTerm}</Text>
        </Box>
      )}

      {/* Hooks List */}
      <LayoutAwareList
        items={filteredHooks}
        renderItem={renderHook}
        onSelect={(hook, index) => setSelectedHookIndex(index)}
        onFocus={(_, index) => setSelectedHookIndex(index)}
        keyExtractor={hook => hook.name}
        emptyMessage="No hooks found"
        showScrollbar={true}
        enableWrapAround={true}
        testMode={true}
        initialIndex={selectedHookIndex}
        localHeightOffset={3 + dynamicOffset} // Status bar (1) + Action buttons (1) + margin (1) + dynamic
      />

      {/* Operation Status */}
      {(hooksStatus?.isVerifying ||
        hooksStatus?.lastOperation ||
        operationInProgress ||
        operationStatus) && (
        <Box marginTop={1} paddingX={1}>
          <Text
            color={
              hooksStatus?.lastOperation?.success === false
                ? theme.status.error
                : hooksStatus?.lastOperation?.success === true
                  ? theme.status.success
                  : hooksStatus?.isVerifying
                    ? theme.primary.blue
                    : operationStatus.includes('failed')
                      ? theme.status.error
                      : operationStatus.includes('successfully')
                        ? theme.status.success
                        : operationStatus.includes('Installing')
                          ? theme.primary.aqua
                          : operationStatus.includes('Verifying')
                            ? theme.primary.blue
                            : theme.ui.textMuted
            }
          >
            {hooksStatus?.isVerifying
              ? 'Verifying...'
              : hooksStatus?.lastOperation?.message
                ? hooksStatus.lastOperation.message
                : operationStatus || 'Processing...'}
          </Text>
        </Box>
      )}

      {/* Action Buttons */}
      <Box marginTop={1} paddingX={1}>
        {actions.map((action, index) => (
          <Text
            key={action}
            color={
              actionAreaFocused && selectedActionIndex === index
                ? theme.ui.hover
                : theme.ui.text
            }
          >
            {actionAreaFocused && selectedActionIndex === index ? '❯ ' : '  '}
            {action}
            {'  '}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

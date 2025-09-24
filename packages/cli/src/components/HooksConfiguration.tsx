import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../hooks/useSafeInput';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../stores/appStore';
import { getRealHooksStatus, installRealHooks, uninstallRealHooks, verifyRealHooks, type RealHooksStatus } from '../utils/real-hooks';

type FocusArea = 'hooks' | 'actions';
type ActionButton = 'install' | 'uninstall' | 'verify' | 'refresh';

interface HooksConfigurationProps {
  onBack: () => void;
  updateMetadata?: (metadata: { customBackHandler?: boolean }) => void;
}

export const HooksConfiguration: React.FC<HooksConfigurationProps> = ({ onBack, updateMetadata }) => {
  const [selectedHookIndex, setSelectedHookIndex] = useState(0);
  const [focusArea, setFocusArea] = useState<FocusArea>('hooks');
  const [selectedAction, setSelectedAction] = useState<ActionButton>('install');
  const [showHookDetails, setShowHookDetails] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [searchMode, setSearchMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEnabled, setFilterEnabled] = useState(false);
  const [realHooksStatus, setRealHooksStatus] = useState<RealHooksStatus>({
    isInstalled: false,
    installedHooks: [],
    totalEvents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [operationInProgress, setOperationInProgress] = useState(false);

  const theme = useTheme();

  // Load real hooks status on component mount and refresh periodically
  useEffect(() => {
    const loadHooksStatus = async () => {
      try {
        setLoading(true);
        const status = await getRealHooksStatus();
        setRealHooksStatus(status);
      } finally {
        setLoading(false);
      }
    };

    loadHooksStatus();

    // Refresh every 10 seconds
    const interval = setInterval(loadHooksStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update metadata when modal states change to control escape key handling
  useEffect(() => {
    const inModalState = showHookDetails || showSetupWizard || searchMode;
    updateMetadata?.({ customBackHandler: inModalState });
  }, [showHookDetails, showSetupWizard, searchMode, updateMetadata]);

  const actions: ActionButton[] = ['install', 'uninstall', 'verify', 'refresh'];

  // Filter hooks based on search and filter settings
  const filteredHooks = realHooksStatus.installedHooks.filter(hook => {
    if (filterEnabled && !hook.enabled) return false;
    if (searchTerm && !hook.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const selectedHook = filteredHooks[selectedHookIndex] || filteredHooks[0];

  useSafeInput((input, key) => {
    // Handle modal states - when customBackHandler is active, we handle escape ourselves
    if (showSetupWizard) {
      if (key.escape) {
        setShowSetupWizard(false);
      } else if (key.leftArrow) {
        setWizardStep(Math.max(1, wizardStep - 1));
      } else if (key.rightArrow) {
        setWizardStep(Math.min(3, wizardStep + 1));
      } else if (key.return) {
        // Trigger installation from wizard
        handleActionClick('install');
        setShowSetupWizard(false);
      }
      return;
    }

    if (showHookDetails) {
      if (key.escape) {
        setShowHookDetails(false);
      }
      return;
    }

    if (searchMode) {
      if (key.escape) {
        setSearchMode(false);
        setSearchTerm('');
      } else if (key.return) {
        setSearchMode(false);
      } else if (key.backspace) {
        setSearchTerm(prev => prev.slice(0, -1));
      } else if (input && input.length === 1) {
        setSearchTerm(prev => prev + input);
      }
      return;
    }

    // Handle escape key when NOT in modal states - call onBack to return to previous view
    if (key.escape || input === 'q') {
      onBack();
      return;
    }

    if (focusArea === 'hooks') {
      if (key.upArrow || input === 'k') {
        const newIndex = selectedHookIndex === 0 ? filteredHooks.length - 1 : selectedHookIndex - 1;
        setSelectedHookIndex(newIndex);
      } else if (key.downArrow || input === 'j') {
        const newIndex = (selectedHookIndex + 1) % filteredHooks.length;
        setSelectedHookIndex(newIndex);
      } else if (input === ' ') {
        // Space to toggle hook - in this context it means reinstall/verify
        if (selectedHook && !operationInProgress) {
          handleActionClick('verify');
        }
      } else if (key.return) {
        setShowHookDetails(true);
      } else if (key.tab) {
        setFocusArea('actions');
      }
    } else if (focusArea === 'actions') {
      if (key.leftArrow) {
        const currentIndex = actions.indexOf(selectedAction);
        const newIndex = currentIndex === 0 ? actions.length - 1 : currentIndex - 1;
        setSelectedAction(actions[newIndex]);
      } else if (key.rightArrow) {
        const currentIndex = actions.indexOf(selectedAction);
        const newIndex = (currentIndex + 1) % actions.length;
        setSelectedAction(actions[newIndex]);
      } else if (key.return) {
        handleActionClick(selectedAction);
      } else if (key.tab) {
        setFocusArea('hooks');
      }
    }

    // Global shortcuts
    if (input === 'i' && !searchMode && !operationInProgress) {
      handleActionClick('install');
    } else if (input === 'u' && !searchMode && !operationInProgress) {
      handleActionClick('uninstall');
    } else if (input === 'v' && !searchMode && !operationInProgress) {
      handleActionClick('verify');
    } else if (input === 'r' && !searchMode && !operationInProgress) {
      handleActionClick('refresh');
    } else if (input === 'w' && !realHooksStatus.isInstalled) {
      setShowSetupWizard(true);
    } else if (input === '/' && !searchMode) {
      setSearchMode(true);
    } else if (input === 'f' && !searchMode) {
      setFilterEnabled(!filterEnabled);
    } else if (input === 'c' && !searchMode) {
      setFilterEnabled(false);
      setSearchTerm('');
    }
  });

  const handleActionClick = async (action: ActionButton) => {
    if (operationInProgress) return;

    setOperationInProgress(true);

    try {
      let result = { success: false, message: '' };

      switch (action) {
        case 'install':
          setRealHooksStatus(prev => ({ ...prev, isLoading: true }));
          result = await installRealHooks();
          break;
        case 'uninstall':
          setRealHooksStatus(prev => ({ ...prev, isLoading: true }));
          result = await uninstallRealHooks();
          break;
        case 'verify':
          setRealHooksStatus(prev => ({ ...prev, isVerifying: true }));
          result = await verifyRealHooks();
          break;
        case 'refresh':
          // Refresh is handled by reloading the status
          const status = await getRealHooksStatus();
          setRealHooksStatus(status);
          result = { success: true, message: 'Status refreshed' };
          break;
      }

      // Update the status with the operation result
      setRealHooksStatus(prev => ({
        ...prev,
        isLoading: false,
        isVerifying: false,
        lastOperation: result
      }));

      // Reload status after operations that change state
      if (action !== 'refresh' && action !== 'verify') {
        setTimeout(async () => {
          const updatedStatus = await getRealHooksStatus();
          setRealHooksStatus(updatedStatus);
        }, 1000);
      }

    } finally {
      setOperationInProgress(false);
    }
  };

  const getEnabledCount = () => {
    return realHooksStatus.installedHooks.filter(hook => hook.enabled).length;
  };

  const getTotalCount = () => {
    return realHooksStatus.installedHooks.length;
  };

  const renderSetupWizard = () => {
    if (!showSetupWizard) return null;

    return (
      <Box flexDirection="column" marginY={1} paddingX={1}>
        <Text color={theme.primary.aqua} bold>Setup Wizard</Text>
        <Box marginTop={1}>
          <Text color={theme.ui.textMuted}>Step {wizardStep} of 3</Text>
        </Box>
        <Box marginTop={1}>
          {wizardStep === 1 && (
            <Box flexDirection="column">
              <Text color={theme.ui.text}>Step 1: Open Claude Code settings</Text>
              <Text color={theme.ui.textMuted}>Navigate to Claude Code settings.json</Text>
            </Box>
          )}
          {wizardStep === 2 && (
            <Box flexDirection="column">
              <Text color={theme.ui.text}>Step 2: Configure hooks</Text>
              <Text color={theme.ui.textMuted}>Add Cage hooks to your configuration</Text>
            </Box>
          )}
          {wizardStep === 3 && (
            <Box flexDirection="column">
              <Text color={theme.ui.text}>Step 3: Install hooks</Text>
              <Text color={theme.ui.textMuted}>Press Enter to install hooks automatically</Text>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  const renderHookDetails = () => {
    if (!showHookDetails || !selectedHook) return null;

    return (
      <Box flexDirection="column" marginY={1} paddingX={1}>
        <Text color={theme.primary.aqua} bold>Hook Details: {selectedHook.name}</Text>
        <Box marginTop={1}>
          <Text color={theme.ui.textMuted}>Events: </Text>
          <Text color={theme.ui.text}>{selectedHook.eventCount}</Text>
        </Box>
        <Box>
          <Text color={theme.ui.textMuted}>Status: </Text>
          <Text color={selectedHook.enabled ? theme.status.success : theme.status.error}>
            {selectedHook.enabled ? 'Enabled' : 'Disabled'}
          </Text>
        </Box>
        <Box marginTop={1}>
          <Text color={theme.ui.textMuted}>Configuration</Text>
        </Box>
      </Box>
    );
  };

  const renderSearchBar = () => {
    if (!searchMode && !searchTerm) return null;

    return (
      <Box marginY={1} paddingX={1}>
        <Text color={theme.ui.textMuted}>Search: </Text>
        <Text color={theme.ui.text}>{searchTerm}</Text>
        {searchMode && (
          <Text color={theme.ui.textDim}> (Enter to apply, Escape to cancel)</Text>
        )}
      </Box>
    );
  };

  const renderStatusMessages = () => {
    if (loading) {
      return (
        <Box marginY={1} paddingX={1}>
          <Text color={theme.status.warning}>Loading hooks status...</Text>
        </Box>
      );
    }

    if (realHooksStatus.isLoading) {
      return (
        <Box marginY={1} paddingX={1}>
          <Text color={theme.status.warning}>Installing...</Text>
        </Box>
      );
    }

    if (realHooksStatus.isVerifying) {
      return (
        <Box marginY={1} paddingX={1}>
          <Text color={theme.status.warning}>Verifying...</Text>
        </Box>
      );
    }

    if (realHooksStatus.lastOperation) {
      const color = realHooksStatus.lastOperation.success ? theme.status.success : theme.status.error;
      return (
        <Box marginY={1} paddingX={1}>
          <Text color={color}>{realHooksStatus.lastOperation.message}</Text>
        </Box>
      );
    }

    return null;
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Main Content */}
      <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>

      {/* Status messages */}
      {renderStatusMessages()}

      {/* Setup wizard */}
      {renderSetupWizard()}

      {/* Hook details */}
      {renderHookDetails()}

      {/* Search bar */}
      {renderSearchBar()}

      {/* Main content - only show if not in dialog mode */}
      {!showSetupWizard && !showHookDetails && (
        <>
          {/* Installation Status */}
          <Box flexDirection="column" marginBottom={1} paddingX={1}>
            <Text color={theme.ui.textMuted}>
              Status: <Text color={realHooksStatus.isInstalled ? theme.status.success : theme.status.error}>
                {realHooksStatus.isInstalled ? 'Installed' : 'Not Installed'}
              </Text>
            </Text>
            {realHooksStatus.settingsPath && (
              <Text color={theme.ui.textMuted}>
                Settings: <Text color={theme.ui.text}>{realHooksStatus.settingsPath}</Text>
              </Text>
            )}
            {realHooksStatus.backendPort && (
              <Text color={theme.ui.textMuted}>
                Backend Port: <Text color={theme.ui.text}>{realHooksStatus.backendPort}</Text>
              </Text>
            )}
            {realHooksStatus.backendEnabled !== undefined && (
              <Text color={theme.ui.textMuted}>
                Backend: <Text color={realHooksStatus.backendEnabled ? theme.status.success : theme.status.error}>
                  {realHooksStatus.backendEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </Text>
            )}
          </Box>

          {/* Statistics */}
          <Box marginBottom={1} paddingX={1}>
            <Text color={theme.ui.textMuted}>
              Total Events: <Text color={theme.ui.text}>{realHooksStatus.totalEvents}</Text>
            </Text>
            {realHooksStatus.installedHooks.length > 0 && (
              <Text color={theme.ui.textMuted}>
                   Hooks: <Text color={theme.ui.text}>{getEnabledCount()}/{getTotalCount()}</Text>
              </Text>
            )}
          </Box>

          {/* Hooks List or Not Installed Message */}
          {realHooksStatus.isInstalled && filteredHooks.length > 0 ? (
            <Box flexDirection="column" marginBottom={1}>
              {filteredHooks.map((hook, index) => (
                <Box key={hook.name} paddingX={1} marginBottom={1}>
                  <Text color={
                    focusArea === 'hooks' && selectedHookIndex === index
                      ? theme.status.success
                      : theme.ui.text
                  }>
                    {focusArea === 'hooks' && selectedHookIndex === index ? '❯ ' : '  '}
                    {hook.enabled ? '✓' : '✗'} {hook.name}
                  </Text>
                  <Text color={theme.ui.textMuted}> ({hook.eventCount})</Text>
                </Box>
              ))}
            </Box>
          ) : !realHooksStatus.isInstalled ? (
            <Box flexDirection="column" marginBottom={1} paddingX={1}>
              <Text color={theme.ui.textMuted}>No hooks installed</Text>
              <Text color={theme.ui.textDim}>Press i to install or w for Setup Wizard</Text>
            </Box>
          ) : (
            <Box marginBottom={1} paddingX={1}>
              <Text color={theme.ui.textMuted}>No hooks found</Text>
            </Box>
          )}

          {/* Action buttons */}
          <Box marginTop={1} justifyContent="center" gap={2}>
            {actions.map((action) => (
              <Text
                key={action}
                color={
                  operationInProgress
                    ? theme.ui.textMuted
                    : focusArea === 'actions' && selectedAction === action
                    ? theme.status.success
                    : theme.ui.text
                }
              >
                {focusArea === 'actions' && selectedAction === action ? '❯ ' : '  '}
                {action.charAt(0).toUpperCase() + action.slice(1)}
                {operationInProgress && (focusArea === 'actions' && selectedAction === action) ? '...' : ''}
              </Text>
            ))}
          </Box>

        </>
      )}
      </Box>
    </Box>
  );
};
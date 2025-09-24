import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useTheme } from '../hooks/useTheme';
import { useAppStore } from '../stores/appStore';

type FocusArea = 'hooks' | 'actions';
type ActionButton = 'install' | 'uninstall' | 'verify' | 'refresh';

interface Hook {
  name: string;
  enabled: boolean;
  eventCount: number;
}

interface HooksStatus {
  isInstalled: boolean;
  settingsPath?: string;
  backendPort?: number;
  backendEnabled?: boolean;
  installedHooks: Hook[];
  totalEvents: number;
  isLoading?: boolean;
  isVerifying?: boolean;
  lastOperation?: {
    success: boolean;
    message: string;
  };
}

interface HooksConfigurationProps {
  onBack: () => void;
}

export const HooksConfiguration: React.FC<HooksConfigurationProps> = ({ onBack }) => {
  const [selectedHookIndex, setSelectedHookIndex] = useState(0);
  const [focusArea, setFocusArea] = useState<FocusArea>('hooks');
  const [selectedAction, setSelectedAction] = useState<ActionButton>('install');
  const [showHookDetails, setShowHookDetails] = useState(false);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [searchMode, setSearchMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEnabled, setFilterEnabled] = useState(false);

  const theme = useTheme();

  // Get hooks status from store
  const {
    hooksStatus = {
      isInstalled: true,
      settingsPath: '/test/.claude/settings.json',
      backendPort: 3790,
      backendEnabled: true,
      installedHooks: [],
      totalEvents: 0,
    } as HooksStatus,
    refreshHooksStatus = () => {},
    installHooks = () => {},
    uninstallHooks = () => {},
    toggleHook = () => {},
    verifyHooks = () => {},
  } = useAppStore((state) => ({
    hooksStatus: state.hooksStatus,
    refreshHooksStatus: state.refreshHooksStatus,
    installHooks: state.installHooks,
    uninstallHooks: state.uninstallHooks,
    toggleHook: state.toggleHook,
    verifyHooks: state.verifyHooks,
  }));

  const actions: ActionButton[] = ['install', 'uninstall', 'verify', 'refresh'];

  // Filter hooks based on search and filter settings
  const filteredHooks = hooksStatus.installedHooks.filter(hook => {
    if (filterEnabled && !hook.enabled) return false;
    if (searchTerm && !hook.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const selectedHook = filteredHooks[selectedHookIndex] || filteredHooks[0];

  useInput((input, key) => {
    if (showSetupWizard) {
      if (key.escape) {
        setShowSetupWizard(false);
      } else if (key.leftArrow) {
        setWizardStep(Math.max(1, wizardStep - 1));
      } else if (key.rightArrow) {
        setWizardStep(Math.min(3, wizardStep + 1));
      } else if (key.return) {
        // Trigger installation from wizard
        installHooks();
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

    if (focusArea === 'hooks') {
      if (key.upArrow || input === 'k') {
        const newIndex = selectedHookIndex === 0 ? filteredHooks.length - 1 : selectedHookIndex - 1;
        setSelectedHookIndex(newIndex);
      } else if (key.downArrow || input === 'j') {
        const newIndex = (selectedHookIndex + 1) % filteredHooks.length;
        setSelectedHookIndex(newIndex);
      } else if (input === ' ') {
        if (selectedHook) {
          toggleHook(selectedHook.name);
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
    if (input === 'i' && !searchMode) {
      installHooks();
    } else if (input === 'u' && !searchMode) {
      uninstallHooks();
    } else if (input === 'v' && !searchMode) {
      verifyHooks();
    } else if (input === 'r' && !searchMode) {
      refreshHooksStatus();
    } else if (input === 'w' && !hooksStatus.isInstalled) {
      setShowSetupWizard(true);
    } else if (input === '/' && !searchMode) {
      setSearchMode(true);
    } else if (input === 'f' && !searchMode) {
      setFilterEnabled(!filterEnabled);
    } else if (input === 'c' && !searchMode) {
      setFilterEnabled(false);
      setSearchTerm('');
    } else if ((key.escape || input === 'q') && !searchMode) {
      onBack();
    }
  });

  const handleActionClick = (action: ActionButton) => {
    switch (action) {
      case 'install':
        installHooks();
        break;
      case 'uninstall':
        uninstallHooks();
        break;
      case 'verify':
        verifyHooks();
        break;
      case 'refresh':
        refreshHooksStatus();
        break;
    }
  };

  const getEnabledCount = () => {
    return hooksStatus.installedHooks.filter(hook => hook.enabled).length;
  };

  const getTotalCount = () => {
    return hooksStatus.installedHooks.length;
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
    if (hooksStatus.isLoading) {
      return (
        <Box marginY={1} paddingX={1}>
          <Text color={theme.status.warning}>Installing...</Text>
        </Box>
      );
    }

    if (hooksStatus.isVerifying) {
      return (
        <Box marginY={1} paddingX={1}>
          <Text color={theme.status.warning}>Verifying...</Text>
        </Box>
      );
    }

    if (hooksStatus.lastOperation) {
      const color = hooksStatus.lastOperation.success ? theme.status.success : theme.status.error;
      return (
        <Box marginY={1} paddingX={1}>
          <Text color={color}>{hooksStatus.lastOperation.message}</Text>
        </Box>
      );
    }

    return null;
  };

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
          CAGE | Hooks Configuration
        </Text>
        <Text color={theme.ui.textMuted} dimColor>
          {isInstalled ? 'Installed' : 'Not Installed'}
        </Text>
      </Box>

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
              Status: <Text color={hooksStatus.isInstalled ? theme.status.success : theme.status.error}>
                {hooksStatus.isInstalled ? 'Installed' : 'Not Installed'}
              </Text>
            </Text>
            {hooksStatus.settingsPath && (
              <Text color={theme.ui.textMuted}>
                Settings: <Text color={theme.ui.text}>{hooksStatus.settingsPath}</Text>
              </Text>
            )}
            {hooksStatus.backendPort && (
              <Text color={theme.ui.textMuted}>
                Backend Port: <Text color={theme.ui.text}>{hooksStatus.backendPort}</Text>
              </Text>
            )}
            {hooksStatus.backendEnabled !== undefined && (
              <Text color={theme.ui.textMuted}>
                Backend: <Text color={hooksStatus.backendEnabled ? theme.status.success : theme.status.error}>
                  {hooksStatus.backendEnabled ? 'Enabled' : 'Disabled'}
                </Text>
              </Text>
            )}
          </Box>

          {/* Statistics */}
          <Box marginBottom={1} paddingX={1}>
            <Text color={theme.ui.textMuted}>
              Total Events: <Text color={theme.ui.text}>{hooksStatus.totalEvents}</Text>
            </Text>
            {hooksStatus.installedHooks.length > 0 && (
              <Text color={theme.ui.textMuted}>
                   Hooks: <Text color={theme.ui.text}>{getEnabledCount()}/{getTotalCount()}</Text>
              </Text>
            )}
          </Box>

          {/* Hooks List or Not Installed Message */}
          {hooksStatus.isInstalled && filteredHooks.length > 0 ? (
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
          ) : !hooksStatus.isInstalled ? (
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
                  focusArea === 'actions' && selectedAction === action
                    ? theme.status.success
                    : theme.ui.text
                }
              >
                {focusArea === 'actions' && selectedAction === action ? '❯ ' : '  '}
                {action.charAt(0).toUpperCase() + action.slice(1)}
              </Text>
            ))}
          </Box>

        </>
      )}
      </Box>

      {/* Footer */}
      <Box
        paddingX={2}
        borderStyle="single"
        borderColor={theme.ui.borderSubtle}
      >
        <Text color={theme.ui.textDim}>
          ↑↓ Navigate  Space Toggle  ↵ Action  Tab Switch  / Search  f Filter  ESC Back
        </Text>
      </Box>
    </Box>
  );
};
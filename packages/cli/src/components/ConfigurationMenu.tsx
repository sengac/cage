import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../hooks/useSafeInput';
import { useTheme } from '../hooks/useTheme';
import { useSettingsStore } from '../stores/settingsStore';

type ConfigSection = 'theme' | 'server' | 'display' | 'keyBindings';
type FocusArea = 'sections' | 'actions';
type ActionButton = 'apply' | 'cancel' | 'reset' | 'import' | 'export';

interface ConfigurationMenuProps {
  onBack: () => void;
}

export const ConfigurationMenu: React.FC<ConfigurationMenuProps> = ({
  onBack,
}) => {
  const [selectedSection, setSelectedSection] =
    useState<ConfigSection>('theme');
  const [focusArea, setFocusArea] = useState<FocusArea>('sections');
  const [selectedAction, setSelectedAction] = useState<ActionButton>('apply');
  const [editingSection, setEditingSection] = useState<ConfigSection | null>(
    null
  );
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [tempPortValue, setTempPortValue] = useState('');

  const theme = useTheme();
  const {
    settings,
    updateSettings,
    resetSettings,
    exportSettings,
    importSettings,
  } = useSettingsStore();

  // Local state for configuration editing
  const [localSettings, setLocalSettings] = useState(() => {
    return settings
      ? { ...settings }
      : {
          theme: 'dark',
          serverConfig: {
            port: 3790,
            enabled: true,
            autoStart: false,
          },
          displayPreferences: {
            showTimestamps: true,
            dateFormat: 'relative',
            maxEvents: 1000,
          },
          keyBindings: {
            navigation: 'vim',
            customKeys: {},
          },
        };
  });

  const sections: ConfigSection[] = [
    'theme',
    'server',
    'display',
    'keyBindings',
  ];
  const actions: ActionButton[] = [
    'apply',
    'cancel',
    'reset',
    'import',
    'export',
  ];

  useSafeInput((input, key) => {
    if (showExitConfirm) {
      if (input === 'y' || input === 'Y') {
        onBack();
      } else if (input === 'n' || input === 'N' || key.escape) {
        setShowExitConfirm(false);
      }
      return;
    }

    if (showExportDialog) {
      if (key.escape) {
        setShowExportDialog(false);
      }
      return;
    }

    if (showImportDialog) {
      if (key.escape) {
        setShowImportDialog(false);
      }
      return;
    }

    if (editingSection) {
      if (key.escape) {
        setEditingSection(null);
      } else if (editingSection === 'theme') {
        if (key.upArrow || input === 'k') {
          const themes = ['dark', 'light', 'high-contrast'];
          const currentIndex = themes.indexOf(localSettings.theme);
          const newIndex =
            currentIndex === 0 ? themes.length - 1 : currentIndex - 1;
          setLocalSettings(prev => ({ ...prev, theme: themes[newIndex] }));
          setHasUnsavedChanges(true);
        } else if (key.downArrow || input === 'j') {
          const themes = ['dark', 'light', 'high-contrast'];
          const currentIndex = themes.indexOf(localSettings.theme);
          const newIndex = (currentIndex + 1) % themes.length;
          setLocalSettings(prev => ({ ...prev, theme: themes[newIndex] }));
          setHasUnsavedChanges(true);
        } else if (key.return) {
          setEditingSection(null);
        }
      } else if (editingSection === 'server') {
        // Handle port editing
        if (key.backspace || key.delete) {
          setTempPortValue(prev => prev.slice(0, -1));
          setValidationError('');
        } else if (input && /\d/.test(input)) {
          const newPort = tempPortValue + input;
          setTempPortValue(newPort);
          // Validate port
          const portNum = parseInt(newPort, 10);
          if (portNum > 65535) {
            setValidationError('Invalid port number (max 65535)');
          } else {
            setValidationError('');
          }
        } else if (key.return) {
          const portNum = parseInt(tempPortValue, 10);
          if (portNum > 0 && portNum <= 65535) {
            setLocalSettings(prev => ({
              ...prev,
              serverConfig: { ...prev.serverConfig, port: portNum },
            }));
            setHasUnsavedChanges(true);
            setEditingSection(null);
            setTempPortValue('');
            setValidationError('');
          } else {
            setValidationError('Invalid port number');
            // Don't exit edit mode when validation fails
          }
        }
      } else if (editingSection === 'keyBindings') {
        if (key.upArrow || input === 'k') {
          const navStyles = ['vim', 'arrow'];
          const currentIndex = navStyles.indexOf(
            localSettings.keyBindings.navigation
          );
          const newIndex =
            currentIndex === 0 ? navStyles.length - 1 : currentIndex - 1;
          setLocalSettings(prev => ({
            ...prev,
            keyBindings: {
              ...prev.keyBindings,
              navigation: navStyles[newIndex],
            },
          }));
          setHasUnsavedChanges(true);
        } else if (key.downArrow || input === 'j') {
          const navStyles = ['vim', 'arrow'];
          const currentIndex = navStyles.indexOf(
            localSettings.keyBindings.navigation
          );
          const newIndex = (currentIndex + 1) % navStyles.length;
          setLocalSettings(prev => ({
            ...prev,
            keyBindings: {
              ...prev.keyBindings,
              navigation: navStyles[newIndex],
            },
          }));
          setHasUnsavedChanges(true);
        } else if (key.return) {
          setEditingSection(null);
        }
      } else if (key.return) {
        setEditingSection(null);
      }
      return;
    }

    if (focusArea === 'sections') {
      if (key.upArrow || input === 'k') {
        const currentIndex = sections.indexOf(selectedSection);
        const newIndex =
          currentIndex === 0 ? sections.length - 1 : currentIndex - 1;
        setSelectedSection(sections[newIndex]);
      } else if (key.downArrow || input === 'j') {
        const currentIndex = sections.indexOf(selectedSection);
        const newIndex = (currentIndex + 1) % sections.length;
        setSelectedSection(sections[newIndex]);
      } else if (key.return) {
        setEditingSection(selectedSection);
        // If entering server section, initialize temp port value
        if (selectedSection === 'server') {
          setTempPortValue(localSettings.serverConfig.port.toString());
        }
      } else if (key.tab) {
        setFocusArea('actions');
      }
    } else if (focusArea === 'actions') {
      if (key.leftArrow) {
        const currentIndex = actions.indexOf(selectedAction);
        const newIndex =
          currentIndex === 0 ? actions.length - 1 : currentIndex - 1;
        setSelectedAction(actions[newIndex]);
      } else if (key.rightArrow) {
        const currentIndex = actions.indexOf(selectedAction);
        const newIndex = (currentIndex + 1) % actions.length;
        setSelectedAction(actions[newIndex]);
      } else if (key.return) {
        handleActionClick(selectedAction);
      } else if (key.tab) {
        setFocusArea('sections');
      }
    }

    // Global shortcuts
    if (input === 's' && !editingSection) {
      handleActionClick('apply');
    } else if (input === 'r' && !editingSection) {
      handleActionClick('reset');
    }
    // ESC/q handled by FullScreenLayout, not here
    // Note: unsaved changes warning should be handled differently
  });

  const handleActionClick = (action: ActionButton) => {
    switch (action) {
      case 'apply':
        updateSettings(localSettings);
        setHasUnsavedChanges(false);
        setSuccessMessage('Settings saved');
        setTimeout(() => setSuccessMessage(''), 2000);
        break;
      case 'cancel':
        onBack();
        break;
      case 'reset':
        resetSettings();
        // Reset to default settings
        const defaultSettings = {
          theme: 'dark',
          serverConfig: {
            port: 3790,
            enabled: true,
            autoStart: false,
          },
          displayPreferences: {
            showTimestamps: true,
            dateFormat: 'relative',
            maxEvents: 1000,
          },
          keyBindings: {
            navigation: 'vim',
            customKeys: {},
          },
        };
        setLocalSettings(defaultSettings);
        setHasUnsavedChanges(false);
        setSuccessMessage('Settings reset');
        setTimeout(() => setSuccessMessage(''), 2000);
        break;
      case 'export':
        setShowExportDialog(true);
        break;
      case 'import':
        setShowImportDialog(true);
        break;
    }
  };

  const getSectionDisplay = (section: ConfigSection): string => {
    switch (section) {
      case 'theme':
        return `Theme: ${localSettings.theme}`;
      case 'server':
        return `Server - Port: ${localSettings.serverConfig.port}, Enabled: ${localSettings.serverConfig.enabled ? 'Yes' : 'No'}, Auto Start: ${localSettings.serverConfig.autoStart ? 'Yes' : 'No'}`;
      case 'display':
        return `Display - Timestamps: ${localSettings.displayPreferences.showTimestamps ? 'Yes' : 'No'}, Date Format: ${localSettings.displayPreferences.dateFormat}, Max Events: ${localSettings.displayPreferences.maxEvents}`;
      case 'keyBindings':
        return `Key Bindings - Navigation: ${localSettings.keyBindings.navigation}`;
    }
  };

  const getSectionTitle = (section: ConfigSection): string => {
    switch (section) {
      case 'theme':
        return 'Theme';
      case 'server':
        return 'Server';
      case 'display':
        return 'Display';
      case 'keyBindings':
        return 'Key Bindings';
    }
  };

  const renderEditingSection = () => {
    if (!editingSection) return null;

    switch (editingSection) {
      case 'theme':
        return (
          <Box flexDirection="column" marginY={1} paddingX={1}>
            <Text color={theme.primary.aqua} bold>
              Select Theme
            </Text>
            <Box marginTop={1} flexDirection="column">
              <Text
                color={
                  localSettings.theme === 'dark'
                    ? theme.status.success
                    : theme.ui.text
                }
              >
                {localSettings.theme === 'dark' ? '❯ ' : '  '}Dark
              </Text>
              <Text
                color={
                  localSettings.theme === 'light'
                    ? theme.status.success
                    : theme.ui.text
                }
              >
                {localSettings.theme === 'light' ? '❯ ' : '  '}Light
              </Text>
              <Text
                color={
                  localSettings.theme === 'high-contrast'
                    ? theme.status.success
                    : theme.ui.text
                }
              >
                {localSettings.theme === 'high-contrast' ? '❯ ' : '  '}High
                Contrast
              </Text>
            </Box>
          </Box>
        );
      case 'server':
        return (
          <Box flexDirection="column" marginY={1} paddingX={1}>
            <Text color={theme.primary.aqua} bold>
              Server Configuration
            </Text>
            <Box marginTop={1}>
              <Text color={theme.ui.textMuted}>Port: </Text>
              <Text color={theme.ui.text}>
                {tempPortValue || localSettings.serverConfig.port}
              </Text>
            </Box>
            {validationError && (
              <Box marginTop={1}>
                <Text color={theme.status.error}>Invalid port</Text>
              </Box>
            )}
            <Box marginTop={1}>
              <Text color={theme.ui.textMuted}>
                Press Enter to save, Escape to cancel
              </Text>
            </Box>
          </Box>
        );
      case 'display':
        return (
          <Box flexDirection="column" marginY={1} paddingX={1}>
            <Text color={theme.primary.aqua} bold>
              Display Preferences
            </Text>
            <Box marginTop={1}>
              <Text color={theme.ui.textMuted}>Show Timestamps: </Text>
              <Text color={theme.ui.text}>
                {localSettings.displayPreferences.showTimestamps ? 'Yes' : 'No'}
              </Text>
            </Box>
            <Box>
              <Text color={theme.ui.textMuted}>Date Format: </Text>
              <Text color={theme.ui.text}>
                {localSettings.displayPreferences.dateFormat}
              </Text>
            </Box>
          </Box>
        );
      case 'keyBindings':
        return (
          <Box flexDirection="column" marginY={1} paddingX={1}>
            <Text color={theme.primary.aqua} bold>
              Key Bindings
            </Text>
            <Box marginTop={1} flexDirection="column">
              <Text
                color={
                  localSettings.keyBindings.navigation === 'vim'
                    ? theme.status.success
                    : theme.ui.text
                }
              >
                {localSettings.keyBindings.navigation === 'vim' ? '❯ ' : '  '}
                vim
              </Text>
              <Text
                color={
                  localSettings.keyBindings.navigation === 'arrow'
                    ? theme.status.success
                    : theme.ui.text
                }
              >
                {localSettings.keyBindings.navigation === 'arrow' ? '❯ ' : '  '}
                arrow
              </Text>
            </Box>
          </Box>
        );
    }
  };

  const renderExitConfirmDialog = () => {
    if (!showExitConfirm) return null;

    return (
      <Box flexDirection="column" marginY={1} paddingX={1}>
        <Text color={theme.status.warning}>
          You have unsaved changes. Exit anyway? (y/N)
        </Text>
      </Box>
    );
  };

  const renderExportDialog = () => {
    if (!showExportDialog) return null;

    return (
      <Box flexDirection="column" marginY={1} paddingX={1}>
        <Text color={theme.primary.aqua} bold>
          Export Settings
        </Text>
        <Box marginTop={1}>
          <Text color={theme.ui.textMuted}>
            Settings will be exported to clipboard
          </Text>
        </Box>
      </Box>
    );
  };

  const renderImportDialog = () => {
    if (!showImportDialog) return null;

    return (
      <Box flexDirection="column" marginY={1} paddingX={1}>
        <Text color={theme.primary.aqua} bold>
          Import Settings
        </Text>
        <Box marginTop={1}>
          <Text color={theme.ui.textMuted}>Paste settings JSON to import</Text>
        </Box>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Main Content */}
      <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>
        {/* Success message */}
        {successMessage && (
          <Box marginBottom={1} paddingX={1}>
            <Text color={theme.status.success}>{successMessage}</Text>
          </Box>
        )}

        {/* Exit confirmation dialog */}
        {renderExitConfirmDialog()}

        {/* Export dialog */}
        {renderExportDialog()}

        {/* Import dialog */}
        {renderImportDialog()}

        {/* Editing section dialog */}
        {renderEditingSection()}

        {/* Main content - only show if not in dialog mode */}
        {!editingSection &&
          !showExitConfirm &&
          !showExportDialog &&
          !showImportDialog && (
            <>
              {/* Configuration sections */}
              <Box flexDirection="column" marginBottom={1}>
                {sections.map(section => (
                  <Box key={section} paddingX={1} marginBottom={1}>
                    <Text
                      color={
                        focusArea === 'sections' && selectedSection === section
                          ? theme.status.success
                          : theme.ui.text
                      }
                    >
                      {focusArea === 'sections' && selectedSection === section
                        ? '❯ '
                        : '  '}
                      {getSectionTitle(section)}
                    </Text>
                    <Box marginLeft={4}>
                      <Text color={theme.ui.textMuted}>
                        {getSectionDisplay(section)}
                      </Text>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Action buttons */}
              <Box marginTop={1} justifyContent="center" gap={2}>
                {actions.map(action => (
                  <Text
                    key={action}
                    color={
                      focusArea === 'actions' && selectedAction === action
                        ? theme.status.success
                        : theme.ui.text
                    }
                  >
                    {focusArea === 'actions' && selectedAction === action
                      ? '❯ '
                      : '  '}
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </Text>
                ))}
              </Box>
            </>
          )}
      </Box>
    </Box>
  );
};

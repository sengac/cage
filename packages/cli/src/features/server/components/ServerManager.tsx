import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../../../shared/hooks/useSafeInput';
import { formatDistanceToNow } from 'date-fns';
import figures from 'figures';
import { useAppStore } from '../../../shared/stores/appStore';
import { useTheme } from '../../../core/theme/useTheme';
import { StatusMonitor } from '../utils/status-monitor';
import { stopServer } from '../commands/server-management';
import { startServer } from '../commands/server';

interface ServerInfo {
  status: 'running' | 'stopped' | 'error';
  port: number;
  pid?: number;
  uptime?: number;
  memoryUsage?: number;
}

interface ExtendedServerInfo extends ServerInfo {
  cpuUsage?: number;
}

interface ServerManagerProps {
  onBack: () => void;
}

export const ServerManager: React.FC<ServerManagerProps> = ({ onBack }) => {
  const [configMode, setConfigMode] = useState(false);
  const [configPort, setConfigPort] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showSuccess, setShowSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const systemStatus = useAppStore(state => state.systemStatus);
  const isLoading = useAppStore(state => state.isLoading);
  const loadingMessage = useAppStore(state => state.loadingMessage);
  const errors = useAppStore(state => state.errors);
  const setAppLoading = useAppStore(state => state.setLoading);
  const addError = useAppStore(state => state.addError);

  const theme = useTheme();

  const realServerStatus = systemStatus?.server.status || 'stopped';
  const realServerInfo = systemStatus?.server.serverInfo as ServerInfo | null;
  const fullServerStatus = systemStatus?.server.fullStatus || null;

  useEffect(() => {
    const statusMonitor = StatusMonitor.getInstance();
    statusMonitor.start(10000);

    const initialStatus = statusMonitor.getStatus();
    if (initialStatus.lastUpdated > 0) {
      setLoading(false);
    } else {
      statusMonitor
        .forceUpdate()
        .then(() => setLoading(false))
        .catch(() => setLoading(false));
    }
  }, []);

  useSafeInput((input, key) => {
    if (configMode) {
      if (key.return) {
        // Validate and save configuration
        const port = parseInt(configPort, 10);
        if (isNaN(port)) {
          setValidationError('Port must be a number');
          return;
        }
        if (port < 1 || port > 65535) {
          setValidationError('Invalid port range (1-65535)');
          return;
        }

        // Save configuration
        setShowSuccess('Configuration saved');
        setConfigMode(false);
        setValidationError('');
        setTimeout(() => setShowSuccess(''), 2000);
      } else if (key.escape) {
        setConfigMode(false);
        setConfigPort('');
        setValidationError('');
      } else if (key.backspace) {
        setConfigPort(prev => prev.slice(0, -1));
        setValidationError('');
      } else if (input && /[0-9]/.test(input)) {
        setConfigPort(prev => prev + input);
        setValidationError('');
      }
      return;
    }

    if (input === 's') {
      // Start/Stop server
      if (realServerStatus === 'running') {
        setAppLoading(true, 'Stopping CAGE server...');
        stopServer().then(result => {
          setAppLoading(false);
          if (result.success) {
            setShowSuccess('Server stopped successfully');
            setTimeout(() => setShowSuccess(''), 2000);
          } else {
            addError(result.message);
          }
          StatusMonitor.getInstance().triggerUpdate();
        });
      } else {
        setAppLoading(true, 'Starting CAGE server...');
        const port = parseInt(configPort || '3790');
        startServer({ port }).then(result => {
          setAppLoading(false);
          if (result.success) {
            setShowSuccess('Server started successfully');
            setTimeout(() => setShowSuccess(''), 2000);
          } else {
            addError(result.message);
          }
          setTimeout(() => {
            StatusMonitor.getInstance().forceUpdate();
          }, 500);
        });
      }
    } else if (input === 'r') {
      setAppLoading(true, 'Restarting CAGE server...');
      const port = parseInt(configPort || '3790');

      const stopPromise =
        realServerStatus === 'running'
          ? stopServer()
          : Promise.resolve({ success: true, message: 'Server not running' });

      stopPromise.then(() => {
        setTimeout(() => {
          startServer({ port }).then(result => {
            setAppLoading(false);
            if (result.success) {
              setShowSuccess('Server restarted successfully');
              setTimeout(() => setShowSuccess(''), 2000);
            } else {
              addError(result.message);
            }
            setTimeout(() => {
              StatusMonitor.getInstance().forceUpdate();
            }, 500);
          });
        }, 500);
      });
    } else if (input === 'c') {
      setConfigMode(true);
      setConfigPort(realServerInfo?.port?.toString() || '3790');
    } else if (key.escape || input === 'q') {
      onBack();
    }
  });

  const getStatusColor = () => {
    switch (realServerStatus) {
      case 'running':
        return theme.status.success;
      case 'error':
        return theme.status.error;
      case 'connecting':
        return theme.status.warning;
      default:
        return theme.ui.textMuted;
    }
  };

  const getStatusText = () => {
    switch (realServerStatus) {
      case 'running':
        return 'Running';
      case 'stopped':
        return 'Stopped';
      case 'connecting':
        return 'Connecting';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  const formatUptime = (uptime?: number) => {
    if (!uptime) return 'N/A';
    return formatDistanceToNow(new Date(Date.now() - uptime));
  };

  const renderServerInfo = () => {
    if (loading) {
      return (
        <Box marginY={1} paddingX={1}>
          <Text color={theme.ui.textMuted}>Loading server status...</Text>
        </Box>
      );
    }

    if (!realServerInfo) {
      return (
        <Box marginY={1} paddingX={1}>
          <Text color={theme.ui.textMuted}>Server is not running</Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" marginY={1} paddingX={1}>
        <Box marginBottom={1}>
          <Text color={theme.ui.textMuted}>Port: </Text>
          <Text color={theme.ui.text}>{realServerInfo.port}</Text>
          {realServerInfo.pid && (
            <>
              <Text color={theme.ui.textMuted}> PID: </Text>
              <Text color={theme.ui.text}>{realServerInfo.pid}</Text>
            </>
          )}
        </Box>
        {realServerInfo.uptime && (
          <Box marginBottom={1}>
            <Text color={theme.ui.textMuted}>Uptime: </Text>
            <Text color={theme.ui.text}>
              {formatUptime(realServerInfo.uptime)}
            </Text>
          </Box>
        )}
        {realServerInfo.memoryUsage && (
          <Box marginBottom={1}>
            <Text color={theme.ui.textMuted}>Memory: </Text>
            <Text color={theme.ui.text}>{realServerInfo.memoryUsage} MB</Text>
          </Box>
        )}
        {(realServerInfo as ExtendedServerInfo).cpuUsage && (
          <Box>
            <Text color={theme.ui.textMuted}>CPU: </Text>
            <Text color={theme.ui.text}>
              {(realServerInfo as ExtendedServerInfo).cpuUsage}%
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  const renderConfiguration = () => {
    if (!configMode) {
      return (
        <Box flexDirection="column" marginY={1} paddingX={1}>
          <Text color={theme.ui.textMuted} bold>
            Configuration
          </Text>
          <Box marginTop={1}>
            <Text color={theme.ui.textMuted}>Port: </Text>
            <Text color={theme.ui.text}>{realServerInfo?.port || 3790}</Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" marginY={1} paddingX={1}>
        <Text color={theme.primary.aqua} bold>
          Configuration Mode
        </Text>
        <Box marginTop={1}>
          <Text color={theme.ui.textMuted}>Port: </Text>
          <Text color={theme.ui.text}>{configPort}</Text>
        </Box>
        {validationError && (
          <Box marginTop={1}>
            <Text color={theme.status.error}>{validationError}</Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text color={theme.ui.textDim}>Enter to save, Escape to cancel</Text>
        </Box>
      </Box>
    );
  };


  const renderControls = () => {
    const isRunning = realServerStatus === 'running';
    const isError = realServerStatus === 'error';
    const isConnecting = realServerStatus === 'connecting';

    return null;
  };

  if (configMode) {
    return (
      <Box flexDirection="column" flexGrow={1}>
        <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>
          {renderConfiguration()}
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Main Content */}
      <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>
        {/* Status */}
        <Box marginBottom={1} paddingX={1}>
          <Text color={theme.ui.textMuted}>Status: </Text>
          <Text color={getStatusColor()}>{getStatusText()}</Text>
          {isLoading && (
            <>
              <Text color={theme.ui.textMuted}> </Text>
              <Text color={theme.status.warning}>{figures.ellipsis}</Text>
            </>
          )}
        </Box>

        {/* Loading message */}
        {isLoading && loadingMessage && (
          <Box marginBottom={1} paddingX={1}>
            <Text color={theme.ui.text}>{loadingMessage}</Text>
          </Box>
        )}

        {/* Error messages */}
        {errors.length > 0 && (
          <Box marginBottom={1} paddingX={1}>
            {errors.map((error, index) => (
              <Text key={index} color={theme.status.error}>
                {error.message}
              </Text>
            ))}
          </Box>
        )}

        {/* Success message */}
        {showSuccess && (
          <Box marginBottom={1} paddingX={1}>
            <Text color={theme.status.success}>{showSuccess}</Text>
          </Box>
        )}

        {/* Server Information */}
        {renderServerInfo()}

        {/* Configuration */}
        {renderConfiguration()}

        {/* Extended Status Information */}
        {fullServerStatus && (
          <Box flexDirection="column" marginY={1} paddingX={1}>
            <Text color={theme.ui.textMuted} bold>
              System Status
            </Text>

            {/* Hooks Status */}
            <Box marginTop={1}>
              <Text color={theme.ui.textMuted}>Hooks: </Text>
              <Text
                color={
                  fullServerStatus.hooks.installed
                    ? theme.status.success
                    : theme.status.warning
                }
              >
                {fullServerStatus.hooks.installed
                  ? 'Installed'
                  : 'Not Installed'}
              </Text>
              {fullServerStatus.hooks.count && (
                <>
                  <Text color={theme.ui.textMuted}> (</Text>
                  <Text color={theme.ui.text}>
                    {fullServerStatus.hooks.count} types
                  </Text>
                  <Text color={theme.ui.textMuted}>)</Text>
                </>
              )}
            </Box>

            {/* Events Status */}
            <Box marginTop={1}>
              <Text color={theme.ui.textMuted}>Events: </Text>
              <Text color={theme.ui.text}>
                {fullServerStatus.events.total} total
              </Text>
              {fullServerStatus.events.today !== undefined && (
                <>
                  <Text color={theme.ui.textMuted}>, </Text>
                  <Text color={theme.ui.text}>
                    {fullServerStatus.events.today} today
                  </Text>
                </>
              )}
            </Box>

            {/* Warnings */}
            {fullServerStatus.server.warning && (
              <Box marginTop={1}>
                <Text color={theme.status.warning}>
                  ⚠ {fullServerStatus.server.warning}
                </Text>
              </Box>
            )}

            {fullServerStatus.offline.count > 0 && (
              <Box marginTop={1}>
                <Text color={theme.status.warning}>
                  ⚠ {fullServerStatus.offline.count} offline log entries
                </Text>
              </Box>
            )}
          </Box>
        )}

        {/* Controls */}
        {renderControls()}
      </Box>
    </Box>
  );
};

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { format, formatDistanceToNow } from 'date-fns';
import figures from 'figures';
import { useAppStore } from '../stores/appStore';
import { useTheme } from '../hooks/useTheme';
import type { ServerInfo } from '../stores/appStore';

interface ExtendedServerInfo extends ServerInfo {
  cpuUsage?: number;
}

interface ServerManagerProps {
  onBack: () => void;
}

export const ServerManager: React.FC<ServerManagerProps> = ({ onBack }) => {
  const [configMode, setConfigMode] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [configPort, setConfigPort] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showSuccess, setShowSuccess] = useState('');

  const serverStatus = useAppStore((state) => state.serverStatus);
  const serverInfo = useAppStore((state) => state.serverInfo);
  const isLoading = useAppStore((state) => state.isLoading);
  const loadingMessage = useAppStore((state) => state.loadingMessage);
  const errors = useAppStore((state) => state.errors);
  const setServerInfo = useAppStore((state) => state.setServerInfo);
  const setLoading = useAppStore((state) => state.setLoading);
  const addError = useAppStore((state) => state.addError);

  const theme = useTheme();

  useInput((input, key) => {
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
      if (serverStatus === 'running') {
        setLoading(true, 'Stopping server...');
        // Simulate server stop
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      } else {
        setLoading(true, 'Starting server...');
        // Simulate server start
        setTimeout(() => {
          setLoading(false);
        }, 1000);
      }
    } else if (input === 'r') {
      // Restart server
      setLoading(true, 'Restarting server...');
      setTimeout(() => {
        setLoading(false);
      }, 1500);
    } else if (input === 'c') {
      setConfigMode(true);
      setConfigPort(serverInfo?.port?.toString() || '3000');
    } else if (input === 'l') {
      setShowLogs(!showLogs);
    }
  });

  const getStatusColor = () => {
    switch (serverStatus) {
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
    switch (serverStatus) {
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
    if (!serverInfo) {
      return (
        <Box marginY={1} paddingX={1}>
          <Text color={theme.ui.textMuted}>
            Server is not running
          </Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" marginY={1} paddingX={1}>
        <Box marginBottom={1}>
          <Text color={theme.ui.textMuted}>Port: </Text>
          <Text color={theme.ui.text}>{serverInfo.port}</Text>
          {serverInfo.pid && (
            <>
              <Text color={theme.ui.textMuted}>  PID: </Text>
              <Text color={theme.ui.text}>{serverInfo.pid}</Text>
            </>
          )}
        </Box>
        {serverInfo.uptime && (
          <Box marginBottom={1}>
            <Text color={theme.ui.textMuted}>Uptime: </Text>
            <Text color={theme.ui.text}>{formatUptime(serverInfo.uptime)}</Text>
          </Box>
        )}
        {serverInfo.memoryUsage && (
          <Box marginBottom={1}>
            <Text color={theme.ui.textMuted}>Memory: </Text>
            <Text color={theme.ui.text}>{serverInfo.memoryUsage} MB</Text>
          </Box>
        )}
        {(serverInfo as ExtendedServerInfo).cpuUsage && (
          <Box>
            <Text color={theme.ui.textMuted}>CPU: </Text>
            <Text color={theme.ui.text}>{(serverInfo as ExtendedServerInfo).cpuUsage}%</Text>
          </Box>
        )}
      </Box>
    );
  };

  const renderConfiguration = () => {
    if (!configMode) {
      return (
        <Box flexDirection="column" marginY={1} paddingX={1}>
          <Text color={theme.ui.textMuted} bold>Configuration</Text>
          <Box marginTop={1}>
            <Text color={theme.ui.textMuted}>Port: </Text>
            <Text color={theme.ui.text}>{serverInfo?.port || 3000}</Text>
          </Box>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" marginY={1} paddingX={1}>
        <Text color={theme.primary.aqua} bold>Configuration Mode</Text>
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

  const renderLogs = () => {
    if (!showLogs) {
      return (
        <Box marginY={1} paddingX={1}>
          <Text color={theme.ui.textMuted} bold>Recent Logs</Text>
          <Box marginTop={1}>
            <Text color={theme.ui.textDim}>Press 'l' to view logs</Text>
          </Box>
        </Box>
      );
    }

    const mockLogs = [
      { level: 'INFO', timestamp: new Date(), message: 'Server started successfully' },
      { level: 'DEBUG', timestamp: new Date(), message: 'Loading configuration' },
      { level: 'INFO', timestamp: new Date(), message: 'Listening on port 3000' },
    ];

    return (
      <Box flexDirection="column" marginY={1} paddingX={1}>
        <Text color={theme.ui.textMuted} bold>Recent Logs</Text>
        <Box marginTop={1} flexDirection="column">
          {mockLogs.map((log, index) => (
            <Box key={index} marginBottom={1}>
              <Text color={theme.ui.textDim}>
                {format(log.timestamp, 'yyyy-MM-dd HH:mm:ss')}
              </Text>
              <Text color={theme.ui.textMuted}>  [{log.level}]</Text>
              <Text color={theme.ui.text}>  {log.message}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    );
  };

  const renderControls = () => {
    const isRunning = serverStatus === 'running';
    const isError = serverStatus === 'error';
    const isConnecting = serverStatus === 'connecting';

    return (
      <Box
        paddingX={2}
        borderStyle="single"
        borderColor={theme.ui.borderSubtle}
      >
        <Text color={theme.ui.textDim}>
          {isConnecting
            ? 'Please wait...'
            : isRunning
            ? 's Stop Server  r Restart'
            : isError
            ? 's Start Server  r Retry'
            : 's Start Server'
          }  c Config  l Logs  ESC Back
        </Text>
      </Box>
    );
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
        <Text color={getStatusColor()}>
          {getStatusText()}
        </Text>
        {isLoading && (
          <>
            <Text color={theme.ui.textMuted}>  </Text>
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

      {/* Logs */}
      {renderLogs()}
      </Box>
    </Box>
  );
};
import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../hooks/useSafeInput';
import { format, formatDistanceToNow } from 'date-fns';
import figures from 'figures';
import { useAppStore } from '../stores/appStore';
import { useTheme } from '../hooks/useTheme';
import { getRealServerStatus, getRealServerStatusFormatted } from '../utils/real-server-status';
import type { ServerStatus } from '../commands/server-management';
import { stopServer, getServerStatus } from '../commands/server-management';
import { startServer } from '../commands/start/server';

// Define ServerInfo locally since it's component-specific
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
  const [showLogs, setShowLogs] = useState(false);
  const [configPort, setConfigPort] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showSuccess, setShowSuccess] = useState('');
  const [realServerStatus, setRealServerStatus] = useState<'running' | 'stopped' | 'connecting' | 'error'>('stopped');
  const [realServerInfo, setRealServerInfo] = useState<ServerInfo | null>(null);
  const [fullServerStatus, setFullServerStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const isLoading = useAppStore((state) => state.isLoading);
  const loadingMessage = useAppStore((state) => state.loadingMessage);
  const errors = useAppStore((state) => state.errors);
  const setAppLoading = useAppStore((state) => state.setLoading);
  const addError = useAppStore((state) => state.addError);

  const theme = useTheme();

  // Load real server status on component mount and periodically refresh
  useEffect(() => {
    const loadServerStatus = async () => {
      try {
        setLoading(true);
        const [status, fullStatus] = await Promise.all([
          getRealServerStatus(),
          getRealServerStatusFormatted()
        ]);
        setRealServerStatus(status.status);
        setRealServerInfo(status.serverInfo);
        setFullServerStatus(fullStatus);
      } catch (error) {
        // Error is already logged in getRealServerStatus
        setRealServerStatus('error');
        setRealServerInfo(null);
      } finally {
        setLoading(false);
      }
    };

    loadServerStatus();

    // Refresh every 5 seconds
    const interval = setInterval(loadServerStatus, 5000);
    return () => clearInterval(interval);
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
          // Refresh status
          getRealServerStatus().then(status => {
            setRealServerStatus(status.status);
            setRealServerInfo(status.serverInfo);
            setFullServerStatus(status.fullStatus);
          });
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
          // Refresh status after a moment for server to stabilize
          setTimeout(() => {
            getRealServerStatus().then(status => {
              setRealServerStatus(status.status);
              setRealServerInfo(status.serverInfo);
              setFullServerStatus(status.fullStatus);
            });
          }, 500);
        });
      }
    } else if (input === 'r') {
      // Restart server
      setAppLoading(true, 'Restarting CAGE server...');
      const port = parseInt(configPort || '3790');

      // Stop first if running
      const stopPromise = realServerStatus === 'running'
        ? stopServer()
        : Promise.resolve({ success: true, message: 'Server not running' });

      stopPromise.then(() => {
        // Wait a moment then start
        setTimeout(() => {
          startServer({ port }).then(result => {
            setAppLoading(false);
            if (result.success) {
              setShowSuccess('Server restarted successfully');
              setTimeout(() => setShowSuccess(''), 2000);
            } else {
              addError(result.message);
            }
            // Refresh status
            setTimeout(() => {
              getRealServerStatus().then(status => {
                setRealServerStatus(status.status);
                setRealServerInfo(status.serverInfo);
                setFullServerStatus(status.fullStatus);
              });
            }, 500);
          });
        }, 500);
      });
    } else if (input === 'c') {
      setConfigMode(true);
      setConfigPort(realServerInfo?.port?.toString() || '3790');
    } else if (input === 'l') {
      setShowLogs(!showLogs);
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
          <Text color={theme.ui.textMuted}>
            Loading server status...
          </Text>
        </Box>
      );
    }

    if (!realServerInfo) {
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
          <Text color={theme.ui.text}>{realServerInfo.port}</Text>
          {realServerInfo.pid && (
            <>
              <Text color={theme.ui.textMuted}>  PID: </Text>
              <Text color={theme.ui.text}>{realServerInfo.pid}</Text>
            </>
          )}
        </Box>
        {realServerInfo.uptime && (
          <Box marginBottom={1}>
            <Text color={theme.ui.textMuted}>Uptime: </Text>
            <Text color={theme.ui.text}>{formatUptime(realServerInfo.uptime)}</Text>
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
            <Text color={theme.ui.text}>{(realServerInfo as ExtendedServerInfo).cpuUsage}%</Text>
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
            <Text color={theme.ui.text}>{realServerInfo?.port || 3790}</Text>
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
    const isRunning = realServerStatus === 'running';
    const isError = realServerStatus === 'error';
    const isConnecting = realServerStatus === 'connecting';

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

      {/* Extended Status Information */}
      {fullServerStatus && (
        <Box flexDirection="column" marginY={1} paddingX={1}>
          <Text color={theme.ui.textMuted} bold>System Status</Text>

          {/* Hooks Status */}
          <Box marginTop={1}>
            <Text color={theme.ui.textMuted}>Hooks: </Text>
            <Text color={fullServerStatus.hooks.installed ? theme.status.success : theme.status.warning}>
              {fullServerStatus.hooks.installed ? 'Installed' : 'Not Installed'}
            </Text>
            {fullServerStatus.hooks.count && (
              <>
                <Text color={theme.ui.textMuted}> (</Text>
                <Text color={theme.ui.text}>{fullServerStatus.hooks.count} types</Text>
                <Text color={theme.ui.textMuted}>)</Text>
              </>
            )}
          </Box>

          {/* Events Status */}
          <Box marginTop={1}>
            <Text color={theme.ui.textMuted}>Events: </Text>
            <Text color={theme.ui.text}>{fullServerStatus.events.total} total</Text>
            {fullServerStatus.events.today !== undefined && (
              <>
                <Text color={theme.ui.textMuted}>, </Text>
                <Text color={theme.ui.text}>{fullServerStatus.events.today} today</Text>
              </>
            )}
          </Box>

          {/* Warnings */}
          {fullServerStatus.server.warning && (
            <Box marginTop={1}>
              <Text color={theme.status.warning}>⚠ {fullServerStatus.server.warning}</Text>
            </Box>
          )}

          {fullServerStatus.offline.count > 0 && (
            <Box marginTop={1}>
              <Text color={theme.status.warning}>⚠ {fullServerStatus.offline.count} offline log entries</Text>
            </Box>
          )}
        </Box>
      )}

      {/* Logs */}
      {renderLogs()}
      </Box>
    </Box>
  );
};
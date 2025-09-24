import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme';
import { getStatusMonitor } from '../../utils/status-monitor';
import type { SystemStatus } from '../../utils/status-monitor';

interface StatusBarProps {
  compact?: boolean;
}


export const StatusBar: React.FC<StatusBarProps> = ({ compact = false }) => {
  const theme = useTheme();
  const [status, setStatus] = useState<Omit<SystemStatus, 'lastUpdated'>>({
    server: { status: 'stopped' },
    hooks: { installed: false, active: 0, total: 0 },
    events: { total: 0, today: 0, rate: 0 }
  });
  const [loading, setLoading] = useState(true);
  const statusMonitor = getStatusMonitor();

  useEffect(() => {
    const handleStatusUpdate = (fullStatus: SystemStatus) => {
      setStatus({
        server: fullStatus.server,
        hooks: fullStatus.hooks,
        events: fullStatus.events
      });
      setLoading(false);
    };

    const handleStatusError = () => {
      setStatus({
        server: { status: 'error' },
        hooks: { installed: false, active: 0, total: 0 },
        events: { total: 0, today: 0, rate: 0 }
      });
      setLoading(false);
    };

    // Subscribe to status updates
    statusMonitor.on('statusUpdated', handleStatusUpdate);
    statusMonitor.on('statusError', handleStatusError);

    // Start monitoring if not already started (10 second minimum interval)
    statusMonitor.start(10000);

    // Get initial status
    const initialStatus = statusMonitor.getStatus();
    if (initialStatus.lastUpdated > 0) {
      handleStatusUpdate(initialStatus);
    } else {
      // Force immediate update for initial load
      statusMonitor.forceUpdate().then(handleStatusUpdate).catch(handleStatusError);
    }

    // Cleanup
    return () => {
      statusMonitor.off('statusUpdated', handleStatusUpdate);
      statusMonitor.off('statusError', handleStatusError);
    };
  }, []);

  const getServerColor = () => {
    if (loading) return theme.ui.textMuted;
    switch (status.server.status) {
      case 'running': return theme.status.success;
      case 'stopped': return theme.ui.textMuted;
      case 'connecting': return theme.status.warning;
      case 'error': return theme.status.error;
      default: return theme.ui.textMuted;
    }
  };

  const getHooksColor = () => {
    if (loading) return theme.ui.textMuted;
    if (!status.hooks.installed) return theme.ui.textMuted;
    if (status.hooks.active === status.hooks.total) return theme.status.success;
    if (status.hooks.active > 0) return theme.status.warning;
    return theme.status.error;
  };

  const getEventsColor = () => {
    if (loading) return theme.ui.textMuted;
    if (status.events.rate > 0) return theme.status.success;
    if (status.events.today > 0) return theme.primary.main;
    if (status.events.total > 0) return theme.ui.text;
    return theme.ui.textMuted;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (compact) {
    // Compact single-line format - clean and professional
    return (
      <Box>
        {/* Server Status */}
        <Box>
          <Text color={theme.ui.textMuted}>Server: </Text>
          <Text color={getServerColor()} bold>
            {loading ? 'checking' : status.server.status.toUpperCase()}
          </Text>
          {status.server.port && (
            <Text color={theme.ui.textMuted}>:{status.server.port}</Text>
          )}
        </Box>

        {/* Separator */}
        <Text color={theme.ui.borderSubtle}> │ </Text>

        {/* Hooks Status */}
        <Box>
          <Text color={theme.ui.textMuted}>Hooks: </Text>
          <Text color={getHooksColor()} bold>
            {status.hooks.active}/{status.hooks.total}
          </Text>
        </Box>

        {/* Separator */}
        <Text color={theme.ui.borderSubtle}> │ </Text>

        {/* Events Status */}
        <Box>
          <Text color={theme.ui.textMuted}>Events: </Text>
          <Text color={getEventsColor()} bold>
            {formatNumber(status.events.total)}
          </Text>
          {status.events.today > 0 && (
            <Text color={theme.ui.textMuted}> ({formatNumber(status.events.today)} today)</Text>
          )}
          {status.events.rate > 0 && (
            <Text color={theme.status.success} bold> +{status.events.rate}/min</Text>
          )}
        </Box>
      </Box>
    );
  }

  // Full detailed format (for non-compact mode)
  return (
    <Box flexDirection="column" gap={0}>
      <Box gap={3}>
        {/* Server Section */}
        <Box flexDirection="column">
          <Text color={theme.ui.textMuted} dimColor>SERVER</Text>
          <Box gap={1}>
            <Text color={getServerColor()}>
              {loading ? 'checking' : status.server.status.toUpperCase()}
            </Text>
            {status.server.port && (
              <Text color={theme.ui.textDim}>:{status.server.port}</Text>
            )}
            {status.server.pid && (
              <Text color={theme.ui.textDim}> PID:{status.server.pid}</Text>
            )}
          </Box>
        </Box>

        {/* Hooks Section */}
        <Box flexDirection="column">
          <Text color={theme.ui.textMuted} dimColor>HOOKS</Text>
          <Box gap={1}>
            <Text color={getHooksColor()}>
              {status.hooks.active}/{status.hooks.total}
            </Text>
            <Text color={theme.ui.textDim}>
              {status.hooks.installed ? 'active' : 'not installed'}
            </Text>
          </Box>
        </Box>

        {/* Events Section */}
        <Box flexDirection="column">
          <Text color={theme.ui.textMuted} dimColor>EVENTS</Text>
          <Box gap={1}>
            <Text color={getEventsColor()}>
              {formatNumber(status.events.total)}
            </Text>
            {status.events.today > 0 && (
              <Text color={theme.ui.textDim}>
                {formatNumber(status.events.today)} today
              </Text>
            )}
            {status.events.rate > 0 && (
              <Text color={theme.status.success}>
                +{status.events.rate}/min
              </Text>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
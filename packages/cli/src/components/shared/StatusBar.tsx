import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useTheme } from '../../hooks/useTheme';
import { getRealServerStatus } from '../../utils/real-server-status';
import { getRealHooksStatus } from '../../utils/real-hooks';
import { getEventsCounts } from '../../utils/real-events';

interface StatusBarProps {
  compact?: boolean;
}

interface SystemStatus {
  server: {
    status: 'running' | 'stopped' | 'connecting' | 'error';
    port?: number;
    pid?: number;
  };
  hooks: {
    installed: boolean;
    active: number;
    total: number;
  };
  events: {
    total: number;
    today: number;
    rate: number; // events per minute
  };
}

export const StatusBar: React.FC<StatusBarProps> = ({ compact = false }) => {
  const theme = useTheme();
  const [status, setStatus] = useState<SystemStatus>({
    server: { status: 'stopped' },
    hooks: { installed: false, active: 0, total: 0 },
    events: { total: 0, today: 0, rate: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [lastEventCount, setLastEventCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());

  useEffect(() => {
    let mounted = true;

    const loadStatus = async () => {
      try {
        const [serverStatus, hooksStatus, eventsCounts] = await Promise.all([
          getRealServerStatus(),
          getRealHooksStatus(),
          getEventsCounts()
        ]);

        if (!mounted) return;

        // Calculate events per minute rate
        const now = Date.now();
        const timeDiff = (now - lastUpdateTime) / 1000 / 60; // minutes
        const eventDiff = eventsCounts.total - lastEventCount;
        const rate = timeDiff > 0.1 ? Math.round(eventDiff / timeDiff) : 0; // Only calculate after 6 seconds

        setStatus({
          server: {
            status: serverStatus.status,
            port: serverStatus.serverInfo?.port,
            pid: serverStatus.serverInfo?.pid
          },
          hooks: {
            installed: hooksStatus.isInstalled,
            active: hooksStatus.installedHooks.filter(h => h.enabled).length,
            total: hooksStatus.installedHooks.length
          },
          events: {
            total: eventsCounts.total,
            today: eventsCounts.today,
            rate: rate > 0 ? rate : 0
          }
        });

        setLastEventCount(eventsCounts.total);
        setLastUpdateTime(now);
        setLoading(false);
      } catch (error) {
        if (!mounted) return;
        setStatus({
          server: { status: 'error' },
          hooks: { installed: false, active: 0, total: 0 },
          events: { total: 0, today: 0, rate: 0 }
        });
        setLoading(false);
      }
    };

    loadStatus();

    // Refresh every 2 seconds for more responsive updates
    const interval = setInterval(loadStatus, 2000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [lastEventCount, lastUpdateTime]);

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
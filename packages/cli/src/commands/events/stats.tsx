import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { Spinner } from '../../components/Spinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { loadCageConfig } from '../../utils/config';

interface StatsEvent {
  timestamp: string;
  eventType: string;
  toolName?: string;
  sessionId: string;
  [key: string]: unknown;
}

interface EventStats {
  totalEvents: number;
  eventTypes: Record<string, number>;
  toolUsage: Record<string, number>;
  sessionsCount: number;
  averageEventsPerSession: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
}

interface StatsState {
  status: 'loading' | 'done' | 'error';
  message: string;
  error?: string;
  stats: EventStats | null;
}

export function EventsStatsCommand(): React.ReactElement {
  const [state, setState] = useState<StatsState>({
    status: 'loading',
    message: 'Calculating statistics...',
    stats: null,
  });

  useEffect(() => {
    const calculateStats = async () => {
      try {
        const config = await loadCageConfig();
        if (!config) {
          setState({
            status: 'error',
            message: 'CAGE is not initialized',
            error: 'Please run "cage init" first',
            stats: null,
          });
          return;
        }

        const eventsDir = join(
          process.cwd(),
          config.eventsDir || '.cage/events'
        );

        if (!existsSync(eventsDir)) {
          setState({
            status: 'done',
            message: 'No events found',
            stats: null,
          });
          return;
        }

        const allEvents: StatsEvent[] = [];
        const dateDirs = await readdir(eventsDir);

        // Load all events
        for (const dateDir of dateDirs) {
          const datePath = join(eventsDir, dateDir);
          try {
            const files = await readdir(datePath);
            const eventFiles = files.filter(f => f.endsWith('.jsonl'));

            for (const file of eventFiles) {
              const filePath = join(datePath, file);
              const content = await readFile(filePath, 'utf-8');
              const lines = content
                .trim()
                .split('\n')
                .filter(line => line.trim());

              for (const line of lines) {
                try {
                  const event = JSON.parse(line) as StatsEvent;
                  allEvents.push(event);
                } catch {
                  // Skip invalid JSON lines
                }
              }
            }
          } catch {
            // Skip directories that can't be read
            continue;
          }
        }

        if (allEvents.length === 0) {
          setState({
            status: 'done',
            message: 'No events found',
            stats: null,
          });
          return;
        }

        // Calculate statistics
        const eventTypes: Record<string, number> = {};
        const toolUsage: Record<string, number> = {};
        const sessions = new Set<string>();
        const timestamps = allEvents.map(e => new Date(e.timestamp).getTime());

        allEvents.forEach(event => {
          // Count event types
          eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;

          // Count tool usage
          if (event.toolName) {
            toolUsage[event.toolName] = (toolUsage[event.toolName] || 0) + 1;
          }

          // Track unique sessions
          sessions.add(event.sessionId);
        });

        const stats: EventStats = {
          totalEvents: allEvents.length,
          eventTypes,
          toolUsage,
          sessionsCount: sessions.size,
          averageEventsPerSession:
            Math.round((allEvents.length / sessions.size) * 100) / 100,
          dateRange: {
            earliest: new Date(Math.min(...timestamps)).toISOString(),
            latest: new Date(Math.max(...timestamps)).toISOString(),
          },
        };

        setState({
          status: 'done',
          message: 'Event Statistics',
          stats,
        });
      } catch (err) {
        setState({
          status: 'error',
          message: 'Failed to calculate statistics',
          error: err instanceof Error ? err.message : 'Unknown error',
          stats: null,
        });
      }
    };

    calculateStats();
  }, []);

  if (state.status === 'loading') {
    return <Spinner message={state.message} />;
  }

  if (state.status === 'error') {
    return <ErrorMessage message={state.message} details={state.error} />;
  }

  if (!state.stats) {
    return <Text color="gray">No events found</Text>;
  }

  const { stats } = state;

  // Sort event types and tools by count
  const sortedEventTypes = Object.entries(stats.eventTypes).sort(
    ([, a], [, b]) => b - a
  );

  const sortedTools = Object.entries(stats.toolUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10); // Top 10 tools

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        {state.message}
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Text>Total events: {stats.totalEvents}</Text>
        <Text>Unique sessions: {stats.sessionsCount}</Text>
        <Text>Average events per session: {stats.averageEventsPerSession}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text>Date range:</Text>
        <Text>
          {' '}
          From: {new Date(stats.dateRange.earliest).toLocaleString()}
        </Text>
        <Text> To: {new Date(stats.dateRange.latest).toLocaleString()}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Total events by type:</Text>
        {sortedEventTypes.map(([type, count]) => (
          <Text key={type}>
            {' '}
            {type}: {count}
          </Text>
        ))}
      </Box>

      {sortedTools.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Most frequently used tools:</Text>
          {sortedTools.map(([tool, count]) => (
            <Text key={tool}>
              {' '}
              {tool}: {count}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );
}

import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { Spinner } from '../../components/Spinner.js';
import { ErrorMessage } from '../../components/ErrorMessage.js';
import { loadCageConfig } from '../../utils/config.js';

interface ListProps {
  from?: string;
  to?: string;
}

interface ListEvent {
  timestamp: string;
  eventType: string;
  toolName?: string;
  sessionId: string;
  [key: string]: unknown;
}

interface EventSummary {
  date: string;
  totalEvents: number;
  eventTypes: Record<string, number>;
  sessions: number;
}

interface ListState {
  status: 'loading' | 'done' | 'error';
  message: string;
  error?: string;
  summary: EventSummary | null;
  events: ListEvent[];
}

export function EventsListCommand({ from, to }: ListProps): JSX.Element {
  const [state, setState] = useState<ListState>({
    status: 'loading',
    message: 'Loading events...',
    summary: null,
    events: []
  });

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const config = await loadCageConfig();
        if (!config) {
          setState({
            status: 'error',
            message: 'Cage is not initialized',
            error: 'Please run "cage init" first',
            summary: null,
            events: []
          });
          return;
        }

        const eventsDir = join(process.cwd(), config.eventsDir || '.cage/events');

        if (!existsSync(eventsDir)) {
          setState({
            status: 'done',
            message: 'No events found',
            summary: null,
            events: []
          });
          return;
        }

        // Determine date range
        const fromDate = from || new Date().toISOString().split('T')[0];
        const toDate = to || fromDate;

        const allEvents: ListEvent[] = [];
        const dateDirs = await readdir(eventsDir);

        // Filter date directories by range
        const filteredDates = dateDirs.filter(date => {
          return date >= fromDate && date <= toDate;
        });

        for (const dateDir of filteredDates) {
          const datePath = join(eventsDir, dateDir);
          try {
            const files = await readdir(datePath);
            const eventFiles = files.filter(f => f.endsWith('.jsonl'));

            for (const file of eventFiles) {
              const filePath = join(datePath, file);
              const content = await readFile(filePath, 'utf-8');
              const lines = content.trim().split('\n').filter(line => line.trim());

              for (const line of lines) {
                try {
                  const event = JSON.parse(line) as ListEvent;
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

        // Calculate summary
        const eventTypes: Record<string, number> = {};
        const sessions = new Set<string>();

        allEvents.forEach(event => {
          eventTypes[event.eventType] = (eventTypes[event.eventType] || 0) + 1;
          sessions.add(event.sessionId);
        });

        const summary: EventSummary = {
          date: fromDate === toDate ? fromDate : `${fromDate} to ${toDate}`,
          totalEvents: allEvents.length,
          eventTypes,
          sessions: sessions.size
        };

        setState({
          status: 'done',
          message: `Events from ${summary.date}`,
          summary,
          events: allEvents.slice(0, 50) // Limit to first 50 events for display
        });

      } catch (err) {
        setState({
          status: 'error',
          message: 'Failed to load events',
          error: err instanceof Error ? err.message : 'Unknown error',
          summary: null,
          events: []
        });
      }
    };

    loadEvents();
  }, [from, to]);

  if (state.status === 'loading') {
    return <Spinner message={state.message} />;
  }

  if (state.status === 'error') {
    return <ErrorMessage message={state.message} details={state.error} />;
  }

  if (!state.summary) {
    return <Text color="gray">No events found</Text>;
  }

  return (
    <Box flexDirection="column">
      <Text color="cyan">{state.message}</Text>

      <Box marginTop={1} flexDirection="column">
        <Text>Total events: {state.summary.totalEvents}</Text>
        <Text>Sessions: {state.summary.sessions}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Event types:</Text>
        {Object.entries(state.summary.eventTypes).map(([type, count]) => (
          <Text key={type}>  {type}: {count}</Text>
        ))}
      </Box>

      {state.events.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Recent events (first 50):</Text>
          {state.events.slice(0, 10).map((event, index) => (
            <Box key={index}>
              <Text color="green">{event.timestamp}</Text>
              <Text> | </Text>
              <Text color="blue">{event.eventType}</Text>
              {event.toolName && (
                <>
                  <Text> | </Text>
                  <Text color="magenta">{event.toolName}</Text>
                </>
              )}
            </Box>
          ))}
          {state.events.length > 10 && (
            <Text color="gray">... and {state.events.length - 10} more</Text>
          )}
        </Box>
      )}
    </Box>
  );
}
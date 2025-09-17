import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { Spinner } from '../../components/Spinner.js';
import { ErrorMessage } from '../../components/ErrorMessage.js';
import { loadCageConfig } from '../../utils/config.js';

interface TailProps {
  count?: number;
}

interface TailEvent {
  timestamp: string;
  eventType: string;
  toolName?: string;
  sessionId: string;
  [key: string]: unknown;
}

interface TailState {
  status: 'loading' | 'done' | 'error';
  message: string;
  error?: string;
  events: TailEvent[];
}

export function EventsTailCommand({ count = 10 }: TailProps): JSX.Element {
  const [state, setState] = useState<TailState>({
    status: 'loading',
    message: `Loading last ${count} events...`,
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
            events: []
          });
          return;
        }

        const eventsDir = join(process.cwd(), config.eventsDir || '.cage/events');

        if (!existsSync(eventsDir)) {
          setState({
            status: 'done',
            message: 'No events found',
            events: []
          });
          return;
        }

        // Read all event files (sorted by date)
        const allEvents: TailEvent[] = [];
        const dateDirs = await readdir(eventsDir);

        // Sort date directories in descending order
        dateDirs.sort().reverse();

        for (const dateDir of dateDirs) {
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
                  const event = JSON.parse(line) as TailEvent;
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

        // Sort by timestamp descending and take the last N events
        allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        const recentEvents = allEvents.slice(0, count);

        setState({
          status: 'done',
          message: `Last ${recentEvents.length} events:`,
          events: recentEvents
        });

      } catch (err) {
        setState({
          status: 'error',
          message: 'Failed to load events',
          error: err instanceof Error ? err.message : 'Unknown error',
          events: []
        });
      }
    };

    loadEvents();
  }, [count]);

  if (state.status === 'loading') {
    return <Spinner message={state.message} />;
  }

  if (state.status === 'error') {
    return <ErrorMessage message={state.message} details={state.error} />;
  }

  return (
    <Box flexDirection="column">
      <Text color="cyan">{state.message}</Text>

      {state.events.length === 0 ? (
        <Text color="gray">No events found</Text>
      ) : (
        <Box marginTop={1} flexDirection="column">
          {state.events.map((event, index) => (
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
              <Text> | </Text>
              <Text color="gray">{event.sessionId}</Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
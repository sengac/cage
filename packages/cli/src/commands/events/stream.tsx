import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { Spinner } from '../../components/Spinner.js';
import { ErrorMessage } from '../../components/ErrorMessage.js';
import { loadCageConfig } from '../../utils/config.js';

interface StreamProps {
  filter?: string;
}

interface StreamEvent {
  timestamp: string;
  eventType: string;
  toolName?: string;
  sessionId: string;
  [key: string]: unknown;
}

interface StreamState {
  status: 'connecting' | 'connected' | 'error';
  message: string;
  error?: string;
  events: StreamEvent[];
  filter?: string;
}

export function EventsStreamCommand({ filter }: StreamProps): JSX.Element {
  const [state, setState] = useState<StreamState>({
    status: 'connecting',
    message: 'Connecting to event stream...',
    events: [],
    filter
  });

  useEffect(() => {
    const connectToStream = async () => {
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

        // TODO: Implement actual EventSource connection when backend is ready
        // For now, simulate connection
        setState({
          status: 'connected',
          message: filter ? `Streaming events (filtered: ${filter})...` : 'Streaming events...',
          events: [],
          filter
        });

        // Simulate receiving events
        const mockEvents: StreamEvent[] = [
          {
            timestamp: new Date().toISOString(),
            eventType: 'pre-tool-use',
            toolName: 'Read',
            sessionId: 'session-1'
          },
          {
            timestamp: new Date().toISOString(),
            eventType: 'post-tool-use',
            toolName: 'Read',
            sessionId: 'session-1'
          }
        ];

        // Add mock events after a delay
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            events: mockEvents.filter(event =>
              !filter || event.eventType.includes(filter.toLowerCase())
            )
          }));
        }, 1000);

      } catch (err) {
        setState({
          status: 'error',
          message: 'Failed to connect to event stream',
          error: err instanceof Error ? err.message : 'Unknown error',
          events: []
        });
      }
    };

    connectToStream();

    // Cleanup function
    return () => {
      // TODO: Close EventSource connection when implemented
    };
  }, [filter]);

  if (state.status === 'connecting') {
    return <Spinner message={state.message} />;
  }

  if (state.status === 'error') {
    return <ErrorMessage message={state.message} details={state.error} />;
  }

  return (
    <Box flexDirection="column">
      <Text color="cyan">{state.message}</Text>
      <Text color="gray">Press Ctrl+C to stop streaming</Text>

      {state.filter && (
        <Text color="yellow">Filtering: {state.filter}</Text>
      )}

      <Box marginTop={1} flexDirection="column">
        {state.events.length === 0 ? (
          <Text color="gray">Waiting for events...</Text>
        ) : (
          state.events.map((event, index) => (
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
          ))
        )}
      </Box>
    </Box>
  );
}
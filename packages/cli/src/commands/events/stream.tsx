import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { Spinner } from '../../components/Spinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { loadCageConfig } from '../../utils/config';

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
            message: 'CAGE is not initialized',
            error: 'Please run "cage init" first',
            events: []
          });
          return;
        }

        // Connect to real SSE endpoint
        const eventSource = new EventSource(`http://localhost:${config.port}/api/events/stream`);

        eventSource.onopen = () => {
          setState({
            status: 'connected',
            message: filter ? `Streaming events (filtered: ${filter})...` : 'Streaming events...',
            events: [],
            filter
          });
        };

        eventSource.onmessage = (event) => {
          try {
            const eventData: StreamEvent = JSON.parse(event.data);

            // Apply filter if specified
            if (!filter || eventData.eventType.toLowerCase().includes(filter.toLowerCase())) {
              setState(prev => ({
                ...prev,
                events: [...prev.events, eventData].slice(-50) // Keep last 50 events
              }));
            }
          } catch (parseError) {
            console.error('Failed to parse SSE event:', parseError);
          }
        };

        eventSource.onerror = (error) => {
          console.error('SSE connection error:', error);
          setState({
            status: 'error',
            message: 'Connection to event stream failed',
            error: 'Failed to connect to backend SSE endpoint',
            events: []
          });
          eventSource.close();
        };

        // Return cleanup function that closes the connection
        return () => {
          eventSource.close();
        };

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

    // Cleanup function - this will be returned by the actual EventSource setup
    return () => {
      // EventSource cleanup is handled in the connection setup above
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
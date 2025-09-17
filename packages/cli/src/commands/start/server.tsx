import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { Spinner } from '../../components/Spinner.js';
import { ErrorMessage } from '../../components/ErrorMessage.js';
import { SuccessMessage } from '../../components/SuccessMessage.js';
import { loadCageConfig } from '../../utils/config.js';

interface ServerProps {
  port?: string;
}

interface ServerState {
  status: 'starting' | 'running' | 'error';
  message: string;
  error?: string;
  port?: number;
}

export function ServerStartCommand({ port }: ServerProps): JSX.Element {
  const [state, setState] = useState<ServerState>({
    status: 'starting',
    message: 'Starting Cage backend server...'
  });

  useEffect(() => {
    const startServer = async () => {
      try {
        const config = await loadCageConfig();
        if (!config) {
          setState({
            status: 'error',
            message: 'Cage is not initialized',
            error: 'Please run "cage init" first'
          });
          return;
        }

        const serverPort = port ? parseInt(port, 10) : config.port;

        // TODO: Start actual backend server when implemented
        // For now, simulate server startup
        setState({
          status: 'starting',
          message: `Starting server on port ${serverPort}...`
        });

        // Simulate startup delay
        setTimeout(() => {
          setState({
            status: 'running',
            message: 'Cage backend server is running',
            port: serverPort
          });
        }, 2000);

      } catch (err) {
        setState({
          status: 'error',
          message: 'Failed to start server',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    };

    startServer();

    // Cleanup function for when component unmounts
    return () => {
      // TODO: Stop server when implemented
    };
  }, [port]);

  if (state.status === 'starting') {
    return <Spinner message={state.message} />;
  }

  if (state.status === 'error') {
    return <ErrorMessage message={state.message} details={state.error} />;
  }

  return (
    <Box flexDirection="column">
      <SuccessMessage
        message={state.message}
        details={[
          `Port: ${state.port}`,
          `Health check: http://localhost:${state.port}/health`,
          `Events endpoint: http://localhost:${state.port}/api/events`,
          `Hook endpoints: http://localhost:${state.port}/api/hooks/*`,
          '',
          'Press Ctrl+C to stop the server'
        ]}
      />

      <Box marginTop={1}>
        <Text color="cyan">Server logs will appear below:</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="gray">[INFO] Server started successfully</Text>
        <Text color="gray">[INFO] Waiting for hook events...</Text>
      </Box>
    </Box>
  );
}
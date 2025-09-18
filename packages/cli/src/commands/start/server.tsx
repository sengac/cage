import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { Spinner } from '../../components/Spinner.js';
import { ErrorMessage } from '../../components/ErrorMessage.js';
import { SuccessMessage } from '../../components/SuccessMessage.js';
import { loadCageConfig } from '../../utils/config.js';
import { startServer as startBackendServer, isServerRunning } from './server.js';

interface ServerProps {
  port?: string;
}

interface ServerState {
  status: 'checking' | 'starting' | 'running' | 'error';
  message: string;
  error?: string;
  port?: number;
  pid?: number;
}

export function ServerStartCommand({ port }: ServerProps): JSX.Element {
  const [state, setState] = useState<ServerState>({
    status: 'checking',
    message: 'Checking Cage configuration...'
  });

  useEffect(() => {
    const runStartSequence = async () => {
      try {
        // Check if Cage is initialized
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

        // Check if already running
        const runningCheck = await isServerRunning();
        if (runningCheck.running) {
          setState({
            status: 'error',
            message: 'Server is already running',
            error: `PID: ${runningCheck.pid}, Port: ${serverPort}. Use "cage stop" to stop it first.`
          });
          return;
        }

        // Update status to starting
        setState({
          status: 'starting',
          message: `Starting server on port ${serverPort}...`
        });

        // Actually start the server
        const result = await startBackendServer({ port: serverPort });

        if (result.success) {
          setState({
            status: 'running',
            message: 'Cage backend server is running',
            port: serverPort,
            pid: result.pid
          });
        } else {
          setState({
            status: 'error',
            message: 'Failed to start server',
            error: result.message
          });
        }

      } catch (err) {
        setState({
          status: 'error',
          message: 'Failed to start server',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
      }
    };

    runStartSequence();

    // Cleanup function for when component unmounts
    return () => {
      // Note: We don't stop the server here because it should keep running
      // The server runs as a detached process
    };
  }, [port]);

  if (state.status === 'checking' || state.status === 'starting') {
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
          state.pid ? `PID: ${state.pid}` : '',
          `Health check: http://localhost:${state.port}/health`,
          `Events endpoint: http://localhost:${state.port}/api/events`,
          `Hook endpoints: http://localhost:${state.port}/api/hooks/*`,
          '',
          'Server is running in the background.',
          'Use "cage status" to check server status',
          'Use "cage stop" to stop the server'
        ].filter(Boolean)}
      />

      <Box marginTop={1}>
        <Text color="cyan">Server started successfully!</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text color="gray">To view logs, use: cage logs server</Text>
        <Text color="gray">To view events, use: cage events tail</Text>
      </Box>
    </Box>
  );
}
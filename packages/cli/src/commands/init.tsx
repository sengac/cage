import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { defaultConfig } from '@cage/shared';
import { Spinner } from '../components/Spinner';

interface InitStatus {
  status: 'checking' | 'creating' | 'done' | 'error' | 'already-initialized';
  message: string;
  error?: string;
}

export function InitCommand(): JSX.Element {
  const [state, setState] = useState<InitStatus>({
    status: 'checking',
    message: 'Checking project status...'
  });

  useEffect(() => {
    const initialize = async () => {
      try {
        const cwd = process.cwd();
        const configPath = join(cwd, 'cage.config.json');
        const cageDir = join(cwd, '.cage');
        const eventsDir = join(cageDir, 'events');

        // Check if already initialized
        if (existsSync(configPath)) {
          setState({
            status: 'already-initialized',
            message: 'CAGE is already initialized in this project'
          });
          setTimeout(() => process.exit(1), 100);
          return;
        }

        setState({
          status: 'creating',
          message: 'Creating CAGE configuration...'
        });

        // Create .cage directory structure
        await mkdir(eventsDir, { recursive: true });

        // Create config file with default settings
        const config = {
          ...defaultConfig,
          eventsDir: '.cage/events',
          version: '1.0.0'
        };

        await writeFile(configPath, JSON.stringify(config, null, 2));

        setState({
          status: 'done',
          message: 'CAGE initialized successfully'
        });

        // Exit successfully
        setTimeout(() => process.exit(0), 100);
      } catch (err) {
        setState({
          status: 'error',
          message: 'Failed to initialize CAGE',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
        setTimeout(() => process.exit(1), 100);
      }
    };

    initialize();
  }, []);

  if (state.status === 'checking' || state.status === 'creating') {
    return <Spinner message={state.message} />;
  }

  if (state.status === 'already-initialized') {
    return (
      <Box>
        <Text color="yellow">{state.message}</Text>
      </Box>
    );
  }

  if (state.status === 'error') {
    return (
      <Box flexDirection="column">
        <Text>🔴 {state.message}</Text>
        {state.error && <Text color="gray">  {state.error}</Text>}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text>🟢 {state.message}</Text>
      <Text color="gray">  Configuration saved to cage.config.json</Text>
      <Text color="gray">  Event logs will be stored in .cage/events/</Text>
    </Box>
  );
}
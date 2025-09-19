import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { HookType } from '@cage/shared';
import { Spinner } from '../../components/Spinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { SuccessMessage } from '../../components/SuccessMessage';
import { loadCageConfig } from '../../utils/config';
import { installHooksLocally, getLocalClaudeSettingsPath } from '../../utils/hooks-installer';

interface SetupState {
  status: 'checking' | 'installing' | 'done' | 'error';
  message: string;
  error?: string;
  hooks?: string[];
}

export function HooksSetupCommand(): JSX.Element {
  const [state, setState] = useState<SetupState>({
    status: 'checking',
    message: 'Checking Cage configuration...'
  });

  useEffect(() => {
    let exitTimeout: NodeJS.Timeout | undefined;

    const setup = async () => {
      try {
        // Check if Cage is initialized
        const config = await loadCageConfig();
        if (!config) {
          setState({
            status: 'error',
            message: 'Cage is not initialized',
            error: 'Please run "cage init" first'
          });
          // Only exit in non-test environments
          if (process.env.NODE_ENV !== 'test') {
            exitTimeout = setTimeout(() => process.exit(1), 100);
          }
          return;
        }

        setState({
          status: 'installing',
          message: 'Installing Claude Code hooks in local .claude directory...'
        });

        // Install all hooks locally
        await installHooksLocally(config.port);

        // Get list of installed hooks
        const hookTypes = Object.values(HookType);

        setState({
          status: 'done',
          message: 'Hooks configured successfully',
          hooks: hookTypes
        });

        // Only exit in non-test environments
        if (process.env.NODE_ENV !== 'test') {
          exitTimeout = setTimeout(() => process.exit(0), 100);
        }
      } catch (err) {
        setState({
          status: 'error',
          message: 'Failed to configure hooks',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
        // Only exit in non-test environments
        if (process.env.NODE_ENV !== 'test') {
          exitTimeout = setTimeout(() => process.exit(1), 100);
        }
      }
    };

    setup();

    // Cleanup function to clear timeout on unmount
    return () => {
      if (exitTimeout) {
        clearTimeout(exitTimeout);
      }
    };
  }, []);

  if (state.status === 'checking' || state.status === 'installing') {
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
          `Settings location: ${getLocalClaudeSettingsPath()}`,
          '',
          'Installed hooks:',
          ...(state.hooks?.map(hook => `  - ${hook}`) || [])
        ]}
      />
      <Box marginTop={1}>
        <Text color="yellow">⚠ Restart Claude Code for changes to take effect</Text>
      </Box>
    </Box>
  );
}
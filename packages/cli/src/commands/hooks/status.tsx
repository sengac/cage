import React, { useEffect, useState } from 'react';
import { Text, Box } from 'ink';
import { HookType } from '@cage/shared';
import { Spinner } from '../../components/Spinner';
import { ErrorMessage } from '../../components/ErrorMessage';
import { loadCageConfig, isCageInitialized } from '../../utils/config';
import { getInstalledHooksLocally, getLocalClaudeSettingsPath } from '../../utils/hooks-installer';

interface StatusState {
  status: 'checking' | 'done' | 'error';
  message: string;
  error?: string;
  hooks?: Record<string, string>;
  config?: {
    port: number;
    enabled: boolean;
  };
}

export function HooksStatusCommand(): JSX.Element {
  const [state, setState] = useState<StatusState>({
    status: 'checking',
    message: 'Checking hook configuration...'
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Check if Cage is initialized
        if (!isCageInitialized()) {
          setState({
            status: 'error',
            message: 'Cage is not initialized',
            error: 'Please run "cage init" first'
          });
          setTimeout(() => process.exit(1), 100);
          return;
        }

        const config = await loadCageConfig();
        const installedHooks = await getInstalledHooksLocally();

        setState({
          status: 'done',
          message: 'Hook Configuration Status',
          hooks: installedHooks,
          config: config ? {
            port: config.port,
            enabled: config.enabled
          } : undefined
        });

        setTimeout(() => process.exit(0), 100);
      } catch (err) {
        setState({
          status: 'error',
          message: 'Failed to check hook status',
          error: err instanceof Error ? err.message : 'Unknown error'
        });
        setTimeout(() => process.exit(1), 100);
      }
    };

    checkStatus();
  }, []);

  if (state.status === 'checking') {
    return <Spinner message={state.message} />;
  }

  if (state.status === 'error') {
    return <ErrorMessage message={state.message} details={state.error} />;
  }

  const allHookTypes = Object.values(HookType);
  const installedHooks = Object.keys(state.hooks || {});
  const missingHooks = allHookTypes.filter(hook => !installedHooks.includes(hook));

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">{state.message}</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>Settings file: {getLocalClaudeSettingsPath()}</Text>
        <Text>Backend port: {state.config?.port || 'Not configured'}</Text>
        <Text>Backend enabled: {state.config?.enabled ? 'Yes' : 'No'}</Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>Installed Hooks ({installedHooks.length}/{allHookTypes.length}):</Text>
        {installedHooks.length > 0 ? (
          installedHooks.map(hook => (
            <Text key={hook} color="green">  ✔ {hook}</Text>
          ))
        ) : (
          <Text color="gray">  No hooks installed</Text>
        )}
      </Box>

      {missingHooks.length > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>Missing Hooks:</Text>
          {missingHooks.map(hook => (
            <Text key={hook} color="yellow">  ✖ {hook}</Text>
          ))}
        </Box>
      )}

      {missingHooks.length > 0 && (
        <Box marginTop={1}>
          <Text color="yellow">Run "cage hooks setup" to install missing hooks</Text>
        </Box>
      )}
    </Box>
  );
}
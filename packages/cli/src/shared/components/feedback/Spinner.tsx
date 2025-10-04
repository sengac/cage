import React from 'react';
import { Text, Box } from 'ink';
import InkSpinner from 'ink-spinner';

interface SpinnerProps {
  message: string;
  color?: string;
}

export function Spinner({
  message,
  color = 'cyan',
}: SpinnerProps): JSX.Element {
  return (
    <Box>
      <Text color={color}>
        <InkSpinner type="dots" />
      </Text>
      <Text> {message}</Text>
    </Box>
  );
}

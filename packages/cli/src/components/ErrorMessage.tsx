import React from 'react';
import { Text, Box } from 'ink';

interface ErrorMessageProps {
  message: string;
  details?: string;
}

export function ErrorMessage({
  message,
  details,
}: ErrorMessageProps): JSX.Element {
  return (
    <Box flexDirection="column">
      <Text color="red">✖ {message}</Text>
      {details && <Text color="gray"> {details}</Text>}
    </Box>
  );
}

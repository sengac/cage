import React from 'react';
import { Text, Box } from 'ink';

interface SuccessMessageProps {
  message: string;
  details?: string[];
}

export function SuccessMessage({ message, details }: SuccessMessageProps): JSX.Element {
  return (
    <Box flexDirection="column">
      <Text>🟢 {message}</Text>
      {details?.map((detail, index) => (
        <Text key={index} color="gray">  {detail}</Text>
      ))}
    </Box>
  );
}
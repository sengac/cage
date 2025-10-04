import React from 'react';
import { render } from 'ink-testing-library';
import { Box, Text } from 'ink';

// Test to verify how complex Box structures render
const TestComplexRendering = () => {
  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text>🔄 Write unit tests for API endpoints</Text>
      </Box>
      <Box marginLeft={4}>
        <Text>[█████████████▓▓▓▓▓▓▓] 65%</Text>
      </Box>
    </Box>
  );
};

const TestWrappedComplexRendering = () => {
  return (
    <Box height={1}>
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Text>🔄 Write unit tests for API endpoints</Text>
        </Box>
        <Box marginLeft={4}>
          <Text>[█████████████▓▓▓▓▓▓▓] 65%</Text>
        </Box>
      </Box>
    </Box>
  );
};

console.log('Testing complex rendering without constraint:');
const { lastFrame: frame1 } = render(<TestComplexRendering />);
console.log(frame1());

console.log('\nTesting complex rendering with height=1 constraint:');
const { lastFrame: frame2 } = render(<TestWrappedComplexRendering />);
console.log(frame2());

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from 'ink-testing-library';
import { Box, Text } from 'ink';
import { FullScreenWrapper } from './FullScreenWrapper';

describe('FullScreenWrapper Terminal Rendering', () => {
  it('should render content at the actual top of the terminal', () => {
    const { lastFrame } = render(
      <FullScreenWrapper>
        <Box flexDirection="column">
          <Text>TOP LINE - Should be at row 0</Text>
          <Text>Second line</Text>
        </Box>
      </FullScreenWrapper>
    );

    const frame = lastFrame();
    const lines = frame?.split('\n') || [];

    console.log('Frame output:');
    console.log('============');
    lines.forEach((line, i) => {
      console.log(`Line ${i}: "${line}"`);
    });
    console.log('============');
    console.log(`Total lines: ${lines.length}`);

    // The first line should contain our TOP LINE text
    // Force failure to see output
    expect(lines[0]).toBe('FORCE FAIL TO SEE OUTPUT');
  });

  it('should fill exactly 24 lines when height is 24', () => {
    const { lastFrame } = render(
      <Box width={80} height={24} flexDirection="column">
        {Array.from({ length: 24 }, (_, i) => (
          <Text key={i}>Line {String(i + 1).padStart(2, '0')}</Text>
        ))}
      </Box>
    );

    const frame = lastFrame();
    const lines = frame?.split('\n') || [];

    console.log(`\nLines in frame: ${lines.length}`);
    console.log(`First line: "${lines[0]}"`);
    console.log(`Last non-empty line: "${lines.filter(l => l.trim()).pop()}"`);

    // Should have exactly 24 lines
    const nonEmptyLines = lines.filter(line => line.trim() !== '');
    // Force fail to see debug output
    expect(nonEmptyLines.length).toBe(100);
  });
});
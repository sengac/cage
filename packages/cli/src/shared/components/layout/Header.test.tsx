import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { Header } from './Header';
import { useAppStore } from '../../stores/appStore';

vi.mock('../../stores/appStore', () => ({
  useAppStore: vi.fn(),
}));

vi.mock('./StatusBar', () => ({
  StatusBar: vi.fn(() => null),
}));

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    ui: {
      borderSubtle: 'gray',
      textMuted: 'gray',
      textDim: 'dimColor',
    },
    secondary: {
      blue: 'blue',
    },
    status: {
      success: 'green',
      error: 'red',
      warning: 'yellow',
    },
  }),
}));

// Import the mocked StatusBar
import { StatusBar } from './StatusBar';

describe('Header Component', () => {
  const mockUseAppStore = useAppStore as unknown as ReturnType<typeof vi.fn>;
  const mockStatusBar = StatusBar as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUseAppStore.mockReturnValue('stopped');
    // Set up StatusBar mock to render the status
    mockStatusBar.mockImplementation(({ compact }: { compact?: boolean }) => {
      const status = mockUseAppStore();
      return <Text>Server: {status} | Hooks: 0/0 | Events: 0</Text>;
    });
  });

  it('should render with title', () => {
    const { lastFrame } = render(<Header title="Test View" />);

    expect(lastFrame()).toContain('CAGE | Test View');
  });

  it('should always show status bar', () => {
    const { lastFrame } = render(<Header title="Test View" />);

    expect(lastFrame()).toContain('CAGE | Test View');
    expect(lastFrame()).toContain('Server:');
    expect(lastFrame()).toContain('Hooks:');
    expect(lastFrame()).toContain('Events:');
  });

  it('should show server status in status bar', () => {
    mockUseAppStore.mockReturnValue('running');

    const { lastFrame } = render(<Header title="Test View" />);

    expect(lastFrame()).toContain('Server: running');
  });

  it('should show different server status states', () => {
    mockUseAppStore.mockReturnValue('error');

    const { lastFrame } = render(<Header title="Test View" />);

    expect(lastFrame()).toContain('Server: error');
  });

  it('should show stopped server status', () => {
    mockUseAppStore.mockReturnValue('stopped');

    const { lastFrame } = render(<Header title="Test View" />);

    expect(lastFrame()).toContain('Server: stopped');
  });

  it('should show checking server status', () => {
    mockUseAppStore.mockReturnValue('checking');

    const { lastFrame } = render(<Header title="Test View" />);

    expect(lastFrame()).toContain('Server: checking');
  });

  it('should have consistent minHeight of 3', () => {
    const { lastFrame } = render(<Header title="Test View" />);

    // The header should maintain its height even with minimal content
    const output = lastFrame();
    const lines = output?.split('\n') || [];

    // Header with border should be at least 3 lines
    expect(lines.length).toBeGreaterThanOrEqual(3);
  });
});

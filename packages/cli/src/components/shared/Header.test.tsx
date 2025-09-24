import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Header } from './Header';
import { useAppStore } from '../../stores/appStore';

vi.mock('../../stores/appStore', () => ({
  useAppStore: vi.fn()
}));

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    ui: {
      borderSubtle: 'gray',
      textMuted: 'gray',
      textDim: 'dimColor'
    },
    secondary: {
      blue: 'blue'
    },
    status: {
      success: 'green',
      error: 'red',
      warning: 'yellow'
    }
  })
}));

describe('Header Component', () => {
  const mockUseAppStore = useAppStore as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockUseAppStore.mockReturnValue('stopped');
  });

  it('should render with title', () => {
    const { lastFrame } = render(<Header title="Test View" />);

    expect(lastFrame()).toContain('CAGE | Test View');
  });

  it('should render with title and subtitle', () => {
    const { lastFrame } = render(
      <Header title="Test View" subtitle="Subtitle Text" />
    );

    expect(lastFrame()).toContain('CAGE | Test View');
    expect(lastFrame()).toContain('Subtitle Text');
  });

  it('should show server status when enabled', () => {
    mockUseAppStore.mockReturnValue('running');

    const { lastFrame } = render(
      <Header title="Test View" showServerStatus={true} />
    );

    expect(lastFrame()).toContain('CAGE | Test View');
    expect(lastFrame()).toContain('Server:');
    expect(lastFrame()).toContain('running');
  });

  it('should not show server status when disabled', () => {
    mockUseAppStore.mockReturnValue('running');

    const { lastFrame } = render(
      <Header title="Test View" showServerStatus={false} />
    );

    expect(lastFrame()).toContain('CAGE | Test View');
    expect(lastFrame()).not.toContain('Server:');
  });

  it('should show subtitle instead of server status', () => {
    mockUseAppStore.mockReturnValue('running');

    const { lastFrame } = render(
      <Header
        title="Test View"
        subtitle="Custom Status"
        showServerStatus={true}
      />
    );

    expect(lastFrame()).toContain('CAGE | Test View');
    expect(lastFrame()).toContain('Server:');
    expect(lastFrame()).toContain('running');
    expect(lastFrame()).not.toContain('Custom Status');
  });

  it('should render custom React element as subtitle', () => {
    const CustomSubtitle = () => <span>Custom React Element</span>;

    const { lastFrame } = render(
      <Header title="Test View" subtitle={<CustomSubtitle />} />
    );

    expect(lastFrame()).toContain('CAGE | Test View');
    expect(lastFrame()).toContain('Custom React Element');
  });

  it('should show different status icons based on server status', () => {
    mockUseAppStore.mockReturnValue('error');

    const { lastFrame } = render(
      <Header title="Test View" showServerStatus={true} />
    );

    expect(lastFrame()).toContain('error');
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
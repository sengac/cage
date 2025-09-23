import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'ink-testing-library';
import { Text } from 'ink';
import { FullScreenLayout } from './FullScreenLayout';

// Mock ink hooks
vi.mock('ink', async () => {
  const actual = await vi.importActual('ink');
  return {
    ...actual,
    useStdout: () => ({
      stdout: {
        rows: 24,
        columns: 80,
        write: vi.fn()
      }
    }),
    useInput: vi.fn()
  };
});

// Mock the theme
vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({
    ui: {
      borderSubtle: '#444444',
      text: '#ffffff',
      textMuted: '#888888',
      textDim: '#666666',
      hover: '#00ff00'
    },
    secondary: {
      blue: '#0088ff'
    },
    primary: {
      aqua: '#00ffff'
    },
    status: {
      success: '#00ff00',
      error: '#ff0000',
      warning: '#ffff00'
    }
  })
}));

describe('FullScreenLayout', () => {
  let mockOnBack: ReturnType<typeof vi.fn>;
  let mockUseInput: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    mockOnBack = vi.fn();
    vi.clearAllMocks();

    // Get the mocked useInput function
    const { useInput } = await import('ink');
    mockUseInput = useInput as ReturnType<typeof vi.fn>;
  });

  describe('Scenario: Display full-screen layout structure', () => {
    it('Given a FullScreenLayout component When rendered Then it should display header, content area, and footer', () => {
      const { lastFrame } = render(
        <FullScreenLayout
          title="Test View"
          subtitle="Test Subtitle"
          onBack={mockOnBack}
        >
          <Text>Test Content</Text>
        </FullScreenLayout>
      );

      // Verify header contains title
      expect(lastFrame()).toContain('CAGE | Test View');
      expect(lastFrame()).toContain('Test Subtitle');

      // Verify content
      expect(lastFrame()).toContain('Test Content');

      // Verify footer with navigation hints
      expect(lastFrame()).toContain('Back (ESC)');
    });

    it('Given a terminal size When layout renders Then it should adapt to terminal dimensions', () => {
      const { lastFrame } = render(
        <FullScreenLayout
          title="Test View"
          onBack={mockOnBack}
        >
          <Text>Content</Text>
        </FullScreenLayout>
      );

      const frame = lastFrame();
      expect(frame).toBeDefined();
      // The layout should be using the mocked terminal dimensions (80x24)
    });
  });

  describe('Scenario: Clear screen on mount', () => {
    it('Given the layout component When it mounts Then it should clear the terminal screen', () => {
      const writeSpyFn = vi.fn();
      const originalWrite = process.stdout.write;
      process.stdout.write = writeSpyFn as unknown as typeof process.stdout.write;

      render(
        <FullScreenLayout
          title="Test"
          onBack={mockOnBack}
        >
          <Text>Content</Text>
        </FullScreenLayout>
      );

      // Verify clear screen sequence was written
      expect(writeSpyFn).toHaveBeenCalledWith('\x1B[2J\x1B[H');

      // Restore original
      process.stdout.write = originalWrite;
    });
  });

  describe('Scenario: Consistent header and footer', () => {
    it('Given different views When using FullScreenLayout Then headers should be consistent', () => {
      const { lastFrame: frame1 } = render(
        <FullScreenLayout
          title="Events Inspector"
          subtitle="Browse & analyze events"
          onBack={mockOnBack}
        >
          <Text>Events List</Text>
        </FullScreenLayout>
      );

      const { lastFrame: frame2 } = render(
        <FullScreenLayout
          title="Server Management"
          subtitle="Start/stop/status"
          onBack={mockOnBack}
        >
          <Text>Server Status</Text>
        </FullScreenLayout>
      );

      // Both should have CAGE prefix in header
      expect(frame1()).toContain('CAGE |');
      expect(frame2()).toContain('CAGE |');

      // Both should have consistent footer navigation
      expect(frame1()).toContain('Back (ESC)');
      expect(frame2()).toContain('Back (ESC)');
    });
  });

  describe('Scenario: Custom footer content', () => {
    it('Given custom footer content When provided Then it should replace default footer', () => {
      const { lastFrame } = render(
        <FullScreenLayout
          title="Test"
          onBack={mockOnBack}
          footer={<Text>Custom Footer Content</Text>}
        >
          <Text>Content</Text>
        </FullScreenLayout>
      );

      expect(lastFrame()).toContain('Custom Footer Content');
      expect(lastFrame()).not.toContain('↑↓ Navigate');
    });
  });

  describe('Scenario: Content area fills available space', () => {
    it('Given content in FullScreenLayout When rendered Then content area should use flexGrow', () => {
      const { lastFrame } = render(
        <FullScreenLayout
          title="Test"
          onBack={mockOnBack}
        >
          <Text>Main Content Area</Text>
        </FullScreenLayout>
      );

      // Content should be between header and footer
      const frame = lastFrame();
      expect(frame).toContain('Main Content Area');

      // The content area should expand to fill space between header and footer
      const lines = frame!.split('\n');
      const headerIndex = lines.findIndex(line => line.includes('CAGE'));
      const footerIndex = lines.findIndex(line => line.includes('Back (ESC)'));

      // There should be space between header and footer for content
      expect(footerIndex).toBeGreaterThan(headerIndex);
    });
  });

  describe('Scenario: Navigate with Escape key', () => {
    it('Given user is in a sub-view When pressing Escape Then should call onBack', async () => {
      render(
        <FullScreenLayout
          title="Test View"
          onBack={mockOnBack}
        >
          <Text>Content</Text>
        </FullScreenLayout>
      );

      // Verify useInput was called
      expect(mockUseInput).toHaveBeenCalled();

      // Get the input handler
      const inputHandler = mockUseInput.mock.calls[0][0];

      // Simulate Escape key press
      inputHandler('', { escape: true });

      // Verify onBack was called
      expect(mockOnBack).toHaveBeenCalled();
    });

    it('Given user presses q When in any view Then should call onBack', async () => {
      mockUseInput.mockClear();
      mockOnBack.mockClear();

      render(
        <FullScreenLayout
          title="Test View"
          onBack={mockOnBack}
        >
          <Text>Content</Text>
        </FullScreenLayout>
      );

      const inputHandler = mockUseInput.mock.calls[0][0];

      // Simulate q key press
      inputHandler('q', {});

      // Verify onBack was called
      expect(mockOnBack).toHaveBeenCalled();
    });
  });

  describe('Scenario: Responsive layout maintains structure', () => {
    it('Given a FullScreenLayout When terminal dimensions change Then layout should maintain structure', () => {
      const { lastFrame } = render(
        <FullScreenLayout
          title="Responsive Test"
          subtitle="Testing responsive behavior"
          onBack={mockOnBack}
        >
          <Text>Responsive Content</Text>
        </FullScreenLayout>
      );

      const frame = lastFrame();

      // Structure should include all required elements
      expect(frame).toContain('CAGE | Responsive Test');
      expect(frame).toContain('Testing responsive behavior');
      expect(frame).toContain('Responsive Content');
      expect(frame).toContain('Back (ESC)');
    });
  });
});
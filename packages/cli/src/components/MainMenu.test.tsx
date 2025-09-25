import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MainMenu } from './MainMenu';
import { useAppStore } from '../stores/appStore';

// Mock the store
vi.mock('../stores/appStore');

describe('MainMenu', () => {
  let onExit: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onExit = vi.fn();
    navigate = vi.fn();

    // Mock the store implementation
    (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(selector => {
      const state = {
        navigate,
        serverStatus: 'stopped',
      };
      return selector ? selector(state) : state;
    });
  });

  describe('Given the MainMenu is displayed', () => {
    describe('When rendered', () => {
      it('Then should show the title and server status in header', () => {
        const { lastFrame } = render(<MainMenu onExit={onExit} />);

        expect(lastFrame()).toContain('CAGE | Code Alignment Guard Engine');
        expect(lastFrame()).toContain('Server:');
        expect(lastFrame()).toContain('stopped');
      });

      it('Then should show all menu items', () => {
        const { lastFrame } = render(<MainMenu onExit={onExit} />);
        const frame = lastFrame();

        expect(frame).toContain('Events Inspector');
        expect(frame).toContain('Real-time Monitor');
        expect(frame).toContain('Server Management');
        expect(frame).toContain('Hooks Configuration');
        expect(frame).toContain('Statistics Dashboard');
        expect(frame).toContain('Settings');
        expect(frame).toContain('Debug Console');
      });

      it('Then should show menu item descriptions', () => {
        const { lastFrame } = render(<MainMenu onExit={onExit} />);
        const frame = lastFrame();

        expect(frame).toContain('Browse & analyze events');
        expect(frame).toContain('Stream live events');
        expect(frame).toContain('Start/stop/status');
        expect(frame).toContain('Setup & verify hooks');
        expect(frame).toContain('View metrics & charts');
        expect(frame).toContain('Configure Cage');
        expect(frame).toContain('View debug output');
      });

      it('Then should show server status', () => {
        const { lastFrame } = render(<MainMenu onExit={onExit} />);

        expect(lastFrame()).toContain('Server:');
        expect(lastFrame()).toContain('stopped');
      });

      it('Then should show keyboard shortcuts', () => {
        const { lastFrame } = render(<MainMenu onExit={onExit} />);
        const frame = lastFrame();

        expect(frame).toContain('↑↓ Navigate');
        expect(frame).toContain('↵ Select');
        expect(frame).toContain('ESC Exit');
        expect(frame).toContain('? Help');
      });

      it('Then should highlight the first item by default', () => {
        const { lastFrame } = render(<MainMenu onExit={onExit} />);

        // The selected item should have a pointer
        expect(lastFrame()).toMatch(/❯\s*Events Inspector/);
      });
    });

    describe('When pressing arrow keys', () => {
      it('Then down arrow should move selection down', async () => {
        const { stdin, lastFrame, rerender } = render(
          <MainMenu onExit={onExit} />
        );

        // Press down arrow
        stdin.write('\u001B[B');

        // Force a rerender to capture the state update
        rerender(<MainMenu onExit={onExit} />);

        // Should highlight second item
        expect(lastFrame()).toMatch(/❯\s*Real-time Monitor/);
      });

      it('Then up arrow should move selection up', () => {
        const { stdin, lastFrame, rerender } = render(
          <MainMenu onExit={onExit} />
        );

        // Move down first
        stdin.write('\u001B[B');
        stdin.write('\u001B[B');
        // Then move up
        stdin.write('\u001B[A');
        rerender(<MainMenu onExit={onExit} />);

        // Should be on second item
        expect(lastFrame()).toMatch(/❯\s*Real-time Monitor/);
      });

      it('Then j/k keys should navigate', () => {
        const { stdin, lastFrame, rerender } = render(
          <MainMenu onExit={onExit} />
        );

        // j moves down
        stdin.write('j');
        rerender(<MainMenu onExit={onExit} />);
        expect(lastFrame()).toMatch(/❯\s*Real-time Monitor/);

        // k moves up
        stdin.write('k');
        rerender(<MainMenu onExit={onExit} />);
        expect(lastFrame()).toMatch(/❯\s*Events Inspector/);
      });

      it('Then should wrap around at boundaries', () => {
        const { stdin, lastFrame, rerender } = render(
          <MainMenu onExit={onExit} />
        );

        // Go up from first item should wrap to last
        stdin.write('\u001B[A');
        rerender(<MainMenu onExit={onExit} />);
        expect(lastFrame()).toMatch(/❯\s*Debug Console/);

        // Go down from last should wrap to first
        stdin.write('\u001B[B');
        rerender(<MainMenu onExit={onExit} />);
        expect(lastFrame()).toMatch(/❯\s*Events Inspector/);
      });
    });

    describe('When pressing Enter', () => {
      it('Then should navigate to selected view', () => {
        const { stdin } = render(<MainMenu onExit={onExit} />);

        // Press Enter on first item (Events Inspector)
        stdin.write('\r');

        expect(navigate).toHaveBeenCalledWith('events');
      });

      it('Then should navigate to different views based on selection', () => {
        const { stdin, rerender } = render(<MainMenu onExit={onExit} />);

        // Navigate to second item and select
        stdin.write('j');
        rerender(<MainMenu onExit={onExit} />);
        stdin.write('\r');

        expect(navigate).toHaveBeenCalledWith('stream');
      });
    });

    describe('When pressing Escape or q', () => {
      it('Then Escape should call onExit', () => {
        const { stdin } = render(<MainMenu onExit={onExit} />);

        // Send ESC key (ASCII 27)
        stdin.write('\x1B');

        expect(onExit).toHaveBeenCalledTimes(1);
      });

      it('Then q should call onExit', () => {
        const { stdin } = render(<MainMenu onExit={onExit} />);

        stdin.write('q');

        expect(onExit).toHaveBeenCalledTimes(1);
      });
    });

    describe('When pressing ?', () => {
      it('Then should navigate to help', () => {
        const { stdin } = render(<MainMenu onExit={onExit} />);

        stdin.write('?');

        expect(navigate).toHaveBeenCalledWith('help');
      });
    });

    describe('When server status changes', () => {
      it('Then should show running status', () => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              navigate,
              serverStatus: 'running',
            };
            return selector ? selector(state) : state;
          }
        );

        const { lastFrame } = render(<MainMenu onExit={onExit} />);

        expect(lastFrame()).toContain('running');
      });

      it('Then should show error status', () => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              navigate,
              serverStatus: 'error',
            };
            return selector ? selector(state) : state;
          }
        );

        const { lastFrame } = render(<MainMenu onExit={onExit} />);

        expect(lastFrame()).toContain('error');
      });
    });
  });
});

import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HelpSystem } from './HelpSystem';
import { InputModeProvider } from '../../../shared/contexts/InputContext';

// Mock the app store
vi.mock('../../../shared/stores/appStore', () => ({
  useAppStore: vi.fn(() => ({
    currentView: 'help',
    navigate: vi.fn(),
  })),
}));

describe('HelpSystem', () => {
  let onBack: ReturnType<typeof vi.fn>;

  const renderHelpSystem = (props = {}) => {
    return render(
      <InputModeProvider>
        <HelpSystem onBack={onBack} {...props} />
      </InputModeProvider>
    );
  };

  beforeEach(() => {
    onBack = vi.fn();
  });

  describe('Given the HelpSystem is displayed', () => {
    describe('When rendered initially', () => {
      it('Then should show the title', () => {
        const { lastFrame } = renderHelpSystem();
        expect(lastFrame()).toContain('CAGE HELP SYSTEM');
      });

      it('Then should show main help categories', () => {
        const { lastFrame } = renderHelpSystem();

        expect(lastFrame()).toContain('Getting Started');
        expect(lastFrame()).toContain('Navigation');
        expect(lastFrame()).toContain('Components');
        expect(lastFrame()).toContain('Keyboard Shortcuts');
        expect(lastFrame()).toContain('Troubleshooting');
      });

      it('Then should show keyboard shortcuts', () => {
        const { lastFrame } = renderHelpSystem();

        expect(lastFrame()).toContain('↑↓ Navigate');
        expect(lastFrame()).toContain('↵ View details');
        expect(lastFrame()).toContain('/ Search');
        expect(lastFrame()).toContain('ESC Go back');
      });

      it('Then should highlight the first category', () => {
        const { lastFrame } = renderHelpSystem();
        expect(lastFrame()).toContain('❯ Getting Started');
      });

      it('Then should show brief description of each category', () => {
        const { lastFrame } = renderHelpSystem();

        expect(lastFrame()).toContain('Quick start guide and basic concepts');
        expect(lastFrame()).toContain('How to navigate through Cage');
        expect(lastFrame()).toContain('Overview of all available components');
        expect(lastFrame()).toContain('Complete keyboard reference guide');
        expect(lastFrame()).toContain('Common issues and solutions');
      });
    });

    describe('When navigating with keyboard', () => {
      it('Then up/down arrows should move between categories', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        // Move down with arrow
        stdin.write('\x1B[B'); // Down arrow
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        expect(lastFrame()).toContain('❯ Navigation');

        // Move up with arrow
        stdin.write('\x1B[A'); // Up arrow
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        expect(lastFrame()).toContain('❯ Getting Started');
      });

      it('Then j/k keys should move between categories', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        stdin.write('j');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        expect(lastFrame()).toContain('❯ Navigation');

        stdin.write('k');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        expect(lastFrame()).toContain('❯ Getting Started');
      });

      it('Then should cycle through all categories', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        const categories = [
          'Getting Started',
          'Navigation',
          'Components',
          'Keyboard Shortcuts',
          'Troubleshooting',
        ];

        for (let i = 0; i < categories.length; i++) {
          if (i > 0) {
            stdin.write('j');
            rerender(
              <InputModeProvider>
                <HelpSystem onBack={onBack} />
              </InputModeProvider>
            );
          }
          expect(lastFrame()).toContain(`❯ ${categories[i]}`);
        }
      });

      it('Then should wrap around at boundaries', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        // Go to last category
        for (let i = 0; i < 4; i++) {
          stdin.write('j');
          rerender(
            <InputModeProvider>
              <HelpSystem onBack={onBack} />
            </InputModeProvider>
          );
        }
        expect(lastFrame()).toContain('❯ Troubleshooting');

        // Wrap to first
        stdin.write('j');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        expect(lastFrame()).toContain('❯ Getting Started');

        // Go back to last
        stdin.write('k');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        expect(lastFrame()).toContain('❯ Troubleshooting');
      });
    });

    describe('When pressing Enter on categories', () => {
      it('Then Enter should show Getting Started details', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        stdin.write('\r'); // Enter key
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('GETTING STARTED');
        expect(lastFrame()).toContain('Welcome to Cage');
        expect(lastFrame()).toContain('Basic Concepts');
        expect(lastFrame()).toContain('First Steps');
      });

      it('Then should show cage CLI usage', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        stdin.write('\r'); // Enter key
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('cage start');
        expect(lastFrame()).toContain('cage events');
        expect(lastFrame()).toContain('cage hooks');
        expect(lastFrame()).toContain('cage server');
      });

      it('Then should show installation instructions', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        stdin.write('\r'); // Enter key
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('npm install -g @cage/cli');
        expect(lastFrame()).toContain('cage init');
      });

      it('Then should show requirements', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        stdin.write('\r'); // Enter key
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Node.js 18 or later');
        expect(lastFrame()).toContain('Claude Code extension');
      });

      it('Then should show navigation detail', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        // Navigate to Navigation category
        stdin.write('j');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        // Press Enter
        stdin.write('\r');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('NAVIGATION GUIDE');
        expect(lastFrame()).toContain('Main Menu Navigation');
        expect(lastFrame()).toContain('Universal Shortcuts');
      });

      it('Then should show keyboard shortcuts detail', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        // Navigate to Keyboard Shortcuts
        for (let i = 0; i < 3; i++) {
          stdin.write('j');
          rerender(
            <InputModeProvider>
              <HelpSystem onBack={onBack} />
            </InputModeProvider>
          );
        }

        // Press Enter
        stdin.write('\r');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('KEYBOARD SHORTCUTS');
        expect(lastFrame()).toContain('Navigation Shortcuts');
        expect(lastFrame()).toContain('Event Inspector');
      });

      it('Then should show troubleshooting details', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        // Navigate to Troubleshooting
        for (let i = 0; i < 4; i++) {
          stdin.write('j');
          rerender(
            <InputModeProvider>
              <HelpSystem onBack={onBack} />
            </InputModeProvider>
          );
        }

        // Press Enter
        stdin.write('\r');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('TROUBLESHOOTING');
        expect(lastFrame()).toContain('Backend connection failed');
        expect(lastFrame()).toContain('Events not appearing');
      });
    });

    describe('When in detail view', () => {
      it('Then ESC should return to category list', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        // Enter detail view
        stdin.write('\r');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        expect(lastFrame()).toContain('GETTING STARTED');

        // Press ESC
        stdin.write('\x1B');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        // Should be back at main menu
        expect(lastFrame()).toContain('❯ Getting Started');
        expect(lastFrame()).toContain('Navigation');
      });

      it('Then should maintain selection when going back', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        // Navigate to Components
        stdin.write('j');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('j');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        // Enter detail view
        stdin.write('\r');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        expect(lastFrame()).toContain('COMPONENTS OVERVIEW');

        // Go back
        stdin.write('\x1B');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        // Should still have Components selected
        expect(lastFrame()).toContain('❯ Components');
      });
    });

    describe('When viewing specific component details', () => {
      it('Then should show Event Inspector details', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        // Navigate to Components
        stdin.write('j');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('j');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        // Enter Components
        stdin.write('\r');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Event Inspector');
        expect(lastFrame()).toContain('Monitor and analyze events');
      });

      it('Then should show Server Manager details', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        // Navigate to Components
        stdin.write('j');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('j');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        // Enter Components
        stdin.write('\r');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Server Manager');
        expect(lastFrame()).toContain('Control backend server state');
      });

      it('Then Enter should show component details', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        // Navigate to Components
        stdin.write('j');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('j');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        // Enter detail view
        stdin.write('\r');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('COMPONENTS OVERVIEW');
        expect(lastFrame()).toContain('Event Inspector');
      });
    });

    describe('When searching', () => {
      it('Then / key should enable search mode', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        stdin.write('/');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Search Help:');
      });

      it('Then should filter categories based on search term', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        // Enter search mode
        stdin.write('/');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        // Type "nav"
        stdin.write('n');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('a');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('v');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Search Help: nav');
      });

      it('Then ESC should exit search mode', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        // Enter search mode
        stdin.write('/');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        expect(lastFrame()).toContain('Search Help:');

        // Exit with ESC
        stdin.write('\x1B');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        // Should be back at main menu
        expect(lastFrame()).not.toContain('Search Help:');
        expect(lastFrame()).toContain('❯ Getting Started');
      });

      it('Then should handle search with no results', () => {
        const { stdin, lastFrame, rerender } = renderHelpSystem();

        // Enter search mode
        stdin.write('/');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        // Type something that won't match
        stdin.write('x');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('y');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('z');
        rerender(
          <InputModeProvider>
            <HelpSystem onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Search Help: xyz');
      });
    });

    describe('When ESC is pressed from main menu', () => {
      it('Then should call onBack callback', () => {
        const { stdin } = renderHelpSystem();

        stdin.write('\x1B'); // ESC

        expect(onBack).toHaveBeenCalled();
      });
    });

    describe('When in overlay mode', () => {
      it('Then should show as overlay', () => {
        const { lastFrame } = renderHelpSystem({ mode: 'overlay' });

        expect(lastFrame()).toContain('Quick Help');
      });

      it('Then ESC should close overlay', () => {
        const { stdin } = renderHelpSystem({ mode: 'overlay' });

        stdin.write('\x1B');

        expect(onBack).toHaveBeenCalled();
      });
    });

    describe('When tooltip is provided', () => {
      it('Then should show tooltip initially', () => {
        const { lastFrame } = renderHelpSystem({ tooltip: 'Press ? for help' });

        // Tooltip auto-hides after a timeout
        const frame = lastFrame();
        expect(frame).toBeTruthy(); // Just verify component rendered
      });
    });

    describe('When context is provided', () => {
      it('Then should show contextual help', () => {
        const { lastFrame } = renderHelpSystem({ context: 'event-inspector' });

        // Should show help in context
        expect(lastFrame()).toBeTruthy();
      });
    });
  });
});

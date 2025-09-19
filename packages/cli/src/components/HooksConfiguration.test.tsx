import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HooksConfiguration } from './HooksConfiguration';
import { useAppStore } from '../stores/appStore';

// Mock the stores
vi.mock('../stores/appStore');

describe('HooksConfiguration', () => {
  let onBack: ReturnType<typeof vi.fn>;
  let mockHooksStatus: any;

  beforeEach(() => {
    onBack = vi.fn();

    // Create mock hooks status
    mockHooksStatus = {
      isInstalled: true,
      settingsPath: '/test/.claude/settings.json',
      backendPort: 3790,
      backendEnabled: true,
      installedHooks: [
        { name: 'PreToolUse', enabled: true, eventCount: 125 },
        { name: 'PostToolUse', enabled: true, eventCount: 98 },
        { name: 'UserPromptSubmit', enabled: true, eventCount: 67 },
        { name: 'SessionStart', enabled: true, eventCount: 12 },
        { name: 'SessionEnd', enabled: true, eventCount: 11 },
        { name: 'Notification', enabled: false, eventCount: 0 },
        { name: 'Stop', enabled: true, eventCount: 5 },
        { name: 'SubagentStop', enabled: true, eventCount: 3 },
        { name: 'PreCompact', enabled: true, eventCount: 2 },
        { name: 'Status', enabled: true, eventCount: 1 },
      ],
      totalEvents: 324,
    };

    // Mock the app store
    (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
      const state = {
        hooksStatus: mockHooksStatus,
        refreshHooksStatus: vi.fn(),
        installHooks: vi.fn(),
        uninstallHooks: vi.fn(),
        toggleHook: vi.fn(),
        verifyHooks: vi.fn(),
      };
      return selector ? selector(state) : state;
    });
  });

  describe('Given the HooksConfiguration is displayed', () => {
    describe('When rendered initially', () => {
      it('Then should show the title', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toContain('HOOKS CONFIGURATION');
      });

      it('Then should show installation status when hooks are installed', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Status: Installed');
        expect(frame).toContain('Settings: /test/.claude/settings.json');
        expect(frame).toContain('Backend Port: 3790');
        expect(frame).toContain('Backend: Enabled');
      });

      it('Then should show total event count', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toContain('Total Events: 324');
      });

      it('Then should show list of hooks with their status', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('PreToolUse');
        expect(frame).toContain('PostToolUse');
        expect(frame).toContain('UserPromptSubmit');
        expect(frame).toContain('✓'); // Enabled indicator
        expect(frame).toContain('✗'); // Disabled indicator (for Notification)
      });

      it('Then should show event counts for each hook', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('125');
        expect(frame).toContain('98');
        expect(frame).toContain('67');
      });

      it('Then should show action buttons', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Install');
        expect(frame).toContain('Uninstall');
        expect(frame).toContain('Verify');
        expect(frame).toContain('Refresh');
      });

      it('Then should show keyboard shortcuts', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('↑↓ Navigate');
        expect(frame).toContain('Space Toggle');
        expect(frame).toContain('↵ Action');
        expect(frame).toContain('ESC Back');
      });

      it('Then should highlight the first hook', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*PreToolUse/);
      });
    });

    describe('When hooks are not installed', () => {
      beforeEach(() => {
        mockHooksStatus.isInstalled = false;
        mockHooksStatus.installedHooks = [];
        mockHooksStatus.settingsPath = null;
        mockHooksStatus.totalEvents = 0;

        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            hooksStatus: mockHooksStatus,
            refreshHooksStatus: vi.fn(),
            installHooks: vi.fn(),
            uninstallHooks: vi.fn(),
            toggleHook: vi.fn(),
            verifyHooks: vi.fn(),
          };
          return selector ? selector(state) : state;
        });
      });

      it('Then should show not installed status', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Status: Not Installed');
      });

      it('Then should show setup wizard option', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toContain('Setup Wizard');
      });

      it('Then should show installation instructions', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('No hooks installed');
        expect(frame).toContain('Press i to install');
      });

      it('Then should not show hook list', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).not.toContain('PreToolUse');
        expect(frame).not.toContain('PostToolUse');
      });
    });

    describe('When navigating hooks list', () => {
      it('Then up/down arrows should move between hooks', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('\u001B[B'); // Down arrow
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*PostToolUse/);
      });

      it('Then j/k keys should move between hooks', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('j'); // Down
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*PostToolUse/);

        stdin.write('k'); // Up
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*PreToolUse/);
      });

      it('Then should cycle through all hooks', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        // Navigate through several hooks
        stdin.write('j'); // PostToolUse
        rerender(<HooksConfiguration onBack={onBack} />);
        expect(lastFrame()).toMatch(/❯.*PostToolUse/);

        stdin.write('j'); // UserPromptSubmit
        rerender(<HooksConfiguration onBack={onBack} />);
        expect(lastFrame()).toMatch(/❯.*UserPromptSubmit/);

        stdin.write('j'); // SessionStart
        rerender(<HooksConfiguration onBack={onBack} />);
        expect(lastFrame()).toMatch(/❯.*SessionStart/);
      });

      it('Then should wrap around at boundaries', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        // Go up from first hook (should wrap to last)
        stdin.write('\u001B[A'); // Up arrow
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Status/);
      });
    });

    describe('When toggling hooks', () => {
      it('Then Space should toggle hook enabled state', () => {
        const toggleHook = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            hooksStatus: mockHooksStatus,
            refreshHooksStatus: vi.fn(),
            installHooks: vi.fn(),
            uninstallHooks: vi.fn(),
            toggleHook,
            verifyHooks: vi.fn(),
          };
          return selector ? selector(state) : state;
        });

        const { stdin } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write(' '); // Space to toggle

        expect(toggleHook).toHaveBeenCalledWith('PreToolUse');
      });

      it('Then should show visual feedback when toggling', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        // Navigate to disabled hook (Notification)
        for (let i = 0; i < 5; i++) {
          stdin.write('j');
          rerender(<HooksConfiguration onBack={onBack} />);
        }

        // Should show disabled state
        expect(lastFrame()).toMatch(/❯ ✗ Notification/);
      });

      it('Then should update hook status after toggle', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        // Mock the hook being toggled
        mockHooksStatus.installedHooks[0].enabled = false;

        stdin.write(' '); // Toggle first hook
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯ ✗ PreToolUse/);
      });
    });

    describe('When using action buttons', () => {
      it('Then Tab should navigate to action area', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('\t'); // Tab to actions
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Install/);
      });

      it('Then should navigate between action buttons', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('\t'); // Tab to actions
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('\u001B[C'); // Right arrow
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toMatch(/❯.*Uninstall/);
      });

      it('Then Install should trigger installation', () => {
        const installHooks = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            hooksStatus: mockHooksStatus,
            refreshHooksStatus: vi.fn(),
            installHooks,
            uninstallHooks: vi.fn(),
            toggleHook: vi.fn(),
            verifyHooks: vi.fn(),
          };
          return selector ? selector(state) : state;
        });

        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('\t'); // Tab to actions
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('\r'); // Enter Install
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(installHooks).toHaveBeenCalled();
      });

      it('Then Uninstall should trigger uninstallation', () => {
        const uninstallHooks = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            hooksStatus: mockHooksStatus,
            refreshHooksStatus: vi.fn(),
            installHooks: vi.fn(),
            uninstallHooks,
            toggleHook: vi.fn(),
            verifyHooks: vi.fn(),
          };
          return selector ? selector(state) : state;
        });

        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('\t'); // Tab to actions
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('\u001B[C'); // Right to Uninstall
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('\r'); // Enter Uninstall
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(uninstallHooks).toHaveBeenCalled();
      });

      it('Then Verify should trigger verification', () => {
        const verifyHooks = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            hooksStatus: mockHooksStatus,
            refreshHooksStatus: vi.fn(),
            installHooks: vi.fn(),
            uninstallHooks: vi.fn(),
            toggleHook: vi.fn(),
            verifyHooks,
          };
          return selector ? selector(state) : state;
        });

        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('\t'); // Tab to actions
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('\u001B[C'); // Right
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('\u001B[C'); // Right to Verify
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('\r'); // Enter Verify
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(verifyHooks).toHaveBeenCalled();
      });

      it('Then Refresh should update status', () => {
        const refreshHooksStatus = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            hooksStatus: mockHooksStatus,
            refreshHooksStatus,
            installHooks: vi.fn(),
            uninstallHooks: vi.fn(),
            toggleHook: vi.fn(),
            verifyHooks: vi.fn(),
          };
          return selector ? selector(state) : state;
        });

        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('\t'); // Tab to actions
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('\u001B[C'); // Right
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('\u001B[C'); // Right
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('\u001B[C'); // Right to Refresh
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('\r'); // Enter Refresh
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(refreshHooksStatus).toHaveBeenCalled();
      });
    });

    describe('When displaying hook details', () => {
      it('Then Enter should show hook details', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('\r'); // Enter to view details
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toContain('Hook Details: PreToolUse');
      });

      it('Then should show hook event count and status', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('\r'); // Enter to view details
        rerender(<HooksConfiguration onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Events: 125');
        expect(frame).toContain('Status: Enabled');
      });

      it('Then should show hook configuration if available', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('\r'); // Enter to view details
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toContain('Configuration');
      });

      it('Then Escape should close details view', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('\r'); // Enter to view details
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('\u001B'); // Escape to close
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).not.toContain('Hook Details');
      });
    });

    describe('When showing setup wizard', () => {
      beforeEach(() => {
        mockHooksStatus.isInstalled = false;
      });

      it('Then w should start setup wizard', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('w'); // Start wizard
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toContain('Setup Wizard');
      });

      it('Then should show step-by-step instructions', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('w'); // Start wizard
        rerender(<HooksConfiguration onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Step 1');
        expect(frame).toContain('Claude Code');
      });

      it('Then should allow navigation through steps', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('w'); // Start wizard
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('\u001B[C'); // Next step
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toContain('Step 2');
      });

      it('Then should allow installation from wizard', () => {
        const installHooks = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            hooksStatus: mockHooksStatus,
            refreshHooksStatus: vi.fn(),
            installHooks,
            uninstallHooks: vi.fn(),
            toggleHook: vi.fn(),
            verifyHooks: vi.fn(),
          };
          return selector ? selector(state) : state;
        });

        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('w'); // Start wizard
        rerender(<HooksConfiguration onBack={onBack} />);
        // Navigate to install step and trigger installation
        stdin.write('\r'); // Trigger install
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(installHooks).toHaveBeenCalled();
      });
    });

    describe('When filtering and searching', () => {
      it('Then / should start search mode', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('/');
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toContain('Search:');
      });

      it('Then should filter hooks by search term', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        // Start search
        stdin.write('/');
        rerender(<HooksConfiguration onBack={onBack} />);

        // Type "Tool"
        stdin.write('T');
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('o');
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('o');
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('l');
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toContain('Search: Tool');
      });

      it('Then Enter should apply search filter', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('/');
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('Tool');
        stdin.write('\r'); // Apply filter
        rerender(<HooksConfiguration onBack={onBack} />);

        // Should show filtered results
        expect(lastFrame()).toMatch(/PreToolUse|PostToolUse/);
      });

      it('Then should show only enabled hooks when filtering', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('f'); // Filter enabled only
        rerender(<HooksConfiguration onBack={onBack} />);

        const frame = lastFrame();
        expect(frame).toContain('PreToolUse');
        expect(frame).not.toContain('Notification'); // Disabled hook
      });

      it('Then should clear filter when requested', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('f'); // Filter enabled
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('c'); // Clear filter
        rerender(<HooksConfiguration onBack={onBack} />);

        const frame = lastFrame();
        expect(frame).toContain('Notification'); // Should show all hooks again
      });
    });

    describe('When handling loading states', () => {
      it('Then should show loading spinner during installation', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        // Mock loading state
        mockHooksStatus.isLoading = true;

        stdin.write('\t'); // Tab to actions
        rerender(<HooksConfiguration onBack={onBack} />);
        stdin.write('\r'); // Start install
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toContain('Installing');
      });

      it('Then should show progress during verification', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        // Mock verification in progress
        mockHooksStatus.isVerifying = true;

        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toContain('Verifying');
      });

      it('Then should show success message after installation', () => {
        const { lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        // Mock successful installation
        mockHooksStatus.lastOperation = { success: true, message: 'Hooks installed successfully' };

        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toContain('Hooks installed successfully');
      });

      it('Then should show error message on failure', () => {
        const { lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        // Mock failed operation
        mockHooksStatus.lastOperation = { success: false, message: 'Installation failed: Permission denied' };

        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toContain('Installation failed');
      });
    });

    describe('When handling keyboard shortcuts', () => {
      it('Then Escape should call onBack', () => {
        const { stdin } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('\u001B'); // Escape

        expect(onBack).toHaveBeenCalledTimes(1);
      });

      it('Then q should call onBack', () => {
        const { stdin } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('q');

        expect(onBack).toHaveBeenCalledTimes(1);
      });

      it('Then i should trigger quick install', () => {
        const installHooks = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            hooksStatus: mockHooksStatus,
            refreshHooksStatus: vi.fn(),
            installHooks,
            uninstallHooks: vi.fn(),
            toggleHook: vi.fn(),
            verifyHooks: vi.fn(),
          };
          return selector ? selector(state) : state;
        });

        const { stdin } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('i'); // Quick install

        expect(installHooks).toHaveBeenCalled();
      });

      it('Then u should trigger quick uninstall', () => {
        const uninstallHooks = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            hooksStatus: mockHooksStatus,
            refreshHooksStatus: vi.fn(),
            installHooks: vi.fn(),
            uninstallHooks,
            toggleHook: vi.fn(),
            verifyHooks: vi.fn(),
          };
          return selector ? selector(state) : state;
        });

        const { stdin } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('u'); // Quick uninstall

        expect(uninstallHooks).toHaveBeenCalled();
      });

      it('Then v should trigger quick verify', () => {
        const verifyHooks = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            hooksStatus: mockHooksStatus,
            refreshHooksStatus: vi.fn(),
            installHooks: vi.fn(),
            uninstallHooks: vi.fn(),
            toggleHook: vi.fn(),
            verifyHooks,
          };
          return selector ? selector(state) : state;
        });

        const { stdin } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('v'); // Quick verify

        expect(verifyHooks).toHaveBeenCalled();
      });

      it('Then r should trigger quick refresh', () => {
        const refreshHooksStatus = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector) => {
          const state = {
            hooksStatus: mockHooksStatus,
            refreshHooksStatus,
            installHooks: vi.fn(),
            uninstallHooks: vi.fn(),
            toggleHook: vi.fn(),
            verifyHooks: vi.fn(),
          };
          return selector ? selector(state) : state;
        });

        const { stdin } = render(<HooksConfiguration onBack={onBack} />);

        stdin.write('r'); // Quick refresh

        expect(refreshHooksStatus).toHaveBeenCalled();
      });
    });

    describe('When displaying statistics', () => {
      it('Then should show hook usage statistics', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('Total Events: 324');
        expect(frame).toContain('125'); // PreToolUse count
        expect(frame).toContain('98');  // PostToolUse count
      });

      it('Then should show enabled vs disabled counts', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);
        const frame = lastFrame();

        expect(frame).toContain('9/10'); // 9 enabled out of 10 total
      });

      it('Then should show most active hooks', () => {
        const { lastFrame } = render(<HooksConfiguration onBack={onBack} />);
        const frame = lastFrame();

        // PreToolUse should be highlighted as most active
        expect(frame).toMatch(/PreToolUse.*125/);
      });

      it('Then should update statistics after actions', () => {
        const { stdin, lastFrame, rerender } = render(<HooksConfiguration onBack={onBack} />);

        // Toggle a hook and check if stats update
        stdin.write(' '); // Toggle hook
        mockHooksStatus.installedHooks[0].enabled = false;
        rerender(<HooksConfiguration onBack={onBack} />);

        expect(lastFrame()).toContain('8/10'); // Should be 8 enabled now
      });
    });
  });
});
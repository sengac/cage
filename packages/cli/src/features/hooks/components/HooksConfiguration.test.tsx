import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { HooksConfiguration } from './HooksConfiguration';
import { useAppStore } from '../../../shared/stores/appStore';
import { getRealHooksStatus } from '../utils/real-hooks';
import { InputModeProvider } from '../../../shared/contexts/InputContext';

// Mock the stores
vi.mock('../../../shared/stores/appStore');
vi.mock('../utils/real-hooks');

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

    // Mock getRealHooksStatus to return immediately
    vi.mocked(getRealHooksStatus).mockResolvedValue(mockHooksStatus);

    // Mock the app store
    (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(selector => {
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

  // Helper to render component and wait for async loading
  const renderAndWait = async () => {
    let component: any;

    await act(async () => {
      component = render(
        <InputModeProvider>
          <HooksConfiguration onBack={onBack} />
        </InputModeProvider>
      );

      // Wait for async useEffect to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    return component;
  };

  // Helper for input interaction - using React's act like working tests
  const sendInput = (component: any, input: string) => {
    act(() => {
      component.stdin.write(input);
      component.rerender(
        <InputModeProvider>
          <HooksConfiguration onBack={onBack} />
        </InputModeProvider>
      );
    });
  };

  describe('Given the HooksConfiguration is displayed', () => {
    describe('When rendered initially', () => {
      it('Then should show hooks summary', async () => {
        const component = await renderAndWait();

        // Component doesn't have its own title - title comes from FullScreenLayout
        expect(component.lastFrame()).toContain('Hooks: 9/10 enabled');
      });

      it('Then should show installation status when hooks are installed', async () => {
        const component = await renderAndWait();
        const frame = component.lastFrame();

        expect(frame).toContain('Hooks: 9/10 enabled');
      });

      it('Then should show total event count', async () => {
        const component = await renderAndWait();

        expect(component.lastFrame()).toContain('Total Events: 324');
      });

      it('Then should show list of hooks with their status', async () => {
        const component = await renderAndWait();
        const frame = component.lastFrame();

        expect(frame).toContain('PreToolUse');
        expect(frame).toContain('PostToolUse');
        expect(frame).toContain('UserPromptSubmit');
        expect(frame).toContain('✔'); // Enabled indicator
        expect(frame).toContain('✘'); // Disabled indicator (for Notification)
      });

      it('Then should show event counts for each hook', async () => {
        const component = await renderAndWait();
        const frame = component.lastFrame();

        expect(frame).toContain('125');
        expect(frame).toContain('98');
        expect(frame).toContain('67');
      });

      it('Then should show action buttons', async () => {
        const component = await renderAndWait();
        const frame = component.lastFrame();

        expect(frame).toContain('Install');
        expect(frame).toContain('Uninstall');
        expect(frame).toContain('Verify');
        expect(frame).toContain('Refresh');
      });

      it('Then should show hooks information', async () => {
        const component = await renderAndWait();
        const frame = component.lastFrame();

        // Should show hook count and total events from mock data
        expect(frame).toContain('Hooks: 9/10 enabled');
        expect(frame).toContain('Total Events: 324');
      });

      it('Then should highlight the first hook', async () => {
        const component = await renderAndWait();

        expect(component.lastFrame()).toMatch(/❯.*PreToolUse/);
      });
    });

    describe('When hooks are not installed', () => {
      beforeEach(() => {
        mockHooksStatus.isInstalled = false;
        mockHooksStatus.installedHooks = [];
        mockHooksStatus.settingsPath = null;
        mockHooksStatus.totalEvents = 0;

        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              hooksStatus: mockHooksStatus,
              refreshHooksStatus: vi.fn(),
              installHooks: vi.fn(),
              uninstallHooks: vi.fn(),
              toggleHook: vi.fn(),
              verifyHooks: vi.fn(),
            };
            return selector ? selector(state) : state;
          }
        );
      });

      it('Then should show not installed status', async () => {
        const component = await renderAndWait();
        const frame = component.lastFrame();

        expect(frame).toContain('Status: Not Installed');
      });

      it('Then should show setup wizard option', async () => {
        const component = await renderAndWait();

        expect(component.lastFrame()).toContain('Setup Wizard');
      });

      it('Then should show installation instructions', async () => {
        const component = await renderAndWait();
        const frame = component.lastFrame();

        expect(frame).toContain('No hooks installed');
        expect(frame).toContain('Setup Wizard');
      });

      it('Then should not show hook list', async () => {
        const component = await renderAndWait();
        const frame = component.lastFrame();

        expect(frame).not.toContain('PreToolUse');
        expect(frame).not.toContain('PostToolUse');
      });
    });

    describe('When navigating hooks list', () => {
      it('Then up/down arrows should move between hooks', async () => {
        const component = await renderAndWait();
        const { lastFrame } = component;

        // Initial state should show first hook highlighted
        expect(lastFrame()).toMatch(/❯.*PreToolUse/);

        // Move down to next hook
        sendInput(component, '\u001B[B'); // Down arrow
        expect(lastFrame()).toMatch(/❯.*PostToolUse/);
      });

      it('Then j/k keys should move between hooks', async () => {
        const component = await renderAndWait();
        const { lastFrame } = component;

        // Move down with j
        sendInput(component, 'j'); // Down
        expect(lastFrame()).toMatch(/❯.*PostToolUse/);

        // Move up with k
        sendInput(component, 'k'); // Up
        expect(lastFrame()).toMatch(/❯.*PreToolUse/);
      });

      it('Then should cycle through all hooks', async () => {
        const component = await renderAndWait();
        const { lastFrame } = component;

        // Navigate through several hooks
        sendInput(component, 'j'); // PostToolUse
        expect(lastFrame()).toMatch(/❯.*PostToolUse/);

        sendInput(component, 'j'); // UserPromptSubmit
        expect(lastFrame()).toMatch(/❯.*UserPromptSubmit/);

        sendInput(component, 'j'); // SessionStart
        expect(lastFrame()).toMatch(/❯.*SessionStart/);
      });

      it('Then should wrap around at boundaries', async () => {
        const component = await renderAndWait();
        const { lastFrame } = component;

        // Go up from first hook (should wrap to last)
        sendInput(component, '\u001B[A'); // Up arrow
        expect(lastFrame()).toMatch(/❯.*Status/);
      });
    });

    describe('When toggling hooks', () => {
      it('Then Space should toggle hook enabled state', async () => {
        const toggleHook = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              hooksStatus: mockHooksStatus,
              refreshHooksStatus: vi.fn(),
              installHooks: vi.fn(),
              uninstallHooks: vi.fn(),
              toggleHook,
              verifyHooks: vi.fn(),
            };
            return selector ? selector(state) : state;
          }
        );

        const component = await renderAndWait();

        sendInput(component, ' '); // Space to toggle

        expect(toggleHook).toHaveBeenCalledWith('PreToolUse');
      });

      it('Then should show visual feedback when toggling', async () => {
        const component = await renderAndWait();
        const { stdin, lastFrame, rerender } = component;

        // Navigate to disabled hook (Notification)
        for (let i = 0; i < 5; i++) {
          stdin.write('j');
          await act(() => {
            rerender(
              <InputModeProvider>
                <HooksConfiguration onBack={onBack} />
              </InputModeProvider>
            );
          });
        }

        // Should show disabled state
        expect(lastFrame()).toMatch(/❯ ✘ Notification/);
      });

      it('Then should update hook status after toggle', async () => {
        const { stdin, lastFrame, rerender } = await renderAndWait();

        // Mock the hook being toggled
        mockHooksStatus.installedHooks[0].enabled = false;

        stdin.write(' '); // Toggle first hook
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toMatch(/❯ ✘ PreToolUse/);
      });
    });

    describe('When using action buttons', () => {
      it('Then Tab should navigate to action area', async () => {
        const component = await renderAndWait();
        const { lastFrame } = component;

        sendInput(component, '\t'); // Tab to actions

        expect(lastFrame()).toMatch(/❯.*Install/);
      });

      it('Then should navigate between action buttons', async () => {
        const component = await renderAndWait();
        const { lastFrame } = component;

        sendInput(component, '\t'); // Tab to actions
        sendInput(component, '\u001B[C'); // Right arrow

        expect(lastFrame()).toMatch(/❯.*Uninstall/);
      });

      it('Then Install should trigger installation', async () => {
        const installHooks = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              hooksStatus: mockHooksStatus,
              refreshHooksStatus: vi.fn(),
              installHooks,
              uninstallHooks: vi.fn(),
              toggleHook: vi.fn(),
              verifyHooks: vi.fn(),
            };
            return selector ? selector(state) : state;
          }
        );

        const { stdin, lastFrame, rerender } = await renderAndWait();

        stdin.write('\t'); // Tab to actions
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\r'); // Enter Install
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        expect(installHooks).toHaveBeenCalled();
      });

      it('Then Uninstall should trigger uninstallation', async () => {
        const uninstallHooks = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              hooksStatus: mockHooksStatus,
              refreshHooksStatus: vi.fn(),
              installHooks: vi.fn(),
              uninstallHooks,
              toggleHook: vi.fn(),
              verifyHooks: vi.fn(),
            };
            return selector ? selector(state) : state;
          }
        );

        const { stdin, lastFrame, rerender } = await renderAndWait();

        stdin.write('\t'); // Tab to actions
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\u001B[C'); // Right to Uninstall
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\r'); // Enter Uninstall
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        expect(uninstallHooks).toHaveBeenCalled();
      });

      it('Then Verify should trigger verification', async () => {
        const verifyHooks = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              hooksStatus: mockHooksStatus,
              refreshHooksStatus: vi.fn(),
              installHooks: vi.fn(),
              uninstallHooks: vi.fn(),
              toggleHook: vi.fn(),
              verifyHooks,
            };
            return selector ? selector(state) : state;
          }
        );

        const { stdin, lastFrame, rerender } = await renderAndWait();

        stdin.write('\t'); // Tab to actions
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\u001B[C'); // Right
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\u001B[C'); // Right to Verify
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\r'); // Enter Verify
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        expect(verifyHooks).toHaveBeenCalled();
      });

      it('Then Refresh should update status', async () => {
        const refreshHooksStatus = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              hooksStatus: mockHooksStatus,
              refreshHooksStatus,
              installHooks: vi.fn(),
              uninstallHooks: vi.fn(),
              toggleHook: vi.fn(),
              verifyHooks: vi.fn(),
            };
            return selector ? selector(state) : state;
          }
        );

        const { stdin, lastFrame, rerender } = await renderAndWait();

        stdin.write('\t'); // Tab to actions
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\u001B[C'); // Right
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\u001B[C'); // Right
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\u001B[C'); // Right to Refresh
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\r'); // Enter Refresh
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        expect(refreshHooksStatus).toHaveBeenCalled();
      });
    });

    describe('When displaying hook details', () => {
      it('Then Enter should show hook details', async () => {
        const { stdin, lastFrame, rerender } = await renderAndWait();

        stdin.write('\r'); // Enter to view details
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Hook Details: PreToolUse');
      });

      it('Then should show hook event count and status', async () => {
        const { stdin, lastFrame, rerender } = await renderAndWait();

        stdin.write('\r'); // Enter to view details
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        const frame = lastFrame();

        expect(frame).toContain('Events: 125');
        expect(frame).toContain('Status: Enabled');
      });

      it('Then should show hook configuration if available', async () => {
        const { stdin, lastFrame, rerender } = await renderAndWait();

        stdin.write('\r'); // Enter to view details
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Configuration');
      });

      it('Then Escape should close details view', async () => {
        const { stdin, lastFrame, rerender } = await renderAndWait();

        stdin.write('\r'); // Enter to view details
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\u001B'); // Escape to close
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).not.toContain('Hook Details');
      });
    });

    describe('When showing setup wizard', () => {
      beforeEach(() => {
        mockHooksStatus.isInstalled = false;
      });

      it('Then w should start setup wizard', async () => {
        const { stdin, lastFrame, rerender } = await renderAndWait();

        stdin.write('w'); // Start wizard
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Setup Wizard');
      });

    });

    describe('When filtering and searching', () => {
      it('Then / should start search mode', async () => {
        const { stdin, lastFrame, rerender } = await renderAndWait();

        stdin.write('/');
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Search:');
      });


      it('Then Enter should apply search filter', async () => {
        const { stdin, lastFrame, rerender } = await renderAndWait();

        stdin.write('/');
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('Tool');
        stdin.write('\r'); // Apply filter
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        // Should show filtered results
        expect(lastFrame()).toMatch(/PreToolUse|PostToolUse/);
      });

      it('Then should show only enabled hooks when filtering', async () => {
        const { stdin, lastFrame, rerender } = await renderAndWait();

        stdin.write('f'); // Filter enabled only
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        const frame = lastFrame();
        expect(frame).toContain('PreToolUse');
        expect(frame).not.toContain('Notification'); // Disabled hook
      });

      it('Then should clear filter when requested', async () => {
        const { stdin, lastFrame, rerender } = await renderAndWait();

        stdin.write('f'); // Filter enabled
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('c'); // Clear filter
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        const frame = lastFrame();
        expect(frame).toContain('Notification'); // Should show all hooks again
      });
    });

    describe('When handling loading states', () => {
      it('Then should show loading spinner during installation', async () => {
        const { stdin, lastFrame, rerender } = await renderAndWait();

        // Mock loading state
        mockHooksStatus.isLoading = true;

        stdin.write('\t'); // Tab to actions
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\r'); // Start install
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Installing');
      });

      it('Then should show progress during verification', async () => {
        const { stdin, lastFrame, rerender } = await renderAndWait();

        // Mock verification in progress
        mockHooksStatus.isVerifying = true;

        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Verifying');
      });

    });

    describe('When handling keyboard shortcuts', () => {
      it('Then Escape should call onBack', async () => {
        const { stdin } = await renderAndWait();

        stdin.write('\u001B'); // Escape

        expect(onBack).toHaveBeenCalledTimes(1);
      });

      it('Then q should call onBack', async () => {
        const component = await renderAndWait();

        sendInput(component, 'q');

        expect(onBack).toHaveBeenCalledTimes(1);
      });

      it('Then i should trigger quick install', async () => {
        const installHooks = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              hooksStatus: mockHooksStatus,
              refreshHooksStatus: vi.fn(),
              installHooks,
              uninstallHooks: vi.fn(),
              toggleHook: vi.fn(),
              verifyHooks: vi.fn(),
            };
            return selector ? selector(state) : state;
          }
        );

        const component = await renderAndWait();

        sendInput(component, 'i'); // Quick install

        expect(installHooks).toHaveBeenCalled();
      });

      it('Then u should trigger quick uninstall', async () => {
        const uninstallHooks = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              hooksStatus: mockHooksStatus,
              refreshHooksStatus: vi.fn(),
              installHooks: vi.fn(),
              uninstallHooks,
              toggleHook: vi.fn(),
              verifyHooks: vi.fn(),
            };
            return selector ? selector(state) : state;
          }
        );

        const component = await renderAndWait();

        sendInput(component, 'u'); // Quick uninstall

        expect(uninstallHooks).toHaveBeenCalled();
      });

      it('Then v should trigger quick verify', async () => {
        const verifyHooks = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              hooksStatus: mockHooksStatus,
              refreshHooksStatus: vi.fn(),
              installHooks: vi.fn(),
              uninstallHooks: vi.fn(),
              toggleHook: vi.fn(),
              verifyHooks,
            };
            return selector ? selector(state) : state;
          }
        );

        const component = await renderAndWait();

        sendInput(component, 'v'); // Quick verify

        expect(verifyHooks).toHaveBeenCalled();
      });

      it('Then r should trigger quick refresh', async () => {
        const refreshHooksStatus = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              hooksStatus: mockHooksStatus,
              refreshHooksStatus,
              installHooks: vi.fn(),
              uninstallHooks: vi.fn(),
              toggleHook: vi.fn(),
              verifyHooks: vi.fn(),
            };
            return selector ? selector(state) : state;
          }
        );

        const component = await renderAndWait();

        sendInput(component, 'r'); // Quick refresh

        expect(refreshHooksStatus).toHaveBeenCalled();
      });
    });

    describe('When displaying statistics', () => {
      it('Then should show hook usage statistics', async () => {
        const component = await renderAndWait();
        const frame = component.lastFrame();

        expect(frame).toContain('Total Events: 324');
        expect(frame).toContain('125'); // PreToolUse count
        expect(frame).toContain('98'); // PostToolUse count
      });

      it('Then should show enabled vs disabled counts', async () => {
        const component = await renderAndWait();
        const frame = component.lastFrame();

        expect(frame).toContain('9/10'); // 9 enabled out of 10 total
      });

      it('Then should show most active hooks', async () => {
        const component = await renderAndWait();
        const frame = component.lastFrame();

        // PreToolUse should be highlighted as most active
        expect(frame).toMatch(/PreToolUse.*125/);
      });

      it('Then should update statistics after actions', async () => {
        const { stdin, lastFrame, rerender } = await renderAndWait();

        // Toggle a hook and check if stats update
        stdin.write(' '); // Toggle hook
        mockHooksStatus.installedHooks[0].enabled = false;
        rerender(
          <InputModeProvider>
            <HooksConfiguration onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('8/10'); // Should be 8 enabled now
      });
    });
  });
});

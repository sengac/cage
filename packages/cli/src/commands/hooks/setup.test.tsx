import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from '@testing-library/react';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import React from 'react';
import { HooksSetupCommand } from './setup';

// Mock the dependencies
vi.mock('../../utils/config.js');
vi.mock('../../utils/hooks-installer.js');

import * as configUtils from '../../utils/config';
import * as hooksInstaller from '../../utils/hooks-installer';

describe('HooksSetupCommand', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'cage-hooks-setup-test-'));
    process.chdir(testDir);

    // Create cage.config.json
    await writeFile(
      join(testDir, 'cage.config.json'),
      JSON.stringify({
        port: 3790,
        host: 'localhost',
        enabled: true,
        logLevel: 'info',
      })
    );

    // Create .cage directory
    await mkdir(join(testDir, '.cage'), { recursive: true });

    // Setup mocks
    vi.mocked(configUtils.loadCageConfig).mockResolvedValue({
      port: 3790,
      host: 'localhost',
      enabled: true,
      logLevel: 'info',
      eventsDir: '.cage/events',
      maxEventSize: 1048576,
      enableMetrics: false,
      enableOfflineMode: true,
      offlineLogPath: '.cage/hooks-offline.log',
    });

    vi.mocked(hooksInstaller.installHooksLocally).mockImplementation(
      async _port => {
        // Simulate creating local .claude directory and settings
        const claudeDir = join(testDir, '.claude');
        await mkdir(claudeDir, { recursive: true });
        await writeFile(
          join(claudeDir, 'settings.json'),
          JSON.stringify({
            hooks: {
              PreToolUse: [
                {
                  matcher: '*',
                  hooks: [{ type: 'command', command: 'hook.mjs' }],
                },
              ],
              PostToolUse: [
                {
                  matcher: '*',
                  hooks: [{ type: 'command', command: 'hook.mjs' }],
                },
              ],
            },
          })
        );
      }
    );

    vi.mocked(hooksInstaller.getLocalClaudeSettingsPath).mockReturnValue(
      join(testDir, '.claude', 'settings.json')
    );

    // Mock process.exit
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('Acceptance Criteria: Configure Claude Code hooks in local project', () => {
    it('Given I have Cage initialized When I run cage hooks setup Then it uses local .claude directory', async () => {
      // When - render the command
      let component: ReturnType<typeof render>;

      await act(async () => {
        component = render(<HooksSetupCommand />);
      });

      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Then - verify success message
      expect(component!.lastFrame()).toContain('Hooks configured successfully');

      // Verify local .claude directory was used
      expect(
        vi.mocked(hooksInstaller.installHooksLocally)
      ).toHaveBeenCalledWith(3790);

      // Verify settings file was created
      expect(existsSync(join(testDir, '.claude', 'settings.json'))).toBe(true);
    });

    it('Given Cage is not initialized When I run cage hooks setup Then it shows error', async () => {
      // Setup - make loadCageConfig return null
      vi.mocked(configUtils.loadCageConfig).mockResolvedValue(null);

      // When
      let component: ReturnType<typeof render>;

      await act(async () => {
        component = render(<HooksSetupCommand />);
      });

      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Then
      expect(component!.lastFrame()).toContain('Cage is not initialized');
      expect(component!.lastFrame()).toContain('Please run "cage init" first');
    });

    it('Given hooks installation fails When I run cage hooks setup Then it shows error message', async () => {
      // Setup - make installHooksLocally throw error
      vi.mocked(hooksInstaller.installHooksLocally).mockRejectedValue(
        new Error('Failed to install hooks')
      );

      // When
      let component: ReturnType<typeof render>;

      await act(async () => {
        component = render(<HooksSetupCommand />);
      });

      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Then
      expect(component!.lastFrame()).toContain('Failed to configure hooks');
      expect(component!.lastFrame()).toContain('Failed to install hooks');
    });
  });

  describe('Display requirements', () => {
    it('should display the correct settings location after successful setup', async () => {
      // When
      let component: ReturnType<typeof render>;

      await act(async () => {
        component = render(<HooksSetupCommand />);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Then
      const output = component!.lastFrame();
      // The output has line breaks, so just check for key parts
      expect(output).toContain('.claude/settings.json');
      expect(output).toContain('PreToolUse');
      expect(output).toContain('PostToolUse');
    });

    it('should show loading spinner while installing hooks', async () => {
      // Setup - delay the mock to see loading state
      vi.mocked(hooksInstaller.installHooksLocally).mockImplementation(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      );

      // When
      const component = render(<HooksSetupCommand />);

      // Then - check initial loading state (may be checking config first)
      const frame = component.lastFrame();
      expect(frame).toMatch(
        /Checking Cage configuration|Installing Claude Code hooks/
      );
    });
  });
});

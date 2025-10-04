import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from '@testing-library/react';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'fs/promises';
import { tmpdir, homedir } from 'os';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import React from 'react';

// Mock the modules at the top level
vi.mock('../../src/shared/utils/config');
vi.mock('../../src/features/hooks/utils/hooks-installer');

import { HooksSetupCommand } from '../../src/features/hooks/commands/setup';
import { HooksStatusCommand } from '../../src/features/hooks/commands/status';
import * as configUtils from '../../src/shared/utils/config';
import * as hooksInstaller from '../../src/features/hooks/utils/hooks-installer';

describe('Feature: Claude Code Hook Configuration', () => {
  let testDir: string;
  let originalCwd: string;
  let originalHome: string;
  let testHome: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    originalHome = process.env.HOME || '';

    testDir = await mkdtemp(join(tmpdir(), 'cage-test-'));
    testHome = await mkdtemp(join(tmpdir(), 'cage-home-'));

    process.chdir(testDir);
    process.env.HOME = testHome;

    // Mock process.exit to prevent tests from actually exiting
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Create cage config
    await writeFile(
      join(testDir, 'cage.config.json'),
      JSON.stringify({
        port: 3790,
        host: 'localhost',
        enabled: true,
        logLevel: 'info',
        eventsDir: '.cage/events',
        maxEventSize: 1048576,
        enableMetrics: false,
        enableOfflineMode: true,
        offlineLogPath: '.cage/hooks-offline.log',
      })
    );

    // Create .cage directory
    await mkdir(join(testDir, '.cage'), { recursive: true });

    // Mock the Claude settings path to use our test directory
    const testClaudeDir = join(testHome, '.claude');
    await mkdir(testClaudeDir, { recursive: true });
    const testSettingsPath = join(testClaudeDir, 'settings.json');

    // Mock the functions properly with logging
    vi.mocked(configUtils.loadCageConfig).mockImplementation(async () => {
      console.log('🔍 Mock loadCageConfig called');
      return {
        port: 3790,
        host: 'localhost',
        enabled: true,
        logLevel: 'info',
        eventsDir: '.cage/events',
        maxEventSize: 1048576,
        enableMetrics: false,
        enableOfflineMode: true,
        offlineLogPath: '.cage/hooks-offline.log',
      };
    });

    vi.mocked(configUtils.isCageInitialized).mockReturnValue(true);

    // Mock process.exit to prevent actual exit during tests
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Mock the local hooks installer functions
    vi.mocked(hooksInstaller.installHooksLocally).mockImplementation(
      async port => {
        console.log('🔍 Mock installHooksLocally called with port:', port);

        // Simulate what the real installHooksLocally does - create local settings
        const settings = {
          hooks: {
            PreToolUse: [
              {
                matcher: '*',
                hooks: [
                  {
                    type: 'command',
                    command: `\$CLAUDE_PROJECT_DIR/.claude/hooks/cage/pretooluse.mjs`,
                    timeout: 180,
                  },
                ],
              },
            ],
            PostToolUse: [
              {
                matcher: '*',
                hooks: [
                  {
                    type: 'command',
                    command: `\$CLAUDE_PROJECT_DIR/.claude/hooks/cage/posttooluse.mjs`,
                    timeout: 180,
                  },
                ],
              },
            ],
            // Add other hooks as needed
          },
        };

        // Create the local .claude directory and settings
        await mkdir(join(testDir, '.claude'), { recursive: true });
        await writeFile(
          join(testDir, '.claude', 'settings.json'),
          JSON.stringify(settings, null, 2)
        );
        return;
      }
    );

    vi.mocked(hooksInstaller.getLocalClaudeSettingsPath).mockReturnValue(
      join(testDir, '.claude', 'settings.json')
    );

    // Mock the local hooks installer functions
    vi.mocked(hooksInstaller.loadLocalClaudeSettings).mockResolvedValue({});
    vi.mocked(hooksInstaller.saveLocalClaudeSettings).mockImplementation(
      async settings => {
        console.log('🔍 Mock saveLocalClaudeSettings called with:', settings);
        const settingsPath = join(testDir, '.claude', 'settings.json');
        await writeFile(settingsPath, JSON.stringify(settings, null, 2));
        console.log('🔍 Settings file written to:', settingsPath);
      }
    );
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env.HOME = originalHome;
    await rm(testDir, { recursive: true, force: true });
    await rm(testHome, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('Scenario: Configure Claude Code hooks', () => {
    it('Given I have Cage initialized When I run cage hooks setup Then Claude Code settings.json should be updated', async () => {
      // Given - Cage is initialized (in beforeEach)

      // Mock process.exit to prevent it from actually exiting the test
      const exitSpy = vi
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);

      // When
      let component: ReturnType<typeof render>;

      await act(async () => {
        component = render(<HooksSetupCommand />);
      });

      // Wait for all async operations to complete
      await act(async () => {
        // Wait for promises to resolve
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Check final state
      const finalFrame = component.lastFrame();
      console.log('📺 Final frame:', finalFrame);

      // Then
      expect(component.lastFrame()).toContain('Hooks configured successfully');

      // Verify the settings file was updated in local .claude directory
      const settingsPath = join(testDir, '.claude', 'settings.json');
      expect(existsSync(settingsPath)).toBe(true);

      exitSpy.mockRestore();
    });
  });

  describe('Scenario: Verify hook configuration', () => {
    it('Given I have configured Cage hooks When I run cage hooks status Then I should see status of each hook', async () => {
      // Given - hooks are configured in local .claude directory
      const settingsPath = join(testDir, '.claude', 'settings.json');
      await mkdir(dirname(settingsPath), { recursive: true });
      await writeFile(
        settingsPath,
        JSON.stringify({
          hooks: {
            PreToolUse: [
              {
                matcher: '*',
                hooks: [
                  {
                    type: 'command',
                    command:
                      '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/pretooluse.mjs',
                    timeout: 180,
                  },
                ],
              },
            ],
            PostToolUse: [
              {
                matcher: '*',
                hooks: [
                  {
                    type: 'command',
                    command:
                      '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/posttooluse.mjs',
                    timeout: 180,
                  },
                ],
              },
            ],
          },
        })
      );

      // Set up mocks for this specific test
      vi.mocked(configUtils.isCageInitialized).mockReturnValue(true);
      vi.mocked(configUtils.loadCageConfig).mockImplementation(async () => {
        console.log('🔍 Status test: Mock loadCageConfig called');
        return {
          port: 3790,
          host: 'localhost',
          enabled: true,
          logLevel: 'info',
          eventsDir: '.cage/events',
          maxEventSize: 1048576,
          enableMetrics: false,
          enableOfflineMode: true,
          offlineLogPath: '.cage/hooks-offline.log',
        };
      });

      vi.mocked(hooksInstaller.loadLocalClaudeSettings).mockResolvedValue({
        hooks: {
          PreToolUse: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command:
                    '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/pretooluse.mjs',
                  timeout: 180,
                },
              ],
            },
          ],
          PostToolUse: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command:
                    '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/posttooluse.mjs',
                  timeout: 180,
                },
              ],
            },
          ],
        },
      });

      vi.mocked(hooksInstaller.getInstalledHooksLocally).mockResolvedValue({
        PreToolUse: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/pretooluse.mjs',
        PostToolUse: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/posttooluse.mjs',
        UserPromptSubmit:
          '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/userpromptsubmit.mjs',
        Notification: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/notification.mjs',
        Stop: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/stop.mjs',
        SubagentStop: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/subagentstop.mjs',
        SessionStart: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/sessionstart.mjs',
        SessionEnd: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/sessionend.mjs',
        PreCompact: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/precompact.mjs',
        Status: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/status.mjs',
      });

      // When
      let component: ReturnType<typeof render>;

      await act(async () => {
        component = render(<HooksStatusCommand />);
      });

      // Wait for all async operations to complete
      await act(async () => {
        // Wait for promises to resolve
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Check final state
      const finalFrame = component.lastFrame();
      console.log('📺 Status final frame:', finalFrame);

      // Then
      expect(component.lastFrame()).toContain('Hook Configuration Status');
    });
  });
});

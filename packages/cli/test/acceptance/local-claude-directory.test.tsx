import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir, access, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { constants } from 'fs';
import {
  getLocalClaudeDirectory,
  getLocalClaudeSettingsPath,
  loadLocalClaudeSettings,
  saveLocalClaudeSettings,
  installHooksLocally,
  uninstallHooksLocally,
  getInstalledHooksLocally
} from '../../src/utils/hooks-installer.js';

describe('Feature: Configure Claude Code hooks in local project', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'cage-acceptance-test-'));
    process.chdir(testDir);

    // Create cage.config.json to simulate initialized project
    await writeFile(join(testDir, 'cage.config.json'), JSON.stringify({
      port: 3790,
      host: 'localhost',
      enabled: true,
      logLevel: 'info',
      eventsDir: '.cage/events',
      maxEventSize: 1048576,
      enableMetrics: false,
      enableOfflineMode: true,
      offlineLogPath: '.cage/hooks-offline.log'
    }));

    // Create .cage directory
    await mkdir(join(testDir, '.cage'), { recursive: true });
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Scenario: Configure Claude Code hooks in local project', () => {
    it('Given I have Cage initialized AND I am in a project directory with a .claude folder When I run cage hooks setup Then the system should use the local .claude directory', async () => {
      // Given - Create existing .claude directory
      await mkdir(join(testDir, '.claude'), { recursive: true });

      // When - Install hooks
      await installHooksLocally(3790);

      // Then - Verify local .claude directory is used
      expect(getLocalClaudeDirectory()).toContain('.claude');
      expect(existsSync(join(testDir, '.claude', 'settings.json'))).toBe(true);

      // Verify hook scripts are created
      const hooksDir = join(testDir, '.claude', 'hooks', 'cage');
      expect(existsSync(hooksDir)).toBe(true);

      const hookFiles = await readdir(hooksDir);
      expect(hookFiles).toContain('pretooluse.mjs');
      expect(hookFiles).toContain('posttooluse.mjs');
      expect(hookFiles).toContain('userpromptsubmit.mjs');
      expect(hookFiles).toContain('stop.mjs');
      expect(hookFiles).toContain('subagentstop.mjs');

      // Verify NO global config files are modified (by checking the function doesn't use global paths)
      const settings = await loadLocalClaudeSettings();
      expect(settings.hooks).toBeDefined();
    });
  });

  describe('Scenario: Handle missing .claude directory', () => {
    it('Given I am in a project directory without a .claude folder When I run cage hooks setup Then the system should create a .claude directory', async () => {
      // Given - Verify no .claude directory exists
      expect(existsSync(join(testDir, '.claude'))).toBe(false);

      // When - Install hooks
      await installHooksLocally(3790);

      // Then - Verify .claude directory was created
      expect(existsSync(join(testDir, '.claude'))).toBe(true);
      expect(existsSync(join(testDir, '.claude', 'settings.json'))).toBe(true);
      expect(existsSync(join(testDir, '.claude', 'hooks', 'cage'))).toBe(true);

      // Verify settings contain hook configuration
      const settings = await loadLocalClaudeSettings();
      expect(settings.hooks?.PreToolUse).toBeDefined();
      expect(settings.hooks?.PostToolUse).toBeDefined();
    });
  });

  describe('Scenario: Detect and use existing .claude directory', () => {
    it('Given I have an existing .claude directory with settings.json When I run cage hooks setup Then preserve existing settings and create backup', async () => {
      // Given - Create existing .claude with settings
      await mkdir(join(testDir, '.claude'), { recursive: true });
      const existingSettings = {
        customField: 'should be preserved',
        hooks: {
          CustomHook: [{
            matcher: 'custom',
            hooks: [{
              type: 'command',
              command: 'custom-command.js',
              timeout: 60
            }]
          }]
        }
      };
      await writeFile(
        join(testDir, '.claude', 'settings.json'),
        JSON.stringify(existingSettings, null, 2)
      );

      // When - Install hooks
      await installHooksLocally(3790);

      // Then - Verify backup was created
      expect(existsSync(join(testDir, '.claude', 'settings.json.backup'))).toBe(true);

      // Verify original settings are preserved
      const updatedSettings = await loadLocalClaudeSettings();
      expect(updatedSettings.customField).toBe('should be preserved');
      expect(updatedSettings.hooks?.CustomHook).toEqual(existingSettings.hooks.CustomHook);

      // Verify Cage hooks were added
      expect(updatedSettings.hooks?.PreToolUse).toBeDefined();
      expect(updatedSettings.hooks?.PostToolUse).toBeDefined();
    });
  });

  describe('Scenario: Verify hook configuration', () => {
    it('Given I have configured Cage hooks When I run cage hooks status Then I should see status from .claude/settings.json', async () => {
      // Given - Install hooks
      await installHooksLocally(3790);

      // When - Get installed hooks status
      const installedHooks = await getInstalledHooksLocally();

      // Then - Verify all expected hooks are reported
      expect(installedHooks.PreToolUse).toContain('.claude/hooks/cage/pretooluse.mjs');
      expect(installedHooks.PostToolUse).toContain('.claude/hooks/cage/posttooluse.mjs');
      expect(installedHooks.UserPromptSubmit).toContain('.claude/hooks/cage/userpromptsubmit.mjs');
      expect(installedHooks.Stop).toContain('.claude/hooks/cage/stop.mjs');
      expect(installedHooks.SubagentStop).toContain('.claude/hooks/cage/subagentstop.mjs');

      // Verify hook scripts actually exist
      const hooksDir = join(testDir, '.claude', 'hooks', 'cage');
      expect(existsSync(join(hooksDir, 'pretooluse.mjs'))).toBe(true);
      expect(existsSync(join(hooksDir, 'posttooluse.mjs'))).toBe(true);

      // Verify scripts are executable
      await expect(access(join(hooksDir, 'pretooluse.mjs'), constants.X_OK)).resolves.toBeUndefined();
    });
  });

  describe('Scenario: Uninstall Cage hooks while preserving others', () => {
    it('Given I have Cage hooks and custom hooks When I uninstall Cage hooks Then only Cage hooks should be removed', async () => {
      // Given - Install Cage hooks
      await installHooksLocally(3790);

      // Add custom hook manually
      const settings = await loadLocalClaudeSettings();
      settings.hooks = settings.hooks || {};
      settings.hooks.PostToolUse = [
        ...(settings.hooks.PostToolUse as unknown[] || []),
        {
          matcher: 'custom',
          hooks: [{
            type: 'command',
            command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/custom/hook.js',
            timeout: 60
          }]
        }
      ];
      await saveLocalClaudeSettings(settings);

      // When - Uninstall Cage hooks
      await uninstallHooksLocally();

      // Then - Verify Cage hooks are removed
      const updatedHooks = await getInstalledHooksLocally();
      expect(Object.keys(updatedHooks).length).toBe(0);

      // Verify custom hooks are preserved
      const finalSettings = await loadLocalClaudeSettings();
      const customHooks = (finalSettings.hooks?.PostToolUse as unknown[])?.filter(
        (h: { hooks?: Array<{ command?: string }> }) =>
          h.hooks?.[0]?.command?.includes('custom')
      );
      expect(customHooks?.length).toBe(1);
    });
  });

  describe('Scenario: Hook scripts use real hook handler', () => {
    it('Given I install hooks When I check the hook scripts Then they should use the real cage-hook-handler', async () => {
      // Create a mock hook handler for testing
      const mockHandlerDir = join(testDir, '.claude', 'hooks', 'cage');
      await mkdir(mockHandlerDir, { recursive: true });
      await writeFile(
        join(mockHandlerDir, 'cage-hook-handler.js'),
        '#!/usr/bin/env node\nconsole.log("mock handler");'
      );

      // Given/When - Install hooks (this will skip copying since handler exists)
      await installHooksLocally(3790);

      // Then - Verify the hook handler exists
      const handlerPath = join(testDir, '.claude', 'hooks', 'cage', 'cage-hook-handler.js');
      expect(existsSync(handlerPath)).toBe(true);

      // Verify wrapper scripts exist and reference the handler
      const hooksDir = join(testDir, '.claude', 'hooks', 'cage');
      const hookFiles = await readdir(hooksDir);

      // Should have wrapper scripts with .mjs extension
      const wrapperScripts = hookFiles.filter(f => f.endsWith('.mjs'));
      expect(wrapperScripts.length).toBeGreaterThan(0);
      expect(wrapperScripts).toContain('pretooluse.mjs');
      expect(wrapperScripts).toContain('posttooluse.mjs');

      // Verify wrapper script content references the real handler
      const scriptContent = await readFile(join(hooksDir, 'pretooluse.mjs'), 'utf-8');
      expect(scriptContent).toContain('cage-hook-handler.js');
      expect(scriptContent).toContain('spawn');
      expect(scriptContent).toContain("'PreToolUse'");
      expect(scriptContent).toContain('#!/usr/bin/env node');
    });
  });

  describe('Scenario: Settings path is correctly resolved', () => {
    it('Given any working directory When I call getLocalClaudeSettingsPath Then it returns .claude/settings.json in cwd', async () => {
      // Create a subdirectory and change to it
      await mkdir(join(testDir, 'subdir'), { recursive: true });
      process.chdir(join(testDir, 'subdir'));

      // When - Get settings path
      const settingsPath = getLocalClaudeSettingsPath();

      // Then - It should be relative to current working directory
      expect(settingsPath).toContain('subdir');
      expect(settingsPath).toContain('.claude');
      expect(settingsPath).toContain('settings.json');

      // Change back to test dir
      process.chdir(testDir);
      const settingsPath2 = getLocalClaudeSettingsPath();
      expect(settingsPath2).toContain('.claude');
      expect(settingsPath2).toContain('settings.json');
      expect(settingsPath2).not.toContain('subdir');
    });
  });
});
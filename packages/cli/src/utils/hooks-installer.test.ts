import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir, access } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { constants } from 'fs';
import {
  getLocalClaudeDirectory,
  getLocalClaudeSettingsPath,
  loadLocalClaudeSettings,
  saveLocalClaudeSettings,
  installHooksLocally,
  uninstallHooksLocally,
  getInstalledHooksLocally,
  createHookScript,
  installHookHandler
} from './hooks-installer.js';
import type { HookType } from '@cage/shared';

// Type definitions for Claude settings
interface HookCommand {
  type: string;
  command: string;
  timeout?: number;
}

interface HookEntry {
  matcher?: string;
  hooks?: HookCommand[];
}

interface ClaudeSettings {
  hooks?: {
    [key: string]: HookEntry[] | undefined;
  };
}

describe('Local .claude Directory Hook Management', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'cage-local-test-'));
    process.chdir(testDir);

    // Create a mock hook handler for all tests that need it
    const mockHandlerContent = '#!/usr/bin/env node\nconsole.log("mock cage-hook-handler");';
    const mockHandlerPath = join(testDir, 'mock-cage-hook-handler.js');
    await writeFile(mockHandlerPath, mockHandlerContent);

    // Set environment variable to use our mock handler
    process.env.CAGE_MOCK_HANDLER_PATH = mockHandlerPath;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(testDir, { recursive: true, force: true });
    delete process.env.CAGE_MOCK_HANDLER_PATH;
    vi.restoreAllMocks();
  });

  describe('getLocalClaudeDirectory', () => {
    it('should return .claude directory in current working directory', () => {
      const claudeDir = getLocalClaudeDirectory();
      expect(claudeDir).toBe(join(process.cwd(), '.claude'));
    });
  });

  describe('getLocalClaudeSettingsPath', () => {
    it('should return settings.json path in local .claude directory', () => {
      const settingsPath = getLocalClaudeSettingsPath();
      expect(settingsPath).toBe(join(process.cwd(), '.claude', 'settings.json'));
    });
  });

  describe('loadLocalClaudeSettings', () => {
    it('should load existing settings from local .claude directory', async () => {
      // Create .claude directory with settings
      await mkdir(join(testDir, '.claude'), { recursive: true });
      const testSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Edit|MultiEdit|Write',
              hooks: [
                {
                  type: 'command',
                  command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/quality-check.js',
                  timeout: 180
                }
              ]
            }
          ]
        }
      };
      await writeFile(
        join(testDir, '.claude', 'settings.json'),
        JSON.stringify(testSettings, null, 2)
      );

      const settings = await loadLocalClaudeSettings();
      expect(settings).toEqual(testSettings);
    });

    it('should return empty object if settings.json does not exist', async () => {
      const settings = await loadLocalClaudeSettings();
      expect(settings).toEqual({});
    });

    it('should return empty object if .claude directory does not exist', async () => {
      const settings = await loadLocalClaudeSettings();
      expect(settings).toEqual({});
    });
  });

  describe('saveLocalClaudeSettings', () => {
    it('should create .claude directory if it does not exist', async () => {
      const testSettings = { hooks: {} };
      await saveLocalClaudeSettings(testSettings);

      // Verify directory was created
      await expect(access(join(testDir, '.claude'), constants.F_OK)).resolves.toBeUndefined();

      // Verify settings were saved
      const content = await readFile(join(testDir, '.claude', 'settings.json'), 'utf-8');
      expect(JSON.parse(content)).toEqual(testSettings);
    });

    it('should backup existing settings.json before overwriting', async () => {
      // Create existing settings
      await mkdir(join(testDir, '.claude'), { recursive: true });
      const originalSettings = { existing: 'data' };
      await writeFile(
        join(testDir, '.claude', 'settings.json'),
        JSON.stringify(originalSettings, null, 2)
      );

      // Save new settings
      const newSettings = { hooks: {} };
      await saveLocalClaudeSettings(newSettings);

      // Verify backup was created
      const backupContent = await readFile(join(testDir, '.claude', 'settings.json.backup'), 'utf-8');
      expect(JSON.parse(backupContent)).toEqual(originalSettings);

      // Verify new settings were saved
      const newContent = await readFile(join(testDir, '.claude', 'settings.json'), 'utf-8');
      expect(JSON.parse(newContent)).toEqual(newSettings);
    });
  });

  describe('hook installation', () => {
    it('should create wrapper scripts with proper hook handler reference', async () => {
      // Create a mock hook handler file for testing
      const mockHandlerContent = '#!/usr/bin/env node\nconsole.log("cage-hook-handler");';
      const mockHandlerDir = join(testDir, '.claude', 'hooks', 'cage');
      await mkdir(mockHandlerDir, { recursive: true });
      await writeFile(join(mockHandlerDir, 'cage-hook-handler.js'), mockHandlerContent);

      // Create a wrapper script
      const hookType: HookType = 'PostToolUse';
      await createHookScript(hookType, 3790);

      // Verify wrapper script was created
      const scriptPath = join(testDir, '.claude', 'hooks', 'cage', 'posttooluse.mjs');
      await expect(access(scriptPath, constants.F_OK)).resolves.toBeUndefined();

      // Verify wrapper script content references the handler
      const content = await readFile(scriptPath, 'utf-8');
      expect(content).toContain('cage-hook-handler.js');
      expect(content).toContain("'PostToolUse'");
      expect(content).toContain('spawn');
    });

    it('should create wrapper scripts for each hook type', async () => {
      const hookType: HookType = 'PostToolUse';
      const port = 3790;

      await createHookScript(hookType, port);

      // Verify wrapper script was created
      const scriptPath = join(testDir, '.claude', 'hooks', 'cage', `${hookType.toLowerCase()}.mjs`);
      await expect(access(scriptPath, constants.F_OK)).resolves.toBeUndefined();
      await expect(access(scriptPath, constants.X_OK)).resolves.toBeUndefined();

      // Verify wrapper script content
      const content = await readFile(scriptPath, 'utf-8');
      expect(content).toContain('#!/usr/bin/env node');
      expect(content).toContain('cage-hook-handler.js');
      expect(content).toContain(`'${hookType}'`);
      expect(content).toContain('spawn');
    });
  });

  describe('installHooksLocally', () => {
    it('should install all hook types in local .claude directory', async () => {
      const port = 3790;
      await installHooksLocally(port);

      // Verify settings.json was updated
      const settings = await loadLocalClaudeSettings();
      expect(settings.hooks).toBeDefined();
      expect(settings.hooks?.PostToolUse).toBeDefined();
      expect(settings.hooks?.PreToolUse).toBeDefined();
      expect(settings.hooks?.UserPromptSubmit).toBeDefined();
      expect(settings.hooks?.Stop).toBeDefined();
      expect(settings.hooks?.SubagentStop).toBeDefined();

      // Verify hook scripts were created
      const hookTypes = ['PostToolUse', 'PreToolUse', 'UserPromptSubmit', 'Stop', 'SubagentStop'];
      for (const hookType of hookTypes) {
        const scriptPath = join(testDir, '.claude', 'hooks', 'cage', `${hookType.toLowerCase()}.mjs`);
        await expect(access(scriptPath, constants.F_OK)).resolves.toBeUndefined();
      }
    });

    it('should preserve existing hooks when installing', async () => {
      // Create existing hooks
      await mkdir(join(testDir, '.claude'), { recursive: true });
      const existingSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Edit|MultiEdit|Write',
              hooks: [
                {
                  type: 'command',
                  command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/existing-hook.js',
                  timeout: 180
                }
              ]
            }
          ]
        }
      };
      await writeFile(
        join(testDir, '.claude', 'settings.json'),
        JSON.stringify(existingSettings, null, 2)
      );

      // Install Cage hooks
      await installHooksLocally(3790);

      // Verify existing hooks are preserved
      const settings = await loadLocalClaudeSettings();
      expect(settings.hooks?.PostToolUse).toBeDefined();
      expect(settings.hooks?.PostToolUse?.length).toBeGreaterThan(1);

      // Check that existing hook is still there
      const existingHook = settings.hooks?.PostToolUse?.find(
        (h: HookEntry) => h.hooks?.[0]?.command?.includes('existing-hook.js')
      );
      expect(existingHook).toBeDefined();
    });
  });

  describe('uninstallHooksLocally', () => {
    it('should remove Cage hooks from local .claude directory', async () => {
      // First install hooks
      await installHooksLocally(3790);

      // Then uninstall
      await uninstallHooksLocally();

      // Verify Cage hooks were removed from settings
      const settings = await loadLocalClaudeSettings();

      // Check that Cage-specific hooks are removed
      const cageHooks = settings.hooks?.PostToolUse?.filter(
        (h: HookEntry) => h.hooks?.[0]?.command?.includes('.claude/hooks/cage/')
      ) || [];
      expect(cageHooks.length).toBe(0);
    });

    it('should preserve non-Cage hooks when uninstalling', async () => {
      // Create existing non-Cage hooks
      await mkdir(join(testDir, '.claude'), { recursive: true });
      const existingSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Edit|MultiEdit|Write',
              hooks: [
                {
                  type: 'command',
                  command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/custom-hook.js',
                  timeout: 180
                }
              ]
            }
          ]
        }
      };
      await writeFile(
        join(testDir, '.claude', 'settings.json'),
        JSON.stringify(existingSettings, null, 2)
      );

      // Install and then uninstall Cage hooks
      await installHooksLocally(3790);
      await uninstallHooksLocally();

      // Verify non-Cage hooks are still there
      const settings = await loadLocalClaudeSettings();
      const customHook = settings.hooks?.PostToolUse?.find(
        (h: HookEntry) => h.hooks?.[0]?.command?.includes('custom-hook.js')
      );
      expect(customHook).toBeDefined();
    });
  });

  describe('getInstalledHooksLocally', () => {
    it('should return only Cage hooks from local .claude directory', async () => {
      // Install hooks
      await installHooksLocally(3790);

      // Get installed hooks
      const installedHooks = await getInstalledHooksLocally();

      // Verify we have Cage hooks
      expect(installedHooks.PostToolUse).toBeDefined();
      expect(installedHooks.PreToolUse).toBeDefined();
      expect(installedHooks.UserPromptSubmit).toBeDefined();
      expect(installedHooks.Stop).toBeDefined();
      expect(installedHooks.SubagentStop).toBeDefined();
    });

    it('should return empty object if no Cage hooks are installed', async () => {
      const installedHooks = await getInstalledHooksLocally();
      expect(installedHooks).toEqual({});
    });
  });

  describe('Integration: Complete hook setup flow', () => {
    it('should handle complete setup flow for local .claude directory', async () => {
      // Simulate cage hooks setup command flow

      // 1. Check if .claude exists (it doesn't initially)
      const claudeDir = getLocalClaudeDirectory();
      expect(claudeDir).toContain('.claude');
      expect(claudeDir).toContain(testDir.split('/').pop() as string);

      // 2. Install hooks (should create directory and scripts)
      await installHooksLocally(3790);

      // 3. Verify installation
      const installedHooks = await getInstalledHooksLocally();
      expect(Object.keys(installedHooks).length).toBeGreaterThan(0);

      // 4. Verify settings structure
      const settings = await loadLocalClaudeSettings();
      expect(settings.hooks).toBeDefined();

      // 5. Uninstall hooks
      await uninstallHooksLocally();

      // 6. Verify uninstallation
      const remainingHooks = await getInstalledHooksLocally();
      expect(Object.keys(remainingHooks).length).toBe(0);
    });
  });
});
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { act } from '@testing-library/react';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import React from 'react';
import { HooksStatusCommand } from './status.js';

// Mock the dependencies
vi.mock('../../utils/config.js');
vi.mock('../../utils/hooks-installer.js');

import * as configUtils from '../../utils/config.js';
import * as hooksInstaller from '../../utils/hooks-installer.js';

describe('HooksStatusCommand', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    originalCwd = process.cwd();
    testDir = await mkdtemp(join(tmpdir(), 'cage-hooks-status-test-'));
    process.chdir(testDir);

    // Create cage.config.json
    await writeFile(join(testDir, 'cage.config.json'), JSON.stringify({
      port: 3790,
      host: 'localhost',
      enabled: true,
      logLevel: 'info'
    }));

    // Create .cage directory
    await mkdir(join(testDir, '.cage'), { recursive: true });

    // Setup default mocks
    vi.mocked(configUtils.isCageInitialized).mockReturnValue(true);

    vi.mocked(configUtils.loadCageConfig).mockResolvedValue({
      port: 3790,
      host: 'localhost',
      enabled: true,
      logLevel: 'info',
      eventsDir: '.cage/events',
      maxEventSize: 1048576,
      enableMetrics: false,
      enableOfflineMode: true,
      offlineLogPath: '.cage/hooks-offline.log'
    });

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

  describe('Acceptance Criteria: Verify hook configuration', () => {
    it('Given I have configured Cage hooks When I run cage hooks status Then I see status from .claude/settings.json', async () => {
      // Setup - mock installed hooks
      vi.mocked(hooksInstaller.getInstalledHooksLocally).mockResolvedValue({
        PreToolUse: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/pretooluse.mjs',
        PostToolUse: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/posttooluse.mjs',
        UserPromptSubmit: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/userpromptsubmit.mjs',
        Stop: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/stop.mjs',
        SubagentStop: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/subagentstop.mjs'
      });

      // When
      let component: ReturnType<typeof render>;

      await act(async () => {
        component = render(<HooksStatusCommand />);
      });

      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Then
      const output = component!.lastFrame();
      expect(output).toContain('Hook Configuration Status');
      expect(output).toContain('.claude/settings.json');
      expect(output).toContain('Backend port: 3790');
      expect(output).toContain('Backend enabled: Yes');

      // Verify installed hooks are shown
      expect(output).toContain('✔ PreToolUse');
      expect(output).toContain('✔ PostToolUse');
      expect(output).toContain('✔ UserPromptSubmit');
      expect(output).toContain('✔ Stop');
      expect(output).toContain('✔ SubagentStop');

      // Verify missing hooks are shown
      expect(output).toContain('✖ SessionStart');
      expect(output).toContain('✖ SessionEnd');
    });

    it('Given Cage is not initialized When I run cage hooks status Then it shows error', async () => {
      // Setup
      vi.mocked(configUtils.isCageInitialized).mockReturnValue(false);

      // When
      let component: ReturnType<typeof render>;

      await act(async () => {
        component = render(<HooksStatusCommand />);
      });

      // Wait for async operations
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Then
      const output = component!.lastFrame();
      expect(output).toContain('Cage is not initialized');
      expect(output).toContain('Please run "cage init" first');
    });

    it('Given no hooks are installed When I run cage hooks status Then it shows no hooks installed', async () => {
      // Setup - no installed hooks
      vi.mocked(hooksInstaller.getInstalledHooksLocally).mockResolvedValue({});

      // When
      let component: ReturnType<typeof render>;

      await act(async () => {
        component = render(<HooksStatusCommand />);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Then
      const output = component!.lastFrame();
      expect(output).toContain('Hook Configuration Status');
      expect(output).toContain('No hooks installed');
      expect(output).toContain('Run "cage hooks setup" to install');
    });

    it('Given some hooks are missing When I run cage hooks status Then it suggests running setup', async () => {
      // Setup - partial hooks installed
      vi.mocked(hooksInstaller.getInstalledHooksLocally).mockResolvedValue({
        PreToolUse: '$CLAUDE_PROJECT_DIR/.claude/hooks/cage/pretooluse.mjs'
      });

      // When
      let component: ReturnType<typeof render>;

      await act(async () => {
        component = render(<HooksStatusCommand />);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Then
      const output = component!.lastFrame();
      expect(output).toContain('Installed Hooks (1/10)');
      expect(output).toContain('Missing Hooks:');
      expect(output).toContain('Run "cage hooks setup" to install missing hooks');
    });
  });

  describe('Display requirements', () => {
    it('should display loading spinner while checking status', async () => {
      // Setup - delay the mock to see loading state
      vi.mocked(hooksInstaller.getInstalledHooksLocally).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return {};
      });

      // When
      const component = render(<HooksStatusCommand />);

      // Then - check initial loading state
      expect(component.lastFrame()).toContain('Checking hook configuration');
    });

    it('should handle errors gracefully', async () => {
      // Setup - make getInstalledHooksLocally throw error
      vi.mocked(hooksInstaller.getInstalledHooksLocally).mockRejectedValue(
        new Error('Failed to read hooks')
      );

      // When
      let component: ReturnType<typeof render>;

      await act(async () => {
        component = render(<HooksStatusCommand />);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Then
      const output = component!.lastFrame();
      expect(output).toContain('Failed to check hook status');
      expect(output).toContain('Failed to read hooks');
    });
  });

  describe('Backend status display', () => {
    it('should show backend as disabled when enabled is false', async () => {
      // Setup
      vi.mocked(configUtils.loadCageConfig).mockResolvedValue({
        port: 3790,
        host: 'localhost',
        enabled: false,
        logLevel: 'info',
        eventsDir: '.cage/events',
        maxEventSize: 1048576,
        enableMetrics: false,
        enableOfflineMode: true,
        offlineLogPath: '.cage/hooks-offline.log'
      });

      vi.mocked(hooksInstaller.getInstalledHooksLocally).mockResolvedValue({});

      // When
      let component: ReturnType<typeof render>;

      await act(async () => {
        component = render(<HooksStatusCommand />);
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Then
      const output = component!.lastFrame();
      expect(output).toContain('Backend enabled: No');
    });
  });
});
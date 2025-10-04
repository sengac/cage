import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from 'ink-testing-library';
import { mkdtemp, rm, readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import React from 'react';

import { InitCommand } from '../../src/cli/commands/init';

describe('Scenario: Initialize Cage in a project', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Save original cwd
    originalCwd = process.cwd();
    // Create temporary directory for test
    testDir = await mkdtemp(join(tmpdir(), 'cage-test-'));
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Always restore mocks first
    vi.restoreAllMocks();

    // Restore original cwd before cleanup
    if (originalCwd) {
      process.chdir(originalCwd);
    }

    // Clean up test directory
    if (testDir && existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('Given I am in a project directory, When I run cage init, Then .cage directory and cage.config.json should be created', async () => {
    // Mock process.exit to prevent test from exiting
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    // Render the init command
    const { lastFrame } = render(<InitCommand />);

    // Wait for the success message to appear
    await vi.waitFor(
      () => {
        const output = lastFrame();
        expect(output).toContain('CAGE initialized successfully');
      },
      { timeout: 5000 }
    );

    // Wait for process.exit to be called (indicates all operations are complete)
    await vi.waitFor(
      () => {
        expect(exitSpy).toHaveBeenCalledWith(0);
      },
      { timeout: 200 }
    );

    // Now verify files were created
    expect(existsSync(join(testDir, '.cage'))).toBe(true);
    expect(existsSync(join(testDir, '.cage', 'events'))).toBe(true);
    expect(existsSync(join(testDir, 'cage.config.json'))).toBe(true);

    // Verify config content
    const configContent = await readFile(
      join(testDir, 'cage.config.json'),
      'utf-8'
    );
    const config = JSON.parse(configContent);

    expect(config).toHaveProperty('port', 3790);
    expect(config).toHaveProperty('enabled', true);
    expect(config).toHaveProperty('logLevel', 'info');
    expect(config).toHaveProperty('eventsDir', '.cage/events');
    expect(config).toHaveProperty('version', '1.0.0');
  });

  it('should handle when cage is already initialized', async () => {
    // Create config file first to simulate already initialized
    await writeFile(join(testDir, 'cage.config.json'), '{"port": 3790}');

    // Mock process.exit
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    const { lastFrame } = render(<InitCommand />);

    // Wait for the already initialized message
    await vi.waitFor(
      () => {
        const output = lastFrame();
        expect(output).toContain('CAGE is already initialized in this project');
      },
      { timeout: 5000 }
    );

    // Wait for process.exit to be called
    await vi.waitFor(
      () => {
        expect(exitSpy).toHaveBeenCalledWith(1);
      },
      { timeout: 200 }
    );
  });

  it('should display initialization progress', async () => {
    // Mock process.exit
    const exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);

    const { lastFrame } = render(<InitCommand />);

    // Should show initial checking status
    const initialOutput = lastFrame();
    expect(initialOutput).toBeDefined();
    expect(
      initialOutput?.includes('Checking project status') ||
        initialOutput?.includes('Creating Cage configuration') ||
        initialOutput?.includes('Cage initialized successfully')
    ).toBe(true);

    // Wait for completion - success message appears
    await vi.waitFor(
      () => {
        const output = lastFrame();
        return output?.includes('Cage initialized successfully');
      },
      { timeout: 5000 }
    );

    // Wait for process.exit to be called (ensures all async operations are done)
    await vi.waitFor(
      () => {
        expect(exitSpy).toHaveBeenCalledWith(0);
      },
      { timeout: 200 }
    );
  });
});

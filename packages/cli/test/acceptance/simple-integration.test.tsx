import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const cliPath = join(__dirname, '../../dist/index.js');

const execPromise = promisify(exec);

describe('CLI Integration Tests', () => {
  it('should show help when run with --help', async () => {
    try {
      const { stdout } = await execPromise(`node ${cliPath} --help`);
      expect(stdout).toContain('Usage: cage');
      expect(stdout).toContain('Code Alignment Guard Engine');
      expect(stdout).toContain('init');
      expect(stdout).toContain('hooks');
      expect(stdout).toContain('events');
      expect(stdout).toContain('start');
    } catch (error) {
      // Help should exit with code 0, but let's check the output
      const execError = error as { stdout?: string; message?: string };
      if (execError.stdout) {
        expect(execError.stdout).toContain('Usage: cage');
      } else {
        // If there's no stdout in error, the test should fail with a meaningful message
        throw new Error(
          `Help command failed: ${execError.message || 'Unknown error'}`
        );
      }
    }
  });

  it('should show hooks help', async () => {
    try {
      const { stdout } = await execPromise(`node ${cliPath} hooks --help`);
      expect(stdout).toContain('Manage Claude Code hooks');
      expect(stdout).toContain('setup');
      expect(stdout).toContain('status');
    } catch (error) {
      const execError = error as { stdout?: string; message?: string };
      if (execError.stdout) {
        expect(execError.stdout).toContain('Manage Claude Code hooks');
      } else {
        throw new Error(
          `Hooks help command failed: ${execError.message || 'Unknown error'}`
        );
      }
    }
  });

  it('should show events help', async () => {
    try {
      const { stdout } = await execPromise(`node ${cliPath} events --help`);
      expect(stdout).toContain('Manage and view hook events');
      expect(stdout).toContain('stream');
      expect(stdout).toContain('tail');
      expect(stdout).toContain('list');
      expect(stdout).toContain('stats');
    } catch (error) {
      const execError = error as { stdout?: string; message?: string };
      if (execError.stdout) {
        expect(execError.stdout).toContain('Manage and view hook events');
      } else {
        throw new Error(
          `Events help command failed: ${execError.message || 'Unknown error'}`
        );
      }
    }
  });
});

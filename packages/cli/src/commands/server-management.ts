import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

export interface ServerStatus {
  server: {
    running: boolean;
    port: number | string;
    pid?: number;
    uptime?: string;
    health?: string;
    warning?: string;
  };
  hooks: {
    installed: boolean;
    count?: number;
    location?: string;
    hasQualityCheck?: boolean;
    message?: string;
  };
  events: {
    total: number;
    today?: number;
    latest?: string;
    location?: string;
    message?: string;
  };
  offline: {
    count: number;
    latestError?: string;
    location?: string;
  };
}

const PID_FILE = join(process.cwd(), '.cage', 'server.pid');
const PORT = 3790;

export async function stopServer(options: { force?: boolean } = {}): Promise<{ success: boolean; message: string }> {
  try {
    // Check if PID file exists
    if (!existsSync(PID_FILE)) {
      return {
        success: true,
        message: chalk.blue('ℹ No Cage server is running')
      };
    }

    // Read PID from file
    const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim());

    // Check if process exists
    try {
      execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
    } catch {
      // Process doesn't exist, clean up PID file
      unlinkSync(PID_FILE);
      return {
        success: true,
        message: chalk.blue('ℹ No Cage server is running (cleaned up stale PID file)')
      };
    }

    // Kill the process
    const signal = options.force ? 'KILL' : 'TERM';
    try {
      execSync(`kill -${signal} ${pid}`, { stdio: 'ignore' });

      // Wait a moment for process to die
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify it's dead
      try {
        execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
        // Still running, might need force
        if (!options.force) {
          return {
            success: false,
            message: chalk.yellow('⚠ Server not responding. Try: cage stop --force')
          };
        }
      } catch {
        // Process is dead, good
      }
    } catch (error) {
      return {
        success: false,
        message: chalk.red(`✗ Failed to stop server: ${error}`)
      };
    }

    // Clean up PID file
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }

    return {
      success: true,
      message: options.force
        ? chalk.green('✓ Cage server forcefully stopped')
        : chalk.green('✓ Cage server stopped')
    };
  } catch (error) {
    return {
      success: false,
      message: chalk.red(`✗ Error stopping server: ${error}`)
    };
  }
}

export async function getServerStatus(): Promise<ServerStatus> {
  const status: ServerStatus = {
    server: { running: false, port: `${PORT} (available)` },
    hooks: { installed: false },
    events: { total: 0 },
    offline: { count: 0 }
  };

  // Check server status
  if (existsSync(PID_FILE)) {
    try {
      const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim());

      // Check if process is running
      try {
        execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
        status.server.running = true;
        status.server.pid = pid;
        status.server.port = PORT;

        // Try to get health status
        try {
          execSync(`curl -s http://localhost:${PORT}/health`, { stdio: 'ignore' });
          status.server.health = 'OK';
        } catch {
          status.server.health = 'Not responding';
        }

        // Get uptime (simplified - would need process start time tracking)
        status.server.uptime = 'Running';

      } catch {
        // Process not running but PID file exists
        status.server.running = false;
        status.server.warning = 'Stale PID file found';
      }
    } catch (error) {
      status.server.running = false;
    }
  }

  // Check if port is in use by another process
  if (!status.server.running) {
    try {
      const lsofOutput = execSync(`lsof -ti :${PORT}`, { encoding: 'utf-8' }).trim();
      if (lsofOutput) {
        const otherPid = parseInt(lsofOutput.split('\n')[0]);
        status.server.warning = `Port ${PORT} is in use by another process (PID: ${otherPid})`;
      }
    } catch {
      // Port is free
    }
  }

  // Check hooks status
  const settingsPath = join(process.cwd(), '.claude', 'settings.json');
  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      if (settings.hooks) {
        status.hooks.installed = true;
        status.hooks.location = settingsPath;

        // Count hook types
        const hookTypes = Object.keys(settings.hooks);
        status.hooks.count = hookTypes.length;

        // Check for quality check hook
        if (settings.hooks.PostToolUse) {
          const postToolUse = settings.hooks.PostToolUse;
          if (Array.isArray(postToolUse)) {
            // Handle array format
            for (const hook of postToolUse) {
              if (hook.hooks && Array.isArray(hook.hooks)) {
                for (const hookDef of hook.hooks) {
                  if (hookDef.command && hookDef.command.includes('quality-check')) {
                    status.hooks.hasQualityCheck = true;
                    break;
                  }
                }
              }
              if (status.hooks.hasQualityCheck) break;
            }
          } else if (typeof postToolUse === 'object') {
            // Handle object format
            for (const key of Object.keys(postToolUse)) {
              if (typeof postToolUse[key] === 'string' && postToolUse[key].includes('quality-check')) {
                status.hooks.hasQualityCheck = true;
                break;
              }
            }
          }
        }
      }
    } catch {
      status.hooks.installed = false;
    }
  } else {
    status.hooks.message = "Run 'cage hooks setup' to install";
  }

  // Check events status
  const eventsDir = join(process.cwd(), '.cage', 'events');
  if (existsSync(eventsDir)) {
    try {
      let totalEvents = 0;
      let latestTimestamp = '';
      let todayEvents = 0;
      const today = new Date().toISOString().split('T')[0];

      // Recursively count events
      const dateDirs = readdirSync(eventsDir);
      for (const dateDir of dateDirs) {
        const datePath = join(eventsDir, dateDir);
        if (statSync(datePath).isDirectory()) {
          const eventsFile = join(datePath, 'events.jsonl');
          if (existsSync(eventsFile)) {
            const lines = readFileSync(eventsFile, 'utf-8').trim().split('\n').filter(l => l);
            totalEvents += lines.length;

            if (dateDir === today) {
              todayEvents = lines.length;
            }

            // Get latest event
            if (lines.length > 0) {
              try {
                const lastEvent = JSON.parse(lines[lines.length - 1]);
                if (lastEvent.timestamp > latestTimestamp) {
                  latestTimestamp = lastEvent.timestamp;
                }
              } catch {}
            }
          }
        }
      }

      status.events.total = totalEvents;
      status.events.today = todayEvents;
      status.events.latest = latestTimestamp;
      status.events.location = eventsDir;

      if (totalEvents === 0) {
        status.events.message = 'No events recorded yet';
      }
    } catch {
      status.events.message = 'No events recorded yet';
    }
  } else {
    status.events.message = 'No events recorded yet';
  }

  // Check offline logs
  const offlineLog = join(process.cwd(), '.cage', 'hooks-offline.log');
  if (existsSync(offlineLog)) {
    try {
      const lines = readFileSync(offlineLog, 'utf-8').trim().split('\n').filter(l => l);
      status.offline.count = lines.length;
      status.offline.location = offlineLog;

      if (lines.length > 0) {
        try {
          const lastLine = JSON.parse(lines[lines.length - 1]);
          status.offline.latestError = `${lastLine.error} (${lastLine.timestamp})`;
        } catch {}
      }
    } catch {}
  }

  return status;
}

export function formatStatus(status: ServerStatus): string {
  const lines: string[] = [];

  // Server status
  if (status.server.running) {
    lines.push(chalk.green('🟢 Server Status: Running'));
    lines.push(`  Port: ${status.server.port}`);
    if (status.server.pid) lines.push(`  PID: ${status.server.pid}`);
    if (status.server.uptime) lines.push(`  Uptime: ${status.server.uptime}`);
    if (status.server.health) lines.push(`  Health: ${status.server.health}`);
  } else {
    lines.push(chalk.red('🔴 Server Status: Not Running'));
    lines.push(`  Port: ${status.server.port}`);
  }

  if (status.server.warning) {
    lines.push(chalk.yellow(`  ⚠️  ${status.server.warning}`));
  }

  lines.push('');

  // Hooks status
  if (status.hooks.installed) {
    lines.push(chalk.green('📎 Hooks: Installed'));
    if (status.hooks.location) lines.push(`  Location: ${status.hooks.location}`);
    if (status.hooks.count) lines.push(`  Hook Types: ${status.hooks.count}`);
    if (status.hooks.hasQualityCheck) {
      lines.push(chalk.green('  ✓ Quality check hook detected'));
    }
  } else {
    lines.push(chalk.yellow('📎 Hooks: Not Installed'));
    if (status.hooks.message) lines.push(`  ${status.hooks.message}`);
  }

  lines.push('');

  // Events status
  lines.push('📊 Events:');
  if (status.events.total > 0) {
    lines.push(`  Total Captured: ${status.events.total}`);
    if (status.events.today !== undefined) lines.push(`  Today: ${status.events.today}`);
    if (status.events.location) lines.push(`  Location: ${status.events.location}`);
    if (status.events.latest) lines.push(`  Latest: ${status.events.latest}`);
  } else {
    lines.push(`  ${status.events.message || 'No events recorded yet'}`);
  }

  // Offline logs
  if (status.offline.count > 0) {
    lines.push('');
    lines.push(chalk.yellow(`⚠️  Offline Logs: ${status.offline.count} entries`));
    if (status.offline.location) lines.push(`  Location: ${status.offline.location}`);
    if (status.offline.latestError) lines.push(`  Latest Error: ${status.offline.latestError}`);
    lines.push(`  Run 'cage logs offline' to view`);
  }

  return lines.join('\n');
}

// Export for CLI command registration
export async function stopCommand(options: { force?: boolean }) {
  const spinner = ora('Stopping Cage server...').start();
  const result = await stopServer(options);

  if (result.success) {
    spinner.succeed(result.message);
  } else {
    spinner.fail(result.message);
    process.exit(1);
  }
}

export async function statusCommand(options: { json?: boolean }) {
  const status = await getServerStatus();

  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
  } else {
    console.log(formatStatus(status));
  }
}

// Function to write PID file when starting server
export function writePidFile(pid: number): void {
  const cageDir = join(process.cwd(), '.cage');
  if (!existsSync(cageDir)) {
    throw new Error('.cage directory not found');
  }
  writeFileSync(PID_FILE, pid.toString());
}

// Function to clean up PID file
export function cleanupPidFile(): void {
  if (existsSync(PID_FILE)) {
    unlinkSync(PID_FILE);
  }
}
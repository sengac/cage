import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
  statSync,
} from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import { platform } from 'os';
import {
  findProcessesOnPort,
  killProcess,
  isProcessRunning,
  killProcessesOnPort,
} from '../utils/process-utils';

export interface ServerStatus {
  server: {
    running: boolean;
    port: number | string;
    pid?: number;
    uptime?: number; // Uptime in milliseconds
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

export async function stopServer(
  options: { force?: boolean } = {}
): Promise<{ success: boolean; message: string }> {
  try {
    let pidFromFile: number | undefined;
    let killedFromPid = false;
    let killedFromPort = 0;

    // First, try to stop using PID file if it exists
    if (existsSync(PID_FILE)) {
      try {
        // Read PID from file
        const pidFileContent = readFileSync(PID_FILE, 'utf-8').trim();

        // Handle both JSON format and plain PID
        try {
          const pidData = JSON.parse(pidFileContent);
          pidFromFile = pidData.pid;
        } catch {
          pidFromFile = parseInt(pidFileContent);
        }

        if (pidFromFile && !isNaN(pidFromFile)) {
          // Check if process exists
          if (isProcessRunning(pidFromFile)) {
            // Kill the process
            if (killProcess(pidFromFile, options.force)) {
              killedFromPid = true;

              // Wait a moment for process to die
              await new Promise(resolve => setTimeout(resolve, 500));

              // Verify it's dead
              if (isProcessRunning(pidFromFile) && !options.force) {
                return {
                  success: false,
                  message: chalk.yellow(
                    'Server not responding. Try: cage stop --force'
                  ),
                };
              }
            }
          }
        }

        // Clean up PID file regardless
        unlinkSync(PID_FILE);
      } catch (error) {
        // Error reading/parsing PID file, continue to port check
      }
    }

    // Also check for any processes on the port (handles orphaned processes)
    const processesOnPort = findProcessesOnPort(PORT);

    // Filter out the PID we already killed
    const remainingProcesses = pidFromFile
      ? processesOnPort.filter(p => p.pid !== pidFromFile)
      : processesOnPort;

    if (remainingProcesses.length > 0) {
      // Kill all processes on the port
      killedFromPort = killProcessesOnPort(PORT, options.force);

      // Wait for processes to die
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if any still remain
      const stillRunning = findProcessesOnPort(PORT);
      if (stillRunning.length > 0 && !options.force) {
        return {
          success: false,
          message: chalk.yellow(
            `${stillRunning.length} process(es) still using port ${PORT}. Try: cage stop --force`
          ),
        };
      }
    }

    // Clean up PID file if it still exists
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }

    // Determine result message
    if (!killedFromPid && killedFromPort === 0) {
      return {
        success: true,
        message: '🔴 No CAGE server is running',
      };
    }

    const message = options.force
      ? '🔴 CAGE server forcefully stopped'
      : '🔴 CAGE server stopped';

    const details: string[] = [];
    if (killedFromPid) details.push('PID from file');
    if (killedFromPort > 0)
      details.push(`${killedFromPort} orphaned process(es)`);

    return {
      success: true,
      message:
        details.length > 0
          ? `${message} (killed: ${details.join(', ')})`
          : message,
    };
  } catch (error) {
    return {
      success: false,
      message: chalk.red(`Error stopping server: ${error}`),
    };
  }
}

export async function getServerStatus(): Promise<ServerStatus> {
  const status: ServerStatus = {
    server: { running: false, port: `${PORT} (available)` },
    hooks: { installed: false },
    events: { total: 0 },
    offline: { count: 0 },
  };

  // Check server status
  if (existsSync(PID_FILE)) {
    try {
      const pidFileContent = readFileSync(PID_FILE, 'utf-8').trim();
      let pid: number;
      let startTime: number | undefined;

      // Try to parse as JSON (new format) or fallback to plain PID (legacy format)
      try {
        const pidData = JSON.parse(pidFileContent);
        pid = pidData.pid;
        startTime = pidData.startTime;
      } catch {
        // Legacy format - just a plain PID number
        pid = parseInt(pidFileContent);
      }

      // Check if process is running (cross-platform)
      try {
        if (platform() === 'win32') {
          execSync(`tasklist /FI "PID eq ${pid}" 2>nul | find "${pid}" >nul`, {
            stdio: 'ignore',
            shell: true,
          });
        } else {
          execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
        }
        status.server.running = true;
        status.server.pid = pid;
        status.server.port = PORT;

        // Calculate uptime if start time is available
        if (startTime) {
          status.server.uptime = Date.now() - startTime;
        }

        // Try to get health status
        try {
          execSync(`curl -s http://localhost:${PORT}/health`, {
            stdio: 'ignore',
          });
          status.server.health = 'OK';
        } catch {
          status.server.health = 'Not responding';
        }
      } catch {
        // Process not running but PID file exists
        status.server.running = false;
        status.server.warning = 'Stale PID file found';
      }
    } catch (error) {
      status.server.running = false;
    }
  }

  // Check if port is in use by another process (cross-platform)
  if (!status.server.running) {
    try {
      if (platform() === 'win32') {
        // Windows: use netstat to check port
        const netstatOutput = execSync(`netstat -ano | findstr :${PORT}`, {
          encoding: 'utf-8',
          shell: true,
        }).trim();
        if (netstatOutput) {
          const lines = netstatOutput.split('\n');
          const firstLine = lines[0];
          const pidMatch = firstLine.match(/\s+(\d+)\s*$/);
          if (pidMatch) {
            const otherPid = parseInt(pidMatch[1]);
            status.server.warning = `Port ${PORT} is in use by another process (PID: ${otherPid})`;
          }
        }
      } else {
        // Unix: use lsof
        const lsofOutput = execSync(`lsof -ti :${PORT}`, {
          encoding: 'utf-8',
        }).trim();
        if (lsofOutput) {
          const otherPid = parseInt(lsofOutput.split('\n')[0]);
          status.server.warning = `Port ${PORT} is in use by another process (PID: ${otherPid})`;
        }
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
                  if (
                    hookDef.command &&
                    hookDef.command.includes('quality-check')
                  ) {
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
              if (
                typeof postToolUse[key] === 'string' &&
                postToolUse[key].includes('quality-check')
              ) {
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
            const lines = readFileSync(eventsFile, 'utf-8')
              .trim()
              .split('\n')
              .filter(l => l);
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
      const lines = readFileSync(offlineLog, 'utf-8')
        .trim()
        .split('\n')
        .filter(l => l);
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
    lines.push(chalk.yellow(`  ${status.server.warning}`));
  }

  lines.push('');

  // Hooks status
  if (status.hooks.installed) {
    lines.push(chalk.green('Hooks: Installed'));
    if (status.hooks.location)
      lines.push(`  Location: ${status.hooks.location}`);
    if (status.hooks.count) lines.push(`  Hook Types: ${status.hooks.count}`);
    if (status.hooks.hasQualityCheck) {
      lines.push(chalk.green('  Quality check hook detected'));
    }
  } else {
    lines.push(chalk.yellow('Hooks: Not Installed'));
    if (status.hooks.message) lines.push(`  ${status.hooks.message}`);
  }

  lines.push('');

  // Events status
  lines.push('Events:');
  if (status.events.total > 0) {
    lines.push(`  Total Captured: ${status.events.total}`);
    if (status.events.today !== undefined)
      lines.push(`  Today: ${status.events.today}`);
    if (status.events.location)
      lines.push(`  Location: ${status.events.location}`);
    if (status.events.latest) lines.push(`  Latest: ${status.events.latest}`);
  } else {
    lines.push(`  ${status.events.message || 'No events recorded yet'}`);
  }

  // Offline logs
  if (status.offline.count > 0) {
    lines.push('');
    lines.push(chalk.yellow(`Offline Logs: ${status.offline.count} entries`));
    if (status.offline.location)
      lines.push(`  Location: ${status.offline.location}`);
    if (status.offline.latestError)
      lines.push(`  Latest Error: ${status.offline.latestError}`);
    lines.push(`  Run 'cage logs offline' to view`);
  }

  return lines.join('\n');
}

// Export for CLI command registration
export async function stopCommand(options: { force?: boolean }) {
  // Don't do early check - let stopServer handle all cases including orphaned processes
  const spinner = ora('Stopping CAGE server...').start();
  const result = await stopServer(options);

  spinner.stop();
  console.log(result.message);

  if (!result.success) {
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

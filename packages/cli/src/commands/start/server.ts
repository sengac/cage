import { execa } from 'execa';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, openSync, closeSync } from 'fs';
import { join, dirname } from 'path';
import { platform } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface StartServerResult {
  success: boolean;
  message: string;
  pid?: number;
}

export async function startServer(options: { port?: number } = {}): Promise<StartServerResult> {
  const port = options.port || 3790;
  const cageDir = join(process.cwd(), '.cage');
  const pidFile = join(cageDir, 'server.pid');
  // Try multiple possible backend paths
  const possiblePaths = [
    join(__dirname, '..', '..', '..', '..', 'backend', 'dist', 'main.js'), // From dist/commands/start/
    join(process.cwd(), '..', 'backend', 'dist', 'main.js'), // From CLI package root
    join(process.cwd(), 'packages', 'backend', 'dist', 'main.js'), // From monorepo root
  ];

  const backendPath = possiblePaths.find(path => existsSync(path));

  if (!backendPath) {
    // Try to provide helpful error with actual paths checked
    return {
      success: false,
      message: `Backend not found. Please run "npm run build --workspace @cage/backend" first\nLooked in:\n${possiblePaths.join('\n')}`
    };
  }

  // Check if server is already running
  if (existsSync(pidFile)) {
    try {
      const pidFileContent = readFileSync(pidFile, 'utf-8').trim();
      let existingPid: number;

      // Try to parse as JSON or fallback to plain PID
      try {
        const pidData = JSON.parse(pidFileContent);
        existingPid = pidData.pid;
      } catch {
        existingPid = parseInt(pidFileContent);
      }

      // Check if process is actually running
      process.kill(existingPid, 0); // This throws if process doesn't exist

      return {
        success: false,
        message: `Server already running on port ${port} (PID: ${existingPid})`
      };
    } catch {
      // PID file exists but process is dead - clean up
      unlinkSync(pidFile);
    }
  }

  // Check if port is already in use (cross-platform)
  try {
    if (platform() === 'win32') {
      // Windows: use netstat
      const netstatOutput = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8', stdio: 'pipe', shell: true }).trim();
      if (netstatOutput) {
        const lines = netstatOutput.split('\n');
        const firstLine = lines[0];
        const pidMatch = firstLine.match(/\s+(\d+)\s*$/);
        if (pidMatch) {
          return {
            success: false,
            message: `Port ${port} is already in use by process ${pidMatch[1]}. Please stop the existing process or use a different port with --port flag.`
          };
        }
      }
    } else {
      // Unix: use lsof
      const lsofOutput = execSync(`lsof -ti :${port}`, { encoding: 'utf-8', stdio: 'pipe' }).trim();
      if (lsofOutput) {
        const pids = lsofOutput.split('\n').filter(pid => pid.trim());
        if (pids.length > 0) {
          return {
            success: false,
            message: `Port ${port} is already in use by process ${pids[0]}. Please stop the existing process or use a different port with --port flag.`
          };
        }
      }
    }
  } catch {
    // Port is free (command exits with error when no processes found)
  }

  // Ensure .cage directory exists
  if (!existsSync(cageDir)) {
    mkdirSync(cageDir, { recursive: true });
  }

  // Create log files for stdout/stderr
  const logFile = join(cageDir, 'server.log');
  const errorLogFile = join(cageDir, 'server.error.log');

  // Open log files with file descriptors for proper detached logging
  const outFd = openSync(logFile, 'a');
  const errFd = openSync(errorLogFile, 'a');

  try {
    // Start server using execa with proper detached configuration
    const subprocess = execa('node', [backendPath], {
      env: {
        PORT: port.toString(),
        NODE_ENV: 'production'
      },
      detached: true,     // Run independently from parent
      cleanup: false,     // Don't kill subprocess when parent exits
      stdio: ['ignore', outFd, errFd], // Use file descriptors for output
      windowsHide: true   // Hide window on Windows
    });

    // Get PID immediately
    const pid = subprocess.pid;
    if (!pid) {
      closeSync(outFd);
      closeSync(errFd);
      return {
        success: false,
        message: 'Failed to get server process ID'
      };
    }

    // Write PID file with start time as JSON
    const pidData = {
      pid: pid,
      startTime: Date.now()
    };
    writeFileSync(pidFile, JSON.stringify(pidData));

    // Critical: unref to allow parent to exit without waiting
    subprocess.unref();

    // Close file descriptors in parent process
    closeSync(outFd);
    closeSync(errFd);

    // Wait a moment to ensure server starts successfully
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if process is still running
    try {
      process.kill(pid, 0);
      return {
        success: true,
        message: `Server started on port ${port} (PID: ${pid}, logs: ${logFile})`,
        pid
      };
    } catch {
      // Process died - clean up and report error
      if (existsSync(pidFile)) {
        unlinkSync(pidFile);
      }

      // Try to read error from log
      let errorMsg = 'Server failed to start (process exited immediately)';
      if (existsSync(errorLogFile)) {
        try {
          const errorContent = readFileSync(errorLogFile, 'utf-8');
          const lines = errorContent.split('\n').filter(l => l.trim());
          if (lines.length > 0) {
            const lastError = lines[lines.length - 1];
            if (lastError.includes('EADDRINUSE')) {
              errorMsg = `Port ${port} is already in use`;
            } else if (lastError.includes('Error:')) {
              errorMsg = lastError;
            }
          }
        } catch {
          // Ignore read errors
        }
      }

      return {
        success: false,
        message: errorMsg
      };
    }
  } catch (error) {
    // Clean up file descriptors on error
    try { closeSync(outFd); } catch {}
    try { closeSync(errFd); } catch {}

    return {
      success: false,
      message: `Failed to start server: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export async function isServerRunning(): Promise<{ running: boolean; pid?: number }> {
  const pidFile = join(process.cwd(), '.cage', 'server.pid');

  if (!existsSync(pidFile)) {
    return { running: false };
  }

  try {
    const pidFileContent = readFileSync(pidFile, 'utf-8').trim();
    let pid: number;

    // Try to parse as JSON or fallback to plain PID
    try {
      const pidData = JSON.parse(pidFileContent);
      pid = pidData.pid;
    } catch {
      pid = parseInt(pidFileContent);
    }

    // Check if process exists
    process.kill(pid, 0);

    return { running: true, pid };
  } catch {
    // Process doesn't exist, clean up stale PID file
    unlinkSync(pidFile);
    return { running: false };
  }
}
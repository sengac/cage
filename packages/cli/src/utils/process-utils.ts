import { execSync } from 'child_process';
import { platform } from 'os';
import { Logger } from '@cage/shared';

const logger = new Logger({ context: 'process-utils' });

export interface ProcessInfo {
  pid: number;
  command?: string;
}

/**
 * Find processes listening on a specific port
 * @param port The port number to check
 * @returns Array of processes using the port
 */
export function findProcessesOnPort(port: number): ProcessInfo[] {
  const processes: ProcessInfo[] = [];

  logger.debug(`Looking for processes on port ${port}`);

  try {
    if (platform() === 'win32') {
      // Windows: use netstat to find process
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8' }).trim();
      const lines = output.split('\n');

      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[parts.length - 1]);
          if (pid && !isNaN(pid)) {
            // Check if we already have this PID
            if (!processes.find(p => p.pid === pid)) {
              processes.push({ pid });
            }
          }
        }
      }
    } else {
      // macOS/Linux: use lsof to find process
      try {
        const output = execSync(`lsof -i :${port} -t`, { encoding: 'utf-8' }).trim();
        logger.debug(`lsof output: ${output}`);
        const pids = output.split('\n').map(p => parseInt(p.trim())).filter(p => !isNaN(p));

        for (const pid of pids) {
          if (!processes.find(p => p.pid === pid)) {
            // Try to get command name
            let command: string | undefined;
            try {
              command = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf-8' }).trim();
            } catch {
              // Ignore if we can't get command name
            }
            processes.push({ pid, command });
          }
        }
      } catch (error) {
        // lsof returns error if no processes found, which is fine
        logger.debug(`No processes found on port ${port}`);
      }
    }
  } catch (error) {
    logger.debug(`Error finding processes on port ${port}:`, error);
  }

  return processes;
}

/**
 * Kill a process by PID
 * @param pid Process ID to kill
 * @param force Use force kill (SIGKILL)
 * @returns True if process was killed successfully
 */
export function killProcess(pid: number, force: boolean = false): boolean {
  try {
    if (platform() === 'win32') {
      // Windows: use taskkill
      const forceFlag = force ? '/F' : '';
      execSync(`taskkill /PID ${pid} ${forceFlag}`, { stdio: 'ignore' });
    } else {
      // Unix: use kill command
      const signal = force ? 'KILL' : 'TERM';
      execSync(`kill -${signal} ${pid}`, { stdio: 'ignore' });
    }
    return true;
  } catch (error) {
    logger.debug(`Failed to kill process ${pid}:`, error);
    return false;
  }
}

/**
 * Check if a process exists
 * @param pid Process ID to check
 * @returns True if process exists
 */
export function isProcessRunning(pid: number): boolean {
  try {
    if (platform() === 'win32') {
      // Windows: use tasklist to check if process exists
      execSync(`tasklist /FI "PID eq ${pid}" 2>nul | find "${pid}" >nul`, {
        stdio: 'ignore',
        shell: true
      });
      return true;
    } else {
      // Unix: use kill -0 to check if process exists
      execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
      return true;
    }
  } catch {
    return false;
  }
}

/**
 * Kill all processes on a specific port
 * @param port The port number
 * @param force Use force kill
 * @returns Number of processes killed
 */
export function killProcessesOnPort(port: number, force: boolean = false): number {
  const processes = findProcessesOnPort(port);
  let killedCount = 0;

  for (const proc of processes) {
    logger.info(`Killing process ${proc.pid} (${proc.command || 'unknown'}) on port ${port}`);
    if (killProcess(proc.pid, force)) {
      killedCount++;
    }
  }

  return killedCount;
}
import { spawn, ChildProcess, execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

export interface StartServerResult {
  success: boolean;
  message: string;
  pid?: number;
}

export async function startServer(options: { port?: number } = {}): Promise<StartServerResult> {
  const port = options.port || 3790;
  const cageDir = join(process.cwd(), '.cage');
  const pidFile = join(cageDir, 'server.pid');
  const backendPath = join(process.cwd(), 'packages', 'backend', 'dist', 'main.js');

  // Check if server is already running
  if (existsSync(pidFile)) {
    try {
      const existingPid = parseInt(readFileSync(pidFile, 'utf-8').trim());

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

  // Check if backend is built
  if (!existsSync(backendPath)) {
    return {
      success: false,
      message: 'Backend not found. Please run "npm run build --workspace @cage/backend" first'
    };
  }

  // Check if port is already in use
  try {
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
  } catch {
    // Port is free (lsof exits with error when no processes found)
  }

  // Ensure .cage directory exists
  if (!existsSync(cageDir)) {
    mkdirSync(cageDir, { recursive: true });
  }

  return new Promise((resolve) => {
    // Start the backend server with captured stderr initially to catch startup errors
    const serverProcess: ChildProcess = spawn('node', [backendPath], {
      env: {
        ...process.env,
        PORT: port.toString(),
        NODE_ENV: 'production'
      },
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']  // Capture stdout/stderr initially
    });

    let startupError = '';

    // Capture stderr for startup errors
    if (serverProcess.stderr) {
      serverProcess.stderr.on('data', (data) => {
        const errorText = data.toString();
        if (errorText.includes('EADDRINUSE')) {
          startupError = `Port ${port} is already in use. Please stop the existing process or use a different port.`;
        } else if (errorText.includes('Error:')) {
          startupError = errorText.trim();
        }
      });
    }

    // Handle spawn errors
    serverProcess.on('error', (error) => {
      resolve({
        success: false,
        message: `Failed to start server: ${error.message}`
      });
    });

    // Once spawned, write PID and detach immediately
    serverProcess.on('spawn', () => {
      // Write PID file immediately
      if (serverProcess.pid) {
        writeFileSync(pidFile, serverProcess.pid.toString());

        // Unref to allow parent to exit
        serverProcess.unref();

        // Give it a moment to ensure it doesn't crash immediately and check for errors
        setTimeout(() => {
          // Check for startup errors first
          if (startupError) {
            // Clean up PID file if there was an error
            if (existsSync(pidFile)) {
              unlinkSync(pidFile);
            }
            resolve({
              success: false,
              message: startupError
            });
            return;
          }

          // Check if process is still running
          try {
            process.kill(serverProcess.pid!, 0);

            // Detach stdio now that startup is successful
            if (serverProcess.stdout) serverProcess.stdout.destroy();
            if (serverProcess.stderr) serverProcess.stderr.destroy();

            resolve({
              success: true,
              message: `Server started on port ${port}`,
              pid: serverProcess.pid
            });
          } catch {
            // Process died immediately
            if (existsSync(pidFile)) {
              unlinkSync(pidFile);
            }
            const errorMsg = startupError || 'Server failed to start (process exited immediately)';
            resolve({
              success: false,
              message: errorMsg
            });
          }
        }, 2000); // Wait 2 seconds to ensure it's stable and capture any errors
      } else {
        resolve({
          success: false,
          message: 'Failed to get server process ID'
        });
      }
    });
  });
}

export async function isServerRunning(): Promise<{ running: boolean; pid?: number }> {
  const pidFile = join(process.cwd(), '.cage', 'server.pid');

  if (!existsSync(pidFile)) {
    return { running: false };
  }

  try {
    const pid = parseInt(readFileSync(pidFile, 'utf-8').trim());

    // Check if process exists
    process.kill(pid, 0);

    return { running: true, pid };
  } catch {
    // Process doesn't exist, clean up stale PID file
    unlinkSync(pidFile);
    return { running: false };
  }
}
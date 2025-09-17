import { spawn, ChildProcess } from 'child_process';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { rmSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Global singleton backend using file-based coordination
let sharedBackendProcess: ChildProcess | null = null;
let sharedTestDir: string | null = null;
let initPromise: Promise<void> | null = null;

export const BACKEND_PORT = 3790;
const LOCK_FILE = join(tmpdir(), 'cage-integration-backend.lock');
const INFO_FILE = join(tmpdir(), 'cage-integration-backend.json');

export async function getSharedBackend(): Promise<{ port: number; testDir: string }> {
  // Check if we already have it in this process
  if (sharedBackendProcess && sharedTestDir) {
    return { port: BACKEND_PORT, testDir: sharedTestDir };
  }

  // Check if another process already started the backend
  if (existsSync(INFO_FILE)) {
    try {
      const info = JSON.parse(readFileSync(INFO_FILE, 'utf-8'));

      // Verify the backend is still running by checking health
      const isHealthy = await checkBackendHealth();
      if (isHealthy) {
        sharedTestDir = info.testDir;
        console.log('Using existing shared backend from another process');
        return { port: BACKEND_PORT, testDir: info.testDir };
      } else {
        // Backend is dead, clean up stale files
        console.log('Found stale backend info, cleaning up...');
        if (existsSync(LOCK_FILE)) rmSync(LOCK_FILE, { force: true });
        if (existsSync(INFO_FILE)) rmSync(INFO_FILE, { force: true });
      }
    } catch (e) {
      // Invalid info file, clean up
      if (existsSync(LOCK_FILE)) rmSync(LOCK_FILE, { force: true });
      if (existsSync(INFO_FILE)) rmSync(INFO_FILE, { force: true });
    }
  }

  // Try to acquire the lock to start the backend
  return await acquireLockAndStartBackend();
}

export async function resetBackendState(): Promise<void> {
  if (!sharedTestDir) {
    throw new Error('Backend not initialized');
  }

  // Clear all events but keep the backend running
  const eventsDir = join(sharedTestDir, '.cage/events');
  if (existsSync(eventsDir)) {
    await rm(eventsDir, { recursive: true, force: true });
    await mkdir(eventsDir, { recursive: true });
  }

  // Clear any other state files if needed
  const offlineLogsDir = join(sharedTestDir, '.cage/offline-logs');
  if (existsSync(offlineLogsDir)) {
    await rm(offlineLogsDir, { recursive: true, force: true });
  }
}

export async function restartBackend(): Promise<void> {
  // Only restart if we own the backend process
  if (!sharedBackendProcess) {
    console.log('Cannot restart backend - not owned by this process');
    return;
  }

  console.log('Restarting shared backend...');

  // Stop the current backend
  sharedBackendProcess.kill();
  await new Promise(resolve => setTimeout(resolve, 1000));
  sharedBackendProcess = null;

  // Clear the lock files so we can restart
  try {
    if (existsSync(LOCK_FILE)) rmSync(LOCK_FILE, { force: true });
    if (existsSync(INFO_FILE)) rmSync(INFO_FILE, { force: true });
  } catch (e) {
    // Ignore cleanup errors
  }

  // Restart using the proper singleton mechanism
  await acquireLockAndStartBackend();
}

async function killProcessOnPort(port: number): Promise<void> {
  try {
    // Try to find and kill any process using the port
    const { execSync } = await import('child_process');
    try {
      // Find process using the port (works on macOS/Linux)
      const pid = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim();
      if (pid) {
        console.log(`Killing existing process ${pid} on port ${port}`);
        execSync(`kill -9 ${pid}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (e) {
      // No process found or command failed, that's ok
    }
  } catch (e) {
    // Import or execution failed, continue anyway
  }
}

async function startBackendProcess(): Promise<void> {
  // Get the project root - go up from test/integration to the root
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const projectRoot = join(__dirname, '..', '..');

  sharedBackendProcess = spawn('node', [
    join(projectRoot, 'packages/backend/dist/main.js')
  ], {
    env: {
      ...process.env,
      PORT: BACKEND_PORT.toString(),
      TEST_BASE_DIR: sharedTestDir
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Wait for backend to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Backend failed to start within 10 seconds'));
    }, 10000);

    if (sharedBackendProcess?.stdout) {
      sharedBackendProcess.stdout.on('data', (data) => {
        if (data.toString().includes('Nest application successfully started')) {
          clearTimeout(timeout);
          resolve();
        }
      });
    }

    if (sharedBackendProcess?.stderr) {
      sharedBackendProcess.stderr.on('data', (data) => {
        const message = data.toString();
        console.error('Shared backend stderr:', message);
        if (message.includes('EADDRINUSE')) {
          reject(new Error(`Port ${BACKEND_PORT} is already in use`));
        }
      });
    }

    // Also handle process exit
    sharedBackendProcess?.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Backend process exited with code ${code}`));
      }
    });
  });

  // Verify backend is actually responding
  await waitForBackendHealth();
}

async function initializeBackend(): Promise<void> {
  try {
    console.log('Starting SHARED backend server for ALL integration tests...');

    // Kill any existing process on our port first
    await killProcessOnPort(BACKEND_PORT);

    // Create shared test directory
    sharedTestDir = await mkdtemp(join(tmpdir(), 'cage-shared-integration-'));

    // Create cage config in test directory
    await writeFile(join(sharedTestDir, 'cage.config.json'), JSON.stringify({
      port: BACKEND_PORT,
      logLevel: 'info'
    }));

    // Create .cage directory structure
    await mkdir(join(sharedTestDir, '.cage'), { recursive: true });
    await mkdir(join(sharedTestDir, '.cage/events'), { recursive: true });

    // Start the backend
    await startBackendProcess();

    console.log('SHARED backend server started successfully on port', BACKEND_PORT);

    // NOTE: We don't register cleanup handlers here because this is a SHARED backend
    // that should stay alive across multiple test files. Vitest will handle cleanup
    // when the test process exits, or tests can call cleanupSharedBackend manually.
  } catch (error) {
    console.error('Failed to initialize shared backend:', error);
    // Clean up on failure
    cleanupSharedBackend();
    initPromise = null; // Allow retry
    throw error;
  }
}

async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:${BACKEND_PORT}/health`, {
      signal: AbortSignal.timeout(2000) // 2 second timeout
    });
    if (response.ok) {
      const data = await response.json();
      return data.status === 'ok';
    }
  } catch (error) {
    // Backend not reachable
  }
  return false;
}

async function waitForBackendHealth(): Promise<void> {
  const maxAttempts = 30;
  const delayMs = 500;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const isHealthy = await checkBackendHealth();
    if (isHealthy) {
      console.log(`Backend health check passed on attempt ${attempt}`);
      return;
    }

    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(`Backend health check failed after ${maxAttempts} attempts`);
}

async function acquireLockAndStartBackend(): Promise<{ port: number; testDir: string }> {
  const maxRetries = 10;
  const retryDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try to create a lock file exclusively
      writeFileSync(LOCK_FILE, process.pid.toString(), { flag: 'wx' });

      // We got the lock! Start the backend
      console.log(`Process ${process.pid} acquired lock, starting shared backend...`);

      try {
        await initializeBackend();

        // Write backend info for other processes
        const info = {
          port: BACKEND_PORT,
          testDir: sharedTestDir,
          pid: process.pid,
          startTime: Date.now()
        };
        writeFileSync(INFO_FILE, JSON.stringify(info));

        return { port: BACKEND_PORT, testDir: sharedTestDir! };
      } catch (error) {
        // Failed to start, release lock
        if (existsSync(LOCK_FILE)) rmSync(LOCK_FILE, { force: true });
        throw error;
      }
    } catch (error) {
      // Lock file already exists, wait and retry
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        console.log(`Process ${process.pid} waiting for backend (attempt ${attempt}/${maxRetries})...`);

        // Wait and check if backend is available
        await new Promise(resolve => setTimeout(resolve, retryDelay));

        // Check if the backend is now available
        if (existsSync(INFO_FILE)) {
          try {
            const info = JSON.parse(readFileSync(INFO_FILE, 'utf-8'));
            const isHealthy = await checkBackendHealth();
            if (isHealthy) {
              sharedTestDir = info.testDir;
              console.log(`Process ${process.pid} using backend started by process ${info.pid}`);
              return { port: BACKEND_PORT, testDir: info.testDir };
            }
          } catch (e) {
            // Invalid or stale info file, continue trying
          }
        }
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Failed to acquire backend lock after ${maxRetries} attempts`);
}

function cleanupSharedBackend(): void {
  if (sharedBackendProcess) {
    console.log('Stopping shared backend server...');
    sharedBackendProcess.kill();
    sharedBackendProcess = null;
  }
  if (sharedTestDir) {
    try {
      rmSync(sharedTestDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
    sharedTestDir = null;
  }

  // Clean up lock files (only if we created them)
  try {
    if (existsSync(LOCK_FILE)) {
      const lockContent = readFileSync(LOCK_FILE, 'utf-8');
      if (lockContent === process.pid.toString()) {
        rmSync(LOCK_FILE, { force: true });
        rmSync(INFO_FILE, { force: true });
        console.log(`Process ${process.pid} cleaned up backend lock files`);
      }
    }
  } catch (e) {
    // Ignore cleanup errors
  }
}
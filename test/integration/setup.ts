import { spawn, ChildProcess } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

let backendProcess: ChildProcess | null = null;
let testDir: string | null = null;
export const BACKEND_PORT = 3790;
export const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

export async function setupIntegrationTests(): Promise<string> {
  // Only start backend once
  if (!backendProcess) {
    console.log('Starting shared backend server...');

    // Create shared test directory
    testDir = await mkdtemp(join(tmpdir(), 'cage-integration-tests-'));

    // Start backend server
    backendProcess = spawn('node', [
      join(process.cwd(), 'packages/backend/dist/main.js')
    ], {
      env: {
        ...process.env,
        PORT: BACKEND_PORT.toString(),
        TEST_BASE_DIR: testDir
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Wait for backend to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Backend failed to start within 10 seconds'));
      }, 10000);

      if (backendProcess?.stdout) {
        backendProcess.stdout.on('data', (data) => {
          if (data.toString().includes('Nest application successfully started')) {
            clearTimeout(timeout);
            resolve();
          }
        });
      }

      if (backendProcess?.stderr) {
        backendProcess.stderr.on('data', (data) => {
          console.error('Backend stderr:', data.toString());
        });
      }
    });

    console.log('Backend server started successfully');
  }

  return testDir!;
}

export async function teardownIntegrationTests(): Promise<void> {
  if (backendProcess) {
    console.log('Stopping shared backend server...');
    backendProcess.kill();
    await new Promise(resolve => setTimeout(resolve, 1000));
    backendProcess = null;
  }

  if (testDir) {
    await rm(testDir, { recursive: true, force: true });
    testDir = null;
  }
}

export function getTestDir(): string {
  if (!testDir) {
    throw new Error('Test directory not initialized. Call setupIntegrationTests first.');
  }
  return testDir;
}
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    pool: 'forks', // Use forks for better test isolation
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@cage/shared': resolve(__dirname, '../shared/src')
    }
  }
});
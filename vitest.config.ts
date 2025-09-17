import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30 seconds for integration tests
    hookTimeout: 30000, // 30 seconds for setup/teardown hooks
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
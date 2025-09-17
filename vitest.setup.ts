import { beforeAll, afterAll } from 'vitest';
import { setupIntegrationTests, teardownIntegrationTests } from './test/integration/setup';

// Only run setup/teardown for integration tests
if (process.env.TEST_TYPE === 'integration' || process.argv.some(arg => arg.includes('integration'))) {
  beforeAll(async () => {
    await setupIntegrationTests();
  });

  afterAll(async () => {
    await teardownIntegrationTests();
  });
}
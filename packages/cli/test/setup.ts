import { vi } from 'vitest';

// Mock console methods that Ink uses internally
global.console = {
  ...console,
  clear: vi.fn(),
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

// Setup test environment for React components
process.env.NODE_ENV = 'test';

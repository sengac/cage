import { vi } from 'vitest';
import type React from 'react';

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

// Mock the InputContext module to prevent useInputMode errors
vi.mock('../src/contexts/InputContext', () => ({
  InputModeProvider: ({ children }: { children: React.ReactNode }) => children,
  useInputMode: () => ({
    mode: 'normal',
    focusOwner: null,
    claimFocus: vi.fn(() => vi.fn()),
    hasFocus: vi.fn(() => false),
  }),
  useExclusiveInput: () => ({
    enterExclusiveMode: vi.fn(() => vi.fn()),
    exitExclusiveMode: vi.fn(),
    hasExclusiveFocus: false,
    exclusiveMode: null,
  }),
}));

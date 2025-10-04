import { vi } from 'vitest';
import type React from 'react';

// Mock the InputContext module
vi.mock('../contexts/InputContext', () => ({
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

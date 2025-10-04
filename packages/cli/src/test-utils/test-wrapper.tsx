import React, { type ReactNode } from 'react';
import { InputModeProvider } from '../shared/contexts/InputContext';

interface TestWrapperProps {
  children: ReactNode;
}

/**
 * Test wrapper that provides all necessary contexts for component testing
 */
export const TestWrapper: React.FC<TestWrapperProps> = ({ children }) => {
  return <InputModeProvider>{children}</InputModeProvider>;
};

/**
 * Helper to render components with test wrapper
 */
export const renderWithContext = (component: React.ReactElement) => {
  return <TestWrapper>{component}</TestWrapper>;
};

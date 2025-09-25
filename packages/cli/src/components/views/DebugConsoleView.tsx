import React from 'react';
import type { ViewProps } from '../../types/viewSystem';
import { DebugConsole } from '../DebugConsole';

/**
 * DebugConsoleView - wraps the existing DebugConsole component
 * Integrates with the new ViewManager system
 */
export const DebugConsoleView: React.FC<ViewProps> = ({
  onBack,
  onNavigate,
}) => {
  return <DebugConsole onBack={onBack} />;
};

import React from 'react';
import type { ViewProps } from '../../../core/navigation/types';
import { DebugConsole } from '../components/DebugConsole';

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

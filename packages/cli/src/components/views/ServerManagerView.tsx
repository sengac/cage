import React from 'react';
import type { ViewProps } from '../../types/viewSystem';
import { ServerManager } from '../ServerManager';

/**
 * ServerManagerView - wraps the existing ServerManager component
 * Integrates with the new ViewManager system
 */
export const ServerManagerView: React.FC<ViewProps> = ({
  onBack,
  onNavigate,
}) => {
  return <ServerManager onBack={onBack} />;
};

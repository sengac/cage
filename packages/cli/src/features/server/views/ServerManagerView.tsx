import React from 'react';
import type { ViewProps } from '../../../core/navigation/types';
import { ServerManager } from '../components/ServerManager';

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

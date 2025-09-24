import React from 'react';
import type { ViewProps } from '../../types/viewSystem';
import { StreamView as StreamComponent } from '../StreamView';

/**
 * StreamView - wraps the existing StreamView component
 * Integrates with the new ViewManager system
 */
export const StreamView: React.FC<ViewProps> = ({ onBack, onNavigate }) => {
  return <StreamComponent onBack={onBack} onNavigate={onNavigate} />;
};

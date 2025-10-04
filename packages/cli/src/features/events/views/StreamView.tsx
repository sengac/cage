import React from 'react';
import type { ViewProps } from '../../../core/navigation/types';
import { StreamView as StreamComponent } from '../components/StreamView';

/**
 * StreamView - wraps the existing StreamView component
 * Integrates with the new ViewManager system
 */
export const StreamView: React.FC<ViewProps> = ({ onBack, onNavigate }) => {
  return <StreamComponent onBack={onBack} onNavigate={onNavigate} />;
};

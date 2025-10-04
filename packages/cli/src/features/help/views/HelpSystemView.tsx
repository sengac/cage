import React from 'react';
import type { ViewProps } from '../../../core/navigation/types';
import { HelpSystem } from '../components/HelpSystem';

/**
 * HelpSystemView - wraps the existing HelpSystem component
 * Integrates with the new ViewManager system
 */
export const HelpSystemView: React.FC<ViewProps> = ({ onBack, onNavigate }) => {
  return <HelpSystem onBack={onBack} />;
};

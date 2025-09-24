import React from 'react';
import type { ViewProps } from '../../types/viewSystem';
import { HelpSystem } from '../HelpSystem';

/**
 * HelpSystemView - wraps the existing HelpSystem component
 * Integrates with the new ViewManager system
 */
export const HelpSystemView: React.FC<ViewProps> = ({ onBack, onNavigate }) => {
  return <HelpSystem onBack={onBack} />;
};

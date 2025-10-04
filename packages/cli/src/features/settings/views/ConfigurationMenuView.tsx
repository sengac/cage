import React from 'react';
import type { ViewProps } from '../../../core/navigation/types';
import { ConfigurationMenu } from '../components/ConfigurationMenu';

/**
 * ConfigurationMenuView - wraps the existing ConfigurationMenu component
 * Integrates with the new ViewManager system
 */
export const ConfigurationMenuView: React.FC<ViewProps> = ({
  onBack,
  onNavigate,
}) => {
  return <ConfigurationMenu onBack={onBack} />;
};

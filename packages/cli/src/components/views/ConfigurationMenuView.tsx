import React from 'react';
import type { ViewProps } from '../../types/viewSystem';
import { ConfigurationMenu } from '../ConfigurationMenu';

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

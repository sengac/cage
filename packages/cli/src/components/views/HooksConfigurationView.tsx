import React from 'react';
import type { ViewProps } from '../../types/viewSystem';
import { HooksConfiguration } from '../HooksConfiguration';

/**
 * HooksConfigurationView - wraps the existing HooksConfiguration component
 * Integrates with the new ViewManager system
 */
export const HooksConfigurationView: React.FC<ViewProps> = ({
  onBack,
  onNavigate,
  updateMetadata,
}) => {
  return <HooksConfiguration onBack={onBack} updateMetadata={updateMetadata} />;
};

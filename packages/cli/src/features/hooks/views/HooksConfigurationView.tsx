import React from 'react';
import type { ViewProps } from '../../../core/navigation/types';
import { HooksConfiguration } from '../components/HooksConfiguration';

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

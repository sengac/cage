import React from 'react';
import type { ViewProps } from '../../types/viewSystem';
import { EventDetail } from '../EventDetail';

/**
 * EventDetailView - wraps the existing EventDetail component
 * Integrates with the new ViewManager system
 */
export const EventDetailView: React.FC<ViewProps> = ({
  onBack,
  onNavigate,
}) => {
  return <EventDetail onBack={onBack} />;
};

import React from 'react';
import type { ViewProps } from '../../types/viewSystem';
import { EventInspector } from '../EventInspector';
import type { Event } from '../../stores/appStore';

/**
 * EventInspectorView - wraps the existing EventInspector component
 * Integrates with the new ViewManager system
 */
export const EventInspectorView: React.FC<ViewProps> = ({ onBack, onNavigate }) => {
  const handleSelectEvent = (event: Event) => {
    // Navigate to event detail view when an event is selected
    onNavigate('eventDetail');
  };

  return <EventInspector onSelectEvent={handleSelectEvent} onBack={onBack} />;
};
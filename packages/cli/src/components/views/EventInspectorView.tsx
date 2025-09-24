import React from 'react';
import type { ViewProps } from '../../types/viewSystem';
import { EventInspector } from '../EventInspector';
import type { Event } from '../../stores/appStore';
import { useAppStore } from '../../stores/appStore';

/**
 * EventInspectorView - wraps the existing EventInspector component
 * Integrates with the new ViewManager system
 */
export const EventInspectorView: React.FC<ViewProps> = ({ onBack, onNavigate }) => {
  const selectEvent = useAppStore((state) => state.selectEvent);

  const handleSelectEvent = (event: Event) => {
    // Store the selected event in the app store
    selectEvent(event);
    // Navigate to event detail view when an event is selected
    onNavigate('eventDetail');
  };

  return <EventInspector onSelectEvent={handleSelectEvent} onBack={onBack} />;
};
import React from 'react';
import type { ViewProps } from '../../../core/navigation/types';
import { EventInspector } from '../components/EventInspector';
import type { Event } from '../../../shared/stores/appStore';
import { useAppStore } from '../../../shared/stores/appStore';

/**
 * EventInspectorView - wraps the existing EventInspector component
 * Integrates with the new ViewManager system
 */
export const EventInspectorView: React.FC<ViewProps> = ({
  onBack,
  onNavigate,
}) => {
  const selectEvent = useAppStore(state => state.selectEvent);
  const selectedEventIndex = useAppStore(state => state.selectedEventIndex);

  const handleSelectEvent = (event: Event, index: number) => {
    // Store the selected event and index in the app store
    selectEvent(event, index);
    // Navigate to event detail view when an event is selected
    onNavigate('eventDetail');
  };

  return (
    <EventInspector
      onSelectEvent={handleSelectEvent}
      onBack={onBack}
      initialSelectedIndex={selectedEventIndex}
    />
  );
};

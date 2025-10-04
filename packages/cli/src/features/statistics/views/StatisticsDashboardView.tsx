import React from 'react';
import type { ViewProps } from '../../../core/navigation/types';
import { StatisticsDashboard } from '../components/StatisticsDashboard';

/**
 * StatisticsDashboardView - wraps the existing StatisticsDashboard component
 * Integrates with the new ViewManager system
 */
export const StatisticsDashboardView: React.FC<ViewProps> = ({ onBack }) => {
  return <StatisticsDashboard onBack={onBack} />;
};

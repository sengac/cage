import React from 'react';
import type { ViewProps } from '../../types/viewSystem';
import { StatisticsDashboard } from '../StatisticsDashboard';

/**
 * StatisticsDashboardView - wraps the existing StatisticsDashboard component
 * Integrates with the new ViewManager system
 */
export const StatisticsDashboardView: React.FC<ViewProps> = ({ onBack, onNavigate }) => {
  return <StatisticsDashboard onBack={onBack} />;
};

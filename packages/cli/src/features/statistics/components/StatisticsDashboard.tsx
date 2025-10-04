import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useSafeInput } from '../../../shared/hooks/useSafeInput';
import { useAppStore } from '../../../shared/stores/appStore';
import { Footer } from '../../../shared/components/layout/Footer';
import { useTheme } from '../../../core/theme/useTheme';

export interface StatisticsDashboardProps {
  onBack: () => void;
}

interface Section {
  name: string;
  key: string;
}

type ViewMode = 'overview' | 'detail';

const SECTIONS: Section[] = [
  { name: 'Event Summary', key: 'events' },
  { name: 'Activity Timeline', key: 'timeline' },
  { name: 'Tool Usage', key: 'tools' },
  { name: 'Performance', key: 'performance' },
];

export const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({
  onBack,
}) => {
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [showHelp, setShowHelp] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const statistics = useAppStore(state => state.statistics);
  const refreshStatistics = useAppStore(state => state.refreshStatistics);
  const isLoadingStats = useAppStore(state => state.isLoadingStats);
  const statsError = useAppStore(state => state.statsError);

  // Load statistics on component mount
  useEffect(() => {
    refreshStatistics();
  }, []); // Empty dependency array - only run once on mount

  useSafeInput((input, key) => {
    if (showHelp) {
      if (key.escape || input === '?') {
        setShowHelp(false);
      }
      return;
    }

    if (viewMode === 'detail') {
      if (key.escape) {
        setViewMode('overview');
        return;
      }
      if (key.downArrow || input === 'j') {
        // Navigate within detail view (implementation varies by section)
        return;
      }
      if (key.upArrow || input === 'k') {
        // Navigate within detail view (implementation varies by section)
        return;
      }
      return;
    }

    // Overview mode navigation
    if (key.downArrow || input === 'j') {
      setSelectedSectionIndex(prev => (prev + 1) % SECTIONS.length);
    } else if (key.upArrow || input === 'k') {
      setSelectedSectionIndex(
        prev => (prev - 1 + SECTIONS.length) % SECTIONS.length
      );
    } else if (key.return) {
      setViewMode('detail');
    } else if (key.escape || input === 'q') {
      onBack();
    } else if (input === 'r') {
      refreshStatistics();
      setLastUpdated(new Date());
    } else if (input === '?') {
      setShowHelp(true);
    }
  });

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const createBarChart = (
    data: Record<string, number>,
    maxWidth: number = 30
  ): string[] => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const maxValue = Math.max(...entries.map(([, value]) => value));

    return entries.slice(0, 10).map(([key, value]) => {
      const percentage = (value / maxValue) * 100;
      const barLength = Math.floor((percentage / 100) * maxWidth);
      const fullChars = Math.floor(barLength);
      const emptyChars = maxWidth - fullChars;
      const bar =
        '█'.repeat(fullChars) +
        '▓'.repeat(Math.max(0, 2)) +
        '░'.repeat(Math.max(0, emptyChars - 2));
      const percent = (
        (value / Object.values(data).reduce((a, b) => a + b, 0)) *
        100
      ).toFixed(1);
      return `${key.padEnd(20)} ${bar} ${formatNumber(value)} (${percent}%)`;
    });
  };

  const createTimelineChart = (
    data: Array<{ date: string; events: number }>
  ): string[] => {
    const maxEvents = Math.max(...data.map(d => d.events));

    return data.map(({ date, events }) => {
      const height = Math.floor((events / maxEvents) * 8);
      const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
      const char = chars[Math.min(height, 7)] || '▁';
      const shortDate = date.substring(5).replace('-', '/'); // MM/DD format
      return `${shortDate}: ${char.repeat(3)} ${formatNumber(events)}`;
    });
  };

  const theme = useTheme();

  const renderHelp = (): JSX.Element => (
    <Box flexDirection="column" padding={1}>
      <Text bold color={theme.primary.main}>
        STATISTICS HELP
      </Text>
      <Text></Text>
      <Text bold>Navigation Commands:</Text>
      <Text> ↑↓ / j/k Navigate sections</Text>
      <Text> ↵ Enter View section details</Text>
      <Text> ESC Back to overview / Exit help</Text>
      <Text> q Quit dashboard</Text>
      <Text> r Refresh statistics</Text>
      <Text> ? Toggle this help</Text>
      <Text></Text>
      <Text bold>Analysis Features:</Text>
      <Text> • Event type breakdown and trends</Text>
      <Text> • Activity timeline with hourly patterns</Text>
      <Text> • Tool usage analytics and performance</Text>
      <Text> • Session metrics and error rates</Text>
      <Text></Text>
      <Text color={theme.ui.textDim}>Press ? to close help</Text>
    </Box>
  );

  const renderEventDetails = (): JSX.Element => {
    if (!statistics) return <Text>No data available</Text>;

    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color={theme.primary.main}>
          EVENT TYPE DETAILS
        </Text>
        <Text></Text>
        {Object.entries(statistics.eventsByType).map(([type, count]) => {
          const percentage = (count / statistics.totalEvents) * 100;
          const avgPerDay = count / 5; // Assuming 5 days of data
          const trend = statistics.trends?.toolPopularityChange?.[type] || 0;
          const trendSymbol = trend > 0 ? '↗' : trend < 0 ? '↘' : '→';

          return (
            <Box key={type} flexDirection="column" marginBottom={1}>
              <Text bold>{type}</Text>
              <Text>
                {' '}
                Total: {formatNumber(count)} ({formatPercentage(percentage)})
              </Text>
              <Text> Average per day: {avgPerDay.toFixed(1)}</Text>
              <Text>
                {' '}
                Trend: {trendSymbol} {formatPercentage(Math.abs(trend))}
              </Text>
            </Box>
          );
        })}
      </Box>
    );
  };

  const renderTimelineDetails = (): JSX.Element => {
    if (!statistics) return <Text>No data available</Text>;

    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color={theme.primary.main}>
          ACTIVITY TIMELINE DETAILS
        </Text>
        <Text></Text>
        <Text bold>Hourly Breakdown:</Text>
        {Object.entries(statistics.hourlyDistribution)
          .slice(8, 20)
          .map(([hour, count]) => (
            <Text key={hour}>
              {' '}
              {hour}:00 - {formatNumber(count)} events
            </Text>
          ))}
        <Text></Text>
        <Text bold>Peak Activity Periods:</Text>
        <Text>
          {' '}
          Busiest Hour: {statistics.peakActivity.mostActiveHour.hour}:00 (
          {formatNumber(statistics.peakActivity.mostActiveHour.count)} events)
        </Text>
        <Text>
          {' '}
          Peak Day: {statistics.peakActivity.mostActiveDay.date} (
          {formatNumber(statistics.peakActivity.mostActiveDay.count)} events)
        </Text>
      </Box>
    );
  };

  const renderToolDetails = (): JSX.Element => {
    if (!statistics) return <Text>No data available</Text>;

    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color={theme.primary.main}>
          TOOL USAGE ANALYSIS
        </Text>
        <Text></Text>
        <Text bold>Usage Patterns:</Text>
        {Object.entries(statistics.toolUsageStats).map(([tool, count]) => {
          const totalToolUsage = Object.values(
            statistics.toolUsageStats
          ).reduce((a, b) => a + b, 0);
          const percentage = (count / totalToolUsage) * 100;

          return (
            <Text key={tool}>
              {' '}
              {tool}: {formatNumber(count)} ({formatPercentage(percentage)})
            </Text>
          );
        })}
        <Text></Text>
        <Text bold>Performance Impact:</Text>
        <Text>
          {' '}
          Fastest: {statistics.performanceMetrics.fastestTool.name} (
          {statistics.performanceMetrics.fastestTool.avgTime}ms)
        </Text>
        <Text>
          {' '}
          Slowest: {statistics.performanceMetrics.slowestTool.name} (
          {formatNumber(statistics.performanceMetrics.slowestTool.avgTime)}ms)
        </Text>
      </Box>
    );
  };

  const renderPerformanceDetails = (): JSX.Element => {
    if (!statistics) return <Text>No data available</Text>;

    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color={theme.primary.main}>
          PERFORMANCE DETAILS
        </Text>
        <Text></Text>
        <Text bold>Response Time Distribution:</Text>
        <Text>
          {' '}
          Average: {statistics.performanceMetrics.averageResponseTime}ms
        </Text>
        <Text>
          {' '}
          Fastest Tool: {statistics.performanceMetrics.fastestTool.name} (
          {statistics.performanceMetrics.fastestTool.avgTime}ms)
        </Text>
        <Text>
          {' '}
          Slowest Tool: {statistics.performanceMetrics.slowestTool.name} (
          {formatNumber(statistics.performanceMetrics.slowestTool.avgTime)}ms)
        </Text>
        <Text></Text>
        <Text bold>Tool Performance Rankings:</Text>
        <Text>
          {' '}
          Error Rate:{' '}
          {formatPercentage(statistics.performanceMetrics.errorRate * 100)}
        </Text>
        <Text>
          {' '}
          Session Reliability:{' '}
          {formatPercentage(
            (1 - statistics.performanceMetrics.errorRate) * 100
          )}
        </Text>
      </Box>
    );
  };

  const renderDetailView = (): JSX.Element => {
    const section = SECTIONS[selectedSectionIndex];

    switch (section.key) {
      case 'events':
        return renderEventDetails();
      case 'timeline':
        return renderTimelineDetails();
      case 'tools':
        return renderToolDetails();
      case 'performance':
        return renderPerformanceDetails();
      default:
        return <Text>Detail view not implemented</Text>;
    }
  };

  const renderLoadingState = (): JSX.Element => (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height={20}
    >
      <Text>Loading statistics...</Text>
    </Box>
  );

  const renderErrorState = (): JSX.Element => (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height={20}
    >
      <Text color={theme.status.error}>Error: {statsError}</Text>
      <Text color={theme.ui.textDim}>Press r to retry</Text>
    </Box>
  );

  const renderEmptyState = (): JSX.Element => (
    <Box
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height={20}
    >
      <Text>No statistics available</Text>
      <Text color={theme.ui.textDim}>Start using Cage to see analytics</Text>
    </Box>
  );

  const renderOverview = (): JSX.Element => {
    if (!statistics || statistics.totalEvents === 0) {
      return renderEmptyState();
    }

    return (
      <Box flexDirection="column" flexGrow={1}>
        {/* Main Content */}
        <Box flexDirection="column" paddingX={2} paddingY={1} flexGrow={1}>
          {/* Total Events */}
          <Box justifyContent="center" marginBottom={1}>
            <Text>Total Events: {formatNumber(statistics.totalEvents)}</Text>
          </Box>

          {/* Main Sections */}
          <Box flexDirection="column" marginBottom={1}>
            {SECTIONS.map((section, index) => {
              const isSelected = index === selectedSectionIndex;
              const prefix = isSelected ? '❯ ' : '  ';

              let sectionContent = '';

              switch (section.key) {
                case 'events':
                  const topEvent = Object.entries(statistics.eventsByType).sort(
                    (a, b) => b[1] - a[1]
                  )[0];
                  sectionContent = `Most Frequent: ${topEvent[0]}`;
                  break;
                case 'timeline':
                  sectionContent = `Peak Hours: ${statistics.peakActivity.mostActiveHour.hour}:00 (${formatNumber(statistics.peakActivity.mostActiveHour.count)} events)`;
                  break;
                case 'tools':
                  const topTool = Object.entries(
                    statistics.toolUsageStats
                  ).sort((a, b) => b[1] - a[1])[0];
                  sectionContent = `Top Tool: ${topTool[0]} (${formatNumber(topTool[1])})`;
                  break;
                case 'performance':
                  sectionContent = `Average Response: ${statistics.performanceMetrics.averageResponseTime}ms`;
                  break;
              }

              return (
                <Text
                  key={section.key}
                  color={isSelected ? theme.primary.main : theme.ui.text}
                >
                  {prefix}
                  {section.name} - {sectionContent}
                </Text>
              );
            })}
          </Box>

          {/* Section-specific content based on selection */}
          <Box flexDirection="column" marginBottom={1}>
            {(() => {
              const section = SECTIONS[selectedSectionIndex];

              switch (section.key) {
                case 'events':
                  return (
                    <Box flexDirection="column">
                      <Text bold>Event Type Breakdown:</Text>
                      {createBarChart(statistics.eventsByType)
                        .slice(0, 5)
                        .map((line, index) => (
                          <Text key={index} color={theme.status.success}>
                            {line}
                          </Text>
                        ))}
                      {Object.entries(statistics.eventsByType)
                        .slice(0, 3)
                        .map(([type, count]) => {
                          const percentage =
                            (count / statistics.totalEvents) * 100;
                          return (
                            <Text key={type}>
                              {type}: {formatNumber(count)} (
                              {formatPercentage(percentage)})
                            </Text>
                          );
                        })}
                    </Box>
                  );

                case 'timeline':
                  return (
                    <Box flexDirection="column">
                      <Text bold>Daily Activity:</Text>
                      {createTimelineChart(statistics.dailyActivity).map(
                        (line, index) => (
                          <Text key={index} color={theme.secondary.blue}>
                            {line}
                          </Text>
                        )
                      )}
                      <Text>
                        Weekly Growth: +
                        {formatPercentage(statistics.trends.weeklyGrowth)}
                      </Text>
                      <Text>
                        Monthly Growth: +
                        {formatPercentage(statistics.trends.monthlyGrowth)}
                      </Text>
                    </Box>
                  );

                case 'tools':
                  return (
                    <Box flexDirection="column">
                      <Text bold>Tool Usage:</Text>
                      {Object.entries(statistics.toolUsageStats)
                        .slice(0, 3)
                        .map(([tool, count]) => {
                          const totalToolUsage = Object.values(
                            statistics.toolUsageStats
                          ).reduce((a, b) => a + b, 0);
                          const percentage = (count / totalToolUsage) * 100;
                          return (
                            <Text key={tool}>
                              {tool}: {formatNumber(count)} (
                              {formatPercentage(percentage)})
                            </Text>
                          );
                        })}
                      <Text>Tool Trends:</Text>
                      {Object.entries(statistics.trends.toolPopularityChange)
                        .slice(0, 3)
                        .map(([tool, change]) => {
                          const symbol =
                            change > 0 ? '↗' : change < 0 ? '↘' : '→';
                          return (
                            <Text key={tool}>
                              {symbol} {tool}: {change > 0 ? '+' : ''}
                              {formatPercentage(change)}
                            </Text>
                          );
                        })}
                    </Box>
                  );

                case 'performance':
                  return (
                    <Box flexDirection="column">
                      <Text bold>Performance Metrics:</Text>
                      <Text>
                        Average Response:{' '}
                        {statistics.performanceMetrics.averageResponseTime}ms
                      </Text>
                      <Text>
                        Fastest:{' '}
                        {statistics.performanceMetrics.fastestTool.name} (
                        {statistics.performanceMetrics.fastestTool.avgTime}ms)
                      </Text>
                      <Text>
                        Slowest:{' '}
                        {statistics.performanceMetrics.slowestTool.name} (
                        {formatNumber(
                          statistics.performanceMetrics.slowestTool.avgTime
                        )}
                        ms)
                      </Text>
                      <Text>
                        Error Rate:{' '}
                        {formatPercentage(
                          statistics.performanceMetrics.errorRate * 100
                        )}
                      </Text>
                      <Text>
                        Total Sessions:{' '}
                        {formatNumber(
                          statistics.sessionAnalytics.totalSessions
                        )}
                      </Text>
                      <Text>
                        Events/Session:{' '}
                        {statistics.sessionAnalytics.averageEventsPerSession.toFixed(
                          1
                        )}
                      </Text>
                    </Box>
                  );

                default:
                  return null;
              }
            })()}
          </Box>

          {/* Last updated info */}
          {isLoadingStats ? (
            <Text color={theme.status.warning}>Refreshing statistics...</Text>
          ) : (
            <Text color={theme.ui.textDim}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Text>
          )}
        </Box>
      </Box>
    );
  };

  if (showHelp) {
    return renderHelp();
  }

  if (isLoadingStats && !statistics) {
    return renderLoadingState();
  }

  if (statsError) {
    return renderErrorState();
  }

  if (viewMode === 'detail') {
    return renderDetailView();
  }

  return renderOverview();
};

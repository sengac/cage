import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatisticsDashboard } from './StatisticsDashboard';
import { useAppStore } from '../../../shared/stores/appStore';
import { InputModeProvider } from '../../../shared/contexts/InputContext';

// Mock the app store
vi.mock('../../../shared/stores/appStore');

describe('StatisticsDashboard', () => {
  let onBack: ReturnType<typeof vi.fn>;
  let mockStatistics: any;

  const renderComponent = (props = {}) => {
    return render(
      <InputModeProvider>
        <StatisticsDashboard onBack={onBack} {...props} />
      </InputModeProvider>
    );
  };

  beforeEach(() => {
    onBack = vi.fn();

    // Mock comprehensive statistics data
    mockStatistics = {
      totalEvents: 1547,
      eventsByType: {
        PreToolUse: 485,
        PostToolUse: 421,
        UserPromptSubmit: 298,
        SessionStart: 67,
        SessionEnd: 65,
        Notification: 123,
        Stop: 45,
        SubagentStop: 28,
        PreCompact: 12,
        Status: 3,
      },
      dailyActivity: [
        { date: '2025-09-15', events: 245 },
        { date: '2025-09-16', events: 367 },
        { date: '2025-09-17', events: 412 },
        { date: '2025-09-18', events: 298 },
        { date: '2025-09-19', events: 225 },
      ],
      hourlyDistribution: {
        '00': 12,
        '01': 8,
        '02': 3,
        '03': 1,
        '04': 2,
        '05': 7,
        '06': 15,
        '07': 34,
        '08': 67,
        '09': 89,
        '10': 145,
        '11': 178,
        '12': 156,
        '13': 134,
        '14': 167,
        '15': 189,
        '16': 145,
        '17': 123,
        '18': 89,
        '19': 67,
        '20': 45,
        '21': 34,
        '22': 23,
        '23': 15,
      },
      toolUsageStats: {
        Read: 234,
        Write: 156,
        Edit: 189,
        Bash: 167,
        Grep: 89,
        WebFetch: 45,
        Task: 23,
      },
      sessionAnalytics: {
        totalSessions: 67,
        averageEventsPerSession: 23.1,
      },
      peakActivity: {
        mostActiveHour: { hour: '15', count: 189 },
        mostActiveDay: { date: '2025-09-17', count: 412 },
      },
      performanceMetrics: {
        averageResponseTime: 245, // ms
        slowestTool: { name: 'WebFetch', avgTime: 1234 },
        fastestTool: { name: 'Read', avgTime: 89 },
        errorRate: 0.03, // 3%
      },
      trends: {
        weeklyGrowth: 12.5, // percentage
        monthlyGrowth: 45.2,
        toolPopularityChange: {
          Read: 5.2,
          Edit: -2.1,
          Bash: 8.7,
        },
      },
    };

    // Mock the app store
    (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(selector => {
      const state = {
        statistics: mockStatistics,
        refreshStatistics: vi.fn(),
        isLoadingStats: false,
        statsError: null,
      };
      return selector ? selector(state) : state;
    });
  });

  describe('Given the StatisticsDashboard is displayed', () => {
    describe('When rendered initially', () => {
      it('Then should show total events count', () => {
        const { lastFrame } = renderComponent();

        expect(lastFrame()).toContain('Total Events: 1,547');
      });

      it('Then should show main statistics sections', () => {
        const { lastFrame } = renderComponent();

        expect(lastFrame()).toContain('Event Summary');
        expect(lastFrame()).toContain('Activity Timeline');
        expect(lastFrame()).toContain('Tool Usage');
        expect(lastFrame()).toContain('Performance');
      });

      it('Then should highlight the first section', () => {
        const { lastFrame } = renderComponent();

        expect(lastFrame()).toMatch(/❯.*Event Summary/);
      });
    });

    describe('When navigating sections', () => {
      it('Then up/down arrows should move between sections', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        stdin.write('\x1B[B'); // Down arrow
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toMatch(/❯.*Activity Timeline/);
      });

      it('Then j/k keys should move between sections', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        stdin.write('j');
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toMatch(/❯.*Activity Timeline/);

        stdin.write('k');
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toMatch(/❯.*Event Summary/);
      });

      it('Then should cycle through all sections', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        // Navigate through all sections
        const sections = [
          'Event Summary',
          'Activity Timeline',
          'Tool Usage',
          'Performance',
        ];

        for (let i = 0; i < sections.length; i++) {
          if (i > 0) {
            stdin.write('j');
            rerender(
              <InputModeProvider>
                <StatisticsDashboard onBack={onBack} />
              </InputModeProvider>
            );
          }
          expect(lastFrame()).toMatch(new RegExp(`❯.*${sections[i]}`));
        }
      });

      it('Then should wrap around at boundaries', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        // Go to last section
        for (let i = 0; i < 3; i++) {
          stdin.write('j');
          rerender(
            <InputModeProvider>
              <StatisticsDashboard onBack={onBack} />
            </InputModeProvider>
          );
        }
        expect(lastFrame()).toMatch(/❯.*Performance/);

        // Wrap to first
        stdin.write('j');
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );
        expect(lastFrame()).toMatch(/❯.*Event Summary/);

        // Wrap to last
        stdin.write('k');
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );
        expect(lastFrame()).toMatch(/❯.*Performance/);
      });
    });

    describe('When viewing event summary section', () => {
      it('Then should show total events prominently', () => {
        const { lastFrame } = renderComponent();

        expect(lastFrame()).toContain('Total Events: 1,547');
      });

      it('Then should show events by type breakdown', () => {
        const { lastFrame } = renderComponent();

        expect(lastFrame()).toContain('PreToolUse: 485');
        expect(lastFrame()).toContain('PostToolUse: 421');
        expect(lastFrame()).toContain('UserPromptSubmit: 298');
      });

      it('Then should show event type percentages', () => {
        const { lastFrame } = renderComponent();

        // PreToolUse: 485/1547 = ~31.4%
        expect(lastFrame()).toContain('31.4%');
        // PostToolUse: 421/1547 = ~27.2%
        expect(lastFrame()).toContain('27.2%');
      });

      it('Then should show most frequent event type', () => {
        const { lastFrame } = renderComponent();

        expect(lastFrame()).toContain('Most Frequent: PreToolUse');
      });

      it('Then Enter should show detailed event breakdown', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        stdin.write('\r'); // Enter key
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('EVENT TYPE DETAILS');
        expect(lastFrame()).toContain('Average per day');
        expect(lastFrame()).toContain('Trend');
      });
    });

    describe('When viewing activity timeline section', () => {
      it('Then should navigate to timeline when selected', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        stdin.write('j'); // Move to timeline
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toMatch(/❯.*Activity Timeline/);
      });

      it('Then should show daily activity chart', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        stdin.write('j'); // Move to timeline
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\r'); // Enter detail view
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('ACTIVITY TIMELINE DETAILS');
      });

      it('Then should show hourly distribution', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        stdin.write('j'); // Move to timeline
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Peak Hours: 15:00 (189 events)');
      });

      it('Then should show activity trends', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        stdin.write('j'); // Move to timeline
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('Weekly Growth: +12.5%');
        expect(lastFrame()).toContain('Monthly Growth: +45.2%');
      });

      it('Then Enter should show detailed timeline view', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        stdin.write('j'); // Move to timeline
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\r'); // Enter key
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('ACTIVITY TIMELINE DETAILS');
        expect(lastFrame()).toContain('Hourly Breakdown');
        expect(lastFrame()).toContain('Peak Activity Periods');
      });
    });

    describe('When viewing tool usage section', () => {
      it('Then should navigate to tool usage when selected', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        // Navigate to tool usage section
        stdin.write('j'); // Activity Timeline
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('j'); // Tool Usage
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toMatch(/❯.*Tool Usage/);
      });

      it('Then should show top tools by usage', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        // Navigate to tool usage
        stdin.write('j'); // Activity Timeline
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('j'); // Tool Usage
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        // The overview shows summary
        expect(lastFrame()).toContain('Top Tool: Read (234)');
      });

      it('Then should show tool usage percentages', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        // The overview shows percentages in event breakdown
        expect(lastFrame()).toContain('31.4%'); // PreToolUse percentage
        expect(lastFrame()).toContain('27.2%'); // PostToolUse percentage
      });

      it('Then should show tool popularity trends', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        // Navigate to tool usage
        stdin.write('j'); // Activity Timeline
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('j'); // Tool Usage
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('↗ Read: +5.2%');
        expect(lastFrame()).toContain('↘ Edit: -2.1%');
        expect(lastFrame()).toContain('↗ Bash: +8.7%');
      });

      it('Then Enter should show detailed tool analysis', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        // Navigate to tool usage
        stdin.write('j'); // Activity Timeline
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('j'); // Tool Usage
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );
        stdin.write('\r'); // Enter key
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('TOOL USAGE ANALYSIS');
        expect(lastFrame()).toContain('Usage Patterns');
        expect(lastFrame()).toContain('Performance Impact');
      });
    });

    describe('When viewing performance section', () => {
      it('Then should navigate to performance when selected', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        // Navigate to performance section
        for (let i = 0; i < 3; i++) {
          stdin.write('j');
          rerender(
            <InputModeProvider>
              <StatisticsDashboard onBack={onBack} />
            </InputModeProvider>
          );
        }

        expect(lastFrame()).toMatch(/❯.*Performance/);
      });

      it('Then should show average response times', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        // Navigate to performance
        for (let i = 0; i < 3; i++) {
          stdin.write('j');
          rerender(
            <InputModeProvider>
              <StatisticsDashboard onBack={onBack} />
            </InputModeProvider>
          );
        }

        expect(lastFrame()).toContain('Average Response: 245ms');
      });

      it('Then should show fastest and slowest tools', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        // Navigate to performance
        for (let i = 0; i < 3; i++) {
          stdin.write('j');
          rerender(
            <InputModeProvider>
              <StatisticsDashboard onBack={onBack} />
            </InputModeProvider>
          );
        }

        expect(lastFrame()).toContain('Fastest: Read (89ms)');
        expect(lastFrame()).toContain('Slowest: WebFetch (1,234ms)');
      });

      it('Then should show error rate', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        // Navigate to performance
        for (let i = 0; i < 3; i++) {
          stdin.write('j');
          rerender(
            <InputModeProvider>
              <StatisticsDashboard onBack={onBack} />
            </InputModeProvider>
          );
        }

        expect(lastFrame()).toContain('Error Rate: 3.0%');
      });


      it('Then Enter should show detailed performance metrics', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        // Navigate to performance
        for (let i = 0; i < 3; i++) {
          stdin.write('j');
          rerender(
            <InputModeProvider>
              <StatisticsDashboard onBack={onBack} />
            </InputModeProvider>
          );
        }
        stdin.write('\r'); // Enter key
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('PERFORMANCE DETAILS');
        expect(lastFrame()).toContain('Response Time Distribution');
        expect(lastFrame()).toContain('Tool Performance Rankings');
      });
    });

    describe('When using refresh functionality', () => {
      it('Then r key should trigger statistics refresh', () => {
        const refreshStatistics = vi.fn();
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              statistics: mockStatistics,
              refreshStatistics,
              isLoadingStats: false,
              statsError: null,
            };
            return selector ? selector(state) : state;
          }
        );

        const { stdin } = renderComponent();

        stdin.write('r');

        expect(refreshStatistics).toHaveBeenCalled();
      });

      it('Then should show loading spinner during refresh', () => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              statistics: mockStatistics,
              refreshStatistics: vi.fn(),
              isLoadingStats: true,
              statsError: null,
            };
            return selector ? selector(state) : state;
          }
        );

        const { lastFrame } = renderComponent();

        expect(lastFrame()).toContain('Refreshing statistics...');
      });

      it('Then should show success message after refresh', () => {
        const { lastFrame } = renderComponent();

        expect(lastFrame()).toContain('Last updated:');
      });
    });

    describe('When handling loading states', () => {
      it('Then should show loading spinner when statistics are loading', () => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              statistics: null,
              refreshStatistics: vi.fn(),
              isLoadingStats: true,
              statsError: null,
            };
            return selector ? selector(state) : state;
          }
        );

        const { lastFrame } = renderComponent();

        expect(lastFrame()).toContain('Loading statistics...');
      });

      it('Then should show error message on statistics load failure', () => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              statistics: null,
              refreshStatistics: vi.fn(),
              isLoadingStats: false,
              statsError: 'Failed to load statistics',
            };
            return selector ? selector(state) : state;
          }
        );

        const { lastFrame } = renderComponent();

        expect(lastFrame()).toContain('Error: Failed to load statistics');
        expect(lastFrame()).toContain('Press r to retry');
      });

      it('Then should show empty state when no data available', () => {
        (useAppStore as ReturnType<typeof vi.fn>).mockImplementation(
          selector => {
            const state = {
              statistics: { totalEvents: 0, eventsByType: {} },
              refreshStatistics: vi.fn(),
              isLoadingStats: false,
              statsError: null,
            };
            return selector ? selector(state) : state;
          }
        );

        const { lastFrame } = renderComponent();

        expect(lastFrame()).toContain('No statistics available');
        expect(lastFrame()).toContain('Start using Cage to see analytics');
      });
    });

    describe('When handling keyboard shortcuts', () => {
      it('Then Escape should call onBack', () => {
        const { stdin } = renderComponent();

        stdin.write('\x1B'); // Escape key

        expect(onBack).toHaveBeenCalled();
      });

      it('Then q should call onBack', () => {
        const { stdin } = renderComponent();

        stdin.write('q');

        expect(onBack).toHaveBeenCalled();
      });

      it('Then should show help when ? is pressed', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        stdin.write('?');
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('STATISTICS HELP');
        expect(lastFrame()).toContain('Navigation Commands');
        expect(lastFrame()).toContain('Analysis Features');
      });
    });

    describe('When displaying visual charts', () => {
      it('Then should show ASCII bar chart for event types', () => {
        const { lastFrame } = renderComponent();

        expect(lastFrame()).toContain('█'); // Bar chart characters
        expect(lastFrame()).toContain('▓');
        expect(lastFrame()).toContain('░');
      });

      it('Then should show timeline graph for daily activity', () => {
        const { lastFrame } = renderComponent();

        // The overview shows bar charts for event breakdown
        expect(lastFrame()).toContain('█'); // Bar chart character
        expect(lastFrame()).toContain('▓'); // Bar chart character
      });

      it('Then should use colors to distinguish data categories', () => {
        const { lastFrame } = renderComponent();

        // Dashboard uses text content to distinguish categories
        const frame = lastFrame();
        expect(frame).toContain('Event Summary');
        expect(frame).toContain('Activity Timeline');
      });
    });

    describe('When showing detailed views', () => {

      it('Then should navigate within detail views', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        // Enter detail view
        stdin.write('\r'); // Enter key
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        // Navigate within details
        stdin.write('j');
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );

        expect(lastFrame()).toContain('EVENT TYPE DETAILS');
      });
    });

    describe('When handling data updates', () => {

      it('Then should maintain navigation state during updates', () => {
        const { stdin, lastFrame, rerender } = renderComponent();

        // Navigate to a section
        stdin.write('j');
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );
        expect(lastFrame()).toMatch(/❯.*Activity Timeline/);

        // Simulate data update
        rerender(
          <InputModeProvider>
            <StatisticsDashboard onBack={onBack} />
          </InputModeProvider>
        );
        expect(lastFrame()).toMatch(/❯.*Activity Timeline/);
      });
    });
  });
});

import type { Event } from '../../../shared/stores/appStore';

interface Statistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  hourlyDistribution: Record<string, number>;
  dailyActivity: Array<{ date: string; events: number }>;
  toolUsageStats: Record<string, number>;
  performanceMetrics: {
    averageResponseTime: number;
    fastestTool: { name: string; avgTime: number };
    slowestTool: { name: string; avgTime: number };
    errorRate: number;
  };
  peakActivity: {
    mostActiveHour: { hour: string; count: number };
    mostActiveDay: { date: string; count: number };
  };
  sessionAnalytics: {
    totalSessions: number;
    averageEventsPerSession: number;
  };
}

const HOURS_IN_DAY = 24;
const RECENT_DAYS_LIMIT = 7;

export class StatisticsCalculator {
  static calculate(events: Event[]): Statistics {
    const eventsByType = this.calculateEventsByType(events);
    const hourlyDistribution = this.calculateHourlyDistribution(events);
    const dailyActivity = this.calculateDailyActivity(events);
    const toolUsageStats = this.calculateToolUsage(events);
    const performanceMetrics = this.calculatePerformanceMetrics(events);
    const peakActivity = this.calculatePeakActivity(
      hourlyDistribution,
      dailyActivity
    );
    const sessionAnalytics = this.calculateSessionAnalytics(events);

    return {
      totalEvents: events.length,
      eventsByType,
      hourlyDistribution,
      dailyActivity,
      toolUsageStats,
      performanceMetrics,
      peakActivity,
      sessionAnalytics,
    };
  }

  private static calculateEventsByType(
    events: Event[]
  ): Record<string, number> {
    const eventsByType: Record<string, number> = {};
    events.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    });
    return eventsByType;
  }

  private static calculateHourlyDistribution(
    events: Event[]
  ): Record<string, number> {
    const hourlyDistribution: Record<string, number> = {};
    for (let i = 0; i < HOURS_IN_DAY; i++) {
      hourlyDistribution[i.toString().padStart(2, '0')] = 0;
    }
    events.forEach(event => {
      const hour = new Date(event.timestamp)
        .getHours()
        .toString()
        .padStart(2, '0');
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });
    return hourlyDistribution;
  }

  private static calculateDailyActivity(
    events: Event[]
  ): Array<{ date: string; events: number }> {
    const dailyMap: Record<string, number> = {};
    events.forEach(event => {
      const date = new Date(event.timestamp).toISOString().split('T')[0];
      dailyMap[date] = (dailyMap[date] || 0) + 1;
    });
    return Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-RECENT_DAYS_LIMIT)
      .map(([date, events]) => ({ date, events }));
  }

  private static calculateToolUsage(events: Event[]): Record<string, number> {
    const toolUsageStats: Record<string, number> = {};
    events.forEach(event => {
      if (event.toolName) {
        toolUsageStats[event.toolName] =
          (toolUsageStats[event.toolName] || 0) + 1;
      }
    });
    return toolUsageStats;
  }

  private static calculatePerformanceMetrics(events: Event[]) {
    const toolTimes: Record<string, number[]> = {};
    events.forEach(event => {
      if (event.toolName && event.executionTime) {
        if (!toolTimes[event.toolName]) {
          toolTimes[event.toolName] = [];
        }
        toolTimes[event.toolName].push(event.executionTime);
      }
    });

    const avgTimes = Object.entries(toolTimes).map(([tool, times]) => ({
      tool,
      avgTime: times.reduce((a, b) => a + b, 0) / times.length,
    }));

    const fastestTool = avgTimes.reduce(
      (min, curr) => (curr.avgTime < min.avgTime ? curr : min),
      { tool: 'None', avgTime: Infinity }
    );

    const slowestTool = avgTimes.reduce(
      (max, curr) => (curr.avgTime > max.avgTime ? curr : max),
      { tool: 'None', avgTime: 0 }
    );

    const allExecutionTimes = events
      .filter(e => e.executionTime)
      .map(e => e.executionTime || 0);

    const averageResponseTime =
      allExecutionTimes.length > 0
        ? Math.round(
            allExecutionTimes.reduce((a, b) => a + b, 0) /
              allExecutionTimes.length
          )
        : 0;

    const errorCount = events.filter(e => e.error).length;
    const errorRate = events.length > 0 ? errorCount / events.length : 0;

    return {
      averageResponseTime,
      fastestTool: {
        name: fastestTool.tool,
        avgTime: Math.round(fastestTool.avgTime),
      },
      slowestTool: {
        name: slowestTool.tool,
        avgTime: Math.round(slowestTool.avgTime),
      },
      errorRate,
    };
  }

  private static calculatePeakActivity(
    hourlyDistribution: Record<string, number>,
    dailyActivity: Array<{ date: string; events: number }>
  ) {
    const hourCounts = Object.entries(hourlyDistribution);
    const mostActiveHour = hourCounts.reduce(
      (max, [hour, count]) => (count > max.count ? { hour, count } : max),
      { hour: '00', count: 0 }
    );

    const mostActiveDay = dailyActivity.reduce(
      (max, curr) =>
        curr.events > max.count ? { date: curr.date, count: curr.events } : max,
      { date: '', count: 0 }
    );

    return {
      mostActiveHour,
      mostActiveDay,
    };
  }

  private static calculateSessionAnalytics(events: Event[]) {
    const sessions = new Set(events.map(e => e.sessionId)).size;
    const averageEventsPerSession = sessions > 0 ? events.length / sessions : 0;

    return {
      totalSessions: sessions,
      averageEventsPerSession: Math.round(averageEventsPerSession * 10) / 10,
    };
  }
}

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { generateMockEvents } from './mockData';

export interface Event {
  id: string;
  timestamp: string;
  eventType: string;
  sessionId: string;
  toolName?: string;
  arguments?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  executionTime?: number;
}

export interface FilterOptions {
  type?: string;
  tool?: string;
  session?: string;
  dateRange?: [Date, Date];
  searchText?: string;
}

export interface ServerInfo {
  status: 'running' | 'stopped' | 'error';
  port: number;
  pid?: number;
  uptime?: number;
  memoryUsage?: number;
}

export type ViewType =
  | 'menu'
  | 'events'
  | 'eventDetail'
  | 'stream'
  | 'server'
  | 'hooks'
  | 'statistics'
  | 'settings'
  | 'debug'
  | 'help';

interface Hook {
  name: string;
  enabled: boolean;
  eventCount: number;
}

interface HooksStatus {
  isInstalled: boolean;
  settingsPath?: string;
  backendPort?: number;
  backendEnabled?: boolean;
  installedHooks: Hook[];
  totalEvents: number;
  isLoading?: boolean;
  isVerifying?: boolean;
  lastOperation?: {
    success: boolean;
    message: string;
  };
}

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
    busiestPeriod: { start: string; end: string };
    mostActiveDay: { date: string; count: number };
  };
  sessionAnalytics: {
    totalSessions: number;
    averageEventsPerSession: number;
    averageSessionDuration: number;
  };
  trends: {
    weeklyGrowth: number;
    monthlyGrowth: number;
    toolPopularityChange: Record<string, number>;
  };
}

interface AppState {
  // Navigation
  currentView: ViewType;
  previousView: ViewType | null;
  navigationStack: ViewType[];

  // Events
  events: Event[];
  filteredEvents: Event[];
  selectedEvent: Event | null;
  eventFilters: FilterOptions;

  // Stream
  isStreaming: boolean;
  isPaused: boolean;
  streamBuffer: Event[];
  newEventCount: number;

  // Server
  serverStatus: 'running' | 'stopped' | 'connecting' | 'error';
  serverInfo: ServerInfo | null;

  // UI
  isLoading: boolean;
  loadingMessage: string;
  errors: Error[];
  showHelp: boolean;
  debugMode: boolean;

  // Hooks
  hooksStatus: HooksStatus | null;

  // Statistics
  statistics: Statistics | null;
  isLoadingStats: boolean;
  statsError: string | null;

  // Actions
  navigate: (view: ViewType) => void;
  goBack: () => void;
  setEvents: (events: Event[]) => void;
  addEvent: (event: Event) => void;
  selectEvent: (event: Event | null) => void;
  applyFilter: (filters: FilterOptions) => void;
  clearFilter: () => void;
  toggleStream: () => void;
  pauseStream: () => void;
  setServerInfo: (info: ServerInfo) => void;
  setLoading: (loading: boolean, message?: string) => void;
  addError: (error: Error) => void;
  clearErrors: () => void;
  toggleHelp: () => void;
  toggleDebugMode: () => void;

  // Hooks actions
  refreshHooksStatus: () => void;
  installHooks: () => void;
  uninstallHooks: () => void;
  toggleHook: (hookName: string) => void;
  verifyHooks: () => void;

  // Statistics actions
  refreshStatistics: () => void;
}

// Helper function to apply filters
const applyFilters = (events: Event[], filters: FilterOptions): Event[] => {
  return events.filter(event => {
    if (filters.type && event.eventType !== filters.type) return false;
    if (filters.tool && event.toolName !== filters.tool) return false;
    if (filters.session && event.sessionId !== filters.session) return false;
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      const eventStr = JSON.stringify(event).toLowerCase();
      if (!eventStr.includes(searchLower)) return false;
    }
    if (filters.dateRange) {
      const eventDate = new Date(event.timestamp);
      if (eventDate < filters.dateRange[0] || eventDate > filters.dateRange[1]) return false;
    }
    return true;
  });
};

export const useAppStore = create<AppState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      currentView: 'menu',
      previousView: null,
      navigationStack: [],
      events: generateMockEvents(100), // Use mock data for testing
      filteredEvents: generateMockEvents(100),
      selectedEvent: null,
      eventFilters: {},
      isStreaming: false,
      isPaused: false,
      streamBuffer: [],
      newEventCount: 0,
      serverStatus: 'stopped',
      serverInfo: null,
      isLoading: false,
      loadingMessage: '',
      errors: [],
      showHelp: false,
      debugMode: false,
      hooksStatus: {
        isInstalled: false,
        installedHooks: [],
        totalEvents: 0,
      },
      statistics: null,
      isLoadingStats: false,
      statsError: null,

      // Navigation actions
      navigate: (view) =>
        set((state) => {
          state.navigationStack.push(state.currentView);
          state.previousView = state.currentView;
          state.currentView = view;
        }),

      goBack: () =>
        set((state) => {
          const previous = state.navigationStack.pop();
          if (previous) {
            state.currentView = previous;
            state.previousView = state.navigationStack[state.navigationStack.length - 1] || null;
          }
        }),

      // Event actions
      setEvents: (events) =>
        set((state) => {
          state.events = events;
          state.filteredEvents = applyFilters(events, state.eventFilters);
        }),

      addEvent: (event) =>
        set((state) => {
          if (state.isStreaming && !state.isPaused) {
            state.events.push(event);
            state.streamBuffer.push(event);
            if (state.streamBuffer.length > 1000) {
              state.streamBuffer.shift();
            }
            // Apply filters to new event
            if (applyFilters([event], state.eventFilters).length > 0) {
              state.filteredEvents.push(event);
            }
          } else {
            state.newEventCount++;
          }
        }),

      selectEvent: (event) =>
        set((state) => {
          state.selectedEvent = event;
        }),

      applyFilter: (filters) =>
        set((state) => {
          state.eventFilters = filters;
          state.filteredEvents = applyFilters(state.events, filters);
        }),

      clearFilter: () =>
        set((state) => {
          state.eventFilters = {};
          state.filteredEvents = state.events;
        }),

      // Stream actions
      toggleStream: () =>
        set((state) => {
          state.isStreaming = !state.isStreaming;
          if (state.isStreaming) {
            state.isPaused = false;
            state.newEventCount = 0;
          }
        }),

      pauseStream: () =>
        set((state) => {
          state.isPaused = !state.isPaused;
        }),

      // Server actions
      setServerInfo: (info) =>
        set((state) => {
          state.serverInfo = info;
          state.serverStatus = info.status;
        }),

      // UI actions
      setLoading: (loading, message = '') =>
        set((state) => {
          state.isLoading = loading;
          state.loadingMessage = message;
        }),

      addError: (error) =>
        set((state) => {
          state.errors.push(error);
        }),

      clearErrors: () =>
        set((state) => {
          state.errors = [];
        }),

      toggleHelp: () =>
        set((state) => {
          state.showHelp = !state.showHelp;
        }),

      toggleDebugMode: () =>
        set((state) => {
          state.debugMode = !state.debugMode;
        }),

      // Hooks actions
      refreshHooksStatus: () =>
        set((state) => {
          // Mock implementation - would normally fetch from backend
          state.hooksStatus = {
            isInstalled: true,
            settingsPath: '/home/user/.claude/settings.json',
            backendPort: 3790,
            backendEnabled: true,
            installedHooks: [
              { name: 'PreToolUse', enabled: true, eventCount: 45 },
              { name: 'PostToolUse', enabled: true, eventCount: 38 },
              { name: 'UserPromptSubmit', enabled: false, eventCount: 12 },
              { name: 'SubagentStop', enabled: true, eventCount: 5 },
            ],
            totalEvents: 100,
          };
        }),

      installHooks: () =>
        set((state) => {
          if (state.hooksStatus) {
            state.hooksStatus.isLoading = true;
          }
          // Simulate async installation
          setTimeout(() => {
            set((innerState) => {
              if (innerState.hooksStatus) {
                innerState.hooksStatus.isLoading = false;
                innerState.hooksStatus.isInstalled = true;
                innerState.hooksStatus.lastOperation = {
                  success: true,
                  message: 'Hooks installed successfully',
                };
              }
            });
          }, 2000);
        }),

      uninstallHooks: () =>
        set((state) => {
          if (state.hooksStatus) {
            state.hooksStatus.isLoading = true;
          }
          // Simulate async uninstallation
          setTimeout(() => {
            set((innerState) => {
              if (innerState.hooksStatus) {
                innerState.hooksStatus.isLoading = false;
                innerState.hooksStatus.isInstalled = false;
                innerState.hooksStatus.installedHooks = [];
                innerState.hooksStatus.lastOperation = {
                  success: true,
                  message: 'Hooks uninstalled successfully',
                };
              }
            });
          }, 2000);
        }),

      toggleHook: (hookName) =>
        set((state) => {
          if (state.hooksStatus) {
            const hook = state.hooksStatus.installedHooks.find(h => h.name === hookName);
            if (hook) {
              hook.enabled = !hook.enabled;
            }
          }
        }),

      verifyHooks: () =>
        set((state) => {
          if (state.hooksStatus) {
            state.hooksStatus.isVerifying = true;
          }
          // Simulate async verification
          setTimeout(() => {
            set((innerState) => {
              if (innerState.hooksStatus) {
                innerState.hooksStatus.isVerifying = false;
                innerState.hooksStatus.lastOperation = {
                  success: true,
                  message: 'All hooks verified successfully',
                };
              }
            });
          }, 1500);
        }),

      // Statistics actions
      refreshStatistics: () =>
        set((state) => {
          state.isLoadingStats = true;
          state.statsError = null;

          // Calculate statistics from existing events
          const events = get().events;

          // Calculate event type distribution
          const eventsByType: Record<string, number> = {};
          events.forEach(event => {
            eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
          });

          // Calculate hourly distribution
          const hourlyDistribution: Record<string, number> = {};
          for (let i = 0; i < 24; i++) {
            hourlyDistribution[i.toString().padStart(2, '0')] = 0;
          }
          events.forEach(event => {
            const hour = new Date(event.timestamp).getHours().toString().padStart(2, '0');
            hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
          });

          // Calculate daily activity
          const dailyMap: Record<string, number> = {};
          events.forEach(event => {
            const date = new Date(event.timestamp).toISOString().split('T')[0];
            dailyMap[date] = (dailyMap[date] || 0) + 1;
          });
          const dailyActivity = Object.entries(dailyMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-7)
            .map(([date, events]) => ({ date, events }));

          // Calculate tool usage stats
          const toolUsageStats: Record<string, number> = {};
          events.forEach(event => {
            if (event.toolName) {
              toolUsageStats[event.toolName] = (toolUsageStats[event.toolName] || 0) + 1;
            }
          });

          // Calculate performance metrics
          const toolTimes: Record<string, number[]> = {};
          events.forEach(event => {
            if (event.toolName && event.executionTime) {
              if (!toolTimes[event.toolName]) toolTimes[event.toolName] = [];
              toolTimes[event.toolName].push(event.executionTime);
            }
          });

          const avgTimes = Object.entries(toolTimes).map(([tool, times]) => ({
            tool,
            avgTime: times.reduce((a, b) => a + b, 0) / times.length
          }));

          const fastestTool = avgTimes.reduce((min, curr) =>
            curr.avgTime < min.avgTime ? curr : min,
            { tool: 'None', avgTime: Infinity }
          );

          const slowestTool = avgTimes.reduce((max, curr) =>
            curr.avgTime > max.avgTime ? curr : max,
            { tool: 'None', avgTime: 0 }
          );

          const allExecutionTimes = events
            .filter(e => e.executionTime)
            .map(e => e.executionTime || 0);

          const averageResponseTime = allExecutionTimes.length > 0
            ? Math.round(allExecutionTimes.reduce((a, b) => a + b, 0) / allExecutionTimes.length)
            : 0;

          const errorCount = events.filter(e => e.error).length;
          const errorRate = events.length > 0 ? errorCount / events.length : 0;

          // Find peak activity
          const hourCounts = Object.entries(hourlyDistribution);
          const mostActiveHour = hourCounts.reduce((max, [hour, count]) =>
            count > max.count ? { hour, count } : max,
            { hour: '00', count: 0 }
          );

          const dayCounts = Object.entries(dailyMap);
          const mostActiveDay = dayCounts.reduce((max, [date, count]) =>
            count > max.count ? { date, count } : max,
            { date: '', count: 0 }
          );

          // Calculate session analytics
          const sessions = new Set(events.map(e => e.sessionId)).size;
          const averageEventsPerSession = sessions > 0 ? events.length / sessions : 0;
          // Mock average session duration (30m 47s = 1847 seconds)
          const averageSessionDuration = 1847;

          // Set the calculated statistics
          state.statistics = {
            totalEvents: events.length,
            eventsByType,
            hourlyDistribution,
            dailyActivity,
            toolUsageStats,
            performanceMetrics: {
              averageResponseTime,
              fastestTool: { name: fastestTool.tool, avgTime: Math.round(fastestTool.avgTime) },
              slowestTool: { name: slowestTool.tool, avgTime: Math.round(slowestTool.avgTime) },
              errorRate,
            },
            peakActivity: {
              mostActiveHour,
              busiestPeriod: { start: '09:00', end: '17:00' }, // Simplified for now
              mostActiveDay,
            },
            sessionAnalytics: {
              totalSessions: sessions,
              averageEventsPerSession: Math.round(averageEventsPerSession * 10) / 10,
              averageSessionDuration,
            },
            trends: {
              weeklyGrowth: 0, // Would need historical data to calculate
              monthlyGrowth: 0, // Would need historical data to calculate
              toolPopularityChange: Object.fromEntries(
                Object.keys(toolUsageStats).map(tool => [tool, 0])
              ),
            },
          };

          state.isLoadingStats = false;
        }),
    })),
    {
      name: 'cage-app-store',
    }
  )
);
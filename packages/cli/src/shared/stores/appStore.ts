import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { CageApiClient } from '../../api/cage-api-client';
import { Logger } from '@cage/shared';
import {
  installHooksLocally,
  uninstallHooksLocally,
  loadLocalClaudeSettings,
  saveLocalClaudeSettings,
  getInstalledHooksLocally,
} from '../../features/hooks/utils/hooks-installer';

const logger = new Logger({ context: 'AppStore', silent: true });
const MAX_EVENTS_IN_MEMORY = 1000;

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

export interface DebugLog {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  component: string;
  message: string;
  context?: Record<string, unknown>;
  stackTrace?: string;
}

export interface FilterOptions {
  type?: string;
  tool?: string;
  session?: string;
  dateRange?: [Date, Date];
  searchText?: string;
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
    mostActiveDay: { date: string; count: number };
  };
  sessionAnalytics: {
    totalSessions: number;
    averageEventsPerSession: number;
  };
  trends: {
    weeklyGrowth: number;
    monthlyGrowth: number;
    toolPopularityChange: Record<string, number>;
  };
}

interface ServerInfo {
  status: 'running' | 'stopped' | 'unknown';
  port?: number;
  version?: string;
}

export interface AppState {
  // Navigation
  currentView: ViewType;
  previousView: ViewType | null;
  navigationStack: ViewType[];

  // Events
  events: Event[];
  filteredEvents: Event[];
  selectedEvent: Event | null;
  selectedEventIndex: number;
  eventFilters: FilterOptions;

  // Debug Logs
  debugLogs: DebugLog[];

  // SSE Timestamps
  lastEventTimestamp: string | null;
  lastDebugLogTimestamp: string | null;

  // Server Status
  serverStatus: 'running' | 'stopped' | 'unknown';

  // Stream
  isStreaming: boolean;
  isPaused: boolean;
  streamBuffer: Event[];
  newEventCount: number;

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
  selectEvent: (event: Event | null, index?: number) => void;
  applyFilter: (filters: FilterOptions) => void;
  clearFilter: () => void;
  toggleStream: () => void;
  pauseStream: () => void;
  setLoading: (loading: boolean, message?: string) => void;
  addError: (error: Error) => void;
  clearErrors: () => void;
  toggleHelp: () => void;
  toggleDebugMode: () => void;

  // SSE Actions
  setLastEventTimestamp: (timestamp: string) => void;
  setLastDebugLogTimestamp: (timestamp: string) => void;
  setStreamingStatus: (status: boolean) => void;
  updateServerStatus: (status: 'running' | 'stopped' | 'unknown') => void;
  fetchLatestEvents: () => Promise<void>;
  fetchLatestDebugLogs: () => Promise<void>;

  // Hooks actions
  refreshHooksStatus: () => Promise<void>;
  installHooks: () => void;
  uninstallHooks: () => void;
  toggleHook: (hookName: string) => void;
  verifyHooks: () => void;

  // Statistics actions
  refreshStatistics: () => void;
}

export type { ServerInfo };

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
      if (eventDate < filters.dateRange[0] || eventDate > filters.dateRange[1])
        return false;
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
      events: [], // Real events loaded from backend via SSE + fetchLatestEvents
      filteredEvents: [],
      selectedEvent: null,
      selectedEventIndex: 0,
      eventFilters: {},
      debugLogs: [],
      lastEventTimestamp: null,
      lastDebugLogTimestamp: null,
      serverStatus: 'unknown',
      isStreaming: false,
      isPaused: false,
      streamBuffer: [],
      newEventCount: 0,
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
      navigate: view =>
        set(state => {
          state.navigationStack.push(state.currentView);
          state.previousView = state.currentView;
          state.currentView = view;
        }),

      goBack: () =>
        set(state => {
          const previous = state.navigationStack.pop();
          if (previous) {
            state.currentView = previous;
            state.previousView =
              state.navigationStack[state.navigationStack.length - 1] || null;
          }
        }),

      // Event actions
      setEvents: events =>
        set(state => {
          // Sort events newest-first (by timestamp descending)
          const sortedEvents = events.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          // Enforce MAX_EVENTS_IN_MEMORY limit (keep newest)
          if (sortedEvents.length > MAX_EVENTS_IN_MEMORY) {
            state.events = sortedEvents.slice(0, MAX_EVENTS_IN_MEMORY);
          } else {
            state.events = sortedEvents;
          }

          state.filteredEvents = applyFilters(state.events, state.eventFilters);
        }),

      addEvent: event =>
        set(state => {
          // Always add events to the array
          state.events.push(event);

          // Sort events newest-first
          state.events.sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          // Enforce MAX_EVENTS_IN_MEMORY limit (keep newest)
          if (state.events.length > MAX_EVENTS_IN_MEMORY) {
            state.events = state.events.slice(0, MAX_EVENTS_IN_MEMORY);
          }

          if (state.isStreaming && !state.isPaused) {
            state.streamBuffer.push(event);
            if (state.streamBuffer.length > 1000) {
              state.streamBuffer.shift();
            }
          } else {
            state.newEventCount++;
          }

          // Apply filters and sort filtered events
          const filtered = applyFilters([event], state.eventFilters);
          if (filtered.length > 0) {
            state.filteredEvents.push(event);
            state.filteredEvents.sort((a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          }
        }),

      selectEvent: (event, index) =>
        set(state => {
          state.selectedEvent = event;
          if (index !== undefined) {
            state.selectedEventIndex = index;
          }
        }),

      applyFilter: filters =>
        set(state => {
          state.eventFilters = filters;
          state.filteredEvents = applyFilters(state.events, filters);
        }),

      clearFilter: () =>
        set(state => {
          state.eventFilters = {};
          state.filteredEvents = state.events;
        }),

      // Stream actions
      toggleStream: () =>
        set(state => {
          state.isStreaming = !state.isStreaming;
          if (state.isStreaming) {
            state.isPaused = false;
            state.newEventCount = 0;
          }
        }),

      pauseStream: () =>
        set(state => {
          state.isPaused = !state.isPaused;
        }),

      // UI actions
      setLoading: (loading, message = '') =>
        set(state => {
          state.isLoading = loading;
          state.loadingMessage = message;
        }),

      addError: error =>
        set(state => {
          state.errors.push(error);
        }),

      clearErrors: () =>
        set(state => {
          state.errors = [];
        }),

      toggleHelp: () =>
        set(state => {
          state.showHelp = !state.showHelp;
        }),

      toggleDebugMode: () =>
        set(state => {
          state.debugMode = !state.debugMode;
        }),

      // SSE Actions
      setLastEventTimestamp: (timestamp: string) => {
        set(state => {
          state.lastEventTimestamp = timestamp;
        });

        // Automatically fetch latest events when timestamp is updated
        const state = get();
        if (state.serverStatus !== 'running') {
          return;
        }

        void (async () => {
          try {
            const client = await CageApiClient.initializeFromConfig();
            const response = await client.getEvents({
              since: timestamp,
              limit: 100,
            });

            if (response.success && response.data) {
              const newEvents = response.data.events;
              logger.info('fetchLatestEvents called, fetched events', {
                count: newEvents.length,
              });

              set(state => {
                // Append new events to existing array
                const allEvents = [...state.events, ...newEvents];

                // Sort newest-first
                allEvents.sort((a, b) =>
                  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );

                // Enforce MAX_EVENTS_IN_MEMORY limit (keep newest)
                if (allEvents.length > MAX_EVENTS_IN_MEMORY) {
                  state.events = allEvents.slice(0, MAX_EVENTS_IN_MEMORY);
                } else {
                  state.events = allEvents;
                }

                state.filteredEvents = applyFilters(state.events, state.eventFilters);
              });
            }
          } catch (error) {
            logger.error('Failed to fetch latest events', { error });
          }
        })();
      },

      setLastDebugLogTimestamp: (timestamp: string) => {
        set(state => {
          state.lastDebugLogTimestamp = timestamp;
        });

        // Automatically fetch latest debug logs when timestamp is updated
        const state = get();
        if (state.serverStatus !== 'running') {
          return;
        }

        void (async () => {
          try {
            const client = await CageApiClient.initializeFromConfig();
            const response = await client.getDebugLogs({
              since: timestamp,
              limit: 500,
            });

            if (response.success && response.data) {
              const newLogs = response.data;
              logger.debug('fetchLatestDebugLogs called, fetched logs', {
                count: newLogs.length,
              });

              set(state => {
                // Create a Set of existing log IDs for deduplication
                const existingIds = new Set(state.debugLogs.map(log => log.id));

                // Only add logs that don't already exist
                const uniqueNewLogs = newLogs.filter(log => !existingIds.has(log.id));

                logger.debug('Deduplication results', {
                  total: newLogs.length,
                  unique: uniqueNewLogs.length,
                  duplicates: newLogs.length - uniqueNewLogs.length,
                });

                // Append only unique new logs to existing array
                const allLogs = [...state.debugLogs, ...uniqueNewLogs];

                // Sort newest-first (SAME as events)
                allLogs.sort((a, b) =>
                  new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );

                // Enforce MAX_DEBUG_LOGS limit (keep newest)
                const MAX_DEBUG_LOGS = 1000;
                if (allLogs.length > MAX_DEBUG_LOGS) {
                  state.debugLogs = allLogs.slice(0, MAX_DEBUG_LOGS);
                } else {
                  state.debugLogs = allLogs;
                }
              });
            }
          } catch (error) {
            logger.error('Failed to fetch latest debug logs', { error });
          }
        })();
      },

      setStreamingStatus: (status: boolean) =>
        set(state => {
          state.isStreaming = status;
          if (status) {
            state.serverStatus = 'running';
          }
        }),

      updateServerStatus: (status: 'running' | 'stopped' | 'unknown') =>
        set(state => {
          state.serverStatus = status;
        }),

      fetchLatestEvents: async () => {
        const state = get();
        if (state.serverStatus !== 'running') {
          return;
        }

        try {
          const client = await CageApiClient.initializeFromConfig();
          const response = await client.getEvents({
            since: state.lastEventTimestamp || undefined,
            limit: 100,
          });

          if (response.success && response.data) {
            const newEvents = response.data.events;
            logger.info('fetchLatestEvents called, fetched events', {
              count: newEvents.length,
            });

            set(state => {
              // Create a Set of existing event IDs for deduplication
              const existingIds = new Set(state.events.map(e => e.id));

              // Only add events that don't already exist
              const uniqueNewEvents = newEvents.filter(e => !existingIds.has(e.id));

              logger.info('Deduplication results', {
                total: newEvents.length,
                unique: uniqueNewEvents.length,
                duplicates: newEvents.length - uniqueNewEvents.length,
              });

              // Append only unique new events to existing array
              const allEvents = [...state.events, ...uniqueNewEvents];

              // Sort newest-first
              allEvents.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              );

              // Enforce MAX_EVENTS_IN_MEMORY limit (keep newest)
              if (allEvents.length > MAX_EVENTS_IN_MEMORY) {
                state.events = allEvents.slice(0, MAX_EVENTS_IN_MEMORY);
              } else {
                state.events = allEvents;
              }

              state.filteredEvents = applyFilters(state.events, state.eventFilters);
            });
          }
        } catch (error) {
          logger.error('Failed to fetch latest events', { error });
        }
      },

      fetchLatestDebugLogs: async () => {
        const state = get();
        if (state.serverStatus !== 'running') {
          return;
        }

        try {
          const client = await CageApiClient.initializeFromConfig();
          const response = await client.getDebugLogs({
            since: state.lastDebugLogTimestamp || undefined,
            limit: 500,
          });

          if (response.success && response.data) {
            const newLogs = response.data;
            logger.debug('fetchLatestDebugLogs called, fetched logs', {
              count: newLogs.length,
            });

            set(state => {
              // Create a Set of existing log IDs for deduplication
              const existingIds = new Set(state.debugLogs.map(log => log.id));

              // Only add logs that don't already exist
              const uniqueNewLogs = newLogs.filter(log => !existingIds.has(log.id));

              logger.debug('Deduplication results', {
                total: newLogs.length,
                unique: uniqueNewLogs.length,
                duplicates: newLogs.length - uniqueNewLogs.length,
              });

              // Append only unique new logs to existing array
              const allLogs = [...state.debugLogs, ...uniqueNewLogs];

              // Sort newest-first (SAME as events)
              allLogs.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
              );

              // Enforce MAX_DEBUG_LOGS limit (keep newest)
              const MAX_DEBUG_LOGS = 1000;
              if (allLogs.length > MAX_DEBUG_LOGS) {
                state.debugLogs = allLogs.slice(0, MAX_DEBUG_LOGS);
              } else {
                state.debugLogs = allLogs;
              }
            });
          }
        } catch (error) {
          logger.error('Failed to fetch latest debug logs', { error });
        }
      },

      // Hooks actions
      refreshHooksStatus: async () => {
        const state = get();
        if (state.serverStatus !== 'running') {
          return;
        }

        try {
          const client = await CageApiClient.initializeFromConfig();
          const response = await client.getHooksStatus();

          if (response.success && response.data) {
            set(state => {
              state.hooksStatus = response.data;
            });
          }
        } catch (error) {
          logger.error('Failed to refresh hooks status', { error });
        }
      },

      installHooks: async () => {
        useAppStore.setState(state => {
          if (state.hooksStatus) {
            state.hooksStatus.isLoading = true;
          }
        });

        try {
          // Get backend port from client
          const client = await CageApiClient.initializeFromConfig();
          const baseUrl = client.getBaseUrl();
          const port = parseInt(new URL(baseUrl).port || '3790', 10);

          // Call real installer
          await installHooksLocally(port);

          // Refresh status from backend
          await useAppStore.getState().refreshHooksStatus();

          useAppStore.setState(state => {
            if (state.hooksStatus) {
              state.hooksStatus.isLoading = false;
              state.hooksStatus.lastOperation = {
                success: true,
                message: 'Hooks installed successfully',
              };
            }
          });
        } catch (error) {
          logger.error('Failed to install hooks', { error });
          useAppStore.setState(state => {
            if (state.hooksStatus) {
              state.hooksStatus.isLoading = false;
              state.hooksStatus.lastOperation = {
                success: false,
                message: `Installation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              };
            }
          });
        }
      },

      uninstallHooks: async () => {
        useAppStore.setState(state => {
          if (state.hooksStatus) {
            state.hooksStatus.isLoading = true;
          }
        });

        try {
          // Call real uninstaller
          await uninstallHooksLocally();

          // Refresh status from backend
          await useAppStore.getState().refreshHooksStatus();

          useAppStore.setState(state => {
            if (state.hooksStatus) {
              state.hooksStatus.isLoading = false;
              state.hooksStatus.lastOperation = {
                success: true,
                message: 'Hooks uninstalled successfully',
              };
            }
          });
        } catch (error) {
          logger.error('Failed to uninstall hooks', { error });
          useAppStore.setState(state => {
            if (state.hooksStatus) {
              state.hooksStatus.isLoading = false;
              state.hooksStatus.lastOperation = {
                success: false,
                message: `Uninstallation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              };
            }
          });
        }
      },

      toggleHook: async (hookName: string) => {
        try {
          // Load current settings
          const settings = await loadLocalClaudeSettings();

          // Toggle the hook by removing or adding it
          if (settings.hooks?.[hookName]) {
            // Hook is currently enabled - disable by removing
            delete settings.hooks[hookName];
          } else {
            // Hook is currently disabled - enable by adding
            const client = await CageApiClient.initializeFromConfig();
            const baseUrl = client.getBaseUrl();
            const port = parseInt(new URL(baseUrl).port || '3790', 10);

            // Get all installed hooks
            const installedHooks = await getInstalledHooksLocally();
            if (installedHooks[hookName]) {
              settings.hooks = settings.hooks || {};
              settings.hooks[hookName] = installedHooks[hookName];
            }
          }

          // Save modified settings
          await saveLocalClaudeSettings(settings);

          // Refresh from backend
          await useAppStore.getState().refreshHooksStatus();
        } catch (error) {
          logger.error('Failed to toggle hook', { error, hookName });
        }
      },

      verifyHooks: async () => {
        useAppStore.setState(state => {
          if (state.hooksStatus) {
            state.hooksStatus.isVerifying = true;
          }
        });

        try {
          // Check if hook files exist on filesystem
          const installedHooks = await getInstalledHooksLocally();

          // Verify Claude settings.json has correct entries
          const settings = await loadLocalClaudeSettings();

          // Test connection to backend endpoints
          const client = await CageApiClient.initializeFromConfig();
          const healthCheck = await client.checkHealth();

          // Determine verification result
          const hasInstalledHooks = Object.keys(installedHooks).length > 0;
          const hasSettings = settings.hooks && Object.keys(settings.hooks).length > 0;
          const backendHealthy = healthCheck.success;

          if (!backendHealthy) {
            throw new Error(healthCheck.error || 'Backend not responding');
          }

          useAppStore.setState(state => {
            if (state.hooksStatus) {
              state.hooksStatus.isVerifying = false;
              state.hooksStatus.lastOperation = {
                success: hasInstalledHooks && hasSettings && backendHealthy,
                message:
                  hasInstalledHooks && hasSettings && backendHealthy
                    ? 'All hooks verified successfully'
                    : 'Verification incomplete - some hooks may not be configured correctly',
              };
            }
          });
        } catch (error) {
          logger.error('Failed to verify hooks', { error });
          useAppStore.setState(state => {
            if (state.hooksStatus) {
              state.hooksStatus.isVerifying = false;
              state.hooksStatus.lastOperation = {
                success: false,
                message: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              };
            }
          });
        }
      },

      // Statistics actions
      refreshStatistics: () =>
        set(state => {
          state.isLoadingStats = true;
          state.statsError = null;

          // Calculate statistics from existing events
          const events = get().events;

          // Calculate event type distribution
          const eventsByType: Record<string, number> = {};
          events.forEach(event => {
            eventsByType[event.eventType] =
              (eventsByType[event.eventType] || 0) + 1;
          });

          // Calculate hourly distribution
          const hourlyDistribution: Record<string, number> = {};
          for (let i = 0; i < 24; i++) {
            hourlyDistribution[i.toString().padStart(2, '0')] = 0;
          }
          events.forEach(event => {
            const hour = new Date(event.timestamp)
              .getHours()
              .toString()
              .padStart(2, '0');
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
              toolUsageStats[event.toolName] =
                (toolUsageStats[event.toolName] || 0) + 1;
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

          // Find peak activity
          const hourCounts = Object.entries(hourlyDistribution);
          const mostActiveHour = hourCounts.reduce(
            (max, [hour, count]) => (count > max.count ? { hour, count } : max),
            { hour: '00', count: 0 }
          );

          const dayCounts = Object.entries(dailyMap);
          const mostActiveDay = dayCounts.reduce(
            (max, [date, count]) => (count > max.count ? { date, count } : max),
            { date: '', count: 0 }
          );

          // Calculate session analytics
          const sessions = new Set(events.map(e => e.sessionId)).size;
          const averageEventsPerSession =
            sessions > 0 ? events.length / sessions : 0;

          // Set the calculated statistics
          state.statistics = {
            totalEvents: events.length,
            eventsByType,
            hourlyDistribution,
            dailyActivity,
            toolUsageStats,
            performanceMetrics: {
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
            },
            peakActivity: {
              mostActiveHour,
              mostActiveDay,
            },
            sessionAnalytics: {
              totalSessions: sessions,
              averageEventsPerSession:
                Math.round(averageEventsPerSession * 10) / 10,
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

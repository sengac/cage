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
    })),
    {
      name: 'cage-app-store',
    }
  )
);
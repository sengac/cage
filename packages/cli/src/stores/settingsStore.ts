import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface KeyBindings {
  up: string[];
  down: string[];
  left: string[];
  right: string[];
  select: string[];
  back: string[];
  quit: string[];
  help: string[];
  filter: string[];
  search: string[];
  pageUp: string[];
  pageDown: string[];
  home: string[];
  end: string[];
}

export interface SettingsState {
  // User preferences
  theme: 'auto' | 'dark' | 'light' | 'highContrast';
  animationsEnabled: boolean;
  soundEnabled: boolean;
  compactMode: boolean;
  fontSize: 'small' | 'medium' | 'large';
  keyBindings: KeyBindings;

  // Server configuration
  serverAddress: string;
  serverPort: number;
  authToken: string | null;

  // Display preferences
  showLineNumbers: boolean;
  syntaxHighlighting: boolean;
  autoScroll: boolean;
  maxEventsBuffer: number;

  // Actions
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  loadFromFile: (path: string) => Promise<void>;
  exportToFile: (path: string) => Promise<void>;
  resetToDefaults: () => void;
}

const defaultKeyBindings: KeyBindings = {
  up: ['up', 'k'],
  down: ['down', 'j'],
  left: ['left', 'h'],
  right: ['right', 'l'],
  select: ['return', 'enter'],
  back: ['escape', 'backspace'],
  quit: ['q', 'ctrl+c'],
  help: ['?', 'h'],
  filter: ['f'],
  search: ['/'],
  pageUp: ['pageup', 'b'],
  pageDown: ['pagedown', 'f'],
  home: ['home', 'g'],
  end: ['end', 'G'],
};

const defaultSettings: Omit<SettingsState, 'updateSetting' | 'loadFromFile' | 'exportToFile' | 'resetToDefaults'> = {
  theme: 'auto',
  animationsEnabled: true,
  soundEnabled: false,
  compactMode: false,
  fontSize: 'medium',
  keyBindings: defaultKeyBindings,
  serverAddress: 'http://localhost:3000',
  serverPort: 3000,
  authToken: null,
  showLineNumbers: true,
  syntaxHighlighting: true,
  autoScroll: true,
  maxEventsBuffer: 200,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      updateSetting: (key, value) =>
        set((state) => ({
          ...state,
          [key]: value,
        })),

      loadFromFile: async (path: string) => {
        try {
          const { readFileSync } = await import('fs');
          const content = readFileSync(path, 'utf-8');
          const settings = JSON.parse(content);
          set((state) => ({
            ...state,
            ...settings,
          }));
        } catch (error) {
          console.error('Failed to load settings:', error);
        }
      },

      exportToFile: async (path: string) => {
        try {
          const { writeFileSync } = await import('fs');
          const state = get();
          const exportData = {
            theme: state.theme,
            animationsEnabled: state.animationsEnabled,
            soundEnabled: state.soundEnabled,
            compactMode: state.compactMode,
            fontSize: state.fontSize,
            keyBindings: state.keyBindings,
            serverAddress: state.serverAddress,
            serverPort: state.serverPort,
            authToken: state.authToken,
            showLineNumbers: state.showLineNumbers,
            syntaxHighlighting: state.syntaxHighlighting,
            autoScroll: state.autoScroll,
            maxEventsBuffer: state.maxEventsBuffer,
          };
          writeFileSync(path, JSON.stringify(exportData, null, 2));
        } catch (error) {
          console.error('Failed to export settings:', error);
        }
      },

      resetToDefaults: () =>
        set(() => ({
          ...defaultSettings,
        })),
    }),
    {
      name: 'cage-settings',
      partialize: (state) => ({
        theme: state.theme,
        animationsEnabled: state.animationsEnabled,
        compactMode: state.compactMode,
        fontSize: state.fontSize,
        keyBindings: state.keyBindings,
        serverAddress: state.serverAddress,
        serverPort: state.serverPort,
        showLineNumbers: state.showLineNumbers,
        syntaxHighlighting: state.syntaxHighlighting,
        autoScroll: state.autoScroll,
        maxEventsBuffer: state.maxEventsBuffer,
      }),
    }
  )
);
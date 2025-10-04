import { create } from 'zustand';

interface DebugStore {
  debugMode: boolean;
  logFile: string | null;
  debugLogs: string[];
  enableDebugMode: (enabled: boolean) => void;
  setLogFile: (file: string) => void;
  addDebugLog: (message: string) => void;
  clearDebugLogs: () => void;
}

export const useDebugStore = create<DebugStore>(set => ({
  debugMode: false,
  logFile: null,
  debugLogs: [],
  enableDebugMode: enabled => set({ debugMode: enabled }),
  setLogFile: file => set({ logFile: file }),
  addDebugLog: message =>
    set(state => ({
      debugLogs: [...state.debugLogs, message],
    })),
  clearDebugLogs: () => set({ debugLogs: [] }),
}));

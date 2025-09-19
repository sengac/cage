import React, { useEffect } from 'react';
import fs from 'fs/promises';
import path from 'path';
import { App } from '../components/App';
import { useDebugStore } from '../stores/useStore';

export interface DebugStore {
  enableDebugMode: (enabled: boolean) => void;
  setLogFile: (file: string) => void;
  addDebugLog: (message: string) => void;
}

export interface DebugModeProps {
  debugMode: boolean;
  logFile?: string;
  remainingArgs?: string[];
  debugStore?: DebugStore;
  enablePerformanceMonitoring?: boolean;
}

interface ParsedDebugFlags {
  debugMode: boolean;
  logFile?: string;
  remainingArgs: string[];
}

/**
 * Parse debug flag from command line arguments
 */
export function parseDebugFlag(args: string[]): ParsedDebugFlags {
  const processArgs = args.slice(2); // Remove node and script name
  let debugMode = false;
  let logFile: string | undefined;
  const remainingArgs: string[] = [];

  // Check environment variables first
  if (process.env.CAGE_DEBUG === '1') {
    debugMode = true;
    logFile = process.env.CAGE_DEBUG_LOG || path.join(process.cwd(), '.cage', 'debug.log');
  }

  // Parse CLI args (overrides env vars)
  for (const arg of processArgs) {
    if (arg === '--debug' || arg === '-d') {
      debugMode = true;
      if (!logFile) {
        logFile = path.join(process.cwd(), '.cage', 'debug.log');
      }
    } else if (arg.startsWith('--debug=')) {
      debugMode = true;
      logFile = arg.substring('--debug='.length);
    } else {
      remainingArgs.push(arg);
    }
  }

  // Set default log file if debug mode is enabled but no file specified
  if (debugMode && !logFile) {
    logFile = path.join(process.cwd(), '.cage', 'debug.log');
  }

  return {
    debugMode,
    logFile,
    remainingArgs
  };
}

/**
 * Append a log message to the debug file
 */
export async function appendDebugLog(logFile: string, message: string): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;

    // Ensure directory exists
    const dir = path.dirname(logFile);
    await fs.mkdir(dir, { recursive: true });

    // Append to log file
    await fs.appendFile(logFile, logEntry, 'utf8');
  } catch (error) {
    console.error('Failed to write to debug log:', error);
  }
}

/**
 * Log an error to the debug file
 */
export async function logDebugError(logFile: string, error: Error): Promise<void> {
  const errorMessage = `[ERROR] ${error.message}\n${error.stack || ''}`;
  await appendDebugLog(logFile, errorMessage);
}

/**
 * Debug Mode Component
 */
export function DebugMode({
  debugMode,
  logFile,
  remainingArgs = [],
  debugStore,
  enablePerformanceMonitoring = false
}: DebugModeProps) {
  const store = debugStore || useDebugStore();
  const startTime = React.useRef(Date.now());

  useEffect(() => {
    const initDebugMode = async () => {
      if (debugMode && logFile) {
        // Enable debug mode in store
        store.enableDebugMode(true);
        store.setLogFile(logFile);

        // Create log directory
        const dir = path.dirname(logFile);
        await fs.mkdir(dir, { recursive: true });

        // Log startup
        await appendDebugLog(logFile, 'Debug mode activated');

        // Log command if provided
        if (remainingArgs.length > 0) {
          await appendDebugLog(logFile, `Command: ${remainingArgs.join(' ')}`);
        }

        // Log performance metrics if enabled
        if (enablePerformanceMonitoring) {
          await appendDebugLog(logFile, '[PERF] Performance monitoring enabled');
        }
      }
    };

    initDebugMode().catch(error => {
      console.error('Failed to initialize debug mode:', error);
    });

    // Track execution time on unmount
    return () => {
      if (debugMode && logFile && remainingArgs.length > 0) {
        const executionTime = Date.now() - startTime.current;
        appendDebugLog(logFile, `Execution time: ${executionTime}ms`).catch(() => {});
      }
    };
  }, [debugMode, logFile, remainingArgs, store, enablePerformanceMonitoring]);

  return (
    <App
      showDebugPanel={debugMode}
      args={remainingArgs}
      onExit={() => process.exit(0)}
    />
  );
}
import open from 'open';
import { useDebugStore } from '../stores/useStore';

export interface BrowserOpenOptions {
  url: string;
  wait?: boolean;
}

export const CAGE_API_URLS = {
  OPENAPI: 'http://localhost:3790/api-docs',
  HEALTH: 'http://localhost:3790/health',
  EVENTS: 'http://localhost:3790/api/events',
  SSE_STREAM: 'http://localhost:3790/api/events/stream',
} as const;

export async function openInBrowser({
  url,
  wait = false,
}: BrowserOpenOptions): Promise<void> {
  const debugStore = useDebugStore.getState();

  try {
    if (debugStore.debugMode) {
      debugStore.addDebugLog(`Opening URL in browser: ${url}`);
    }
    await open(url, { wait });
    if (debugStore.debugMode) {
      debugStore.addDebugLog(`Successfully opened ${url} in browser`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    if (debugStore.debugMode) {
      debugStore.addDebugLog(`Failed to open browser: ${errorMessage}`);
    }
    throw new Error(`Failed to open browser: ${errorMessage}`);
  }
}

export async function openOpenAPIDocumentation(): Promise<void> {
  return openInBrowser({ url: CAGE_API_URLS.OPENAPI });
}

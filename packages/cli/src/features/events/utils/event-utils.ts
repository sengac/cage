import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { loadCageConfig } from '../../../shared/utils/config';
import { getEventsDir as getSharedEventsDir, getProjectRoot } from '@cage/shared';

export function getEventsDir(): string {
  // Try to load config synchronously, fallback to centralized default
  try {
    const configPath = join(getProjectRoot(), '.cage', 'config.json');
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      return join(getProjectRoot(), config.eventsDir || '.cage/events');
    }
  } catch {
    // Fallback to centralized default
  }
  return getSharedEventsDir();
}

export async function getEventsDirAsync(): Promise<string> {
  const config = await loadCageConfig();
  if (config?.eventsDir) {
    return join(getProjectRoot(), config.eventsDir);
  }
  return getSharedEventsDir();
}

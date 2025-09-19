import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { loadCageConfig } from './config';

export function getEventsDir(): string {
  // Try to load config synchronously, fallback to default
  try {
    const configPath = join(process.cwd(), '.cage', 'config.json');
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      return join(process.cwd(), config.eventsDir || '.cage/events');
    }
  } catch {
    // Fallback to default
  }
  return join(process.cwd(), '.cage', 'events');
}

export async function getEventsDirAsync(): Promise<string> {
  const config = await loadCageConfig();
  if (config?.eventsDir) {
    return join(process.cwd(), config.eventsDir);
  }
  return join(process.cwd(), '.cage', 'events');
}
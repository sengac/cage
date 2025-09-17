import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { HookType } from '@cage/shared';

interface ClaudeSettings {
  hooks?: Record<string, string>;
  [key: string]: unknown;
}

export function getClaudeSettingsPath(): string {
  // Claude Code stores settings in platform-specific locations
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS
    return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else if (platform === 'win32') {
    // Windows
    return join(process.env.APPDATA || homedir(), 'Claude', 'claude_desktop_config.json');
  } else {
    // Linux
    return join(homedir(), '.config', 'Claude', 'claude_desktop_config.json');
  }
}

export async function loadClaudeSettings(): Promise<ClaudeSettings> {
  const settingsPath = getClaudeSettingsPath();

  try {
    await access(settingsPath, constants.R_OK);
    const content = await readFile(settingsPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // If file doesn't exist or can't be read, return empty settings
    return {};
  }
}

export async function saveClaudeSettings(settings: ClaudeSettings): Promise<void> {
  const settingsPath = getClaudeSettingsPath();
  const settingsDir = dirname(settingsPath);

  // Ensure directory exists
  await mkdir(settingsDir, { recursive: true });

  // Write settings
  await writeFile(settingsPath, JSON.stringify(settings, null, 2));
}

export function getHookCommand(hookType: HookType, port: number): string {
  // The command that Claude Code will execute
  // This will be the cage-hook-handler executable
  const handlerPath = 'cage-hook';
  return `${handlerPath} ${hookType} --port ${port}`;
}

export async function installHooks(port: number): Promise<void> {
  const settings = await loadClaudeSettings();

  // Initialize hooks object if it doesn't exist
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // Configure all 10 hook types
  const hookTypes = Object.values(HookType);

  for (const hookType of hookTypes) {
    const hookKey = hookType.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase();
    settings.hooks[hookKey] = getHookCommand(hookType, port);
  }

  await saveClaudeSettings(settings);
}

export async function uninstallHooks(): Promise<void> {
  const settings = await loadClaudeSettings();

  if (settings.hooks) {
    // Remove all cage hooks
    const hookTypes = Object.values(HookType);

    for (const hookType of hookTypes) {
      const hookKey = hookType.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase();
      delete settings.hooks[hookKey];
    }

    // If no hooks remain, remove the hooks object entirely
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }

    await saveClaudeSettings(settings);
  }
}

export async function getInstalledHooks(): Promise<Record<string, string>> {
  const settings = await loadClaudeSettings();
  const installedHooks: Record<string, string> = {};

  if (settings.hooks) {
    const hookTypes = Object.values(HookType);

    for (const hookType of hookTypes) {
      const hookKey = hookType.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase();
      if (settings.hooks[hookKey]) {
        installedHooks[hookType] = settings.hooks[hookKey];
      }
    }
  }

  return installedHooks;
}
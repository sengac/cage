import { readFile, writeFile, mkdir, access, chmod, copyFile } from 'fs/promises';
import { constants, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { HookType } from '@cage/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type definitions for Claude settings
interface HookCommand {
  type: string;
  command: string;
  timeout?: number;
}

interface HookEntry {
  matcher?: string;
  hooks?: HookCommand[];
}

interface ClaudeSettings {
  hooks?: Record<string, string | HookEntry[] | undefined>;
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
      const hookValue = settings.hooks[hookKey];
      if (hookValue && typeof hookValue === 'string') {
        installedHooks[hookType] = hookValue;
      }
    }
  }

  return installedHooks;
}

// Local .claude directory functions
export function getLocalClaudeDirectory(): string {
  return join(process.cwd(), '.claude');
}

export function getLocalClaudeSettingsPath(): string {
  return join(getLocalClaudeDirectory(), 'settings.json');
}

export async function loadLocalClaudeSettings(): Promise<ClaudeSettings> {
  const settingsPath = getLocalClaudeSettingsPath();

  try {
    await access(settingsPath, constants.R_OK);
    const content = await readFile(settingsPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // If file doesn't exist or can't be read, return empty settings
    return {};
  }
}

export async function saveLocalClaudeSettings(settings: ClaudeSettings): Promise<void> {
  const settingsPath = getLocalClaudeSettingsPath();
  const settingsDir = dirname(settingsPath);

  // Ensure directory exists
  await mkdir(settingsDir, { recursive: true });

  // Backup existing settings if they exist
  try {
    await access(settingsPath, constants.F_OK);
    await copyFile(settingsPath, settingsPath + '.backup');
  } catch {
    // No existing file to backup
  }

  // Write settings
  await writeFile(settingsPath, JSON.stringify(settings, null, 2));
}

// Get the path to the built hook handler from the hooks package
export function getHookHandlerPath(): string {
  // For testing: allow override via environment variable
  if (process.env.CAGE_MOCK_HANDLER_PATH) {
    return process.env.CAGE_MOCK_HANDLER_PATH;
  }

  // Try multiple locations where the hook handler might be
  const possiblePaths = [
    // In development (monorepo) - relative from CLI dist
    resolve(__dirname, '../../../hooks/dist/cage-hook-handler.js'),
    // In development (monorepo) - relative from CLI src
    resolve(__dirname, '../../../../hooks/dist/cage-hook-handler.js'),
    // When installed as dependency
    resolve(__dirname, '../../../@cage/hooks/dist/cage-hook-handler.js'),
    // Global npm install
    resolve('/usr/local/lib/node_modules/@cage/hooks/dist/cage-hook-handler.js'),
    // Local node_modules
    resolve(process.cwd(), 'node_modules/@cage/hooks/dist/cage-hook-handler.js')
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  throw new Error('Could not find cage-hook-handler.js - ensure @cage/hooks is built');
}

export async function installHookHandler(): Promise<string> {
  const scriptDir = join(getLocalClaudeDirectory(), 'hooks', 'cage');
  const targetPath = join(scriptDir, 'cage-hook-handler.js');

  // Ensure directory exists
  await mkdir(scriptDir, { recursive: true });

  // Check if handler already exists (for testing)
  if (!existsSync(targetPath)) {
    // Copy the actual hook handler from the hooks package
    const sourcePath = getHookHandlerPath();
    await copyFile(sourcePath, targetPath);
  }

  // Make it executable
  await chmod(targetPath, 0o755);

  return targetPath;
}

export async function createHookScript(hookType: HookType, port: number): Promise<void> {
  const scriptDir = join(getLocalClaudeDirectory(), 'hooks', 'cage');
  const scriptPath = join(scriptDir, `${hookType.toLowerCase()}.mjs`);

  // Ensure directory exists
  await mkdir(scriptDir, { recursive: true });

  // Create a wrapper script that calls the real hook handler with the right hook type
  const scriptContent = `#!/usr/bin/env node
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the actual hook handler
const hookHandler = join(__dirname, 'cage-hook-handler.js');

// Spawn the hook handler with the hook type as argument
const child = spawn('node', [hookHandler, '${hookType}'], {
  stdio: 'inherit',
  env: { ...process.env }
});

child.on('error', (error) => {
  console.error('Failed to execute hook handler:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
`;

  await writeFile(scriptPath, scriptContent);
  // Make script executable
  await chmod(scriptPath, 0o755);
}

export async function installHooksLocally(port: number): Promise<void> {
  const settings = await loadLocalClaudeSettings();

  // Initialize hooks object if it doesn't exist
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // First, install the actual hook handler
  await installHookHandler();

  // Define all hook types that need to be installed
  const hookTypes: HookType[] = [
    'PreToolUse' as HookType,
    'PostToolUse' as HookType,
    'UserPromptSubmit' as HookType,
    'Stop' as HookType,
    'SubagentStop' as HookType,
    'SessionStart' as HookType,
    'SessionEnd' as HookType,
    'Notification' as HookType,
    'PreCompact' as HookType,
    'Status' as HookType
  ];

  for (const hookType of hookTypes) {
    // Create the wrapper script for this hook type
    await createHookScript(hookType, port);

    // Add hook to settings
    const hookPath = `\${CLAUDE_PROJECT_DIR}/.claude/hooks/cage/${hookType.toLowerCase()}.mjs`;
    const hookEntry: HookEntry = {
      matcher: '*',
      hooks: [
        {
          type: 'command',
          command: hookPath,
          timeout: 180
        }
      ]
    };

    // Ensure array exists for this hook type
    if (!Array.isArray(settings.hooks[hookType])) {
      settings.hooks[hookType] = [];
    }

    // Remove any existing Cage hooks for this type
    const hookArray = settings.hooks[hookType] as HookEntry[];
    const filteredHooks = hookArray.filter(
      (h: HookEntry) => !h.hooks?.[0]?.command?.includes('.claude/hooks/cage/')
    );

    // Add our new hook
    filteredHooks.push(hookEntry);
    settings.hooks[hookType] = filteredHooks;
  }

  await saveLocalClaudeSettings(settings);
}

export async function uninstallHooksLocally(): Promise<void> {
  const settings = await loadLocalClaudeSettings();

  if (settings.hooks) {
    // Remove all Cage hooks
    const hookTypes: HookType[] = [
      'PreToolUse' as HookType,
      'PostToolUse' as HookType,
      'UserPromptSubmit' as HookType,
      'Stop' as HookType,
      'SubagentStop' as HookType,
      'SessionStart' as HookType,
      'SessionEnd' as HookType,
      'Notification' as HookType,
      'PreCompact' as HookType,
      'Status' as HookType
    ];

    for (const hookType of hookTypes) {
      if (Array.isArray(settings.hooks[hookType])) {
        const hookArray = settings.hooks[hookType] as HookEntry[];
        settings.hooks[hookType] = hookArray.filter(
          (h: HookEntry) => !h.hooks?.[0]?.command?.includes('.claude/hooks/cage/')
        );

        // Remove empty arrays
        if ((settings.hooks[hookType] as HookEntry[]).length === 0) {
          delete settings.hooks[hookType];
        }
      }
    }

    // If no hooks remain, remove the hooks object entirely
    if (Object.keys(settings.hooks).length === 0) {
      delete settings.hooks;
    }

    await saveLocalClaudeSettings(settings);
  }
}

export async function getInstalledHooksLocally(): Promise<Record<string, string>> {
  const settings = await loadLocalClaudeSettings();
  const installedHooks: Record<string, string> = {};

  if (settings.hooks) {
    const hookTypes: HookType[] = [
      'PreToolUse' as HookType,
      'PostToolUse' as HookType,
      'UserPromptSubmit' as HookType,
      'Stop' as HookType,
      'SubagentStop' as HookType,
      'SessionStart' as HookType,
      'SessionEnd' as HookType,
      'Notification' as HookType,
      'PreCompact' as HookType,
      'Status' as HookType
    ];

    for (const hookType of hookTypes) {
      if (Array.isArray(settings.hooks[hookType])) {
        const hookArray = settings.hooks[hookType] as HookEntry[];
        const cageHook = hookArray.find(
          (h: HookEntry) => h.hooks?.[0]?.command?.includes('.claude/hooks/cage/')
        );
        if (cageHook) {
          installedHooks[hookType] = cageHook.hooks?.[0]?.command || '';
        }
      }
    }
  }

  return installedHooks;
}
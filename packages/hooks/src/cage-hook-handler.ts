#!/usr/bin/env node

import { readFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface CageConfig {
  port: number;
}

interface HookData {
  [key: string]: unknown;
  raw?: string;
}

interface EnrichedHookData extends HookData {
  hook_type: string;
  timestamp: string;
  project_dir: string;
}

interface BackendResponse {
  success?: boolean;
  block?: boolean;
  message?: string;
  output?: string;
  warning?: string;
}

interface LogEntry {
  timestamp: string;
  hookType: string;
  data: EnrichedHookData;
  error: string;
}

// Find cage config - check current dir, parent dirs, and home
function findCageConfig(): CageConfig {
  const locations = [
    process.cwd(),
    join(process.cwd(), '..'),
    join(process.cwd(), '../..'),
    homedir()
  ];

  for (const dir of locations) {
    const configPath = join(dir, 'cage.config.json');
    if (existsSync(configPath)) {
      try {
        return JSON.parse(readFileSync(configPath, 'utf-8')) as CageConfig;
      } catch {
        // Invalid JSON, continue searching
      }
    }
  }

  // Default config if none found
  return { port: 3790 };
}

// Main handler
async function main(): Promise<void> {
  const config = findCageConfig();
  const hookType = process.argv[2] || 'unknown'; // Pass hook type as argument

  // Read Claude Code's input from stdin
  let inputData = '';
  process.stdin.setEncoding('utf-8');

  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  let hookData: HookData;
  try {
    // Handle empty input
    if (!inputData.trim()) {
      hookData = { raw: '' };
    } else {
      hookData = JSON.parse(inputData) as HookData;
    }
  } catch (error) {
    // If not JSON, treat as raw text
    hookData = { raw: inputData };
  }

  // Add metadata
  const enrichedData: EnrichedHookData = {
    ...hookData,
    hook_type: hookType,
    timestamp: new Date().toISOString(),
    project_dir: process.env.CLAUDE_PROJECT_DIR || process.cwd()
  };

  // Forward to Cage backend
  try {
    const response = await fetch(
      `http://localhost:${config.port}/api/claude/hooks/${hookType}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedData),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const result = await response.json() as BackendResponse;

    // Handle Cage backend's response
    if (result.block) {
      // Exit code 2 blocks Claude Code
      console.error(result.message || 'Operation blocked by Cage');
      process.exit(2);
    }

    if (result.output) {
      // Send output back to Claude Code for context injection
      console.log(result.output);
    }

    if (result.warning) {
      // Inject warning into Claude's context
      console.log(`[CAGE WARNING] ${result.warning}`);
    }

    // Success
    process.exit(0);
  } catch (error) {
    // Log offline when backend is unreachable
    const cageDir = join(process.cwd(), '.cage');

    // Ensure .cage directory exists
    if (!existsSync(cageDir)) {
      try {
        mkdirSync(cageDir, { recursive: true });
      } catch {
        // Can't create directory, fail silently
      }
    }

    const logPath = join(cageDir, 'hooks-offline.log');
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      hookType,
      data: enrichedData,
      error: error instanceof Error ? error.message : String(error)
    };

    try {
      appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
    } catch {
      // Can't log, silent fail
    }

    // Don't block Claude Code when backend is down
    process.exit(0);
  }
}

// Run the handler
main().catch(err => {
  // Silent fail to not block Claude Code
  process.exit(0);
});
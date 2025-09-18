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

  // Log raw input for debugging
  const debugLogPath = join(process.env.TEST_BASE_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.cage', 'raw-hooks.log');
  try {
    const cageDir = join(process.env.TEST_BASE_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd(), '.cage');
    if (!existsSync(cageDir)) {
      mkdirSync(cageDir, { recursive: true });
    }
    appendFileSync(debugLogPath, `\n===== ${hookType} at ${new Date().toISOString()} =====\n`);
    appendFileSync(debugLogPath, `RAW INPUT: ${inputData}\n`);
    appendFileSync(debugLogPath, `===== END =====\n`);
  } catch {}

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

  // Map Claude Code fields to our expected schema based on hook type
  interface ClaudeCodeHookData extends HookData {
    session_id?: string;
    transcript_path?: string;
    cwd?: string;
    hook_event_name?: string;
    tool_name?: string;  // Claude Code uses tool_name
    tool_input?: Record<string, unknown>;  // Claude Code uses tool_input
    tool_response?: unknown;  // For PostToolUse
    additionalContext?: string;  // For UserPromptSubmit
    permission_mode?: string;
  }

  const typedHookData = hookData as ClaudeCodeHookData;
  let mappedData: Record<string, unknown> = {};

  if (hookType === 'PreToolUse') {
    // Map from Claude Code's actual format
    mappedData = {
      sessionId: typedHookData.session_id || `session-${Date.now()}`,
      timestamp: new Date().toISOString(),
      toolName: typedHookData.tool_name || 'unknown',
      arguments: typedHookData.tool_input || {},  // Backend expects 'arguments'
      transcriptPath: typedHookData.transcript_path,
      cwd: typedHookData.cwd
    };
  } else if (hookType === 'PostToolUse') {
    mappedData = {
      sessionId: typedHookData.session_id || `session-${Date.now()}`,
      timestamp: new Date().toISOString(),
      toolName: typedHookData.tool_name || 'unknown',
      arguments: typedHookData.tool_input || {},  // Backend expects 'arguments'
      result: typedHookData.tool_response || null,  // Backend expects 'result'
      executionTime: 0,
      transcriptPath: typedHookData.transcript_path,
      cwd: typedHookData.cwd
    };
  } else if (hookType === 'UserPromptSubmit') {
    mappedData = {
      sessionId: typedHookData.session_id || `session-${Date.now()}`,
      timestamp: new Date().toISOString(),
      prompt: typedHookData.additionalContext || '',
      transcriptPath: typedHookData.transcript_path,
      cwd: typedHookData.cwd,
      context: {
        previousMessages: [],
        currentFile: undefined
      }
    };
  } else {
    // For other hooks, pass through with minimal mapping
    mappedData = {
      sessionId: typedHookData.session_id || `session-${Date.now()}`,
      timestamp: new Date().toISOString(),
      transcriptPath: typedHookData.transcript_path,
      cwd: typedHookData.cwd,
      ...hookData
    };
  }

  // Add metadata - ensure timestamp is always present for backend validation
  const enrichedData: EnrichedHookData = {
    ...mappedData,
    timestamp: mappedData.timestamp || new Date().toISOString(), // Ensure timestamp exists
    hook_type: hookType,
    project_dir: process.env.CLAUDE_PROJECT_DIR || process.cwd()
  };

  // Define baseDir before the try block for proper scoping
  const baseDir = process.env.TEST_BASE_DIR || process.env.CLAUDE_PROJECT_DIR || process.cwd();

  // Forward to Cage backend
  try {
    // Convert hookType from PascalCase to kebab-case (PreToolUse -> pre-tool-use)
    const kebabHookType = hookType
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');

    const backendUrl = `http://localhost:${config.port}/api/claude/hooks/${kebabHookType}`;

    // Debug logging
    const debugLogPath = join(baseDir, '.cage', 'debug-hook-connection.log');
    try {
      appendFileSync(debugLogPath, `\n===== ${hookType} at ${new Date().toISOString()} =====\n`);
      appendFileSync(debugLogPath, `URL: ${backendUrl}\n`);
      appendFileSync(debugLogPath, `Port: ${config.port}\n`);
      appendFileSync(debugLogPath, `Config: ${JSON.stringify(config)}\n`);
      appendFileSync(debugLogPath, `Payload size: ${JSON.stringify(enrichedData).length} bytes\n`);
    } catch {
      // Ignore debug log errors
    }

    const response = await fetch(
      backendUrl,
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
    // Add more detailed error logging
    const debugLogPath = join(baseDir, '.cage', 'debug-hook-connection.log');
    try {
      appendFileSync(debugLogPath, `ERROR: ${error}\n`);
      appendFileSync(debugLogPath, `ERROR NAME: ${(error as Error).name}\n`);
      appendFileSync(debugLogPath, `ERROR MESSAGE: ${(error as Error).message}\n`);
      appendFileSync(debugLogPath, `ERROR STACK: ${(error as Error).stack}\n`);
      appendFileSync(debugLogPath, `===== END ERROR =====\n`);
    } catch {
      // Ignore debug log errors
    }

    // Log offline when backend is unreachable
    const cageDir = join(baseDir, '.cage');

    // Ensure .cage directory exists
    if (!existsSync(cageDir)) {
      try {
        mkdirSync(cageDir, { recursive: true });
      } catch {
        // Can't create directory, fail silently
      }
    }

    const logPath = join(cageDir, 'hooks-offline.log');
    const errorMessage = error instanceof Error ? error.message : String(error);
    const logEntry = `${new Date().toISOString()} [${hookType}] Failed to connect to Cage backend: ${errorMessage}\n`;

    try {
      appendFileSync(logPath, logEntry);
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
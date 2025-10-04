#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { getProjectRoot, getCageDir, Logger, setGlobalLogTransport, type LogTransport } from '@cage/shared';

// HTTP Log Transport for hooks (same as CLI)
class HttpLogTransport implements LogTransport {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3790') {
    this.baseUrl = baseUrl;
  }

  log(entry: {
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    component: string;
    message: string;
    context?: Record<string, unknown>;
    stackTrace?: string;
  }): void {
    // Send to backend Winston asynchronously, don't wait for response
    void fetch(`${this.baseUrl}/api/debug/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: [entry] }),
      signal: AbortSignal.timeout(2000), // 2 second timeout for logging
    }).catch(() => {
      // Silent fail - don't block hook execution if logging fails
    });
  }
}

// Logger for hook handler
const logger = new Logger({ context: 'CageHookHandler' });

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

// Find cage config - check current dir, parent dirs, and home
function findCageConfig(): CageConfig {
  const locations = [
    process.cwd(),
    join(process.cwd(), '..'),
    join(process.cwd(), '../..'),
    homedir(),
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

  // Initialize Winston HTTP transport for this hook execution
  setGlobalLogTransport(new HttpLogTransport(`http://localhost:${config.port}`));

  const hookType = process.argv[2] || 'unknown'; // Pass hook type as argument

  logger.info('Hook handler started', { hookType, port: config.port });

  // Read Claude Code's input from stdin
  let inputData = '';
  process.stdin.setEncoding('utf-8');

  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  logger.info('Received hook input', {
    hookType,
    inputLength: inputData.length,
    timestamp: new Date().toISOString()
  });

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
    tool_name?: string; // Claude Code uses tool_name
    tool_input?: Record<string, unknown>; // Claude Code uses tool_input
    tool_response?: unknown; // For PostToolUse
    additionalContext?: string; // For UserPromptSubmit
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
      arguments: typedHookData.tool_input || {}, // Backend expects 'arguments'
      transcriptPath: typedHookData.transcript_path,
      cwd: typedHookData.cwd,
    };
  } else if (hookType === 'PostToolUse') {
    mappedData = {
      sessionId: typedHookData.session_id || `session-${Date.now()}`,
      timestamp: new Date().toISOString(),
      toolName: typedHookData.tool_name || 'unknown',
      arguments: typedHookData.tool_input || {}, // Backend expects 'arguments'
      result: typedHookData.tool_response || null, // Backend expects 'result'
      executionTime: 0,
      transcriptPath: typedHookData.transcript_path,
      cwd: typedHookData.cwd,
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
        currentFile: undefined,
      },
    };
  } else {
    // For other hooks, pass through with minimal mapping
    mappedData = {
      sessionId: typedHookData.session_id || `session-${Date.now()}`,
      timestamp: new Date().toISOString(),
      transcriptPath: typedHookData.transcript_path,
      cwd: typedHookData.cwd,
      ...hookData,
    };
  }

  // Add metadata - ensure timestamp is always present for backend validation
  const enrichedData: EnrichedHookData = {
    ...mappedData,
    timestamp: (mappedData.timestamp as string) || new Date().toISOString(), // Ensure timestamp exists
    hook_type: hookType,
    project_dir: process.env.CLAUDE_PROJECT_DIR || getProjectRoot(),
  };

  // Define baseDir before the try block for proper scoping
  const baseDir = process.env.CLAUDE_PROJECT_DIR || getProjectRoot();

  // Forward to Cage backend
  try {
    // Convert hookType from PascalCase to kebab-case (PreToolUse -> pre-tool-use)
    const kebabHookType = hookType
      .replace(/([A-Z])/g, '-$1')
      .toLowerCase()
      .replace(/^-/, '');

    const backendUrl = `http://localhost:${config.port}/api/claude/hooks/${kebabHookType}`;

    logger.info('Sending hook to backend', {
      url: backendUrl,
      port: config.port,
      payloadSize: JSON.stringify(enrichedData).length,
      hookType: kebabHookType
    });

    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichedData),
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const result = (await response.json()) as BackendResponse;

    // Handle Cage backend's response
    if (result.block) {
      // INTENTIONAL: console.error for hook protocol - sends message to Claude Code
      // Exit code 2 blocks Claude Code
      console.error(result.message || 'Operation blocked by Cage');
      process.exit(2);
    }

    if (result.output) {
      // INTENTIONAL: console.log for hook protocol - sends output to Claude Code for context injection
      console.log(result.output);
    }

    if (result.warning) {
      // INTENTIONAL: console.log for hook protocol - injects warning into Claude's context
      console.log(`[CAGE WARNING] ${result.warning}`);
    }

    // Success
    logger.info('Hook executed successfully', { hookType });
    process.exit(0);
  } catch (error) {
    // Log error through Winston transport
    logger.error('Failed to connect to Cage backend', {
      error,
      hookType,
      errorName: (error as Error).name,
      errorMessage: (error as Error).message,
      offline: true
    });

    // Don't block Claude Code when backend is down
    process.exit(0);
  }
}

// Run the handler
main().catch(() => {
  // Silent fail to not block Claude Code
  process.exit(0);
});

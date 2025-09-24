#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { App } from './components/App';
import { InitCommand } from './commands/init';
import { HooksSetupCommand } from './commands/hooks/setup';
import { HooksStatusCommand } from './commands/hooks/status';
import { EventsStreamCommand } from './commands/events/stream';
import { EventsTailCommand } from './commands/events/tail';
import { EventsListCommand } from './commands/events/list';
import { EventsStatsCommand } from './commands/events/stats';
import { ServerStartCommand } from './commands/start';
import { stopCommand, statusCommand } from './commands/server-management';
import { DebugMode, parseDebugFlag } from './commands/debug';

const program = new Command();

program
  .name('cage')
  .description('Code Alignment Guard Engine - Enhances AI coding assistants through quality guidance and contextual assistance')
  .version('0.0.1');

program
  .command('init')
  .description('Initialize CAGE in the current project')
  .action(() => {
    const stdin = process.stdin.isTTY ? process.stdin : undefined;
    render(<InitCommand />, {
      stdin,
      isRawModeSupported: process.stdin.isTTY !== undefined
    });
  });

// Hook commands
const hooks = program
  .command('hooks')
  .description('Manage Claude Code hooks');

hooks
  .command('setup')
  .description('Configure Claude Code hooks')
  .action(() => {
    const stdin = process.stdin.isTTY ? process.stdin : undefined;
    render(<HooksSetupCommand />, {
      stdin,
      isRawModeSupported: process.stdin.isTTY !== undefined
    });
  });

hooks
  .command('status')
  .description('Check hook configuration status')
  .action(() => {
    const stdin = process.stdin.isTTY ? process.stdin : undefined;
    render(<HooksStatusCommand />, {
      stdin,
      isRawModeSupported: process.stdin.isTTY !== undefined
    });
  });

// Events commands
const events = program
  .command('events')
  .description('Manage and view hook events');

events
  .command('stream')
  .description('Stream events in real-time')
  .option('-t, --type <type>', 'Filter by event type')
  .action((options) => {
    const stdin = process.stdin.isTTY ? process.stdin : undefined;
    render(<EventsStreamCommand filter={options.type} />, {
      stdin,
      isRawModeSupported: process.stdin.isTTY !== undefined
    });
  });

events
  .command('tail')
  .description('Tail recent events')
  .option('-n, --lines <number>', 'Number of lines to show', '10')
  .action((options) => {
    const count = parseInt(options.lines, 10);
    const stdin = process.stdin.isTTY ? process.stdin : undefined;
    render(<EventsTailCommand count={count} />, {
      stdin,
      isRawModeSupported: process.stdin.isTTY !== undefined
    });
  });

events
  .command('list')
  .description('List events within a date range')
  .option('-f, --from <date>', 'Start date (YYYY-MM-DD)')
  .option('-t, --to <date>', 'End date (YYYY-MM-DD)')
  .action((options) => {
    const stdin = process.stdin.isTTY ? process.stdin : undefined;
    render(<EventsListCommand from={options.from} to={options.to} />, {
      stdin,
      isRawModeSupported: process.stdin.isTTY !== undefined
    });
  });

events
  .command('stats')
  .description('Display event statistics')
  .action(() => {
    const stdin = process.stdin.isTTY ? process.stdin : undefined;
    render(<EventsStatsCommand />, {
      stdin,
      isRawModeSupported: process.stdin.isTTY !== undefined
    });
  });

// Server commands
program
  .command('start')
  .description('Start the CAGE backend server')
  .option('-p, --port <port>', 'Port to run on', '3790')
  .action((options) => {
    const stdin = process.stdin.isTTY ? process.stdin : undefined;
    render(<ServerStartCommand port={options.port} />, {
      stdin,
      isRawModeSupported: process.stdin.isTTY !== undefined
    });
  });

program
  .command('stop')
  .description('Stop the CAGE backend server')
  .option('-f, --force', 'Force kill the server')
  .action(async (options) => {
    await stopCommand(options);
  });

program
  .command('status')
  .description('Check CAGE system status')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    await statusCommand(options);
  });

// Logs command
const logs = program
  .command('logs <type>')
  .description('View various CAGE logs')
  .action(async (type) => {
    // TODO: Implement logs command
    console.log(`Logs command for ${type} not yet implemented`);
  });

// Parse debug flag first
const { debugMode, logFile, remainingArgs } = parseDebugFlag(process.argv);

// Check if no arguments were provided (just 'cage' command) or only debug flag
if (process.argv.length === 2 || (debugMode && remainingArgs.length === 0)) {
  // Clear screen and reset cursor to top BEFORE Ink starts rendering
  // This ensures Ink starts from a clean slate at position (0,0)
  process.stdout.write('\x1B[2J\x1B[3J\x1B[H');

  // Check if stdin supports raw mode before launching interactive TUI
  const stdin = process.stdin.isTTY ? process.stdin : undefined;

  // Launch interactive TUI with debug mode if enabled
  const { waitUntilExit } = render(
    <DebugMode
      debugMode={debugMode}
      logFile={logFile}
      remainingArgs={[]}
    />,
    {
      stdin,
      // Disable raw mode if stdin doesn't support it
      isRawModeSupported: process.stdin.isTTY !== undefined
    }
  );
  waitUntilExit().then(() => {
    process.exit(0);
  });
} else {
  // If debug mode is enabled with commands, wrap the command execution
  if (debugMode) {
    // Reconstruct argv with remaining args for commander
    process.argv = [process.argv[0], process.argv[1], ...remainingArgs];
  }

  // Parse normal commands
  program.parse();
}
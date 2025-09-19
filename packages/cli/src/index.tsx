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
import { ServerStartCommand } from './commands/start/server';
import { stopCommand, statusCommand } from './commands/server-management';
import { DebugMode, parseDebugFlag } from './commands/debug';

const program = new Command();

program
  .name('cage')
  .description('Controlled AI Environment - Hook infrastructure for Claude Code')
  .version('0.0.1');

program
  .command('init')
  .description('Initialize Cage in the current project')
  .action(() => {
    render(<InitCommand />);
  });

// Hook commands
const hooks = program
  .command('hooks')
  .description('Manage Claude Code hooks');

hooks
  .command('setup')
  .description('Configure Claude Code hooks')
  .action(() => {
    render(<HooksSetupCommand />);
  });

hooks
  .command('status')
  .description('Check hook configuration status')
  .action(() => {
    render(<HooksStatusCommand />);
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
    render(<EventsStreamCommand filter={options.type} />);
  });

events
  .command('tail')
  .description('Tail recent events')
  .option('-n, --lines <number>', 'Number of lines to show', '10')
  .action((options) => {
    const count = parseInt(options.lines, 10);
    render(<EventsTailCommand count={count} />);
  });

events
  .command('list')
  .description('List events within a date range')
  .option('-f, --from <date>', 'Start date (YYYY-MM-DD)')
  .option('-t, --to <date>', 'End date (YYYY-MM-DD)')
  .action((options) => {
    render(<EventsListCommand from={options.from} to={options.to} />);
  });

events
  .command('stats')
  .description('Display event statistics')
  .action(() => {
    render(<EventsStatsCommand />);
  });

// Server commands
program
  .command('start')
  .description('Start the Cage backend server')
  .option('-p, --port <port>', 'Port to run on', '3790')
  .action((options) => {
    render(<ServerStartCommand port={options.port} />);
  });

program
  .command('stop')
  .description('Stop the Cage backend server')
  .option('-f, --force', 'Force kill the server')
  .action(async (options) => {
    await stopCommand(options);
  });

program
  .command('status')
  .description('Check Cage system status')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    await statusCommand(options);
  });

// Logs command
const logs = program
  .command('logs <type>')
  .description('View various Cage logs')
  .action(async (type) => {
    // TODO: Implement logs command
    console.log(`Logs command for ${type} not yet implemented`);
  });

// Parse debug flag first
const { debugMode, logFile, remainingArgs } = parseDebugFlag(process.argv);

// Check if no arguments were provided (just 'cage' command) or only debug flag
if (process.argv.length === 2 || (debugMode && remainingArgs.length === 0)) {
  // Launch interactive TUI with debug mode if enabled
  const { waitUntilExit } = render(
    <DebugMode
      debugMode={debugMode}
      logFile={logFile}
      remainingArgs={[]}
    />
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
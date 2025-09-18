#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { InitCommand } from './commands/init.js';
import { HooksSetupCommand } from './commands/hooks/setup.js';
import { HooksStatusCommand } from './commands/hooks/status.js';
import { EventsStreamCommand } from './commands/events/stream.js';
import { EventsTailCommand } from './commands/events/tail.js';
import { EventsListCommand } from './commands/events/list.js';
import { EventsStatsCommand } from './commands/events/stats.js';
import { ServerStartCommand } from './commands/start/server.jsx';
import { stopCommand, statusCommand } from './commands/server-management.js';

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

program.parse();
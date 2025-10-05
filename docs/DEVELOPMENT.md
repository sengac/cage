# CAGE Development Guide

## Overview

This guide covers everything you need to know to contribute to the CAGE project. CAGE follows **Acceptance Criteria Driven Development (ACDD)** with strict quality standards and test-first development.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Methodology](#development-methodology)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Development Workflow](#development-workflow)
- [Git Workflow](#git-workflow)
- [Architecture Patterns](#architecture-patterns)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- **Node.js**: v18+ (LTS recommended)
- **npm**: v8+ (comes with Node.js)
- **Git**: Latest version
- **Claude Code**: Optional for testing hooks

### Initial Setup

```bash
# Clone repository
git clone https://github.com/sengac/cage.git
cd cage

# Set Node.js version (uses .nvmrc)
nvm use

# Install dependencies
npm install

# Build all packages
npm run build

# Install cage command locally
npm run install:local

# Verify installation
cage --version
```

### Development Commands

```bash
# Run all packages in development mode
npm run dev

# Run specific package
npm run dev --workspace @cage/cli
npm run dev --workspace @cage/backend

# Run tests (all packages)
npm run test

# Run tests for specific package
npm run test --workspace @cage/cli

# Type checking
npm run typecheck

# Linting
npm run lint

# Code formatting
npm run format

# Full quality check (typecheck + lint + format + tests)
npm run check
```

## Development Methodology

### Acceptance Criteria Driven Development (ACDD)

CAGE follows a strict TDD approach where:

1. **Specifications First** - Define acceptance criteria in Given-When-Then format
2. **Tests Second** - Write tests that implement acceptance criteria
3. **Code Last** - Write minimum code to make tests pass

**Critical Rules:**
- ❌ **NEVER write production code without a failing test first**
- ✅ **ALWAYS write acceptance criteria before tests**
- ✅ **ALWAYS write tests before implementation**
- ✅ **ALWAYS use Given-When-Then language in tests**

### Documentation Structure

- **FOUNDATION.md** - Project overview, requirements, success criteria
- **PHASE1.md** - Core infrastructure acceptance criteria
- **PHASE2.md** - Interactive CLI acceptance criteria
- **CLAUDE.md** - Development guidelines for AI assistants
- **FEATURES.md** files - Feature-specific acceptance criteria in each package/feature directory

### Development Flow

```
1. Read acceptance criteria (PHASE*.md or FEATURES.md)
   |
   v
2. Write failing tests (*.test.ts)
   |
   v
3. Implement minimum code to pass tests
   |
   v
4. Refactor while keeping tests green
   |
   v
5. Run quality checks (npm run check)
   |
   v
6. Commit changes
```

## Project Structure

### Monorepo Layout

```
cage/
    packages/
        cli/              # Ink React CLI application
            src/
                features/ # Feature-specific code
                shared/   # Shared components/utils
               index.ts
            test/         # CLI tests
           package.json
     
        backend/          # NestJS backend
            src/
                hooks/    # Hook controllers
                events/   # Event services
               main.ts
            test/         # Backend tests
           package.json
     
        hooks/            # Hook handler implementation
            src/
               cage-hook-handler.ts
            test/
           package.json
     
       shared/           # Shared utilities and types
            src/
                types/    # TypeScript types
                utils/    # Utility functions
               index.ts
           package.json
 
    docs/                 # Documentation
    test/                 # Integration tests
    FOUNDATION.md
    PHASE1.md
    PHASE2.md
    CLAUDE.md
   package.json
```

### Feature Organization (CLI)

```
packages/cli/src/features/{feature}/
    FEATURES.md           # Feature acceptance criteria
    components/           # React components (Ink)
    services/             # Business logic
    utils/                # Feature-specific utilities
   test/                 # Feature tests
```

## Coding Standards

### TypeScript Standards

**ZERO TOLERANCE - Code will be rejected for:**

#### Type Safety
- ❌ **NEVER** use `any` type
- ❌ **NEVER** use `as unknown as`
- ✅ **ALWAYS** use proper types and type guards

```typescript
// ✅ CORRECT
interface UserConfig {
  name: string;
  settings: ConfigData;
}
const config: UserConfig = loadConfig();

// ❌ WRONG
const config: any = loadConfig();
```

#### ES Modules Only
- ❌ **NEVER** use `require()` or CommonJS
- ❌ **NEVER** use `module.exports`
- ✅ **ALWAYS** use ES6 `import`/`export`

```typescript
// ✅ CORRECT
import { Logger } from './logger';
export const myFunc = () => {};

// ❌ WRONG
const Logger = require('./logger');
module.exports = { myFunc };
```

#### Import Rules
- ❌ **NEVER** use file extensions in imports
- ❌ **NEVER** use dynamic imports (unless absolutely necessary)
- ✅ **ALWAYS** use type-only imports for types

```typescript
// ✅ CORRECT
import { MyService } from './services';
import type { MyType } from './types';

// ❌ WRONG
import { MyService } from './services.ts';
import { MyType } from './types';  // Should be type import
```

#### Interfaces vs Types
- ❌ **NEVER** use `type` for object shapes
- ✅ **ALWAYS** use `interface` for objects

```typescript
// ✅ CORRECT
interface User {
  name: string;
  email: string;
}

// ❌ WRONG
type User = {
  name: string;
  email: string;
};
```

#### Variables and Operators
- ❌ **NEVER** use `var`
- ❌ **NEVER** use `==` or `!=`
- ❌ **NEVER** skip curly braces
- ✅ **ALWAYS** use `const`/`let`, `===`/`!==`, and braces

```typescript
// ✅ CORRECT
const value = 10;
if (value === 10) {
  doSomething();
}

// ❌ WRONG
var value = 10;
if (value == 10) doSomething();
```

#### Promise Handling
- ❌ **NEVER** have floating promises
- ✅ **ALWAYS** await or explicitly void

```typescript
// ✅ CORRECT
await asyncFunc();
void asyncFunc();  // Explicitly ignored

// ❌ WRONG
asyncFunc();  // Floating promise
```

#### Logging
- ❌ **NEVER** use `console.log/error/warn/info`
- ✅ **ALWAYS** use Logger class

```typescript
// ✅ CORRECT
import { Logger } from '@cage/shared';
const logger = new Logger({ context: 'MyService' });
logger.info('Message');

// ❌ WRONG
console.log('Message');
```

### File Organization

- **Keep files under 300 lines**
- When approaching limit, stop and refactor BEFORE continuing
- Ask for approval before major refactoring

### Code Quality Tools

```bash
# ESLint (enforces standards)
npm run lint

# Prettier (code formatting)
npm run format

# TypeScript compiler (type checking)
npm run typecheck

# All checks together
npm run check
```

**Pre-commit Hook:** Automatically runs quality checks and blocks commit if standards violated.

## Testing

### Test Framework

- **Framework**: Vitest (NOT Jest)
- **CLI Testing**: ink-testing-library
- **All tests in TypeScript** (NO .js or .mjs test files)

### Test File Naming

```
src/services/stream-service.ts
src/services/stream-service.test.ts   

src/services/stream-service.spec.ts   
src/components/App.test.tsx             (React/JSX)
```

### Test Structure

Follow Given-When-Then from acceptance criteria:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('StreamService', () => {
  describe('Scenario: Establish SSE connection', () => {
    it('Given the service is initialized, When connect() is called, Then it establishes ONE SSE connection', async () => {
      // Arrange (Given)
      const service = StreamService.getInstance();

      // Act (When)
      await service.connect();

      // Assert (Then)
      expect(service.isConnected()).toBe(true);
      expect(mockEventSource).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Test Coverage Requirements

- **All new code must have tests**
- **No trivial tests** (e.g., `expect(true).toBe(true)`)
- **Test actual functionality**
- **Use proper mocks** (Vitest mocks, avoid real filesystem)
- **No `any` types in tests**

### Running Tests

```bash
# All tests
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:cov

# Specific package
npm run test --workspace @cage/cli

# Specific file
npm run test stream-service.test.ts
```

### NestJS Testing (CRITICAL)

When testing NestJS apps with dependency injection, you MUST call `await module.init()` TWICE:

```typescript
// ✅ CORRECT - Double initialization
let module: TestingModule;
let app: INestApplication;

beforeEach(async () => {
  module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  await module.init();  // FIRST init - for DI

  app = module.createNestApplication();
  app.setGlobalPrefix('api');

  await app.init();  // SECOND init - for HTTP server
});

afterEach(async () => {
  if (app) await app.close();
  if (module) await module.close();
});
```

**Why:** First init creates providers (DI), second init sets up HTTP server.

## Development Workflow

### Before Making Changes

1. Read acceptance criteria (PHASE*.md or FEATURES.md)
2. Check FOUNDATION.md for project context
3. Review existing code patterns
4. Create feature branch

### When Writing Code

1. **Write Tests First** - No exceptions
2. Run tests (ensure they fail for right reasons)
3. Implement minimum code to pass
4. Refactor while keeping tests green
5. Follow existing patterns
6. Ensure cross-platform compatibility (Windows/macOS/Linux)

### Before Committing

```bash
# Run full quality check
npm run check

# This runs:
# - TypeScript type checking
# - ESLint (blocks any, CommonJS, etc.)
# - Prettier formatting
# - All tests
```

**Quality check hook will automatically block commits that violate standards.**

## Git Workflow

### Branch Naming

```bash
# Feature branches
git checkout -b feature/add-event-filtering

# Bug fixes
git checkout -b fix/sse-reconnection-issue

# Documentation
git checkout -b docs/update-cli-guide
```

### Commit Messages

Follow conventional commits:

```bash
git commit -m "feat: add real-time event filtering"
git commit -m "fix: resolve SSE reconnection timeout"
git commit -m "docs: update CLI documentation"
git commit -m "test: add integration tests for hooks"
git commit -m "refactor: extract event service logic"
```

### Commit Guidelines

**What quality checks do:**
1. Run all tests
2. Check TypeScript types
3. Lint code (enforce standards)
4. Format code
5. Block commits that fail any check

**Pre-commit hook blocks:**
- TypeScript `any` usage
- CommonJS syntax
- `debugger` statements
- `eslint-disable` comments
- File extensions in TS imports
- `var`, `==`, `!=` usage
- Console usage in source code

### Creating Pull Requests

CAGE currently uses local development. When contributing:

1. Ensure all tests pass
2. Update relevant documentation
3. Add/update acceptance criteria if needed
4. Follow established patterns
5. Keep commits focused and descriptive

## Architecture Patterns

### Singleton Services (CLI)

**For persistent connections (SSE, WebSocket, etc.):**

```typescript
// ✅ CORRECT - Singleton pattern
export class StreamService {
  private static instance: StreamService | null = null;

  static getInstance(): StreamService {
    if (!StreamService.instance) {
      StreamService.instance = new StreamService();
    }
    return StreamService.instance;
  }

  async connect(): Promise<void> {
    // Establish connection ONCE
  }
}

// Initialize in App.tsx
useEffect(() => {
  const service = StreamService.getInstance();
  service.connect();
  return () => service.disconnect();
}, []); // Empty deps - run once
```

**Why:** Prevents connection drops on component remount/re-render.

### No Polling in Components

**Components MUST read from Zustand, services update Zustand:**

```typescript
// ✅ CORRECT - Service updates store
export class HooksStatusService {
  start(): void {
    setInterval(async () => {
      const status = await fetchHooksStatus();
      useAppStore.getState().setHooksStatus(status);
    }, 30000);
  }
}

// ✅ CORRECT - Component reads from store
export const StatusBar: React.FC = () => {
  const hooksStatus = useAppStore(state => state.hooksStatus);
  return <Text>Hooks: {hooksStatus?.count}</Text>;
};
```

**Why:** Prevents race conditions, polling overhead, stale data.

### SSE Notification Bus

**Backend emits notifications, clients fetch data on-demand:**

```typescript
// Backend: Emit notification when event added
this.eventEmitter.emit('hook.event.added', {
  eventType: 'PreToolUse',
  timestamp: event.timestamp
});

// Client: Receive notification, fetch new data
eventSource.onmessage = async (event) => {
  const { type, timestamp } = JSON.parse(event.data);

  if (type === 'event_added') {
    // Fetch ONLY new data since timestamp
    const response = await fetch(`/api/events/list?since=${timestamp}`);
    const newEvents = await response.json();
    updateStore(newEvents);
  }
};
```

**Why:** Reduces bandwidth, eliminates polling, instant updates.

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

### Test Failures

```bash
# Run in watch mode with verbose
npm run test:watch -- --reporter=verbose

# Run specific test file
npm run test stream-service.test.ts
```

### TypeScript Errors

```bash
# Check types
npm run typecheck

# Check specific package
npm run typecheck --workspace @cage/cli
```

### Lint/Format Issues

```bash
# Auto-fix linting issues
npm run lint:fix

# Auto-format code
npm run format
```

### Hook Development Issues

```bash
# Test hook manually
echo '{"tool_name":"Edit"}' | node packages/hooks/dist/cage-hook-handler.js PreToolUse

# Enable debug output
export CAGE_DEBUG=true
```

### Port Conflicts

```bash
# Check what's using port 3790
lsof -i :3790

# Kill process
kill -9 <PID>

# Or use different port
export CAGE_PORT=3791
```

## Development Tools

### Recommended VS Code Extensions

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Vitest
- GitLens

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### Debugging

#### Backend Debugging

```bash
# Node inspect mode
node --inspect dist/main.js

# Or with npm script
npm run start:debug --workspace @cage/backend
```

Then open `chrome://inspect` in Chrome.

#### CLI Debugging

```bash
# Launch with debug flag
cage --debug

# Or enable debug logging
export CAGE_DEBUG=true
cage
```

## Performance Guidelines

### File I/O

- Use async methods (fs.promises, not sync)
- Batch read/write operations when possible
- Stream large files instead of loading into memory

### React/Ink Performance

- Use React.memo for expensive components
- Avoid unnecessary re-renders (proper dependency arrays)
- Keep state close to where it's used

### Database/Storage

- File-based storage is fine for MVP
- Append-only logs for performance
- Daily log rotation to manage file size

## Contributing Checklist

Before submitting changes:

- [ ] Acceptance criteria exist for changes
- [ ] Tests written and passing
- [ ] Code follows TypeScript standards
- [ ] No `any`, CommonJS, or console usage
- [ ] Files under 300 lines
- [ ] Documentation updated
- [ ] `npm run check` passes
- [ ] Cross-platform tested (if applicable)

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/sengac/cage/issues)
- **Documentation**: Check docs/ directory
- **Foundation**: See FOUNDATION.md for project context
- **Acceptance Criteria**: See PHASE*.md and FEATURES.md files

## Related Documentation

- [CLI Documentation](CLI.md)
- [Backend API](BACKEND.md)
- [Hooks System](HOOKS.md)
- [Interactive TUI](TUI.md)
- [Project Foundation](../FOUNDATION.md)
- [Development Guidelines](../CLAUDE.md)

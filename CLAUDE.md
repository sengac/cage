# Claude Development Guidelines for CAGE

**IMPORTANT:** CAGE is a legitimate developer tool that uses Claude Code's official Hooks API to provide quality guidance and contextual assistance. This project helps developers write better code through the approved hook system provided by Anthropic.

This document provides guidelines for AI assistants (particularly Claude) working on the CAGE project. For complete project context and requirements, always refer to [FOUNDATION.md](FOUNDATION.md).

## Project Overview

**CAGE** is a developer productivity tool for AI that provides boundaries, context, and guidance to help AI produce code matching living specifications. It enhances Claude Code through its official API.

- **Website**: https://cage.tools
- **Repository**: https://github.com/sengac/cage
- **License**: MIT (Copyright 2025 Software Engineering & Consulting Pty Ltd)

For detailed understanding of:

- **Why we're building this**: See [FOUNDATION.md - Why We Are Building It](FOUNDATION.md#2-why-we-are-building-it)
- **Technical requirements**: See [FOUNDATION.md - What We Are Building](FOUNDATION.md#1-what-we-are-building)
- **Success criteria**: See [FOUNDATION.md - Success Criteria](FOUNDATION.md#success-criteria)

## Core Principles

### 1. Living Specifications

As defined in [FOUNDATION.md](FOUNDATION.md#success-criteria):

- Maintain specifications that evolve with the codebase
- Connect the "why" (pain points) → "how" (user journeys) → "what" (code implementation)
- Generate executable acceptance tests from specifications
- Achieve specification-code alignment with runnable acceptance tests

### 2. Code Quality Standards

## MANDATORY CODING STANDARDS - ZERO TOLERANCE

**ALL CODE MUST PASS QUALITY CHECKS BEFORE COMMITTING**

### CRITICAL DO NOT VIOLATIONS - CODE WILL BE REJECTED

#### TypeScript Violations:

- ❌ **NEVER** use `any` type - use proper types always
- ❌ **NEVER** use `as unknown as` - use proper type guards or generics
- ❌ **NEVER** use `require()` - only ES6 `import`/`export`
- ❌ **NEVER** use CommonJS syntax (`module.exports`, `__dirname`, `__filename`)
- ❌ **NEVER** use file extensions in TypeScript imports (`import './file.ts'` or `import './file.js'` → `import './file'`)
- ❌ **NEVER** use `var` - only `const`/`let`
- ❌ **NEVER** use `==` or `!=` - only `===` and `!==`
- ❌ **NEVER** skip curly braces: `if (x) doSomething()` → `if (x) { doSomething() }`

#### Import Violations:

- ❌ **NEVER** use dynamic imports unless absolutely necessary (e.g., `await import('./module')`)
- ❌ **NEVER** write: `import { Type } from './types'` when only using as type
- ✅ **ALWAYS** use static imports: `import { something } from './module'`
- ✅ **ALWAYS** write: `import type { Type } from './types'` for type-only imports

#### Interface Violations:

- ❌ **NEVER** use `type` for object shapes
- ✅ **ALWAYS** use `interface` for object definitions

#### Promise Violations:

- ❌ **NEVER** have floating promises - all promises must be awaited or explicitly ignored with `void`
- ❌ **NEVER** await non-promises

#### Variable Violations:

- ❌ **NEVER** declare unused variables
- ❌ **NEVER** use `let` when value never changes - use `const`

#### Console Violations:

- ❌ **NEVER** use `console.log/error/warn` in source code (tests are OK)
- ✅ **ONLY** use Logger class for all output

### MANDATORY IMPLEMENTATION PATTERNS

#### ES Modules (Required):

```typescript
// ✅ CORRECT
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ❌ WRONG
const __dirname = require('path').dirname(__filename);
```

#### Type Safety (Required):

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

#### Error Handling (Required):

```typescript
// ✅ CORRECT - All async operations must have error handling
try {
  const result = await operation();
  return result;
} catch (error) {
  logger.error('Operation failed', { error });
  throw error;
}
```

#### Process Management (Required):

```typescript
// ✅ CORRECT - Rename process variable to avoid Node.js global
const childProcess = spawn('command', args);

// ❌ WRONG - Shadows Node.js global
const process = spawn('command', args);
```

#### Logging (Required):

```typescript
// ✅ CORRECT - Use Logger class (NEVER use silent:true)
import { Logger } from '@cage/shared';
const logger = new Logger({ context: 'MyComponent', silent: true });
logger.info('Operation completed');

// ❌ WRONG - Direct console usage
console.log('Operation completed');

// ❌ WRONG - Silent logger that doesn't send to Winston
const logger = new Logger({ silent: true });
```

**CRITICAL**: ALL components (frontend CLI and backend) MUST log to Winston:
- **NEVER use `silent: true`** - this prevents logs from reaching Winston
- **ALL logs go through Logger class** which sends to backend Winston transport
- **Frontend logs appear in backend debug logs** for unified debugging
- View logs via Debug Console or `/api/debug/logs` endpoint

### File Organization

- **Keep files under 300 lines** - refactor when approaching this limit
- When a file exceeds 300 lines, stop and refactor BEFORE continuing
- Ask for approval before major refactoring

### Testing Requirements

- **Use Vitest exclusively** - NEVER use Jest
- **Write ALL tests in TypeScript** - NEVER create standalone JavaScript test files
- **NEVER write external JavaScript files for testing** - All tests must be TypeScript files running through Vitest
- **NEVER create .mjs or .js test files** - Only .ts test files within the project structure
- **NEVER test module imports using Node.js directly** - Always test through Vitest
- Write meaningful tests that verify actual functionality
- No trivial tests like `expect(true).toBe(true)`
- **Test Coverage:** All new code must have corresponding unit tests
- **Mock Patterns:** Use Vitest mocks, avoid actual file system in unit tests
- **Type Safety:** No `any` types allowed in tests - use proper type assertions

#### Test File Requirements:

- ❌ **NEVER** create `test.mjs`, `test.js`, or any external JavaScript test files
- ❌ **NEVER** run tests with `node test.js` or `node test.mjs`
- ✅ **ALWAYS** create `.test.ts`, `.spec.ts`, `.test.tsx`, or `.spec.tsx` files
- ✅ **ALWAYS** run tests through `npm test` using Vitest
- ✅ **ALWAYS** import and test TypeScript modules directly in TypeScript test files
- ✅ **ALWAYS** Use `.test.tsx` or `.spec.tsx` for React/JSX component tests

#### NestJS Integration Test Setup (CRITICAL):

**MANDATORY**: When testing NestJS applications with dependency injection, you MUST call `await module.init()` TWICE - once after compiling the module, and again after creating the NestApplication.

**Why This is Required:**

NestJS has two separate initialization phases:

1. **Module Initialization** (`await module.init()` after `.compile()`):
   - Instantiates all providers (services) registered in the module
   - Builds the dependency injection container
   - Resolves all dependencies and injects them into constructors
   - **Without this, provider instances are NOT created**

2. **Application Initialization** (`await app.init()` after `createNestApplication()`):
   - Initializes the HTTP server
   - Sets up middleware pipeline
   - Configures routes and global pipes/guards
   - **This does NOT create providers - they must already exist from step 1**

**What Happens If You Skip the First Init:**
- `module.createNestApplication()` creates controllers but can't inject dependencies
- Constructor parameters like `private winstonService: WinstonLoggerService` remain `undefined`
- Tests fail with `TypeError: Cannot read properties of undefined (reading 'methodName')`
- Even though the service is registered in AppModule, it's never instantiated

**Correct Pattern**:
```typescript
// ✅ CORRECT - Double initialization
let module: TestingModule;
let app: INestApplication;

beforeEach(async () => {
  module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  await module.init(); // FIRST init - critical for DI

  app = module.createNestApplication();

  // Configure app (global prefix, pipes, etc.)
  app.setGlobalPrefix('api');

  await app.init(); // SECOND init - for HTTP server

  // Now get services
  const service = module.get<MyService>(MyService);
});

afterEach(async () => {
  if (app) await app.close();
  if (module) await module.close();
});
```

**Wrong Pattern**:
```typescript
// ❌ WRONG - Missing first module.init()
beforeEach(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  await app.init(); // Only one init - DI will fail!

  // Services will be undefined in controllers!
});
```

**Symptoms of Missing First Init**:
- `TypeError: Cannot read properties of undefined (reading 'methodName')`
- Controller methods fail with "undefined is not a function"
- Dependency injection fields are undefined in controllers
- Tests pass for some services but fail for others randomly

## Critical Architectural Patterns

### Singleton Services for Persistent Connections

**MANDATORY**: All persistent connections (SSE, WebSocket, etc.) MUST be implemented as singleton services initialized at app startup, NOT in React component lifecycles.

**Why**: Component-based connection management causes:
- Connections drop when components unmount/remount
- Multiple duplicate connections from re-renders
- Unstable connections that disconnect after receiving first event
- State inconsistencies between components

**Correct Pattern**:
```typescript
// ✅ CORRECT - Singleton service pattern
// src/services/stream-manager.ts
export class StreamManager {
  private static instance: StreamManager | null = null;

  static getInstance(): StreamManager {
    if (!StreamManager.instance) {
      StreamManager.instance = new StreamManager();
    }
    return StreamManager.instance;
  }

  async initialize(): Promise<void> {
    // Establish connection ONCE
  }
}

// Initialize in App.tsx, NOT in components
useEffect(() => {
  streamManager.initialize();
  return () => streamManager.disconnect();
}, []); // Empty deps - run once
```

**Wrong Pattern**:
```typescript
// ❌ WRONG - Component-based connection
export const StreamView = () => {
  useEffect(() => {
    startStream(); // This will break on re-render!
  }, []);
}
```

**Apply this pattern to**:
- SSE connections for event streaming
- WebSocket connections
- Database connections
- File watchers
- Any long-lived resource

### NO Polling in UI Components

**MANDATORY**: UI components (StatusBar, etc.) MUST NEVER use polling (setInterval/setTimeout) and MUST NEVER make direct API calls for real-time data.

**Why**: Polling creates:
- Unnecessary API load
- Race conditions between multiple pollers
- Stale data between polling intervals
- Difficult-to-test timing dependencies
- No single source of truth

**Correct Pattern - Singleton Services Update Zustand, Components Read from Zustand**:
```typescript
// ✅ CORRECT - Service updates Zustand
// src/services/hooks-status-service.ts
export class HooksStatusService {
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    this.fetchHooksStatus(); // Immediate fetch

    // Polling ONLY in singleton service
    this.intervalId = setInterval(() => {
      this.fetchHooksStatus();
    }, 30000);
  }

  private async fetchHooksStatus(): Promise<void> {
    const store = useAppStore.getState();
    await store.refreshHooksStatus(); // Updates Zustand
  }
}

// ✅ CORRECT - Component reads from Zustand ONLY
// src/components/shared/StatusBar.tsx
export const StatusBar: React.FC = () => {
  // Read from Zustand - NO polling, NO API calls
  const serverStatus = useAppStore(state => state.serverStatus);
  const hooksStatus = useAppStore(state => state.hooksStatus);
  const events = useAppStore(state => state.events);

  // Pure reactive component - automatically updates when Zustand changes
  return (
    <Box>
      <Text>Server: {serverStatus}</Text>
      <Text>Hooks: {hooksStatus?.installedHooks?.length || 0}</Text>
      <Text>Events: {events.length}</Text>
    </Box>
  );
};
```

**Wrong Pattern**:
```typescript
// ❌ WRONG - Component polling directly
export const StatusBar: React.FC = () => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // NEVER DO THIS - No polling in components!
    const interval = setInterval(async () => {
      const response = await fetch('/api/hooks/status');
      const data = await response.json();
      setStatus(data);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return <Text>{status}</Text>;
};
```

**TDD Requirements for Singleton Services + Zustand Pattern**:

When implementing features using this pattern, you MUST:

1. **Write acceptance criteria FIRST** in the relevant PHASE document:
   - Scenario for service singleton behavior
   - Scenario for Zustand updates
   - Scenario for component reading from Zustand only
   - Scenario explicitly stating "NO polling in components"

2. **Write tests SECOND** before any implementation:
   - Test that service is singleton (getInstance returns same instance)
   - Test that service updates Zustand on data fetch
   - Test that component reads ONLY from Zustand (mock useAppStore)
   - Test that component does NOT use setInterval/setTimeout
   - Test that component does NOT make fetch/API calls

3. **Implement code LAST** to make tests pass

**Testing Checklist**:
- [ ] Service singleton test exists and passes
- [ ] Service → Zustand update test exists and passes
- [ ] Component → Zustand read-only test exists and passes
- [ ] No polling verification test exists and passes
- [ ] Integration test (service + store + component) exists and passes

## Technology Stack

### Monorepo Structure (npm workspaces)

```
cage/
├── packages/
│   ├── cli/        # Ink React CLI application
│   ├── backend/    # NestJS backend with SSE
│   ├── frontend/   # Vite + React + Tailwind v4
│   ├── hooks/      # Hook implementations
│   └── shared/     # Shared utilities and types
└── docs/           # Documentation
```

### Key Technologies

- **TypeScript**: All packages use ES modules (`"type": "module"`)
- **Tailwind CSS v4**: Using @tailwindcss/vite (no PostCSS needed)
- **Testing**: Vitest, @vitest/browser with Playwright
- **State Management**: Zustand (frontend only, no Redux)
- **API Client**: Fetch API (no Axios)
- **Validation**: Zod across all layers

## Development Methodology: Acceptance Criteria Driven Development (ACDD)

This project uses **Acceptance Criteria Driven Development** where:

1. **Specifications come first** - We define acceptance criteria in Given-When-Then format (see PHASE1.md)
2. **Tests come second** - We write tests that directly map to acceptance criteria BEFORE any code
3. **Code comes last** - We implement just enough code to make the tests pass

### CRITICAL RULES:

- **NEVER write production code without a failing test first**
- **Each acceptance criteria must have corresponding tests**
- **Tests must use the exact Given-When-Then language from specifications**
- **Follow the implementation instructions in PHASE1-IMPLEMENTATION.md exactly**

## Development Workflow

### 1. Before Making Changes

- Read the acceptance criteria in the relevant phase document (PHASE1.md, etc.)
- Check `FOUNDATION.md` for project requirements
- Review `PHASE1-IMPLEMENTATION.md` for implementation instructions

### 2. When Writing Code

- **WRITE TESTS FIRST** - No exceptions to this rule
- Run tests and ensure they fail for the right reasons
- Implement minimal code to make tests pass
- Refactor while keeping tests green
- Follow existing patterns in the codebase
- Use ESLint and Prettier configurations
- Ensure Windows, macOS, and Linux compatibility
- Use cross-platform path handling

### 3. Quality Check Integration

Run quality checks before committing:

```bash
npm run check  # Runs typecheck + lint + format + tests
```

The project has automated quality check hooks that will:

- Block TypeScript `any` usage
- Block CommonJS syntax
- Block `debugger` statements
- Block `eslint-disable` comments
- Enforce file size limits
- Block file extension usage in TypeScript imports
- Block `var`, `==`, and `!=` usage
- Enforce proper type imports
- Enforce interface usage over type for object shapes
- Ensure all promises are handled properly
- Check for unused variables
- Block console usage in source code

**Code that violates these standards will be automatically rejected by the quality check hook.**

### 4. Hook System Integration

When working with Claude Code hooks:

- **PreToolUse**: Validate and inject context before actions
- **PostToolUse**: Analyze results and trigger corrections
- **UserPromptSubmit**: Enhance prompts with project context
- **Stop/SubagentStop**: Final quality checks

## Common Commands

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Development mode
npm run dev

# Run tests
npm run test

# Lint code
npm run lint

# Format code
npm run format

# Run specific package commands
npm run dev --workspace @cage/frontend
npm run build --workspace @cage/cli
```

## File-Based Event Logging

- Use append-only logs for full data capture
- Structure logs for easy migration to databases later
- Capture all hook events for debugging and analysis

## Important Reminders

1. **Quality over Speed**: Take time to write proper types and tests
2. **Ask Before Major Changes**: Propose refactoring before implementing
3. **Maintain Specifications**: Update specifications as code evolves
4. **Cross-Platform**: Always consider Windows path/shell differences
5. **No Shortcuts**: Fix issues properly, don't disable linters

## When You Get Stuck

1. Check existing patterns in the codebase
2. Refer to `FOUNDATION.md` for project goals
3. Run tests to verify changes
4. Let quality check hooks guide you

## Contributing

When contributing to CAGE:

1. Ensure all tests pass
2. Update relevant documentation
3. Follow the established patterns
4. Keep commits focused and descriptive
5. Update specifications when behavior changes

Remember: The goal is to create a system that helps AI write better code through living specifications and quality enforcement. Every line of code should contribute to this goal.

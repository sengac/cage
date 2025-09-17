# Claude Development Guidelines for Cage

This document provides guidelines for AI assistants (particularly Claude) working on the Cage project. For complete project context and requirements, always refer to [FOUNDATION.md](FOUNDATION.md).

## Project Overview

**Cage** is a controlled environment for AI that provides boundaries, context, and guidance to help AI produce code matching living specifications through Specification by Example.

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

- ❌ **NEVER** write: `import { Type } from './types'` when only using as type
- ✅ **ALWAYS** write: `import type { Type } from './types'`

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
// ✅ CORRECT - Use Logger class
import { Logger } from '../logger.js';
const logger = new Logger();
logger.info('Operation completed');

// ❌ WRONG - Direct console usage
console.log('Operation completed');
```

### File Organization
- **Keep files under 300 lines** - refactor when approaching this limit
- When a file exceeds 300 lines, stop and refactor BEFORE continuing
- Ask for approval before major refactoring

### Testing Requirements
- **Use Vitest exclusively** - NEVER use Jest
- Write meaningful tests that verify actual functionality
- No trivial tests like `expect(true).toBe(true)`
- **Test Coverage:** All new code must have corresponding unit tests
- **Mock Patterns:** Use Vitest mocks, avoid actual file system in unit tests
- **Type Safety:** No `any` types allowed in tests - use proper type assertions

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

## Development Workflow

### 1. Before Making Changes
- Read the existing code to understand patterns and conventions
- Check `FOUNDATION.md` for project requirements
- Check `STRUCTURE.md` for technical setup details

### 2. When Writing Code
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
3. Refer to `STRUCTURE.md` for technical details
4. Run tests to verify changes
5. Let quality check hooks guide you

## Contributing

When contributing to Cage:
1. Ensure all tests pass
2. Update relevant documentation
3. Follow the established patterns
4. Keep commits focused and descriptive
5. Update specifications when behavior changes

Remember: The goal is to create a system that helps AI write better code through living specifications and quality enforcement. Every line of code should contribute to this goal.
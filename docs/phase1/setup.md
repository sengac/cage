# Phase 1: Project Setup and Prerequisites

## Step 0: Complete Project Setup

Before implementing any features, ensure these configuration files exist:

### Create `tsconfig.base.json` (root)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": false,
    "allowJs": false,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true,
    "paths": {
      "@cage/shared": ["./packages/shared/src"],
      "@cage/shared/*": ["./packages/shared/src/*"]
    }
  },
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

### Create `vitest.config.base.ts` (root)

```typescript
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/index.ts', // Exclude barrel exports
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@cage/shared': resolve(__dirname, './packages/shared/src'),
    },
  },
});
```

### Create `.nvmrc` (root)

```
20.18.0
```

### Update root `package.json` scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage",
    "build": "npm run build --workspaces --if-present",
    "dev": "npm run dev --workspace @cage/backend",
    "typecheck": "tsc --build --verbose",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write .",
    "check": "npm run typecheck && npm run lint && npm run test",
    "cage": "node packages/cli/dist/index.js",
    "start:server": "npm run start --workspace @cage/backend"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "@vitest/coverage-v8": "^2.1.0",
    "tsx": "^4.20.0"
  }
}
```

## Install Dependencies

```bash
# From root directory
npm install

# Install workspace-specific dependencies
npm install --workspace @cage/shared zod nanoid
npm install --workspace @cage/cli ink ink-spinner ink-progress-bar commander chalk ink-testing-library
npm install --workspace @cage/backend @nestjs/core @nestjs/common @nestjs/platform-express @nestjs/event-emitter @nestjs/swagger
```

## Verify Setup

Run these commands to verify everything is configured correctly:

```bash
# Check TypeScript configuration
npm run typecheck

# Run tests (should pass with no tests)
npm test

# Check linting
npm run lint
```

## Git Hook Verification

The project includes a pre-commit hook that enforces test-first development:

```bash
# Test the hook by trying to commit implementation without tests
echo "export const test = 'hello';" > packages/shared/src/test.ts
git add packages/shared/src/test.ts
git commit -m "test" # This should fail with "Test-First Development Violation!"
```

## Next Steps

Once setup is complete, proceed to:

1. [Shared Package Implementation](shared-package.md)
2. [CLI Package Implementation](cli-package.md)
3. [Backend Package Implementation](backend-package.md)

# Cage Project Structure & Setup Guide

This document provides step-by-step instructions for setting up the Cage project based on the technical requirements defined in FOUNDATION.md.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Claude Code CLI installed and authenticated (`claude login`)
- Git installed

## Project Setup Steps

### Phase 1: Monorepo Foundation with npm Workspaces

#### 1. Initialize Project Root
```bash
mkdir cage
cd cage
git init
```

#### 2. Create Node Version File
```bash
echo "20.11.0" > .nvmrc
nvm use
```

#### 3. Initialize Root Package.json with Workspaces
```bash
npm init -y
npm pkg set name="@cage/root"
npm pkg set type="module"
npm pkg set workspaces="[\"packages/*\"]"
```

#### 4. Create Workspace Directories
```bash
mkdir -p packages/cli
mkdir -p packages/backend
mkdir -p packages/frontend
mkdir -p packages/hooks
mkdir -p packages/shared
mkdir -p docs
```

#### 5. Initialize Workspace Packages
```bash
# Initialize each workspace package using npm workspaces
npm init --workspace packages/shared -y
npm init --workspace packages/cli -y
npm init --workspace packages/backend -y
npm init --workspace packages/frontend -y
npm init --workspace packages/hooks -y
```

### Phase 2: Shared Package Setup

#### 1. Configure Shared Package
```bash
# Set package properties using workspace flag
npm pkg set name="@cage/shared" --workspace packages/shared
npm pkg set type="module" --workspace packages/shared
npm pkg set main="dist/index.js" --workspace packages/shared
npm pkg set types="dist/index.d.ts" --workspace packages/shared
```

#### 2. Install Shared Dependencies
```bash
# Install from root using workspace flag
npm install zod date-fns nanoid --workspace packages/shared
npm install -D typescript @types/node --workspace packages/shared
```

#### 3. Create TypeScript Config
Create `packages/shared/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Phase 3: CLI Package Setup

#### 1. Configure CLI Package
```bash
# Set package properties using workspace flag
npm pkg set name="@cage/cli" --workspace packages/cli
npm pkg set type="module" --workspace packages/cli
npm pkg set bin.cage="./dist/index.js" --workspace packages/cli
```

#### 2. Install CLI Dependencies
```bash
# Install from root using workspace flag
npm install ink react chalk commander --workspace packages/cli
npm install -D @types/react @types/node typescript vite-node ink-testing-library @vitest/ui vitest --workspace packages/cli
# Add shared package as dependency
npm install @cage/shared --workspace packages/cli
```

#### 3. Setup CLI Build Configuration
Create `packages/cli/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.tsx',
      formats: ['es'], // ESM only
      fileName: 'index'
    },
    rollupOptions: {
      external: ['ink', 'react', 'chalk', 'commander'],
      output: {
        format: 'es'
      }
    },
    target: 'node18', // For Node.js 18+
    ssr: true // Server-side rendering mode for CLI
  },
  optimizeDeps: {
    include: [
      // Add any CommonJS dependencies here that need to be pre-bundled
      'chalk',
      'commander'
    ]
  },
  resolve: {
    conditions: ['node', 'import', 'module', 'default']
  }
});
```

### Phase 4: Backend Package Setup

#### 1. Configure Backend Package
```bash
# Set package properties using workspace flag
npm pkg set name="@cage/backend" --workspace packages/backend
npm pkg set type="module" --workspace packages/backend
```

#### 2. Install NestJS and Dependencies
```bash
# Install from root using workspace flag
npm install @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs --workspace packages/backend
npm install @nestjs/swagger @nestjs/event-emitter @nestjs/sse --workspace packages/backend
npm install class-validator class-transformer zod --workspace packages/backend
npm install @instantlyeasy/claude-code-sdk-ts --workspace packages/backend
npm install -D @nestjs/cli @nestjs/testing @types/node typescript vitest --workspace packages/backend
# Add shared package as dependency
npm install @cage/shared --workspace packages/backend
```

#### 3. Create NestJS Configuration
```bash
# Run from the backend package directory
cd packages/backend
npx @nestjs/cli new . --skip-git --package-manager npm --skip-install
cd ../..
```

### Phase 5: Frontend Package Setup

#### 1. Configure Frontend Package
```bash
# Set package properties using workspace flag
npm pkg set name="@cage/frontend" --workspace packages/frontend
npm pkg set type="module" --workspace packages/frontend
```

#### 2. Create Vite React App
```bash
# Run from the frontend package directory
cd packages/frontend
npm create vite@latest . -- --template react-ts --skip
cd ../..
```

#### 3. Install Frontend Dependencies
```bash
# Install from root using workspace flag
npm install react react-dom react-router-dom zustand --workspace packages/frontend
npm install -D @types/react @types/react-dom typescript --workspace packages/frontend
npm install -D tailwindcss@next @tailwindcss/vite@next --workspace packages/frontend
npm install -D @vitejs/plugin-react vite vitest @vitest/ui --workspace packages/frontend
npm install -D @testing-library/react @testing-library/user-event @vitest/browser playwright --workspace packages/frontend
# Add shared package as dependency
npm install @cage/shared --workspace packages/frontend
```

#### 4. Configure Tailwind CSS
Create `packages/frontend/src/styles.css`:
```css
@import "tailwindcss";

/* Custom theme configuration in CSS */
@theme {
  /* Add custom theme tokens here if needed */
}
```

#### 5. Create Frontend Vite Configuration
Create `packages/frontend/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'esnext', // Use latest ES features
    minify: 'esbuild',
    rollupOptions: {
      output: {
        format: 'es' // ESM output format
      }
    }
  },
  optimizeDeps: {
    include: [
      // Pre-bundle any CommonJS dependencies
      'react',
      'react-dom',
      'react-router-dom',
      'zustand'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@cage/shared': path.resolve(__dirname, '../shared/src')
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Backend server
        changeOrigin: true
      }
    }
  }
});
```

### Phase 6: Hooks Package Setup

#### 1. Configure Hooks Package
```bash
# Set package properties using workspace flag
npm pkg set name="@cage/hooks" --workspace packages/hooks
npm pkg set type="module" --workspace packages/hooks
```

#### 2. Install Hook Dependencies
```bash
# Install from root using workspace flag
npm install zod chalk --workspace packages/hooks
npm install -D typescript @types/node vitest --workspace packages/hooks
# Add shared package as dependency
npm install @cage/shared --workspace packages/hooks
```

### Phase 7: Code Quality Setup (Root Level)

#### 1. Install ESLint and Prettier
```bash
# Install at root level (these will be available to all workspaces)
npm install -D eslint prettier eslint-config-prettier eslint-plugin-prettier
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D eslint-plugin-react eslint-plugin-react-hooks
```

#### 2. Create ESLint Configuration
Create `.eslintrc.json`:
```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "prettier"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "prettier/prettier": "error",
    "no-any": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error"
  },
  "overrides": [
    {
      "files": ["packages/frontend/**/*.tsx", "packages/frontend/**/*.ts"],
      "extends": [
        "plugin:react/recommended",
        "plugin:react-hooks/recommended"
      ],
      "settings": {
        "react": {
          "version": "detect"
        }
      }
    }
  ]
}
```

#### 3. Create Prettier Configuration
Create `.prettierrc`:
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

#### 4. Install Stylelint (Frontend)
```bash
npm install -D stylelint stylelint-config-standard stylelint-config-tailwindcss
```

Create `.stylelintrc.json`:
```json
{
  "extends": ["stylelint-config-standard", "stylelint-config-tailwindcss"],
  "rules": {
    "selector-class-pattern": null
  }
}
```

### Phase 8: Testing Configuration

#### 1. Root Level Vitest Config
Create `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
```

#### 2. Add Test Scripts to Root package.json
```bash
npm pkg set scripts.test="lerna run test"
npm pkg set scripts.test:ui="lerna run test:ui"
npm pkg set scripts.test:coverage="lerna run test:coverage"
```

### Phase 9: Git Configuration

#### 1. Create .gitignore
```
node_modules/
dist/
build/
*.log
.env
.env.local
coverage/
.vscode/
.idea/
*.swp
*.swo
.DS_Store
lerna-debug.log*
.nx/
```

#### 2. Create MIT License
Create `LICENSE`:
```
MIT License

Copyright (c) 2025 Cage Project

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### Phase 10: Documentation Structure

#### 1. Create Documentation Files
```bash
touch README.md
touch docs/CLI.md
touch docs/BACKEND.md
touch docs/FRONTEND.md
touch docs/HOOKS.md
touch docs/DOCKER.md
touch docs/DEVELOPMENT.md
```

#### 2. Basic README.md
```markdown
# Cage

A controlled environment for AI that provides the right boundaries, context, and guidance to help it do its job effectively.

## Documentation

- [CLI Documentation](docs/CLI.md)
- [Backend Documentation](docs/BACKEND.md)
- [Frontend Documentation](docs/FRONTEND.md)
- [Hooks Documentation](docs/HOOKS.md)
- [Docker Setup](docs/DOCKER.md)
- [Development Guide](docs/DEVELOPMENT.md)

## Quick Start

```bash
# Install all workspace dependencies
npm install

# Build all packages
npm run build

# Run CLI
npm run cage

# Start backend server
npm run start:server

# Development mode (all packages)
npm run dev

# Run tests in all workspaces
npm run test

# Run specific workspace commands
npm run dev --workspace @cage/frontend
npm run build --workspace @cage/cli
```

## License

MIT
```

### Phase 11: Final Setup Scripts

#### 1. Add Root Scripts
```bash
npm pkg set scripts.setup="npm install && npm run build"
npm pkg set scripts.build="npm run build --workspaces --if-present"
npm pkg set scripts.dev="npm run dev --workspaces --if-present"
npm pkg set scripts.test="npm run test --workspaces --if-present"
npm pkg set scripts.test:ui="npm run test:ui --workspaces --if-present"
npm pkg set scripts.lint="eslint . --ext .ts,.tsx"
npm pkg set scripts.format="prettier --write ."
npm pkg set scripts.cage="node packages/cli/dist/index.js"
npm pkg set scripts.start:server="npm run start --workspace @cage/backend"
```

#### 2. Add Package-Specific Scripts
```bash
# CLI package scripts
npm pkg set scripts.build="vite-node build" --workspace @cage/cli
npm pkg set scripts.dev="vite-node src/index.tsx" --workspace @cage/cli
npm pkg set scripts.test="vitest" --workspace @cage/cli

# Backend package scripts
npm pkg set scripts.build="nest build" --workspace @cage/backend
npm pkg set scripts.dev="nest start --watch" --workspace @cage/backend
npm pkg set scripts.start="node dist/main.js" --workspace @cage/backend
npm pkg set scripts.test="vitest" --workspace @cage/backend

# Frontend package scripts
npm pkg set scripts.build="vite build" --workspace @cage/frontend
npm pkg set scripts.dev="vite" --workspace @cage/frontend
npm pkg set scripts.preview="vite preview" --workspace @cage/frontend
npm pkg set scripts.test="vitest" --workspace @cage/frontend
npm pkg set scripts.test:ui="vitest --ui" --workspace @cage/frontend

# Shared package scripts
npm pkg set scripts.build="tsc" --workspace @cage/shared
npm pkg set scripts.test="vitest" --workspace @cage/shared

# Hooks package scripts
npm pkg set scripts.build="tsc" --workspace @cage/hooks
npm pkg set scripts.test="vitest" --workspace @cage/hooks
```

#### 3. Create Initial Source Files
```bash
# Create entry points for each package
touch packages/shared/src/index.ts
touch packages/cli/src/index.tsx
touch packages/backend/src/main.ts
touch packages/frontend/src/main.tsx
touch packages/hooks/src/index.ts
```

## Verification Checklist

- [ ] Node.js version matches .nvmrc
- [ ] All packages initialized with correct names using npm workspaces
- [ ] TypeScript configured for all packages
- [ ] ESLint and Prettier configured
- [ ] Vitest configured for testing
- [ ] npm workspaces configured in root package.json
- [ ] All dependencies installed using workspace commands
- [ ] Inter-package dependencies properly linked (@cage/shared)
- [ ] Git initialized with .gitignore
- [ ] MIT License file created
- [ ] Documentation structure created
- [ ] Cross-platform compatibility considered

## Next Steps

1. Implement Phase 1 from FOUNDATION.md Notes:
   - Core hook infrastructure
   - Basic NestJS backend to receive hook data
   - File-based event logging system

2. Set up CI/CD if needed (GitHub Actions, etc.)

3. Begin implementing the living specification system

## Platform-Specific Notes

### Windows Compatibility
- Use cross-platform path handling in all code
- Test CLI commands with Windows Command Prompt and PowerShell
- Ensure file watchers work correctly on Windows
- Use `cross-env` for environment variables if needed

### macOS/Linux
- Standard Unix paths and commands work as expected
- File permissions may need adjustment for hook execution

## Important Reminders

1. **Never use `any` type in TypeScript** - ESLint is configured to catch this
2. **Keep files under 300 lines** - Refactor when approaching this limit
3. **All tests use Vitest** - Never use Jest
4. **File-based logging** - Append-only for event capture
5. **npm workspaces** - All packages under `/packages` directory with automatic linking
6. **Workspace commands** - Always use `--workspace` or `--workspaces` flags from root
7. **Cross-package dependencies** - Use package names (e.g., `@cage/shared`) not relative paths